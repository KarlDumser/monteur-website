import express from 'express';
import Booking from '../models/Booking.js';
import BlockedDate from '../models/BlockedDate.js';
import Customer from '../models/Customer.js';
import { findOrCreateCustomerFromBooking } from '../services/customerService.js';
import { generateInvoice } from '../services/invoiceGenerator.js';
import { sendBookingConfirmation } from '../services/emailService.js';

const router = express.Router();

// Bot Control via HTTP (via Cloudflare Tunnel)
const BOT_CONTROL_URL = process.env.BOT_CONTROL_URL || '';
const BOT_CONTROL_TOKEN = process.env.BOT_CONTROL_TOKEN || '';

// Log config on startup
if (process.env.NODE_ENV === 'production') {
  console.log('🤖 Bot Control Configuration:');
  console.log('  URL:', BOT_CONTROL_URL ? '✓ gesetzt' : '✗ NICHT gesetzt');
  console.log('  Token:', BOT_CONTROL_TOKEN ? '✓ gesetzt' : '✗ NICHT gesetzt');
}

/**
 * Sendet HTTP-Request an Bot Control Server auf dem Raspberry Pi
 */
const botControlRequest = async (endpoint, method = 'GET', timeoutMs = 10000) => {
  if (!BOT_CONTROL_URL) {
    const err = new Error('BOT_CONTROL_URL nicht konfiguriert. Setze die ENV Variable in Railway.');
    console.error('❌ Bot Control ERROR:', err.message);
    throw err;
  }
  
  if (!BOT_CONTROL_TOKEN) {
    const err = new Error('BOT_CONTROL_TOKEN nicht konfiguriert. Setze die ENV Variable in Railway.');
    console.error('❌ Bot Control ERROR:', err.message);
    throw err;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const url = `${BOT_CONTROL_URL}${endpoint}`;
    console.log(`🔌 Bot Request: ${method} ${endpoint}`);
    
    const response = await fetch(url, {
      method,
      headers: {
        'Authorization': `Bearer ${BOT_CONTROL_TOKEN}`,
        'Content-Type': 'application/json'
      },
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`HTTP ${response.status}: ${text}`);
    }

    const data = await response.json();
    console.log(`✓ Bot Response OK`);
    return data;
  } catch (error) {
    clearTimeout(timeout);
    console.error('❌ Bot Request Failed:', error.message);
    if (error.name === 'AbortError') {
      throw new Error('Bot Control Server not reachable (timeout)');
    }
    throw error;
  }
};

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

const addDays = (date, days) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

const buildBlockedDateDeleteFilters = (booking) => {
  const filters = [];

  const pushFilter = (startDate, endDate, reason) => {
    if (!startDate || !endDate) {
      return;
    }

    filters.push({
      wohnung: booking.wohnung,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      reason
    });
  };

  pushFilter(booking.startDate, booking.endDate, 'Buchung');
  pushFilter(addDays(booking.endDate, 1), addDays(booking.endDate, 3), 'Reinigung');

  if (booking.isPartialBooking && booking.paidThroughDate && booking.originalEndDate) {
    const secondPeriodStart = addDays(booking.paidThroughDate, 1);

    pushFilter(secondPeriodStart, booking.originalEndDate, 'Reservierung');
    pushFilter(secondPeriodStart, booking.originalEndDate, 'Buchung');
    pushFilter(addDays(booking.originalEndDate, 1), addDays(booking.originalEndDate, 3), 'Reinigung');
  }

  return filters;
};

// Bot Console: Status abrufen
router.get('/bot-console/status', async (req, res) => {
  try {
    const data = await botControlRequest('/status');
    const info = await botControlRequest('/info');
    
    res.json({
      status: data.status,
      host: info.hostname,
      projectDir: info.log_file,
      service: info.service
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Bot Console: Bot starten
router.post('/bot-console/start', async (req, res) => {
  try {
    const result = await botControlRequest('/start', 'POST');
    const status = await botControlRequest('/status');
    
    res.json({
      ok: result.success,
      status: status.status,
      message: result.message
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Bot Console: Bot stoppen
router.post('/bot-console/stop', async (req, res) => {
  try {
    const result = await botControlRequest('/stop', 'POST');
    const status = await botControlRequest('/status');
    
    res.json({
      ok: result.success,
      status: status.status,
      message: result.message
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Bot Console: Logs abrufen
router.get('/bot-console/logs', async (req, res) => {
  try {
    const rawLines = Number(req.query.lines || 200);
    const lines = Number.isFinite(rawLines) ? Math.max(20, Math.min(500, rawLines)) : 200;
    
    const data = await botControlRequest(`/logs?lines=${lines}`);
    const info = await botControlRequest('/info');
    
    res.json({
      host: info.hostname,
      projectDir: info.log_file,
      lines,
      output: data.logs || ''
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Alle Buchungen abrufen
router.get('/bookings', async (req, res) => {
  try {
    const bookings = await Booking.find({ deletedAt: null }).sort({ createdAt: -1 });
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Neue Buchung erstellen
router.post('/bookings', async (req, res) => {
  try {
    const booking = new Booking(req.body);
    const customer = await findOrCreateCustomerFromBooking(req.body);
    booking.customerId = customer._id;
    await booking.save();

    await BlockedDate.create({
      wohnung: booking.wohnung,
      startDate: booking.startDate,
      endDate: booking.endDate,
      reason: 'Buchung',
      createdBy: booking.email || 'admin'
    });

    if (booking.isPartialBooking && booking.paidThroughDate && booking.originalEndDate) {
      const secondPeriodStart = addDays(booking.paidThroughDate, 1);

      await BlockedDate.create({
        wohnung: booking.wohnung,
        startDate: secondPeriodStart,
        endDate: booking.originalEndDate,
        reason: 'Reservierung',
        createdBy: booking.email || 'admin'
      });

      await BlockedDate.create({
        wohnung: booking.wohnung,
        startDate: addDays(booking.originalEndDate, 1),
        endDate: addDays(booking.originalEndDate, 3),
        reason: 'Reinigung',
        createdBy: 'system-cleaning-buffer'
      });
    } else {
      await BlockedDate.create({
        wohnung: booking.wohnung,
        startDate: addDays(booking.endDate, 1),
        endDate: addDays(booking.endDate, 3),
        reason: 'Reinigung',
        createdBy: 'system-cleaning-buffer'
      });
    }

    res.status(201).json(booking);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Bestehende Buchung manuell einem Kunden zuordnen
router.patch('/bookings/:id/assign-customer', async (req, res) => {
  try {
    const { customerId } = req.body;
    const booking = await Booking.findOne({ _id: req.params.id, deletedAt: null });

    if (!booking) {
      return res.status(404).json({ error: 'Buchung nicht gefunden' });
    }

    if (!customerId) {
      booking.customerId = null;
      booking.updatedAt = new Date();
      await booking.save();
      return res.json(booking);
    }

    const customer = await Customer.findById(customerId);
    if (!customer) {
      return res.status(404).json({ error: 'Kunde nicht gefunden' });
    }

    booking.customerId = customer._id;
    booking.updatedAt = new Date();
    await booking.save();
    res.json(booking);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Alle Buchungen archivieren
router.delete('/bookings', async (req, res) => {
  try {
    const activeBookings = await Booking.find({ deletedAt: null })
      .select('wohnung startDate endDate isPartialBooking paidThroughDate originalEndDate')
      .lean();

    const result = await Booking.updateMany(
      { deletedAt: null },
      { $set: { deletedAt: new Date(), deletedBy: req.adminUser } }
    );

    if (activeBookings.length > 0) {
      const blockQueries = activeBookings.flatMap(buildBlockedDateDeleteFilters);

      if (blockQueries.length > 0) {
        await BlockedDate.deleteMany({
          $or: blockQueries
        });
      }
    }

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

    const blockQueries = buildBlockedDateDeleteFilters(booking);
    if (blockQueries.length > 0) {
      await BlockedDate.deleteMany({
        $or: blockQueries
      });
    }

    res.json({ message: 'Buchung gelöscht' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Buchung als bezahlt markieren (optional mit Zahlungsnachweis)
router.patch('/bookings/:id/mark-paid', async (req, res) => {
  try {
    const booking = await Booking.findOne({ _id: req.params.id, deletedAt: null });

    if (!booking) {
      return res.status(404).json({ error: 'Buchung nicht gefunden' });
    }

    const paymentProof = req.body?.paymentProof;

    if (paymentProof?.dataUrl && !String(paymentProof.dataUrl).startsWith('data:image/')) {
      return res.status(400).json({ error: 'Zahlungsnachweis muss ein Bild sein' });
    }

    booking.paymentStatus = 'paid';
    booking.paidAt = new Date();
    booking.paidBy = req.adminUser;
    booking.updatedAt = new Date();

    if (paymentProof?.dataUrl) {
      booking.paymentProof = {
        fileName: paymentProof.fileName || 'zahlungsnachweis.png',
        mimeType: paymentProof.mimeType || 'image/png',
        dataUrl: paymentProof.dataUrl,
        uploadedAt: new Date(),
        uploadedBy: req.adminUser
      };
    }

    await booking.save();
    res.json(booking);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Buchung als unbezahlt markieren (Rückgängig)
router.patch('/bookings/:id/mark-unpaid', async (req, res) => {
  try {
    const booking = await Booking.findOne({ _id: req.params.id, deletedAt: null });

    if (!booking) {
      return res.status(404).json({ error: 'Buchung nicht gefunden' });
    }

    booking.paymentStatus = 'pending';
    booking.paidAt = null;
    booking.paidBy = null;
    booking.paymentProof = {
      fileName: '',
      mimeType: '',
      dataUrl: '',
      uploadedAt: null,
      uploadedBy: ''
    };
    booking.updatedAt = new Date();

    await booking.save();
    res.json(booking);
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
    
    // Für jede BlockedDate die company Information hinzufügen
    const enrichedDates = await Promise.all(blockedDates.map(async (blocked) => {
      let createdByLabel = 'Privat';
      
      // Wenn createdBy eine Email ist (nicht system), suche die Buchung
      if (blocked.createdBy && 
          !blocked.createdBy.startsWith('system') && 
          blocked.createdBy !== 'admin' &&
          blocked.createdBy.includes('@')) {
        try {
          const booking = await Booking.findOne({ 
            email: blocked.createdBy,
            wohnung: blocked.wohnung,
            startDate: { $lte: blocked.endDate },
            endDate: { $gte: blocked.startDate }
          }).sort({ createdAt: -1 }).limit(1);
          
          if (booking && booking.company) {
            createdByLabel = booking.company;
          }
        } catch (e) {
          console.error('Fehler beim Laden der Booking-Info:', e);
        }
      }
      
      return {
        ...blocked.toObject(),
        createdByLabel
      };
    }));
    
    res.json(enrichedDates);
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
    const paidBookings = await Booking.countDocuments({ paymentStatus: 'paid', deletedAt: null });
    const totalRevenue = await Booking.aggregate([
      { $match: { paymentStatus: 'paid', deletedAt: null } },
      { $group: { _id: null, total: { $sum: '$total' } } }
    ]);
    
    const recentBookings = await Booking.find({ deletedAt: null })
      .sort({ createdAt: -1 })
      .limit(5);
    
    res.json({
      totalBookings,
      paidBookings,
      totalRevenue: totalRevenue[0]?.total || 0,
      recentBookings
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Folgerechnung erstellen für längere Buchungen
router.post('/bookings/:id/create-follow-up-invoice', async (req, res) => {
  try {
    const originalBooking = await Booking.findOne({ _id: req.params.id, deletedAt: null });
    
    if (!originalBooking) {
      return res.status(404).json({ error: 'Buchung nicht gefunden' });
    }

    // Prüfe ob Buchung länger als einen Monat ist
    if (originalBooking.nights < 30) {
      return res.status(400).json({ error: 'Folgerechnung nur möglich bei Buchungen über 30 Tagen' });
    }

    // Berechne neue Daten - für die nächsten 4 Wochen
    const newStartDate = new Date(originalBooking.endDate);
    const newEndDate = new Date(originalBooking.endDate);
    newEndDate.setDate(newEndDate.getDate() + 28); // 4 Wochen = 28 Tage

    // Erstelle neue Buchung mit denselben Daten
    const newBooking = new Booking({
      name: originalBooking.name,
      email: originalBooking.email,
      phone: originalBooking.phone,
      company: originalBooking.company,
      street: originalBooking.street,
      zip: originalBooking.zip,
      city: originalBooking.city,
      wohnung: originalBooking.wohnung,
      wohnungLabel: originalBooking.wohnungLabel,
      startDate: newStartDate,
      endDate: newEndDate,
      nights: 28,
      people: originalBooking.people,
      pricePerNight: originalBooking.pricePerNight,
      cleaningFee: originalBooking.cleaningFee,
      subtotal: originalBooking.pricePerNight * 28,
      discount: 0,
      vat: (originalBooking.pricePerNight * 28) * 0.19, // 19% MwSt
      total: (originalBooking.pricePerNight * 28) * 1.19,
      checkInTime: originalBooking.checkInTime,
      checkOutTime: originalBooking.checkOutTime,
      paymentStatus: 'pending',
      bookingStatus: 'confirmed'
    });

    await newBooking.save();

    res.status(201).json({
      message: 'Folgerechnung erfolgreich erstellt',
      booking: newBooking
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============== KUNDEN-MANAGEMENT ==============

// Alle Kunden abrufen
router.get('/customers', async (req, res) => {
  try {
    const customers = await Customer.find({ isActive: true }).sort({ name: 1 });
    
    // Statistiken für jeden Kunden berechnen
    for (const customer of customers) {
      if (!customer.customerNumber) {
        await customer.save();
      }

      const bookings = await Booking.find({ customerId: customer._id, deletedAt: null });
      customer.totalBookings = bookings.length;
      customer.totalNights = bookings.reduce((sum, b) => sum + (b.nights || 0), 0);
      customer.totalRevenue = bookings.reduce((sum, b) => sum + (b.total || 0), 0);
    }
    
    res.json(customers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Kunden erstellen
router.post('/customers', async (req, res) => {
  try {
    const customer = new Customer(req.body);
    await customer.save();
    res.status(201).json(customer);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Kunde aktualisieren
router.put('/customers/:id', async (req, res) => {
  try {
    const customer = await Customer.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: new Date() },
      { new: true, runValidators: true }
    );
    
    if (!customer) {
      return res.status(404).json({ error: 'Kunde nicht gefunden' });
    }
    
    res.json(customer);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Kunde deaktivieren
router.delete('/customers/:id', async (req, res) => {
  try {
    const customer = await Customer.findByIdAndDelete(req.params.id);
    
    if (!customer) {
      return res.status(404).json({ error: 'Kunde nicht gefunden' });
    }

    await Booking.updateMany(
      { customerId: customer._id },
      { $set: { customerId: null, updatedAt: new Date() } }
    );
    
    res.json({ message: 'Kunde gelöscht' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Kunde mit allen Buchungen abrufen
router.get('/customers/:id/bookings', async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    
    if (!customer) {
      return res.status(404).json({ error: 'Kunde nicht gefunden' });
    }
    
    const bookings = await Booking.find({ 
      customerId: req.params.id,
      deletedAt: null 
    }).sort({ startDate: -1 });
    
    res.json({
      customer,
      bookings
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Buchungsbestätigung Email mit Rechnung versenden
router.post('/bookings/:id/send-confirmation', async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ error: 'Buchung nicht gefunden' });
    }

    console.log('\n📧 ADMIN: Starte Buchungsbestätigung Email-Versand');
    console.log('   Buchung ID:', booking._id);
    console.log('   Kunde:', booking.name);
    console.log('   Email:', booking.email);

    // Versende Email mit Rechnung im Hintergrund
    const result = await sendBookingConfirmation(booking, 'confirmation');

    if (result.status === 'sent') {
      console.log('✅ Buchungsbestätigung erfolgreich versendet');
      return res.json({ 
        success: true, 
        message: '✅ Buchungsbestätigung erfolgreich an ' + booking.email + ' versendet!',
        result 
      });
    } else if (result.status === 'skipped') {
      console.warn('⚠️ Email-Versand übersprungen:', result.reason);
      return res.status(500).json({ 
        error: 'Email-Versand nicht konfiguriert: ' + (result.reason || result.details),
        result
      });
    } else {
      console.error('❌ Email-Versand fehlgeschlagen:', result);
      return res.status(500).json({ 
        error: 'Fehler beim Email-Versand: ' + (result.error || 'Unbekannter Fehler'),
        result
      });
    }
  } catch (error) {
    console.error('❌ FEHLER beim Send-Confirmation:', error.message);
    res.status(500).json({ error: error.message });
  }
});

export default router;

