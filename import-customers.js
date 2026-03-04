import fs from 'fs';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Customer from './server/models/Customer.js';
import Booking from './server/models/Booking.js';

dotenv.config({ path: '.env.local' });

// MongoDB verbinden
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI nicht in .env.local gefunden!');
  process.exit(1);
}

async function importCustomers() {
  try {
    console.log('🔗 Verbinde mit MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Verbunden mit MongoDB');

    // JSON-Datei einlesen
    console.log('📖 Lese JSON-Datei...');
    const rawData = fs.readFileSync('customers-data.json', 'utf-8');
    const data = JSON.parse(rawData);

    console.log(`📊 ${data.length} Einträge gefunden`);

    let customersCreated = 0;
    let bookingsCreated = 0;

    for (const row of data) {
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
          console.log(`⚠️  Überspringe Zeile ohne Name/Email`);
          continue;
        }

        // Prüfe ob Kunde bereits existiert
        let customer = await Customer.findOne({ email: customerData.email });
        
        if (!customer) {
          customer = new Customer(customerData);
          await customer.save();
          customersCreated++;
          console.log(`✅ Kunde erstellt: ${customer.name}`);
        } else {
          console.log(`ℹ️  Kunde existiert bereits: ${customer.name}`);
        }

        // Parse Adresse in Komponenten
        const parseAddress = (address) => {
          if (!address) return { street: '', zip: '', city: '' };
          
          // Versuche Format "Straße, PLZ Ort" zu parsen
          const parts = address.split(',').map(p => p.trim());
          const street = parts[0] || '';
          const zipCity = parts[1] || '';
          const zipCityMatch = zipCity.match(/^(\d+)\s+(.+)$/);
          
          if (zipCityMatch) {
            return {
              street,
              zip: zipCityMatch[1],
              city: zipCityMatch[2]
            };
          }
          
          return { street: address, zip: '', city: '' };
        };

        const { street, zip, city } = parseAddress(customerData.address);

        // Erstelle Buchungen für FS (Frühlingstraße)
        if (row['FS-Mietbeginn'] && row['FS-Mietnächte']) {
          const startDate = excelDateToJSDate(row['FS-Mietbeginn']);
          const nights = parseInt(row['FS-Mietnächte']) || 0;
          const endDate = row['FS-Mietende'] ? excelDateToJSDate(row['FS-Mietende']) : addDays(startDate, nights);
          const pricePerNight = parseFloat(row['FS-Preis/Nacht (€)']) || 0;
          const cleaningFee = parseFloat(row['Reinigung FS (€)']) || 0;
          const vatRate = parseFloat(row['Steuer (%)']) || 19;

          const subtotal = pricePerNight * nights;
          const total = subtotal + cleaningFee;
          const vat = total * (vatRate / 100);
          const totalWithVat = total + vat;

          const booking = new Booking({
            customerId: customer._id,
            name: customerData.name,
            email: customerData.email,
            phone: customerData.phone || customerData.mobile || '',
            company: customerData.name,
            street: street,
            zip: zip,
            city: city,
            wohnung: 'neubau',
            wohnungLabel: 'Frühlingstraße',
            startDate: startDate,
            endDate: endDate,
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
            createdAt: row['Rechnungsdatum'] ? excelDateToJSDate(row['Rechnungsdatum']) : new Date()
          });

          await booking.save();
          bookingsCreated++;
          console.log(`  ✅ Buchung (FS) erstellt: ${startDate.toLocaleDateString('de-DE')} - ${nights} Nächte`);
        }

        // Erstelle Buchungen für HA (Hackerberg)
        if (row['HA-Mietbeginn'] && row['HA-Mietnächte']) {
          const startDate = excelDateToJSDate(row['HA-Mietbeginn']);
          const nights = parseInt(row['HA-Mietnächte']) || 0;
          const endDate = row['HA-Mietende'] ? excelDateToJSDate(row['HA-Mietende']) : addDays(startDate, nights);
          const pricePerNight = parseFloat(row['HA-Preis/Nacht (€)']) || 0;
          const cleaningFee = parseFloat(row['Reinigung HA (€)']) || 0;
          const vatRate = parseFloat(row['Steuer (%)']) || 19;

          const subtotal = pricePerNight * nights;
          const total = subtotal + cleaningFee;
          const vat = total * (vatRate / 100);
          const totalWithVat = total + vat;

          const booking = new Booking({
            customerId: customer._id,
            name: customerData.name,
            email: customerData.email,
            phone: customerData.phone || customerData.mobile || '',
            company: customerData.name,
            street: street,
            zip: zip,
            city: city,
            wohnung: 'hackerberg',
            wohnungLabel: 'Hackerberg',
            startDate: startDate,
            endDate: endDate,
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
            createdAt: row['Rechnungsdatum'] ? excelDateToJSDate(row['Rechnungsdatum']) : new Date()
          });

          await booking.save();
          bookingsCreated++;
          console.log(`  ✅ Buchung (HA) erstellt: ${startDate.toLocaleDateString('de-DE')} - ${nights} Nächte`);
        }

      } catch (error) {
        console.error(`❌ Fehler bei Zeile:`, error.message);
      }
    }

    console.log('\n✅ Import abgeschlossen!');
    console.log(`📊 ${customersCreated} Kunden erstellt`);
    console.log(`📊 ${bookingsCreated} Buchungen erstellt`);

  } catch (error) {
    console.error('❌ Fehler beim Import:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 MongoDB Verbindung geschlossen');
  }
}

// Hilfsfunktion: Excel-Datum zu JS-Datum (aus JSON-String)
function excelDateToJSDate(excelDate) {
  if (!excelDate) return new Date();
  
  // Wenn es bereits ein String-Datum ist (ISO)
  if (typeof excelDate === 'string' && excelDate.includes('-')) {
    return new Date(excelDate);
  }
  
  // Wenn es ein Date-Objekt ist
  if (excelDate instanceof Date) return excelDate;
  
  // Wenn es eine Zahl ist (Excel-Serial)
  if (typeof excelDate === 'number') {
    const excelEpoch = new Date(1899, 11, 30);
    const jsDate = new Date(excelEpoch.getTime() + excelDate * 86400000);
    return jsDate;
  }
  
  return new Date();
}

// Hilfsfunktion: Tage zu Datum addieren
function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

// Script ausführen
importCustomers();
