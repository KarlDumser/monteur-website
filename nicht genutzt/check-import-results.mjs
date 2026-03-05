import mongoose from 'mongoose';
import dotenv from 'dotenv';

console.log('Starting check...');
dotenv.config();

console.log('MongoDB URI configured:', !!process.env.MONGODB_URI);

const customerSchema = new mongoose.Schema({
  email: String,
  name: String,
  totalBookings: Number,
}, { strict: false });

const bookingSchema = new mongoose.Schema({
  customerId: mongoose.Schema.Types.ObjectId,
  propertyType: String,
}, { strict: false });

const Customer = mongoose.model('Customer', customerSchema);
const Booking = mongoose.model('Booking', bookingSchema);

async function checkResults() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected!');
    
    console.log('Counting customers...');
    const customerCount = await Customer.countDocuments();
    console.log(`Found ${customerCount} customers`);
    
    console.log('Counting bookings...');
    const bookingCount = await Booking.countDocuments();
    console.log(`Found ${bookingCount} bookings`);
    
    console.log('Fetching sample customers...');
    const customersWithBookings = await Customer.find({}, { name: 1, email: 1, totalBookings: 1 }).limit(5);
    
    console.log('\n✅ IMPORT RESULTS:');
    console.log(`📊 Total Customers: ${customerCount}`);
    console.log(`📖 Total Bookings: ${bookingCount}`);
    console.log('\n📋 Sample Customers:');
    customersWithBookings.forEach(c => {
      console.log(`  - ${c.name} (${c.email}) - ${c.totalBookings} bookings`);
    });
    
    await mongoose.disconnect();
    console.log('Done!');
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

checkResults();
