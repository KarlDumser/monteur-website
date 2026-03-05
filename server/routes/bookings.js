// Rechnung als PDF generieren und zum Download bereitstellen
import express from 'express';
import Booking from '../models/Booking.js';
import BlockedDate from '../models/BlockedDate.js';
import { generateInvoice } from '../services/invoiceGenerator.js';
import { sendBookingConfirmation } from '../services/emailService.js';
import { findOrCreateCustomerFromBooking } from '../services/customerService.js';

const router = express.Router();

const addDays = (date, days) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

const isAdminRequest = (req) => {
  const expectedUser = process.env.ADMIN_USER;
  const expectedPass = process.env.ADMIN_PASS;
  const authHeader = req.headers.authorization || '';

  if (!expectedUser || !expectedPass || !authHeader.startsWith('Basic ')) {
    return false;
  }

  try {
    const encoded = authHeader.slice('Basic '.length);
    const decoded = Buffer.from(encoded, 'base64').toString('utf-8');
    const [user, pass] = decoded.split(':');
    return user === expectedUser && pass === expectedPass;
  } catch {
    return false;
  }
};

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
    const adminRequest = isAdminRequest(req);

    if (req.body.paymentMethod && req.body.paymentMethod !== 'invoice') {
      return res.status(400).json({ error: 'Nur Zahlung auf Rechnung ist aktuell verfügbar.' });
    }

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

    if (!adminRequest) {
      const overlappingBlockedDate = await BlockedDate.findOne({
        wohnung,
        $or: [
          { startDate: { $lte: end }, endDate: { $gte: start } }
        ]
      });

      if (overlappingBlockedDate) {
        return res.status(409).json({ error: 'Für diesen Zeitraum ist die Wohnung nicht verfügbar (inkl. Reinigungszeit).' });
      }
    }

    const booking = new Booking({
      ...req.body,
      paymentMethod: 'invoice',
      paymentStatus: req.body.paymentStatus === 'paid' ? 'pending' : (req.body.paymentStatus || 'pending')
    });

    const customer = await findOrCreateCustomerFromBooking(req.body);
    booking.customerId = customer._id;

    await booking.save();

    // Zeitraum für die Wohnung blockieren
    try {
      const BlockedDate = (await import('../models/BlockedDate.js')).default;
      
      if (booking.isPartialBooking) {
        // Bei Teilbuchung: zwei Blockierungen erstellen
        // 1. Bezahlter Zeitraum als "Buchung"
        await BlockedDate.create({
          wohnung: booking.wohnung,
          startDate: booking.startDate,
          endDate: booking.paidThroughDate,
          reason: 'Buchung',
          createdBy: booking.email || 'system'
        });
        
        // 2. Reservierter aber noch nicht bezahlter Zeitraum als "Reservierung"
        const reservationStart = addDays(new Date(booking.paidThroughDate), 1);
        await BlockedDate.create({
          wohnung: booking.wohnung,
          startDate: reservationStart,
          endDate: booking.originalEndDate,
          reason: 'Reservierung',
          createdBy: booking.email || 'system'
        });
        
        // Reinigungspuffer am Ende des GESAMTEN Zeitraums
        if (!adminRequest) {
          await BlockedDate.create({
            wohnung: booking.wohnung,
            startDate: addDays(new Date(booking.originalEndDate), 1),
            endDate: addDays(new Date(booking.originalEndDate), 3),
            reason: 'Reinigung',
            createdBy: 'system-cleaning-buffer'
          });
        }
      } else {
        // Standard-Buchung: ein Eintrag
        await BlockedDate.create({
          wohnung: booking.wohnung,
          startDate: booking.startDate,
          endDate: booking.endDate,
          reason: 'Buchung',
          createdBy: booking.email || 'system'
        });

        if (!adminRequest) {
          await BlockedDate.create({
            wohnung: booking.wohnung,
            startDate: addDays(booking.endDate, 1),
            endDate: addDays(booking.endDate, 3),
            reason: 'Reinigung',
            createdBy: 'system-cleaning-buffer'
          });
        }
      }
    } catch (blockError) {
      console.error('❌ Fehler beim Blockieren des Zeitraums:', blockError);
    }

    // Versende Email im Hintergrund (nicht-blockierend)
    // Damit die Buchung nicht von Email-Problemen blockiert wird
    console.log('\n🎯 NEUE BUCHUNG ERSTELLT - ID:', booking._id);
    console.log('   Kunde:', booking.name);
    console.log('   Email:', booking.email);
    console.log('   Wohnung:', booking.wohnung);
    console.log('   Betrag:', booking.total, '€');
    
    console.log('\n📧 Starte Email-Versand im Hintergrund...');
    sendBookingConfirmation(booking, 'confirmation')
      .then(result => {
        console.log('\n📬 HINTERGRUND-EMAIL-RESULT:');
        console.log('   Status:', result.status);
        if (result.status === 'sent') {
          console.log('✅ Bestätigungs-Email erfolgreich versendet');
          console.log('   Message ID:', result.messageId);
        } else {
          console.warn('⚠️ Email-Versand übersprungen/fehlgeschlagen');
          console.warn('   Grund:', result.reason || result.error);
          console.warn('   Details:', result);
        }
        console.log('');
      })
      .catch(err => {
        console.error('❌ FEHLER beim Email-Versand (Hintergrund):');
        console.error('   Message:', err.message);
        console.error('   Stack:', err.stack);
      });

    res.status(201).json(booking);
  } catch (error) {
    console.error('❌ Fehler beim Booking erstellen:', error.message);
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

// Rechnung erneut senden (E-Mail mit Anhang versendet automatisch)
router.post('/:id/send-invoice-email', async (req, res) => {
  try {
    // Prüfe ob SMTP konfiguriert ist
    if (!process.env.SMTP_PASSWORD) {
      console.error('❌ SMTP_PASSWORD nicht konfiguriert!');
      return res.status(500).json({
        success: false,
        message: 'Email-Versand ist nicht konfiguriert. SMTP_PASSWORD fehlt. Kontaktieren Sie den Administrator.',
        error: 'SMTP_PASSWORD missing'
      });
    }

    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ error: 'Buchung nicht gefunden' });
    }

    console.log('📧 Starte E-Mail-Versand für Buchung:', req.params.id);

    // Versende E-Mail mit Rechnung als Anhang
    const emailResult = await sendBookingConfirmation(booking, 'invoice-resend');

    console.log('📧 E-Mail-Ergebnis:', emailResult);

    if (emailResult.status === 'sent') {
      return res.json({
        success: true,
        message: 'Rechnung erfolgreich per E-Mail versendet',
        messageId: emailResult.messageId
      });
    } else if (emailResult.status === 'skipped') {
      return res.status(500).json({
        success: false,
        message: `Email konnte nicht versendet werden: ${emailResult.reason || emailResult.error}`,
        error: emailResult.reason
      });
    } else {
      return res.status(400).json({
        success: false,
        message: 'Fehler beim Versenden der E-Mail',
        error: emailResult.error
      });
    }
  } catch (error) {
    console.error('❌ Fehler beim E-Mail-Versand:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Versenden der E-Mail: ' + error.message,
      error: error.message
    });
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
