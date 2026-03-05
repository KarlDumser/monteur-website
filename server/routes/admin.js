import express from 'express';
import { spawn } from 'child_process';
import Booking from '../models/Booking.js';
import BlockedDate from '../models/BlockedDate.js';
import Customer from '../models/Customer.js';
import { findOrCreateCustomerFromBooking } from '../services/customerService.js';

const router = express.Router();

const BOT_SSH_HOST = process.env.BOT_SSH_HOST || 'raspberrypi.tailccc131.ts.net';
const BOT_SSH_USER = process.env.BOT_SSH_USER || '';
const BOT_SSH_PORT = process.env.BOT_SSH_PORT || '22';
const BOT_SSH_KEY_PATH = process.env.BOT_SSH_KEY_PATH || '';
const BOT_PROJECT_DIR = process.env.BOT_PROJECT_DIR || '/home/pi/Projekt-Automatisierung-Kunden';
const BOT_SYSTEMD_SERVICE = process.env.BOT_SYSTEMD_SERVICE || '';

const isSafeServiceName = (value) => /^[a-zA-Z0-9._@-]+$/.test(value || '');

const runSshCommand = (remoteCommand, timeoutMs = 20000) =>
  new Promise((resolve, reject) => {
    if (!BOT_SSH_HOST || !BOT_SSH_USER) {
      reject(new Error('BOT_SSH_HOST/BOT_SSH_USER nicht konfiguriert'));
      return;
    }

    const args = [
      '-p',
      String(BOT_SSH_PORT),
      '-o',
      'BatchMode=yes',
      '-o',
      'StrictHostKeyChecking=accept-new'
    ];

    if (BOT_SSH_KEY_PATH) {
      args.push('-i', BOT_SSH_KEY_PATH);
    }

    args.push(`${BOT_SSH_USER}@${BOT_SSH_HOST}`, remoteCommand);

    const child = spawn('ssh', args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';

    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error('SSH timeout'));
    }, timeoutMs);

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });

    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({ code, stdout: stdout.trim(), stderr: stderr.trim() });
    });
  });

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

router.get('/bot-console/status', async (req, res) => {
  try {
    if (!BOT_SYSTEMD_SERVICE || !isSafeServiceName(BOT_SYSTEMD_SERVICE)) {
      return res.status(500).json({ error: 'BOT_SYSTEMD_SERVICE nicht konfiguriert' });
    }

    const result = await runSshCommand(`systemctl is-active ${BOT_SYSTEMD_SERVICE}`, 10000);
    const status = result.stdout || 'unknown';

    res.json({
      status,
      host: BOT_SSH_HOST,
      projectDir: BOT_PROJECT_DIR,
      service: BOT_SYSTEMD_SERVICE
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/bot-console/start', async (req, res) => {
  try {
    if (!BOT_SYSTEMD_SERVICE || !isSafeServiceName(BOT_SYSTEMD_SERVICE)) {
      return res.status(500).json({ error: 'BOT_SYSTEMD_SERVICE nicht konfiguriert' });
    }

    const startResult = await runSshCommand(`sudo systemctl start ${BOT_SYSTEMD_SERVICE}`, 20000);
    const statusResult = await runSshCommand(`systemctl is-active ${BOT_SYSTEMD_SERVICE}`, 10000);

    res.json({
      ok: startResult.code === 0,
      status: statusResult.stdout || 'unknown',
      stderr: startResult.stderr || null
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/bot-console/stop', async (req, res) => {
  try {
    if (!BOT_SYSTEMD_SERVICE || !isSafeServiceName(BOT_SYSTEMD_SERVICE)) {
      return res.status(500).json({ error: 'BOT_SYSTEMD_SERVICE nicht konfiguriert' });
    }

    const stopResult = await runSshCommand(`sudo systemctl stop ${BOT_SYSTEMD_SERVICE}`, 20000);
    const statusResult = await runSshCommand(`systemctl is-active ${BOT_SYSTEMD_SERVICE}`, 10000);

    res.json({
      ok: stopResult.code === 0,
      status: statusResult.stdout || 'unknown',
      stderr: stopResult.stderr || null
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/bot-console/logs', async (req, res) => {
  try {
    const rawLines = Number(req.query.lines || 200);
    const lines = Number.isFinite(rawLines) ? Math.max(20, Math.min(500, rawLines)) : 200;
    const safeProjectDir = BOT_PROJECT_DIR.replace(/"/g, '\\"');
    const command = `cd "${safeProjectDir}" && (tail -n ${lines} log.txt 2>/dev/null || journalctl -n ${lines} --no-pager)`;
    const result = await runSshCommand(command, 15000);

    res.json({
      host: BOT_SSH_HOST,
      projectDir: BOT_PROJECT_DIR,
      lines,
      output: result.stdout || result.stderr || ''
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
    const activeBookings = await Booking.find({ deletedAt: null }).select('wohnung startDate endDate').lean();

    const result = await Booking.updateMany(
      { deletedAt: null },
      { $set: { deletedAt: new Date(), deletedBy: req.adminUser } }
    );

    if (activeBookings.length > 0) {
      const blockQueries = activeBookings.map((booking) => ({
        wohnung: booking.wohnung,
        startDate: booking.startDate,
        endDate: booking.endDate,
        reason: 'Buchung'
      }));

      await BlockedDate.deleteMany({
        $or: blockQueries
      });
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

    await BlockedDate.deleteMany({
      wohnung: booking.wohnung,
      startDate: booking.startDate,
      endDate: booking.endDate,
      reason: 'Buchung'
    });

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

export default router;

