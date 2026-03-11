import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema({
  // Referenz zum Kunden
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', default: null },
  
  // Gästedaten
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  
  // Firmendaten (für Rechnung)
  company: { type: String, required: true },
  vatId: { type: String, default: '' },
  street: { type: String, required: true },
  zip: { type: String, required: true },
  city: { type: String, required: true },
  country: { type: String, default: 'DE' },
  countryLabel: { type: String, default: 'Deutschland' },
  addressLine2: { type: String, default: '' },
  region: { type: String, default: '' },
  
  // Buchungsdetails
  wohnung: { type: String, required: true, enum: ['neubau', 'hackerberg', 'kombi'] },
  wohnungLabel: { type: String },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  nights: { type: Number, required: true },
  people: { type: Number, required: true },
  
  // Teilbuchung / Staffelzahlung (für Buchungen > 28 Tage)
  isPartialBooking: { type: Boolean, default: false },
  originalStartDate: { type: Date, default: null }, // Ursprünglicher Gesamtzeitraum Start
  originalEndDate: { type: Date, default: null },   // Ursprünglicher Gesamtzeitraum Ende
  totalNights: { type: Number, default: null },      // Gesamtnächte (inkl. noch nicht bezahlter)
  paidThroughDate: { type: Date, default: null },    // Bis wann ist bezahlt (= endDate bei erster Teilzahlung)
  isFollowUpInvoice: { type: Boolean, default: false }, // Manuell im Admin erstellte Folgerechnung
  
  // Preisdetails
  pricePerNight: { type: Number, required: true },
  cleaningFee: { type: Number },
  cleaningBufferDays: { type: Number, default: 3 },
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
  paymentMethod: {
    type: String,
    enum: ['invoice', 'stripe'],
    default: 'invoice'
  },
  stripePaymentIntentId: String,
  stripePaymentId: String,
  paidAt: { type: Date, default: null },
  paidBy: { type: String, default: null },
  paymentProof: {
    fileName: { type: String, default: '' },
    mimeType: { type: String, default: '' },
    dataUrl: { type: String, default: '' },
    uploadedAt: { type: Date, default: null },
    uploadedBy: { type: String, default: '' }
  },
  
  // Status
  bookingStatus: {
    type: String,
    enum: ['confirmed', 'cancelled', 'completed'],
    default: 'confirmed'
  },

  // Interne Notizen (für Admin)
  adminNote: { type: String, default: null },

  // Archivierte Buchungen
  deletedAt: { type: Date, default: null },
  deletedBy: { type: String, default: null },
  
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
bookingSchema.index({ deletedAt: 1 });

export default mongoose.model('Booking', bookingSchema);
