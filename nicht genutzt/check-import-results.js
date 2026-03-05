const mongoose = require('mongoose');
require('dotenv').config();

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
    await mongoose.connect(process.env.MONGODB_URI);
    
    const customerCount = await Customer.countDocuments();
    const bookingCount = await Booking.countDocuments();
    const customersWithBookings = await Customer.find({}, { name: 1, email: 1, totalBookings: 1 }).limit(5);
    
    console.log('✅ IMPORT RESULTS:');
    console.log(`📊 Total Customers: ${customerCount}`);
    console.log(`📖 Total Bookings: ${bookingCount}`);
    console.log('\n📋 Sample Customers:');
    customersWithBookings.forEach(c => {
      console.log(`  - ${c.name} (${c.email}) - ${c.totalBookings} bookings`);
    });
    
    await mongoose.disconnect();
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

checkResults();
