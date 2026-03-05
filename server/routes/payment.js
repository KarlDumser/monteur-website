import express from 'express';
import Stripe from 'stripe';
import Booking from '../models/Booking.js';
import { sendBookingConfirmation } from '../services/emailService.js';

const router = express.Router();
const STRIPE_PAYMENT_ENABLED = process.env.ENABLE_STRIPE_PAYMENT === 'true';

// Stripe nur initialisieren wenn Key vorhanden
let stripe = null;
if (process.env.STRIPE_SECRET_KEY && process.env.STRIPE_SECRET_KEY !== 'sk_test_PLACEHOLDER') {
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
} else {
  console.warn('⚠️  Stripe nicht konfiguriert - Payment-Endpoints funktionieren nicht');
}

// Get Stripe Public Key (für Frontend)
router.get('/config', (req, res) => {
  if (!STRIPE_PAYMENT_ENABLED) {
    return res.status(403).json({
      error: 'Stripe-Zahlung ist deaktiviert',
      stripeEnabled: false
    });
  }

  const publishableKey = process.env.STRIPE_PUBLISHABLE_KEY || 'pk_test_51RUCUYR3yx6JeUyEVGnkFwDjOpyyjR6ZgV9zlS1Yi5HYfkACWz0jgC3KdXkBt0gsyW1RiiEornsAe9vLvNCIPYTF00Ijw31Wzh';
  
  console.log('📋 /config aufgerufen');
  console.log('🔑 STRIPE_PUBLISHABLE_KEY env:', process.env.STRIPE_PUBLISHABLE_KEY ? 'exists' : 'MISSING');
  console.log('🔑 Key verwendet:', publishableKey.substring(0, 20) + '...');
  
  if (!publishableKey || publishableKey === 'pk_test_PLACEHOLDER') {
    console.error('❌ Publishable Key Problem!');
    return res.status(500).json({ error: 'Stripe Publishable Key nicht konfiguriert' });
  }
  
  console.log('✅ Sende Publishable Key ans Frontend');
  res.json({ 
    stripePublishableKey: publishableKey 
  });
});

// Create Payment Intent
router.post('/create-payment-intent', async (req, res) => {
  try {
    if (!STRIPE_PAYMENT_ENABLED) {
      return res.status(403).json({ error: 'Stripe-Zahlung ist deaktiviert' });
    }

    if (!stripe) {
      console.error('❌ Stripe nicht konfiguriert - Secret Key:', process.env.STRIPE_SECRET_KEY ? 'existiert' : 'FEHLT');
      return res.status(500).json({ error: 'Stripe nicht konfiguriert. Bitte Secret Key in Umgebungsvariablen setzen.' });
    }
    
    const { amount, bookingData } = req.body;
    
    console.log('💳 Erstelle Payment Intent:', { amount, wohnung: bookingData.wohnung });
    
    // Erstelle Payment Intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Betrag in Cent
      currency: 'eur',
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        wohnung: bookingData.wohnung,
        name: bookingData.name,
        email: bookingData.email,
        startDate: bookingData.startDate,
        endDate: bookingData.endDate
      }
    });
    
    console.log('✅ Payment Intent erstellt:', paymentIntent.id);
    
    res.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id
    });
  } catch (error) {
    console.error('❌ Payment Intent Fehler:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Confirm Payment
router.post('/confirm-payment', async (req, res) => {
  try {
    if (!STRIPE_PAYMENT_ENABLED) {
      return res.status(403).json({ error: 'Stripe-Zahlung ist deaktiviert' });
    }

    if (!stripe) {
      return res.status(500).json({ error: 'Stripe nicht konfiguriert' });
    }
    
    const { paymentIntentId, bookingData, debugEmail } = req.body;
    
    console.log('✔️ Verifiziere Payment Intent:', paymentIntentId);
    
    // Verifiziere Payment Intent
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    
    if (paymentIntent.status !== 'succeeded') {
      console.error('❌ Zahlung nicht erfolgreich:', paymentIntent.status);
      return res.status(400).json({ error: 'Zahlung nicht erfolgreich' });
    }
    
    // Konvertiere deutsche Datumsstrings (DD.MM.YYYY) zu Date Objects
    const parseGermanDate = (dateStr) => {
      if (!dateStr) return null;
      const [day, month, year] = dateStr.split('.');
      const dateObj = new Date(year, month - 1, day); // Month ist 0-indexed
      console.log('🗓️ Parse Date:', dateStr, '→', dateObj);
      return dateObj;
    };
    
    console.log('📦 Booking Data received:', JSON.stringify(bookingData, null, 2));
    
    const parsedStartDate = parseGermanDate(bookingData.startDate);
    const parsedEndDate = parseGermanDate(bookingData.endDate);

    console.log('✅ Parsed dates:', { startDate: parsedStartDate, endDate: parsedEndDate });

    // Mindestbuchungszeit prüfen (mind. 14 Nächte)
    if (!parsedStartDate || !parsedEndDate) {
      return res.status(400).json({ error: 'Ungültige Buchungsdaten: Start- oder Enddatum fehlt.' });
    }
    // Differenz in Tagen berechnen
    const msPerDay = 1000 * 60 * 60 * 24;
    const diffDays = Math.round((parsedEndDate - parsedStartDate) / msPerDay);
    if (diffDays < 14) {
      return res.status(400).json({ error: 'Die Mindestbuchungsdauer beträgt 14 Nächte.' });
    }
    
    // Erstelle Buchung in Datenbank
    const booking = new Booking({
      ...bookingData,
      startDate: parsedStartDate,
      endDate: parsedEndDate,
      paymentStatus: 'paid',
      stripePaymentIntentId: paymentIntentId,
      stripePaymentId: paymentIntent.id,
      bookingStatus: 'confirmed'
    });
    
    await booking.save();
    console.log('✅ Buchung gespeichert:', booking._id);
    
    if (debugEmail) {
      const emailStatus = await sendBookingConfirmation(booking);
      res.json({ 
        success: true, 
        booking,
        message: 'Buchung erfolgreich erstellt',
        emailStatus
      });
    } else {
      // Sende Response SOFORT ans Frontend
      res.json({ 
        success: true, 
        booking,
        message: 'Buchung erfolgreich erstellt' 
      });
      
      // Sende E-Mail im Hintergrund (nicht warten, nicht blockieren)
      sendBookingConfirmation(booking)
        .then(() => console.log('📧 Bestätigungs-E-Mail gesendet'))
        .catch(emailError => console.warn('⚠️ Email konnte nicht gesendet werden:', emailError.message));
    }
  } catch (error) {
    console.error('❌ Payment confirmation error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Webhook für Stripe Events
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  if (!STRIPE_PAYMENT_ENABLED) {
    return res.status(403).json({ error: 'Stripe-Zahlung ist deaktiviert' });
  }

  const sig = req.headers['stripe-signature'];
  
  let event;
  
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  
  // Handle the event
  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object;
      console.log('PaymentIntent was successful!', paymentIntent.id);
      break;
    case 'payment_intent.payment_failed':
      const failedPayment = event.data.object;
      console.log('Payment failed:', failedPayment.id);
      break;
    default:
      console.log(`Unhandled event type ${event.type}`);
  }
  
  res.json({ received: true });
});

export default router;
