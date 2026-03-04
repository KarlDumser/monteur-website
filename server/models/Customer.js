import mongoose from 'mongoose';

const customerSchema = new mongoose.Schema({
  // Kundenstammdaten
  name: { type: String, required: true }, // Empfängername
  address: { type: String }, // Empfängeradresse
  ustId: { type: String }, // KundenUStID
  contactPerson: { type: String }, // Ansprechpartner
  email: { type: String, required: true },
  phone: { type: String },
  mobile: { type: String }, // Handy
  
  // Notizen & Präferenzen
  notes: { type: String },
  preferredApartment: { type: String, enum: ['neubau', 'hackerberg', 'both', null], default: null },
  
  // Buchungsverlauf (wird automatisch befüllt)
  totalBookings: { type: Number, default: 0 },
  totalNights: { type: Number, default: 0 },
  totalRevenue: { type: Number, default: 0 },
  
  // Status
  isActive: { type: Boolean, default: true },
  
  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Index für schnelle Suche
customerSchema.index({ email: 1 });
customerSchema.index({ name: 1 });

export default mongoose.model('Customer', customerSchema);
