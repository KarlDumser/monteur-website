import fs from 'fs';
import dotenv from 'dotenv';

// Lade Umgebungsvariablen - versuche .env.local, dann .env
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

// Admin-Credentials aus Umgebungsvariablen
const ADMIN_USER = process.env.ADMIN_USER;
const ADMIN_PASS = process.env.ADMIN_PASS;
const API_URL = process.env.API_URL || 'http://localhost:3001';

if (!ADMIN_USER || !ADMIN_PASS) {
  console.error('❌ ADMIN_USER und ADMIN_PASS müssen in .env.local gesetzt sein!');
  process.exit(1);
}

const AUTH_TOKEN = Buffer.from(`${ADMIN_USER}:${ADMIN_PASS}`).toString('base64');

async function importData() {
  try {
    console.log('📖 Lese JSON-Datei...');
    const rawData = fs.readFileSync('customers-data.json', 'utf-8');
    const data = JSON.parse(rawData);

    console.log(`📊 ${data.length} Einträge gefunden\n`);

    let customersCreated = 0;
    let customersExisting = 0;
    let bookingsCreated = 0;
    const customerMap = new Map(); // Email -> Customer ID

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      console.log(`\n[${i + 1}/${data.length}] Verarbeite: ${row['Empfängername']}`);

      try {
        // Kundendaten extrahieren
        const customerData = {
          name: row['Empfängername'] || '',
          address: row['Empfängeradresse'] || '',
          ustId: row['KundenUStID'] || '',
          contactPerson: row['Ansprechpartner'] || '',
          email: row['Email'] || '',
          phone: row['Telefon'] || '',
          mobile: row['Handy'] || ''
        };

        if (!customerData.name || !customerData.email) {
          console.log('  ⚠️  Überspringe - kein Name oder Email');
          continue;
        }

        let customerId;

        // Prüfe ob Kunde bereits im Cache ist (Duplikate in Excel)
        if (customerMap.has(customerData.email)) {
          customerId = customerMap.get(customerData.email);
          customersExisting++;
          console.log(`  ℹ️  Kunde existiert bereits (Cache): ${customerData.name}`);
        } else {
          // Versuche Kunden zu erstellen
          const createCustomerRes = await fetch(`${API_URL}/admin/customers`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Basic ${AUTH_TOKEN}`
            },
            body: JSON.stringify(customerData)
          });

          if (createCustomerRes.ok) {
            const customer = await createCustomerRes.json();
            customerId = customer._id;
            customerMap.set(customerData.email, customerId);
            customersCreated++;
            console.log(`  ✅ Kunde erstellt: ${customerData.name}`);
          } else if (createCustomerRes.status === 400) {
            // Kunde existiert möglicherweise bereits, versuche zu finden
            const getAllRes = await fetch(`${API_URL}/admin/customers`, {
              headers: { 'Authorization': `Basic ${AUTH_TOKEN}` }
            });
            
            if (getAllRes.ok) {
              const allCustomers = await getAllRes.json();
              const existingCustomer = allCustomers.find(c => c.email === customerData.email);
              
              if (existingCustomer) {
                customerId = existingCustomer._id;
                customerMap.set(customerData.email, customerId);
                customersExisting++;
                console.log(`  ℹ️  Kunde existiert bereits: ${customerData.name}`);
              }
            }
          }

          if (!customerId) {
            console.log(`  ❌ Kunde konnte nicht erstellt/gefunden werden`);
            continue;
          }
        }

        // Parse Adresse in Komponenten
        const parseAddress = (address) => {
          if (!address) return { street: '', zip: '', city: '' };
          
          // Versuche Format "Straße, PLZ Ort" zu parsen
          const parts = address.split(/[,\n]/).map(p => p.trim()).filter(p => p);
          const street = parts[0] || '';
          const zipCity = parts[1] || '';
          const zipCityMatch = zipCity.match(/^([A-Z]{1,2}[-\s]?)?(\d{4,5})\s+(.+)$/);
          
          if (zipCityMatch) {
            return {
              street,
              zip: zipCityMatch[2],
              city: zipCityMatch[3]
            };
          }
          
          return { street: address, zip: '', city: '' };
        };

        const { street, zip, city } = parseAddress(customerData.address);

        // Hilfsfunktion: Datum parsen
        const parseDate = (dateStr) => {
          if (!dateStr) return null;
          try {
            const date = new Date(dateStr);
            return isNaN(date.getTime()) ? null : date.toISOString().split('T')[0];
          } catch {
            return null;
          }
        };

        // Erstelle Buchungen für FS (Frühlingstraße)
        if (row['FS-Mietbeginn'] && row['FS-Mietnächte']) {
          const startDate = parseDate(row['FS-Mietbeginn']);
          const nights = parseInt(row['FS-Mietnächte']) || 0;
          const pricePerNight = parseFloat(row['FS-Preis/Nacht (€)']) || 0;
          const cleaningFee = parseFloat(row['Reinigung FS (€)']) || 0;
          const vatRate = parseFloat(row['Steuer (%)']) || 19;

          if (startDate && nights > 0) {
            const endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() + nights);

            const subtotal = pricePerNight * nights;
            const total = subtotal + cleaningFee;
            const vat = total * (vatRate / 100);
            const totalWithVat = total + vat;

            const bookingData = {
              customerId: customerId,
              name: customerData.name,
              email: customerData.email,
              phone: customerData.phone || customerData.mobile || '-',
              company: customerData.name,
              street: street,
              zip: zip,
              city: city,
              wohnung: 'neubau',
              wohnungLabel: 'Frühlingstraße',
              startDate: startDate,
              endDate: endDate.toISOString().split('T')[0],
              nights: nights,
              people: 1,
              pricePerNight: pricePerNight,
              cleaningFee: cleaningFee,
              subtotal: subtotal,
              discount: 0,
              vat: vat,
              total: totalWithVat,
              paymentStatus: row['Rechnung erstellt'] === 'Ja' ? 'paid' : 'pending',
              bookingStatus: 'confirmed',
              createdAt: parseDate(row['Rechnungsdatum']) || startDate
            };

            const createBookingRes = await fetch(`${API_URL}/admin/bookings`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${AUTH_TOKEN}`
              },
              body: JSON.stringify(bookingData)
            });

            if (createBookingRes.ok) {
              bookingsCreated++;
              console.log(`  ✅ Buchung (FS) erstellt: ${startDate} - ${nights} Nächte`);
            } else {
              const error = await createBookingRes.text();
              console.log(`  ❌ Buchung (FS) Fehler: ${error.substring(0, 100)}`);
            }
          }
        }

        // Erstelle Buchungen für HA (Hackerberg)
        if (row['HA-Mietbeginn'] && row['HA-Mietnächte']) {
          const startDate = parseDate(row['HA-Mietbeginn']);
          const nights = parseInt(row['HA-Mietnächte']) || 0;
          const pricePerNight = parseFloat(row['HA-Preis/Nacht (€)']) || 0;
          const cleaningFee = parseFloat(row['Reinigung HA (€)']) || 0;
          const vatRate = parseFloat(row['Steuer (%)']) || 19;

          if (startDate && nights > 0) {
            const endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() + nights);

            const subtotal = pricePerNight * nights;
            const total = subtotal + cleaningFee;
            const vat = total * (vatRate / 100);
            const totalWithVat = total + vat;

            const bookingData = {
              customerId: customerId,
              name: customerData.name,
              email: customerData.email,
              phone: customerData.phone || customerData.mobile || '-',
              company: customerData.name,
              street: street,
              zip: zip,
              city: city,
              wohnung: 'hackerberg',
              wohnungLabel: 'Hackerberg',
              startDate: startDate,
              endDate: endDate.toISOString().split('T')[0],
              nights: nights,
              people: 1,
              pricePerNight: pricePerNight,
              cleaningFee: cleaningFee,
              subtotal: subtotal,
              discount: 0,
              vat: vat,
              total: totalWithVat,
              paymentStatus: row['Rechnung erstellt'] === 'Ja' ? 'paid' : 'pending',
              bookingStatus: 'confirmed',
              createdAt: parseDate(row['Rechnungsdatum']) || startDate
            };

            const createBookingRes = await fetch(`${API_URL}/admin/bookings`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${AUTH_TOKEN}`
              },
              body: JSON.stringify(bookingData)
            });

            if (createBookingRes.ok) {
              bookingsCreated++;
              console.log(`  ✅ Buchung (HA) erstellt: ${startDate} - ${nights} Nächte`);
            } else {
              const error = await createBookingRes.text();
              console.log(`  ❌ Buchung (HA) Fehler: ${error.substring(0, 100)}`);
            }
          }
        }

      } catch (error) {
        console.error(`  ❌ Fehler bei Zeile ${i + 1}:`, error.message);
      }
    }

    console.log('\n\n✅ Import abgeschlossen!');
    console.log(`📊 ${customersCreated} neue Kunden erstellt`);
    console.log(`📊 ${customersExisting} bestehende Kunden verwendet`);
    console.log(`📊 ${bookingsCreated} Buchungen erstellt`);

  } catch (error) {
    console.error('❌ Fehler beim Import:', error);
    process.exit(1);
  }
}

// Script ausführen
importData();
