import express from 'express';
import Stripe from 'stripe';
import Booking from '../models/Booking.js';
import { sendBookingConfirmation } from '../utils/emailService.js';

const router = express.Router();

// Stripe nur initialisieren wenn Key vorhanden
let stripe = null;
if (process.env.STRIPE_SECRET_KEY && process.env.STRIPE_SECRET_KEY !== 'sk_test_PLACEHOLDER') {
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
} else {
  console.warn('⚠️  Stripe nicht konfiguriert - Payment-Endpoints funktionieren nicht');
}

// Get Stripe Public Key (für Frontend)
router.get('/config', (req, res) => {
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
    if (!stripe) {
      return res.status(500).json({ error: 'Stripe nicht konfiguriert' });
    }
    
    const { paymentIntentId, bookingData } = req.body;
    
    console.log('✔️ Verifiziere Payment Intent:', paymentIntentId);
    
    // Verifiziere Payment Intent
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    
    if (paymentIntent.status !== 'succeeded') {
      console.error('❌ Zahlung nicht erfolgreich:', paymentIntent.status);
      return res.status(400).json({ error: 'Zahlung nicht erfolgreich' });
    }
    
    // Erstelle Buchung in Datenbank
    const booking = new Booking({
      ...bookingData,
      paymentStatus: 'paid',
      stripePaymentIntentId: paymentIntentId,
      stripePaymentId: paymentIntent.id,
      bookingStatus: 'confirmed'
    });
    
    await booking.save();
    console.log('✅ Buchung gespeichert:', booking._id);
    
    // Sende Bestätigungs-E-Mail mit Rechnung (optional - schlägt nicht fehl wenn Email nicht konfiguriert)
    try {
      await sendBookingConfirmation(booking);
      console.log('📧 Bestätigungs-E-Mail gesendet');
    } catch (emailError) {
      console.warn('⚠️ Email konnte nicht gesendet werden:', emailError.message);
      console.warn('⚠️ Buchung wurde trotzdem gespeichert');
    }
    
    res.json({ 
      success: true, 
      booking,
      message: 'Buchung erfolgreich erstellt' 
    });
  } catch (error) {
    console.error('❌ Payment confirmation error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Webhook für Stripe Events
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
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
