#!/usr/bin/env node

console.log("Step 1: Starting import/database verification");

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();
console.log("Step 2: dotenv configured");
console.log("Step 3: MONGODB_URI present:", !!process.env.MONGODB_URI);

const customerSchema = new mongoose.Schema({}, { strict: false });
const bookingSchema = new mongoose.Schema({}, { strict: false });

const Customer = mongoose.model('Customer', customerSchema);
const Booking = mongoose.model('Booking', bookingSchema);

console.log("Step 4: Models created");

async function checkDB() {
  console.log("Step 5: Connecting to MongoDB...");
  
  try {
    await mongoose.connect(process.env.MONGODB_URI, { 
      serverSelectionTimeoutMS: 3000,
      socketTimeoutMS: 3000
    });
    console.log("✅ Step 6: Connected to MongoDB!");
    
    console.log("Step 7: Counting customers...");
    const c = await Customer.countDocuments().maxTimeMS(3000);
    console.log(`✅ Total Customers: ${c}`);
    
    console.log("Step 8: Counting bookings...");
    const b = await Booking.countDocuments().maxTimeMS(3000);
    console.log(`✅ Total Bookings: ${b}`);
    
    await mongoose.disconnect();
    console.log("✅ Done!");
    process.exit(0);
  } catch (err) {
    console.error("❌ Error:", err.message);
    process.exit(1);
  }
}

checkDB();
