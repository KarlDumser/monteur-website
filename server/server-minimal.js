import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Backend läuft!',
    timestamp: new Date().toISOString()
  });
});

// Mock-Endpoint für Verfügbarkeit (ohne Datenbank)
app.post('/api/bookings/check-availability', (req, res) => {
  // Temporär: Immer verfügbar zurückgeben
  res.json({ 
    available: true,
    message: 'Verfügbarkeitsprüfung aktiv (ohne Datenbank)'
  });
});

// Mock-Endpoint für Payment Intent (ohne Stripe)
app.post('/api/payment/create-payment-intent', (req, res) => {
  const { amount } = req.body;
  res.json({
    clientSecret: 'test_mock_secret_' + Date.now(),
    message: 'Demo-Modus: Konfiguriere Stripe in .env für echte Zahlungen'
  });
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log('');
  console.log('🚀 ========================================');
  console.log(`✅ Backend läuft auf http://localhost:${PORT}`);
  console.log(`📡 Health Check: http://localhost:${PORT}/api/health`);
  console.log('🚀 ========================================');
  console.log('');
  console.log('⚠️  DEMO-MODUS:');
  console.log('   - Datenbank: Nicht verbunden');
  console.log('   - Stripe: Nicht konfiguriert');
  console.log('   - Email: Nicht konfiguriert');
  console.log('');
  console.log('📝 Konfiguriere .env für volle Funktionalität');
  console.log('');
});
