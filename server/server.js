import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Stripe from 'stripe';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const app = express();

// Stripe nur initialisieren wenn Key vorhanden
let stripe = null;
if (process.env.STRIPE_SECRET_KEY && process.env.STRIPE_SECRET_KEY !== 'sk_test_PLACEHOLDER') {
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  console.log('✅ Stripe initialisiert');
} else {
  console.log('⚠️  Stripe nicht konfiguriert (STRIPE_SECRET_KEY fehlt)');
}

// Middleware
app.use(cors());
app.use(express.json());

// Health check ZUERST (vor MongoDB)
app.get('/api/health', (req, res) => {
  const mongoStatus = mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected';
  res.json({ 
    status: 'OK', 
    message: 'Server läuft',
    mongodb: mongoStatus
  });
});

// Routes
import bookingRoutes from './routes/bookings.js';
import adminRoutes from './routes/admin.js';
import paymentRoutes from './routes/payment.js';

app.use('/api/bookings', bookingRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/payment', paymentRoutes);

// Serve Frontend (Production)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.join(__dirname, '../dist');

// Static files
app.use(express.static(distPath));

// SPA Fallback - Alle nicht-API-Routes zum Frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

const PORT = process.env.PORT || 3001;

// Server starten BEVOR MongoDB verbindet
const server = app.listen(PORT, () => {
  console.log(`🚀 Server läuft auf Port ${PORT}`);
  console.log(`📡 API erreichbar unter http://localhost:${PORT}/api/health`);
  
  // MongoDB NACH Server-Start verbinden
  mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/monteur-website', {
    serverSelectionTimeoutMS: 5000
  })
  .then(() => console.log('✅ MongoDB verbunden'))
  .catch(err => {
    console.error('❌ MongoDB Verbindungsfehler:', err.message);
    console.log('⚠️  Server läuft trotzdem weiter (ohne Datenbank)');
  });
});

export default server;
