import mongoose from 'mongoose';

const blockedDateSchema = new mongoose.Schema({
  wohnung: { 
    type: String, 
    required: true, 
    enum: ['neubau', 'hackerberg'] 
  },
  startDate: { 
    type: Date, 
    required: true 
  },
  endDate: { 
    type: Date, 
    required: true 
  },
  reason: { 
    type: String, 
    default: 'Manuell blockiert' 
  },
  createdBy: {
    type: String,
    default: 'admin'
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

// Index für schnelle Verfügbarkeitsabfragen
blockedDateSchema.index({ wohnung: 1, startDate: 1, endDate: 1 });

export default mongoose.model('BlockedDate', blockedDateSchema);
