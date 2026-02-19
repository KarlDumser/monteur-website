// Blocked periods API (for frontend calendar)
router.get('/blocked', async (req, res) => {
  try {
    const { wohnung } = req.query;
    if (!wohnung) return res.status(400).json({ error: 'wohnung required' });
    // Get all BlockedDates and active bookings for this apartment
    const blocked = await BlockedDate.find({ wohnung });
    const bookings = await Booking.find({ wohnung, bookingStatus: { $ne: 'cancelled' }, deletedAt: null });
    // Merge all periods
    const periods = [
      ...blocked.map(b => ({ start: b.startDate.toISOString().slice(0,10), end: b.endDate.toISOString().slice(0,10) })),
      ...bookings.map(b => ({ start: b.startDate.toISOString().slice(0,10), end: b.endDate.toISOString().slice(0,10) }))
    ];
    res.json({ periods });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
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

    // Zeitraum für die Wohnung blockieren
    try {
      const BlockedDate = (await import('../models/BlockedDate.js')).default;
      await BlockedDate.create({
        wohnung: booking.wohnung,
        startDate: booking.startDate,
        endDate: booking.endDate,
        reason: 'Buchung',
        createdBy: booking.email || 'system'
      });
    } catch (blockError) {
      console.error('❌ Fehler beim Blockieren des Zeitraums:', blockError);
    }

    // Email-Bestätigung asynchron versenden (vorübergehend deaktiviert)
    // (async () => {
    //   try {
    //     const { sendBookingConfirmation } = await import('../services/emailService.js');
    //     const emailResult = await sendBookingConfirmation(booking);
    //     console.log('📧 Buchungsbestätigung gesendet:', emailResult);
    //   } catch (emailError) {
    //     console.error('❌ Fehler beim Senden der Buchungsbestätigung:', emailError);
    //   }
    // })();

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
