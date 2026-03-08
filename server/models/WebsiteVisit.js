import mongoose from 'mongoose';

const websiteVisitSchema = new mongoose.Schema(
  {
    dateKey: { type: String, required: true },
    visitDate: { type: Date, required: true },
    year: { type: Number, required: true },
    month: { type: Number, required: true },
    path: { type: String, required: true, default: '/' },
    visitorHash: { type: String, required: true },
    ipHash: { type: String, default: '' },
    userAgentHash: { type: String, default: '' },
    referrerDomain: { type: String, default: '' },
    views: { type: Number, default: 1 },
    firstSeen: { type: Date, default: Date.now },
    lastSeen: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

websiteVisitSchema.index({ dateKey: 1, visitorHash: 1, path: 1 }, { unique: true });
websiteVisitSchema.index({ visitDate: 1 });
websiteVisitSchema.index({ year: 1, month: 1 });
websiteVisitSchema.index({ visitorHash: 1 });

export default mongoose.model('WebsiteVisit', websiteVisitSchema);
