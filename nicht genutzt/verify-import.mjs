import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const customerSchema = new mongoose.Schema({}, { strict: false });
const bookingSchema = new mongoose.Schema({}, { strict: false });

const Customer = mongoose.model('Customer', customerSchema);
const Booking = mongoose.model('Booking', bookingSchema);

async function checkResults() {
  const output = [];
  try {
    output.push('Starting MongoDB check...');
    await mongoose.connect(process.env.MONGODB_URI, { 
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000
    });
    output.push('✅ Connected to MongoDB');
    
    const customerCount = await Customer.countDocuments();
    const bookingCount = await Booking.countDocuments();
    
    output.push(`📊 Total Customers: ${customerCount}`);
    output.push(`📖 Total Bookings: ${bookingCount}`);
    
    if (customerCount > 0) {
      const samples = await Customer.find({}, { name: 1, email: 1 }).limit(3).lean();
      output.push('\n📋 Sample Customers:');
      samples.forEach(c => {
        output.push(`  - ${c.name} (${c.email})`);
      });
    }
    
    await mongoose.disconnect();
    output.push('\n✅ Done!');
  } catch (err) {
    output.push(`❌ Error: ${err.message}`);
  }
  
  const result = output.join('\n');
  console.log(result);
  fs.writeFileSync('/tmp/import-result-final.txt', result);
}

checkResults();
