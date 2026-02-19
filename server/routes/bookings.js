import express from 'express';
import Booking from '../models/Booking.js';
import BlockedDate from '../models/BlockedDate.js';

const router = express.Router();

// Verfügbarkeit prüfen
router.post('/check-availability', async (req, res) => {
  try {
    const { startDate, endDate, wohnung } = req.body;
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Prüfe bestehende Buchungen
    const existingBookings = await Booking.find({
      wohnung,
      bookingStatus: { $ne: 'cancelled' },
      deletedAt: null,
      $or: [
        { startDate: { $lte: end }, endDate: { $gte: start } }
      ]
    });
    
    // Prüfe blockierte Zeiten
    const blockedDates = await BlockedDate.find({
      wohnung,
      $or: [
        { startDate: { $lte: end }, endDate: { $gte: start } }
      ]
    });
    
    const isAvailable = existingBookings.length === 0 && blockedDates.length === 0;
    
    res.json({ 
      available: isAvailable,
      conflicts: [...existingBookings, ...blockedDates]
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Alle Buchungen abrufen (für Admin)
router.get('/all', async (req, res) => {
  try {
    const bookings = await Booking.find({ deletedAt: null }).sort({ createdAt: -1 });
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Einzelne Buchung abrufen
router.get('/:id', async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ error: 'Buchung nicht gefunden' });
    }
    res.json(booking);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Neue Buchung erstellen
router.post('/', async (req, res) => {
  try {
    const booking = new Booking(req.body);
    await booking.save();

    // Email-Bestätigung versenden (asynchron, Fehler werden geloggt)
    try {
      const { sendBookingConfirmation } = await import('../services/emailService.js');
      const emailResult = await sendBookingConfirmation(booking);
      console.log('📧 Buchungsbestätigung gesendet:', emailResult);
    } catch (emailError) {
      console.error('❌ Fehler beim Senden der Buchungsbestätigung:', emailError);
    }

    res.status(201).json(booking);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Buchung stornieren
router.patch('/:id/cancel', async (req, res) => {
  try {
    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      { bookingStatus: 'cancelled', updatedAt: new Date() },
      { new: true }
    );
    
    if (!booking) {
      return res.status(404).json({ error: 'Buchung nicht gefunden' });
    }
    
    res.json(booking);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
