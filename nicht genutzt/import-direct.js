import fs from 'fs';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Lade Umgebungsvariablen
dotenv.config({ path: '.env.local' });
dotenv.config({path: '.env' });

// MongoDB verbinden
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI nicht gefunden!');
  process.exit(1);
}

// Definiere Schemas direkt hier
const customerSchema = new mongoose.Schema({
  name: String,
  address: String,
  ustId: String,
  contactPerson: String,
  email: { type: String, required: true },
  phone: String,
  mobile: String,
  notes: String,
  totalBookings: { type: Number, default: 0 },
  totalNights: { type: Number, default: 0 },
  totalRevenue: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const bookingSchema = new mongoose.Schema({
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
  name: String,
  email: String,
  phone: String,
  company: String,
  street: String,
  zip: String,
  city: String,
  wohnung: String,
  wohnungLabel: String,
  startDate: Date,
  endDate: Date,
  nights: Number,
  people: Number,
  pricePerNight: Number,
  cleaningFee: Number,
  subtotal: Number,
  discount: { type: Number, default: 0 },
  vat: Number,
  total: Number,
  paymentStatus: { type: String, default: 'pending' },
  bookingStatus: { type: String, default: 'confirmed' },
  deletedAt: { type: Date, default: null },
  checkInTime: { type: String, default: '15:00' },
  checkOutTime: { type: String, default: '10:00' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const Customer = mongoose.model('Customer', customerSchema);
const Booking = mongoose.model('Booking', bookingSchema);

async function importData() {
  try {
    console.log('🔗 Verbinde mit MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Verbunden mit MongoDB\n');

    // JSON-Datei einlesen
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
      console.log(`[${i + 1}/${data.length}] ${row['Empfängername'] || '(leer)'}`);

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
          console.log('  ⚠️  Überspringe - kein Name oder Email\n');
          continue;
        }

        let customer;

        // Prüfe ob Kunde bereits im Cache ist
        if (customerMap.has(customerData.email)) {
          customer = customerMap.get(customerData.email);
          customersExisting++;
          console.log(`  ℹ️  Kunde im Cache: ${customer._id}`);
        } else {
          // Prüfe ob Kunde in DB existiert
          customer = await Customer.findOne({ email: customerData.email });
          
          if (customer) {
            customerMap.set(customerData.email, customer);
            customersExisting++;
            console.log(`  ℹ️  Kunde existiert: ${customer._id}`);
          } else {
            // Erstelle neuen Kunden
            customer = new Customer(customerData);
            await customer.save();
            customerMap.set(customerData.email, customer);
            customersCreated++;
            console.log(`  ✅ Kunde erstellt: ${customer._id}`);
          }
        }

        // Parse Adresse
        const parseAddress = (address) => {
          if (!address) return { street: '', zip: '', city: '' };
          
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

        // Parse Datum
        const parseDate = (dateStr) => {
          if (!dateStr) return null;
          try {
            const date = new Date(dateStr);
            return isNaN(date.getTime()) ? null : date;
          } catch {
            return null;
          }
        };

        // FS (Frühlingstraße) Buchung
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

            const booking = new Booking({
              customerId: customer._id,
              name: customerData.name,
              email: customerData.email,
              phone: customerData.phone || customerData.mobile || '-',
              company: customerData.name,
              street,
              zip,
              city,
              wohnung: 'neubau',
              wohnungLabel: 'Frühlingstraße',
              startDate,
              endDate,
              nights,
              people: 1,
              pricePerNight,
              cleaningFee,
              subtotal,
              discount: 0,
              vat,
              total: totalWithVat,
              paymentStatus: row['Rechnung erstellt'] === 'Ja' ? 'paid' : 'pending',
              bookingStatus: 'confirmed',
              createdAt: parseDate(row['Rechnungsdatum']) || startDate
            });

            await booking.save();
            bookingsCreated++;
            console.log(`  ✅ Buchung FS: ${startDate.toLocaleDateString('de-DE')} (${nights} Nächte)`);
          }
        }

        // HA (Hackerberg) Buchung
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

            const booking = new Booking({
              customerId: customer._id,
              name: customerData.name,
              email: customerData.email,
              phone: customerData.phone || customerData.mobile || '-',
              company: customerData.name,
              street,
              zip,
              city,
              wohnung: 'hackerberg',
              wohnungLabel: 'Hackerberg',
              startDate,
              endDate,
              nights,
              people: 1,
              pricePerNight,
              cleaningFee,
              subtotal,
              discount: 0,
              vat,
              total: totalWithVat,
              paymentStatus: row['Rechnung erstellt'] === 'Ja' ? 'paid' : 'pending',
              bookingStatus: 'confirmed',
              createdAt: parseDate(row['Rechnungsdatum']) || startDate
            });

            await booking.save();
            bookingsCreated++;
            console.log(`  ✅ Buchung HA: ${startDate.toLocaleDateString('de-DE')} (${nights} Nächte)`);
          }
        }

        console.log(''); // Leerzeile

      } catch (error) {
        console.error(`  ❌ Fehler:`, error.message);
        console.log('');
      }
    }

    console.log('\n✅ Import abgeschlossen!');
    console.log(`📊 ${customersCreated} neue Kunden erstellt`);
    console.log(`📊 ${customersExisting} bestehende Kunden verwendet`);
    console.log(`📊 ${bookingsCreated} Buchungen erstellt`);

    await mongoose.disconnect();
    console.log('\n🔌 MongoDB Verbindung geschlossen');

  } catch (error) {
    console.error('\n❌ Fehler beim Import:', error);
    process.exit(1);
  }
}

// Script ausführen
importData();
