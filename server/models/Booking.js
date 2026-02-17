import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema({
  // Gästedaten
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  
  // Firmendaten (für Rechnung)
  company: { type: String, required: true },
  street: { type: String, required: true },
  zip: { type: String, required: true },
  city: { type: String, required: true },
  
  // Buchungsdetails
  wohnung: { type: String, required: true, enum: ['neubau', 'hackerberg'] },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  nights: { type: Number, required: true },
  people: { type: Number, required: true },
  
  // Preisdetails
  pricePerNight: { type: Number, required: true },
  subtotal: { type: Number, required: true },
  discount: { type: Number, default: 0 },
  vat: { type: Number, required: true },
  total: { type: Number, required: true },
  
  // Zahlungsinformationen
  paymentStatus: { 
    type: String, 
    enum: ['pending', 'paid', 'failed', 'refunded'], 
    default: 'pending' 
  },
  stripePaymentIntentId: String,
  stripePaymentId: String,
  
  // Status
  bookingStatus: {
    type: String,
    enum: ['confirmed', 'cancelled', 'completed'],
    default: 'confirmed'
  },
  
  // Check-in/Check-out Zeiten
  checkInTime: { type: String, default: '15:00' },
  checkOutTime: { type: String, default: '10:00' },
  
  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Index für schnelle Abfragen
bookingSchema.index({ wohnung: 1, startDate: 1, endDate: 1 });
bookingSchema.index({ email: 1 });

export default mongoose.model('Booking', bookingSchema);
