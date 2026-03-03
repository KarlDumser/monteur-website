// Rechnung als PDF generieren und zum Download bereitstellen
import express from 'express';
import Booking from '../models/Booking.js';
import BlockedDate from '../models/BlockedDate.js';
import { generateInvoice } from '../services/invoiceGenerator.js';

const router = express.Router();

// Rechnung als PDF generieren und zum Download bereitstellen
router.get('/:id/invoice', async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ error: 'Buchung nicht gefunden' });
    }
    const { buffer, fileName } = await generateInvoice(booking);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

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
    // Prüfe auf Überschneidung mit bestehenden Buchungen
    const { wohnung, startDate, endDate } = req.body;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const overlapping = await Booking.findOne({
      wohnung,
      bookingStatus: { $ne: 'cancelled' },
      deletedAt: null,
      $or: [
        { startDate: { $lte: end }, endDate: { $gte: start } }
      ]
    });
    if (overlapping) {
      return res.status(409).json({ error: 'Für diesen Zeitraum existiert bereits eine Buchung für diese Wohnung.' });
    }

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

    res.status(201).json(booking);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Buchung aktualisieren (Admin)
router.patch('/:id', async (req, res) => {
  try {
    const { _id, createdAt, ...updateData } = req.body;
    const booking = await Booking.findById(req.params.id);
    
    if (!booking) {
      return res.status(404).json({ error: 'Buchung nicht gefunden' });
    }

    // Wenn Daten geändert wurden, auch BlockedDate aktualisieren
    if (
      updateData.startDate && updateData.startDate !== booking.startDate.toISOString().slice(0, 10) ||
      updateData.endDate && updateData.endDate !== booking.endDate.toISOString().slice(0, 10) ||
      updateData.wohnung && updateData.wohnung !== booking.wohnung
    ) {
      try {
        const BlockedDate = (await import('../models/BlockedDate.js')).default;
        await BlockedDate.deleteMany({ 
          wohnung: booking.wohnung,
          startDate: booking.startDate,
          endDate: booking.endDate,
          reason: 'Buchung'
        });
        
        const newStart = new Date(updateData.startDate || booking.startDate);
        const newEnd = new Date(updateData.endDate || booking.endDate);
        await BlockedDate.create({
          wohnung: updateData.wohnung || booking.wohnung,
          startDate: newStart,
          endDate: newEnd,
          reason: 'Buchung',
          createdBy: 'admin'
        });
      } catch (blockError) {
        console.error('Fehler beim Aktualisieren der BlockedDates:', blockError);
      }
    }

    Object.assign(booking, updateData);
    booking.updatedAt = new Date();
    await booking.save();
    
    res.json(booking);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Rechnung erneut senden (Daten für Email-Integration)
router.get('/:id/resend-invoice-data', async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ error: 'Buchung nicht gefunden' });
    }

    // Generiere Rechnung und konvertiere zu Base64
    const { buffer, fileName } = await generateInvoice(booking);
    const base64Invoice = buffer.toString('base64');

    // Template für Email
    const emailTemplate = `Hallo ${booking.name},

anbei erhalten Sie die aktualisierte Rechnung für Ihre Buchung.

Buchungsdetails:
- Wohnung: ${booking.wohnungLabel || booking.wohnung}
- Zeitraum: ${new Date(booking.startDate).toLocaleDateString('de-DE')} - ${new Date(booking.endDate).toLocaleDateString('de-DE')}
- Personen: ${booking.people}
- Summe: €${booking.total.toFixed(2)}

Bei Fragen stehen wir gerne zur Verfügung.

Freundliche Grüße
Ihr Monteur-Wohnungen Team`;

    res.json({
      fileName,
      base64Invoice,
      emailTemplate,
      recipientEmail: booking.email,
      recipientName: booking.name
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
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
