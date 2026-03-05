import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const customerSchema = new mongoose.Schema({}, { strict: false });
const bookingSchema = new mongoose.Schema({}, { strict: false });

const Customer = mongoose.model('Customer', customerSchema);
const Booking = mongoose.model('Booking', bookingSchema);

try {
  await mongoose.connect(process.env.MONGODB_URI, { 
    serverSelectionTimeoutMS: 3000
  });
  
  const customers = await Customer.countDocuments();
  const bookings = await Booking.countDocuments();
  
  console.log(`✅ IMPORT SUCCESS!\n   Customers: ${customers}\n   Bookings: ${bookings}`);
  
  await mongoose.disconnect();
  process.exit(0);
} catch (err) {
  console.error('❌ Error:', err.message);
  process.exit(1);
}
