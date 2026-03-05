import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const MONGODB_URI = process.env.MONGODB_URI;

async function checkImport() {
  try {
    await mongoose.connect(MONGODB_URI);
    
    const customersCount = await mongoose.connection.collection('customers').countDocuments();
    const bookingsCount = await mongoose.connection.collection('bookings').countDocuments();
    
    console.log(`✅ Import Status:`);
    console.log(`   Kunden: ${customersCount}`);
    console.log(`   Buchungen: ${bookingsCount}`);
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('Fehler:', error.message);
  }
}

checkImport();
