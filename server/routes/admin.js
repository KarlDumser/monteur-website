import express from 'express';
import Booking from '../models/Booking.js';
import BlockedDate from '../models/BlockedDate.js';

const router = express.Router();

const requireAdminAuth = (req, res, next) => {
  const expectedUser = process.env.ADMIN_USER;
  const expectedPass = process.env.ADMIN_PASS;

  if (!expectedUser || !expectedPass) {
    return res.status(500).json({ error: 'Admin auth not configured' });
  }

  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Basic ')) {
    res.set('WWW-Authenticate', 'Basic realm="Admin"');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const encoded = authHeader.slice('Basic '.length);
  const decoded = Buffer.from(encoded, 'base64').toString('utf-8');
  const [user, pass] = decoded.split(':');

  if (user !== expectedUser || pass !== expectedPass) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  req.adminUser = user;
  return next();
};

router.use(requireAdminAuth);

// Alle Buchungen abrufen
router.get('/bookings', async (req, res) => {
  try {
    const bookings = await Booking.find({ deletedAt: null }).sort({ createdAt: -1 });
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Alle Buchungen archivieren
router.delete('/bookings', async (req, res) => {
  try {
    const result = await Booking.updateMany(
      { deletedAt: null },
      { $set: { deletedAt: new Date(), deletedBy: req.adminUser } }
    );
    res.json({ archivedCount: result.modifiedCount });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Einzelne Buchung archivieren
router.delete('/bookings/:id', async (req, res) => {
  try {
    const booking = await Booking.findOneAndUpdate(
      { _id: req.params.id, deletedAt: null },
      { $set: { deletedAt: new Date(), deletedBy: req.adminUser } },
      { new: true }
    );
    if (!booking) {
      return res.status(404).json({ error: 'Buchung nicht gefunden' });
    }
    res.json({ message: 'Buchung archiviert' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Archivierte Buchungen abrufen
router.get('/deleted-bookings', async (req, res) => {
  try {
    const bookings = await Booking.find({ deletedAt: { $ne: null } }).sort({ deletedAt: -1 });
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Archivierte Buchung permanent loeschen
router.delete('/deleted-bookings/:id', async (req, res) => {
  try {
    const booking = await Booking.findOneAndDelete({ _id: req.params.id, deletedAt: { $ne: null } });
    if (!booking) {
      return res.status(404).json({ error: 'Buchung nicht gefunden' });
    }
    res.json({ message: 'Buchung permanent geloescht' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Archivierte Buchung wiederherstellen
router.patch('/deleted-bookings/:id/restore', async (req, res) => {
  try {
    const booking = await Booking.findOneAndUpdate(
      { _id: req.params.id, deletedAt: { $ne: null } },
      { $set: { deletedAt: null }, $unset: { deletedBy: '' } },
      { new: true }
    );
    if (!booking) {
      return res.status(404).json({ error: 'Buchung nicht gefunden' });
    }
    res.json({ message: 'Buchung wiederhergestellt' });
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
      bookingStatus: { $ne: 'cancelled' },
      deletedAt: null
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
    const totalBookings = await Booking.countDocuments({ deletedAt: null });
    const confirmedBookings = await Booking.countDocuments({ bookingStatus: 'confirmed', deletedAt: null });
    const totalRevenue = await Booking.aggregate([
      { $match: { paymentStatus: 'paid', deletedAt: null } },
      { $group: { _id: null, total: { $sum: '$total' } } }
    ]);
    
    const recentBookings = await Booking.find({ deletedAt: null })
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
