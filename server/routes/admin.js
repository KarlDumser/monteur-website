import express from 'express';
import Booking from '../models/Booking.js';
import BlockedDate from '../models/BlockedDate.js';

const router = express.Router();

// Alle Buchungen abrufen
router.get('/bookings', async (req, res) => {
  try {
    const bookings = await Booking.find().sort({ createdAt: -1 });
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Alle Buchungen loeschen
router.delete('/bookings', async (req, res) => {
  try {
    const result = await Booking.deleteMany({});
    res.json({ deletedCount: result.deletedCount });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Blockierte Zeiten abrufen
router.get('/blocked-dates', async (req, res) => {
  try {
    const blockedDates = await BlockedDate.find().sort({ startDate: 1 });
    res.json(blockedDates);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Zeit blockieren
router.post('/block-dates', async (req, res) => {
  try {
    const { wohnung, startDate, endDate, reason } = req.body;
    
    const blockedDate = new BlockedDate({
      wohnung,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      reason
    });
    
    await blockedDate.save();
    res.status(201).json(blockedDate);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Blockierung entfernen
router.delete('/blocked-dates/:id', async (req, res) => {
  try {
    const blockedDate = await BlockedDate.findByIdAndDelete(req.params.id);
    
    if (!blockedDate) {
      return res.status(404).json({ error: 'Blockierung nicht gefunden' });
    }
    
    res.json({ message: 'Blockierung erfolgreich entfernt' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Kalenderansicht - Alle belegten Zeiten
router.get('/calendar', async (req, res) => {
  try {
    const { wohnung, year, month } = req.query;
    
    // Datum-Range für den Monat berechnen
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);
    
    const query = {
      startDate: { $lte: endDate },
      endDate: { $gte: startDate }
    };
    
    if (wohnung) {
      query.wohnung = wohnung;
    }
    
    // Buchungen abrufen
    const bookings = await Booking.find({
      ...query,
      bookingStatus: { $ne: 'cancelled' }
    });
    
    // Blockierte Zeiten abrufen
    const blockedDates = await BlockedDate.find(wohnung ? { ...query, wohnung } : query);
    
    res.json({
      bookings,
      blockedDates
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Statistiken
router.get('/statistics', async (req, res) => {
  try {
    const totalBookings = await Booking.countDocuments();
    const confirmedBookings = await Booking.countDocuments({ bookingStatus: 'confirmed' });
    const totalRevenue = await Booking.aggregate([
      { $match: { paymentStatus: 'paid' } },
      { $group: { _id: null, total: { $sum: '$total' } } }
    ]);
    
    const recentBookings = await Booking.find()
      .sort({ createdAt: -1 })
      .limit(5);
    
    res.json({
      totalBookings,
      confirmedBookings,
      totalRevenue: totalRevenue[0]?.total || 0,
      recentBookings
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
