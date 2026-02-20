import express from 'express';
import Stripe from 'stripe';
import Booking from '../models/Booking.js';
import { sendBookingConfirmation } from '../services/emailService.js';

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


// Payment Intent erstellen
router.post('/payment', async (req, res) => {
  try {
    const { bookingData, amount } = req.body;
    if (!stripe) {
      return res.status(500).json({ error: 'Stripe nicht konfiguriert' });
    }
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: 'eur',
      metadata: {
        wohnung: bookingData.wohnung,
        email: bookingData.email,
        name: bookingData.name,
        company: bookingData.company
      },
      automatic_payment_methods: {
        enabled: true
      }
    });
    console.log('✅ Payment Intent erstellt:', paymentIntent.id);
    // Push-Benachrichtigung (nur Demo, echte Integration ggf. nach erfolgreicher Zahlung)
    try {
      const { sendPushNotification } = await import('../services/pushService.js');
      await sendPushNotification(
        'Neue Buchung bezahlt',
        `Wohnung: ${bookingData.wohnung}\nName: ${bookingData.name}\nFirma: ${bookingData.company}\nZeitraum: ${bookingData.startDate} - ${bookingData.endDate}\nBetrag: ${amount / 100} €`,
        bookingData
      );
    } catch (pushError) {
      console.error('❌ Push-Benachrichtigung fehlgeschlagen:', pushError);
    }
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
    
    // Sende Push-Benachrichtigung im Hintergrund
    try {
      const { sendPushNotification } = await import('../services/pushService.js');
      await sendPushNotification(
        'Neue Buchung bezahlt',
        `Wohnung: ${booking.property}\nZeitraum: ${booking.startDate.toLocaleDateString()} bis ${booking.endDate.toLocaleDateString()}\nName: ${booking.name}\nBetrag: ${booking.amount} €`,
        { bookingId: booking._id }
      );
    } catch (pushError) {
      console.error('❌ Push-Benachrichtigung fehlgeschlagen:', pushError);
    }

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
