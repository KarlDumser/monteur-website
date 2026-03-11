import express from 'express';
import Booking from '../models/Booking.js';
import BlockedDate from '../models/BlockedDate.js';
import Customer from '../models/Customer.js';
import WebsiteVisit from '../models/WebsiteVisit.js';
import { findOrCreateCustomerFromBooking } from '../services/customerService.js';
import { generateInvoice } from '../services/invoiceGenerator.js';
import { sendBookingConfirmation } from '../services/emailService.js';
import {
  hasConfiguredAdminCredentials,
  validateAdminBasicAuthHeader
} from '../utils/adminAuth.js';

const router = express.Router();

const ADMIN_MAX_FAILED_ATTEMPTS = 5;
const ADMIN_BLOCK_WINDOW_MS = 15 * 60 * 1000;
const adminFailedAuthByIp = new Map();
const ADMIN_REQUIRE_CLOUDFLARE_ACCESS = process.env.ADMIN_REQUIRE_CLOUDFLARE_ACCESS === 'true';

const getAllowedCloudflareEmails = () =>
  String(process.env.ADMIN_ACCESS_ALLOWED_EMAILS || '')
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);

const getClientIp = (req) => {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || 'unknown';
};

const getLockInfo = (ip) => {
  const info = adminFailedAuthByIp.get(ip);
  if (!info) return null;
  if (Date.now() - info.firstFailedAt > ADMIN_BLOCK_WINDOW_MS) {
    adminFailedAuthByIp.delete(ip);
    return null;
  }
  return info;
};

const registerFailedAttempt = (ip) => {
  const current = getLockInfo(ip);
  if (!current) {
    adminFailedAuthByIp.set(ip, { count: 1, firstFailedAt: Date.now() });
    return;
  }
  current.count += 1;
  adminFailedAuthByIp.set(ip, current);
};

const requireCloudflareAccess = (req, res, next) => {
  if (!ADMIN_REQUIRE_CLOUDFLARE_ACCESS) {
    return next();
  }

  const allowedEmails = getAllowedCloudflareEmails();
  if (allowedEmails.length === 0) {
    return res.status(500).json({
      error: 'Cloudflare Access is enabled but ADMIN_ACCESS_ALLOWED_EMAILS is empty'
    });
  }

  const accessEmail = String(req.headers['cf-access-authenticated-user-email'] || '')
    .trim()
    .toLowerCase();

  if (!accessEmail) {
    return res.status(403).json({ error: 'Cloudflare Access authentication required' });
  }

  if (!allowedEmails.includes(accessEmail)) {
    return res.status(403).json({ error: 'Cloudflare Access identity not allowed' });
  }

  req.cloudflareAccessEmail = accessEmail;
  return next();
};

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
  const clientIp = getClientIp(req);

  const lockInfo = getLockInfo(clientIp);
  if (lockInfo && lockInfo.count >= ADMIN_MAX_FAILED_ATTEMPTS) {
    const waitSeconds = Math.max(
      1,
      Math.ceil((ADMIN_BLOCK_WINDOW_MS - (Date.now() - lockInfo.firstFailedAt)) / 1000)
    );
    res.set('Retry-After', String(waitSeconds));
    return res.status(429).json({ error: 'Too many failed login attempts. Please try again later.' });
  }

  if (!hasConfiguredAdminCredentials()) {
    return res.status(500).json({ error: 'Admin auth not configured' });
  }

  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Basic ')) {
    res.set('WWW-Authenticate', 'Basic realm="Admin"');
    registerFailedAttempt(clientIp);
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { ok, username } = validateAdminBasicAuthHeader(authHeader);

  if (!ok) {
    registerFailedAttempt(clientIp);
    return res.status(401).json({ error: 'Unauthorized' });
  }

  adminFailedAuthByIp.delete(clientIp);

  req.adminUser = username;
  return next();
};

router.use(requireCloudflareAccess);
router.use(requireAdminAuth);

const addDays = (date, days) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

const getCleaningBufferDays = (value) => {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed < 1) {
    return 3;
  }
  return Math.min(parsed, 30);
};

const buildBlockedDateDeleteFilters = (booking) => {
  const filters = [];
  const cleaningBufferDays = getCleaningBufferDays(booking.cleaningBufferDays);

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
  pushFilter(addDays(booking.endDate, 1), addDays(booking.endDate, cleaningBufferDays), 'Reinigung');

  if (booking.isPartialBooking && booking.paidThroughDate && booking.originalEndDate) {
    const secondPeriodStart = addDays(booking.paidThroughDate, 1);

    pushFilter(secondPeriodStart, booking.originalEndDate, 'Reservierung');
    pushFilter(secondPeriodStart, booking.originalEndDate, 'Buchung');
    pushFilter(
      addDays(booking.originalEndDate, 1),
      addDays(booking.originalEndDate, cleaningBufferDays),
      'Reinigung'
    );
  }

  return filters;
};

// Bot Console: Status abrufen
router.get('/bot-console/status', async (req, res) => {
  try {
    if (!BOT_CONTROL_URL || !BOT_CONTROL_TOKEN) {
      return res.status(503).json({
        error: 'Bot Control Server not configured',
        message: 'BOT_CONTROL_URL and BOT_CONTROL_TOKEN environment variables are not set on Railway. Please configure these variables first.',
        docs: 'See BACKEND_SETUP.md for Cloudflare Tunnel setup instructions',
        status: 'unconfigured'
      });
    }

    const data = await botControlRequest('/status');
    const info = await botControlRequest('/info');
    
    res.json({
      status: data.status,
      host: info.hostname,
      projectDir: info.log_file,
      service: info.service
    });
  } catch (error) {
    res.status(502).json({
      error: 'Bot Control Server unreachable',
      message: error.message,
      hint: 'Stelle sicher, dass der Cloudflare Tunnel auf dem Pi läuft und die BOT_CONTROL_URL/TOKEN korrekt sind'
    });
  }
});

// Bot Console: Bot starten
router.post('/bot-console/start', async (req, res) => {
  try {
    if (!BOT_CONTROL_URL || !BOT_CONTROL_TOKEN) {
      return res.status(503).json({
        error: 'Bot Control Server not configured',
        message: 'BOT_CONTROL_URL and BOT_CONTROL_TOKEN environment variables are not set'
      });
    }

    const result = await botControlRequest('/start', 'POST');
    const status = await botControlRequest('/status');
    
    res.json({
      ok: result.success,
      status: status.status,
      message: result.message
    });
  } catch (error) {
    res.status(502).json({ error: error.message });
  }
});

// Bot Console: Bot stoppen
router.post('/bot-console/stop', async (req, res) => {
  try {
    if (!BOT_CONTROL_URL || !BOT_CONTROL_TOKEN) {
      return res.status(503).json({
        error: 'Bot Control Server not configured',
        message: 'BOT_CONTROL_URL and BOT_CONTROL_TOKEN environment variables are not set'
      });
    }

    const result = await botControlRequest('/stop', 'POST');
    const status = await botControlRequest('/status');
    
    res.json({
      ok: result.success,
      status: status.status,
      message: result.message
    });
  } catch (error) {
    res.status(502).json({ error: error.message });
  }
});

// Bot Console: Logs abrufen
router.get('/bot-console/logs', async (req, res) => {
  try {
    if (!BOT_CONTROL_URL || !BOT_CONTROL_TOKEN) {
      return res.status(503).json({
        error: 'Bot Control Server not configured',
        message: 'BOT_CONTROL_URL and BOT_CONTROL_TOKEN environment variables are not set on Railway. Please configure these variables first.',
        docs: 'See BACKEND_SETUP.md for Cloudflare Tunnel setup instructions',
        logs: 'Bot Console not available until configured',
        output: ''
      });
    }

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
    res.status(502).json({
      error: 'Bot Control Server unreachable',
      message: error.message,
      logs: error.message,
      output: error.message
    });
  }
});

// Alle Buchungen abrufen
router.get('/bookings', async (req, res) => {
  try {
    const bookings = await Booking.find({ deletedAt: null }).sort({ createdAt: -1, startDate: -1 });
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Neue Buchung erstellen
router.post('/bookings', async (req, res) => {
  try {
    const { sendConfirmationEmail = true, customerId = null, ...bookingPayload } = req.body || {};
    const booking = new Booking(bookingPayload);
    booking.cleaningBufferDays = getCleaningBufferDays(bookingPayload.cleaningBufferDays);

    let customer = null;
    if (customerId) {
      customer = await Customer.findOne({ _id: customerId, isActive: true });
    }

    if (!customer) {
      customer = await findOrCreateCustomerFromBooking(bookingPayload);
    }

    booking.customerId = customer?._id || null;
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
        endDate: addDays(booking.originalEndDate, booking.cleaningBufferDays),
        reason: 'Reinigung',
        createdBy: 'system-cleaning-buffer'
      });
    } else {
      await BlockedDate.create({
        wohnung: booking.wohnung,
        startDate: addDays(booking.endDate, 1),
        endDate: addDays(booking.endDate, booking.cleaningBufferDays),
        reason: 'Reinigung',
        createdBy: 'system-cleaning-buffer'
      });
    }

    // ========== AUTO-EMAIL: Admin-erstellte Buchungen ==========
    console.log('\n╔═══════════════════════════════════════════════════════╗');
    console.log('║   ADMIN BOOKING - AUTO-EMAIL CHECK                    ║');
    console.log('╚═══════════════════════════════════════════════════════╝');
    console.log('📋 Buchung gespeichert:', booking._id);
    console.log('📧 Email-Adresse:', booking.email || '❌ KEINE EMAIL GESETZT');
    console.log('👤 Kundenname:', booking.name);
    console.log('🏠 Wohnung:', booking.wohnung);
    
    if (sendConfirmationEmail && booking.email) {
      console.log('\n🚀 STARTE AUTO-EMAIL-VERSAND...');
      console.log('   Ziel:', booking.email);
      console.log('   Buchungs-ID:', booking._id);
      
      sendBookingConfirmation(booking, 'confirmation')
        .then((result) => {
          console.log('\n╔═══════════════════════════════════════════════════════╗');
          console.log('║   AUTO-EMAIL RESULT (ADMIN BOOKING)                   ║');
          console.log('╚═══════════════════════════════════════════════════════╝');
          console.log('📊 Result Object:', JSON.stringify(result, null, 2));
          console.log('📍 Status:', result.status);
          
          if (result.status === 'sent') {
            console.log('✅✅✅ ERFOLG - Email versendet!');
            console.log('   📬 Message ID:', result.messageId);
            console.log('   📡 SMTP Response:', result.response);
          } else if (result.status === 'skipped') {
            console.warn('⚠️⚠️⚠️ Email-Versand ÜBERSPRUNGEN');
            console.warn('   Grund:', result.reason);
            console.warn('   Details:', result.details);
          } else if (result.status === 'failed') {
            console.error('❌❌❌ Email-Versand FEHLGESCHLAGEN');
            console.error('   Error:', result.error);
            console.error('   Code:', result.code);
            console.error('   Response:', result.response);
          } else {
            console.warn('⚠️ UNBEKANNTER STATUS:', result.status);
            console.warn('   Full Result:', result);
          }
          console.log('╚═══════════════════════════════════════════════════════╝\n');
        })
        .catch((err) => {
          console.error('\n╔═══════════════════════════════════════════════════════╗');
          console.error('║   AUTO-EMAIL EXCEPTION (ADMIN BOOKING)                ║');
          console.error('╚═══════════════════════════════════════════════════════╝');
          console.error('❌❌❌ EXCEPTION beim Email-Versand (Hintergrund)');
          console.error('   Error Message:', err.message);
          console.error('   Error Code:', err.code);
          console.error('   Error Name:', err.name);
          if (err.stack) {
            console.error('   Stack Trace:', err.stack);
          }
          console.error('╚═══════════════════════════════════════════════════════╝\n');
        });
    } else {
      if (!sendConfirmationEmail) {
        console.log('⏭️  ÜBERSPRINGE Email-Versand (manuell deaktiviert)');
      } else {
        console.log('⏭️  ÜBERSPRINGE Email-Versand (keine Email-Adresse vorhanden)');
      }
    }
    console.log('╚═══════════════════════════════════════════════════════╝\n');

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
    const now = new Date();
    const currentYear = now.getFullYear();
    const previousYear = currentYear - 1;

    const yearStart = new Date(currentYear, 0, 1);
    const nextYearStart = new Date(currentYear + 1, 0, 1);
    const previousYearStart = new Date(previousYear, 0, 1);

    const monthStart = new Date(currentYear, now.getMonth(), 1);
    const nextMonthStart = new Date(currentYear, now.getMonth() + 1, 1);
    const last30Start = new Date(now);
    last30Start.setDate(last30Start.getDate() - 30);

    const baseBookingFilter = { deletedAt: null };

    const [
      totalBookings,
      paidBookings,
      pendingBookings,
      totalRevenuePaidAgg,
      totalRevenueAllAgg,
      totalNightsAgg,
      totalPeopleAgg,
      currentYearAgg,
      previousYearAgg,
      yearlyStats,
      monthlyStatsCurrentYear,
      recentBookings,
      visitorFacets
    ] = await Promise.all([
      Booking.countDocuments(baseBookingFilter),
      Booking.countDocuments({ ...baseBookingFilter, paymentStatus: 'paid' }),
      Booking.countDocuments({ ...baseBookingFilter, paymentStatus: { $in: ['pending', 'failed'] } }),
      Booking.aggregate([
        { $match: { ...baseBookingFilter, paymentStatus: 'paid' } },
        { $group: { _id: null, total: { $sum: '$total' } } }
      ]),
      Booking.aggregate([
        { $match: baseBookingFilter },
        { $group: { _id: null, total: { $sum: '$total' } } }
      ]),
      Booking.aggregate([
        { $match: baseBookingFilter },
        { $group: { _id: null, total: { $sum: '$nights' } } }
      ]),
      Booking.aggregate([
        { $match: baseBookingFilter },
        { $group: { _id: null, total: { $sum: '$people' } } }
      ]),
      Booking.aggregate([
        {
          $match: {
            ...baseBookingFilter,
            createdAt: { $gte: yearStart, $lt: nextYearStart }
          }
        },
        {
          $group: {
            _id: null,
            bookings: { $sum: 1 },
            paidBookings: {
              $sum: {
                $cond: [{ $eq: ['$paymentStatus', 'paid'] }, 1, 0]
              }
            },
            revenuePaid: {
              $sum: {
                $cond: [{ $eq: ['$paymentStatus', 'paid'] }, '$total', 0]
              }
            },
            revenueAll: { $sum: '$total' },
            nights: { $sum: '$nights' }
          }
        }
      ]),
      Booking.aggregate([
        {
          $match: {
            ...baseBookingFilter,
            createdAt: { $gte: previousYearStart, $lt: yearStart }
          }
        },
        {
          $group: {
            _id: null,
            bookings: { $sum: 1 },
            paidBookings: {
              $sum: {
                $cond: [{ $eq: ['$paymentStatus', 'paid'] }, 1, 0]
              }
            },
            revenuePaid: {
              $sum: {
                $cond: [{ $eq: ['$paymentStatus', 'paid'] }, '$total', 0]
              }
            },
            revenueAll: { $sum: '$total' },
            nights: { $sum: '$nights' }
          }
        }
      ]),
      Booking.aggregate([
        { $match: baseBookingFilter },
        {
          $group: {
            _id: { $year: '$createdAt' },
            bookings: { $sum: 1 },
            paidBookings: {
              $sum: {
                $cond: [{ $eq: ['$paymentStatus', 'paid'] }, 1, 0]
              }
            },
            revenuePaid: {
              $sum: {
                $cond: [{ $eq: ['$paymentStatus', 'paid'] }, '$total', 0]
              }
            },
            revenueAll: { $sum: '$total' },
            nights: { $sum: '$nights' }
          }
        },
        { $sort: { _id: 1 } }
      ]),
      Booking.aggregate([
        {
          $match: {
            ...baseBookingFilter,
            createdAt: { $gte: yearStart, $lt: nextYearStart }
          }
        },
        {
          $group: {
            _id: { $month: '$createdAt' },
            bookings: { $sum: 1 },
            paidBookings: {
              $sum: {
                $cond: [{ $eq: ['$paymentStatus', 'paid'] }, 1, 0]
              }
            },
            revenuePaid: {
              $sum: {
                $cond: [{ $eq: ['$paymentStatus', 'paid'] }, '$total', 0]
              }
            },
            revenueAll: { $sum: '$total' },
            nights: { $sum: '$nights' }
          }
        },
        { $sort: { _id: 1 } }
      ]),
      Booking.find(baseBookingFilter).sort({ createdAt: -1 }).limit(5),
      WebsiteVisit.aggregate([
        {
          $facet: {
            totalViews: [{ $group: { _id: null, value: { $sum: '$views' } } }],
            uniqueVisitors: [{ $group: { _id: '$visitorHash' } }, { $count: 'value' }],
            currentYearViews: [
              { $match: { visitDate: { $gte: yearStart, $lt: nextYearStart } } },
              { $group: { _id: null, value: { $sum: '$views' } } }
            ],
            currentYearUniqueVisitors: [
              { $match: { visitDate: { $gte: yearStart, $lt: nextYearStart } } },
              { $group: { _id: '$visitorHash' } },
              { $count: 'value' }
            ],
            currentMonthViews: [
              { $match: { visitDate: { $gte: monthStart, $lt: nextMonthStart } } },
              { $group: { _id: null, value: { $sum: '$views' } } }
            ],
            currentMonthUniqueVisitors: [
              { $match: { visitDate: { $gte: monthStart, $lt: nextMonthStart } } },
              { $group: { _id: '$visitorHash' } },
              { $count: 'value' }
            ],
            last30DaysViews: [
              { $match: { visitDate: { $gte: last30Start, $lte: now } } },
              { $group: { _id: null, value: { $sum: '$views' } } }
            ],
            last30DaysUniqueVisitors: [
              { $match: { visitDate: { $gte: last30Start, $lte: now } } },
              { $group: { _id: '$visitorHash' } },
              { $count: 'value' }
            ]
          }
        }
      ])
    ]);

    const extractFacetValue = (facets, key) => facets?.[0]?.[key]?.[0]?.value || 0;

    const totalRevenuePaid = totalRevenuePaidAgg[0]?.total || 0;
    const totalRevenueAll = totalRevenueAllAgg[0]?.total || 0;
    const totalNights = totalNightsAgg[0]?.total || 0;
    const totalPeople = totalPeopleAgg[0]?.total || 0;

    const currentYearData = currentYearAgg[0] || {
      bookings: 0,
      paidBookings: 0,
      revenuePaid: 0,
      revenueAll: 0,
      nights: 0
    };
    const previousYearData = previousYearAgg[0] || {
      bookings: 0,
      paidBookings: 0,
      revenuePaid: 0,
      revenueAll: 0,
      nights: 0
    };

    const growth = (currentValue, previousValue) => {
      if (!previousValue) {
        return currentValue > 0 ? 100 : 0;
      }
      return Number((((currentValue - previousValue) / previousValue) * 100).toFixed(1));
    };

    const monthlyMap = new Map(monthlyStatsCurrentYear.map((item) => [item._id, item]));
    const monthly = Array.from({ length: 12 }, (_, index) => {
      const monthNumber = index + 1;
      const monthData = monthlyMap.get(monthNumber) || {
        bookings: 0,
        paidBookings: 0,
        revenuePaid: 0,
        revenueAll: 0,
        nights: 0
      };

      return {
        month: monthNumber,
        ...monthData
      };
    });

    res.json({
      totalBookings,
      paidBookings,
      pendingBookings,
      totalRevenue: totalRevenuePaid,
      totalRevenueAll,
      totalNights,
      totalPeople,
      recentBookings,
      currentYear,
      yearly: yearlyStats.map((item) => ({
        year: item._id,
        bookings: item.bookings,
        paidBookings: item.paidBookings,
        revenuePaid: item.revenuePaid,
        revenueAll: item.revenueAll,
        nights: item.nights
      })),
      currentYearStats: currentYearData,
      previousYearStats: previousYearData,
      growthVsPreviousYear: {
        bookings: growth(currentYearData.bookings, previousYearData.bookings),
        paidBookings: growth(currentYearData.paidBookings, previousYearData.paidBookings),
        revenuePaid: growth(currentYearData.revenuePaid, previousYearData.revenuePaid),
        revenueAll: growth(currentYearData.revenueAll, previousYearData.revenueAll),
        nights: growth(currentYearData.nights, previousYearData.nights)
      },
      monthly,
      visitors: {
        totalViews: extractFacetValue(visitorFacets, 'totalViews'),
        uniqueVisitors: extractFacetValue(visitorFacets, 'uniqueVisitors'),
        currentYearViews: extractFacetValue(visitorFacets, 'currentYearViews'),
        currentYearUniqueVisitors: extractFacetValue(visitorFacets, 'currentYearUniqueVisitors'),
        currentMonthViews: extractFacetValue(visitorFacets, 'currentMonthViews'),
        currentMonthUniqueVisitors: extractFacetValue(visitorFacets, 'currentMonthUniqueVisitors'),
        last30DaysViews: extractFacetValue(visitorFacets, 'last30DaysViews'),
        last30DaysUniqueVisitors: extractFacetValue(visitorFacets, 'last30DaysUniqueVisitors')
      }
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
      vatId: originalBooking.vatId,
      street: originalBooking.street,
      zip: originalBooking.zip,
      city: originalBooking.city,
      country: originalBooking.country,
      countryLabel: originalBooking.countryLabel,
      addressLine2: originalBooking.addressLine2,
      region: originalBooking.region,
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
    const { updateBookings = false, ...customerPayload } = req.body || {};

    const customer = await Customer.findByIdAndUpdate(
      req.params.id,
      { ...customerPayload, updatedAt: new Date() },
      { new: true, runValidators: true }
    );
    
    if (!customer) {
      return res.status(404).json({ error: 'Kunde nicht gefunden' });
    }
    
    let updatedBookingsCount = 0;

    if (updateBookings) {
      const bookingUpdate = {
        name: customer.name,
        email: customer.email,
        company: customer.name,
        updatedAt: new Date()
      };

      if (customer.phone || customer.mobile) {
        bookingUpdate.phone = customer.phone || customer.mobile;
      }

      const updateResult = await Booking.updateMany(
        { customerId: customer._id, deletedAt: null },
        { $set: bookingUpdate }
      );

      updatedBookingsCount = updateResult.modifiedCount || 0;
    }

    res.json({ customer, updatedBookingsCount });
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

// Buchungsbestätigung Email mit Rechnung versenden (Manueller Button)
router.post('/bookings/:id/send-confirmation', async (req, res) => {
  try {
    console.log('\n╔═══════════════════════════════════════════════════════╗');
    console.log('║   MANUAL EMAIL SEND - START                           ║');
    console.log('╚═══════════════════════════════════════════════════════╝');
    console.log('📍 Request Parameter ID:', req.params.id);
    
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      console.error('❌ Buchung nicht gefunden:', req.params.id);
      return res.status(404).json({ error: 'Buchung nicht gefunden' });
    }

    console.log('✅ Buchung gefunden:', booking._id);
    console.log('📋 Buchungsdetails:');
    console.log('   ID:', booking._id);
    console.log('   Kundenname:', booking.name);
    console.log('   Email:', booking.email);
    console.log('   Wohnung:', booking.wohnung);
    console.log('   Zeitraum:', booking.startDate, '-', booking.endDate);

    console.log('\n🚀 Rufe sendBookingConfirmation() auf...');
    const result = await sendBookingConfirmation(booking, 'confirmation');
    
    console.log('\n╔═══════════════════════════════════════════════════════╗');
    console.log('║   MANUAL EMAIL SEND - RESULT                          ║');
    console.log('╚═══════════════════════════════════════════════════════╝');
    console.log('📊 Complete Result Object:', JSON.stringify(result, null, 2));
    console.log('📍 Status:', result.status);

    if (result.status === 'sent') {
      console.log('✅✅✅ EMAIL ERFOLGREICH VERSENDET!');
      console.log('   Message ID:', result.messageId);
      console.log('   SMTP Response:', result.response);
      console.log('╚═══════════════════════════════════════════════════════╝\n');
      return res.json({ 
        success: true, 
        message: '✅ Buchungsbestätigung erfolgreich an ' + booking.email + ' versendet!',
        result 
      });
    } else if (result.status === 'skipped') {
      console.warn('⚠️⚠️⚠️ EMAIL-VERSAND ÜBERSPRUNGEN');
      console.warn('   Grund:', result.reason);
      console.warn('   Details:', result.details);
      console.log('╚═══════════════════════════════════════════════════════╝\n');
      return res.status(500).json({ 
        error: 'Email-Versand nicht konfiguriert: ' + (result.reason || result.details),
        result
      });
    } else if (result.status === 'failed') {
      console.error('❌❌❌ EMAIL-VERSAND FEHLGESCHLAGEN');
      console.error('   Error:', result.error);
      console.error('   Code:', result.code);
      console.error('   Response:', result.response);
      console.log('╚═══════════════════════════════════════════════════════╝\n');
      return res.status(500).json({ 
        error: 'Fehler beim Email-Versand: ' + (result.error || 'Unbekannter Fehler'),
        result
      });
    } else {
      console.error('❌ UNBEKANNTER STATUS:', result.status);
      console.error('   Full Result:', result);
      console.log('╚═══════════════════════════════════════════════════════╝\n');
      return res.status(500).json({ 
        error: 'Unbekannter Status: ' + result.status,
        result
      });
    }
  } catch (error) {
    console.error('\n╔═══════════════════════════════════════════════════════╗');
    console.error('║   MANUAL EMAIL SEND - EXCEPTION                       ║');
    console.error('╚═══════════════════════════════════════════════════════╝');
    console.error('❌❌❌ EXCEPTION:', error.message);
    console.error('   Error Name:', error.name);
    console.error('   Error Code:', error.code);
    if (error.stack) {
      console.error('   Stack:', error.stack);
    }
    console.error('╚═══════════════════════════════════════════════════════╝\n');
    res.status(500).json({ error: error.message, stack: error.stack });
  }
});

export default router;

