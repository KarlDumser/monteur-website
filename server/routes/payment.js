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

// Create Payment Intent
router.post('/create-payment-intent', async (req, res) => {
  try {
    const { amount, bookingData } = req.body;
    
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
    
    res.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Confirm Payment
router.post('/confirm-payment', async (req, res) => {
  try {
    const { paymentIntentId, bookingData } = req.body;
    
    // Verifiziere Payment Intent
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    
    if (paymentIntent.status !== 'succeeded') {
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
    
    // Sende Bestätigungs-E-Mail mit Rechnung
    await sendBookingConfirmation(booking);
    
    res.json({ 
      success: true, 
      booking,
      message: 'Buchung erfolgreich erstellt' 
    });
  } catch (error) {
    console.error('Payment confirmation error:', error);
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
