// Rechnung als PDF generieren und zum Download bereitstellen
import express from 'express';
import Booking from '../models/Booking.js';
import BlockedDate from '../models/BlockedDate.js';
import { generateInvoice } from '../services/invoiceGenerator.js';
import { sendBookingConfirmation, sendOfferEmail, sendMissingDataEmail } from '../services/emailService.js';
import { findOrCreateCustomerFromBooking } from '../services/customerService.js';
import { sendBookingPushNotification, sendPushNotification } from '../services/pushoverService.js';
import { validateAdminBasicAuthHeader } from '../utils/adminAuth.js';
import {
  buildOfferVariantFromBooking,
  getBookedApartmentKeysForOption,
  getOfferOptionLabel,
  normalizeOfferOptions
} from '../../shared/apartmentCatalog.js';

const router = express.Router();

const addDays = (date, days) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

const getCleaningBufferDays = (value) => {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed < 0) {
    return 3;
  }
  return Math.min(parsed, 30);
};

const activeBookingFilter = {
  deletedAt: null,
  bookingStatus: { $ne: 'cancelled' },
  isInquiry: { $ne: true },
  inquiryStatus: { $ne: 'pending' }
};

const isAdminRequest = (req) => {
  const authHeader = req.headers.authorization || '';
  const { ok } = validateAdminBasicAuthHeader(authHeader);
  return ok;
};

const hasRequiredInvoiceData = (booking) => {
  return Boolean(
    String(booking.phone || '').trim() &&
    String(booking.company || '').trim() &&
    String(booking.street || '').trim() &&
    String(booking.zip || '').trim() &&
    String(booking.city || '').trim()
  );
};

const getPublicAppBaseUrl = () => {
  const direct = [
    process.env.APP_URL,
    process.env.PUBLIC_APP_URL,
    process.env.FRONTEND_URL,
    process.env.WEBSITE_URL,
    process.env.VITE_URL
  ].find((entry) => {
    const value = String(entry || '').trim().toLowerCase();
    return value && !value.includes('localhost') && !value.includes('127.0.0.1');
  });

  if (direct) {
    return String(direct).trim().replace(/\/$/, '');
  }

  const railwayDomain = String(process.env.RAILWAY_PUBLIC_DOMAIN || '').trim();
  if (railwayDomain) {
    return railwayDomain.startsWith('http') ? railwayDomain.replace(/\/$/, '') : `https://${railwayDomain}`;
  }

  const apiUrl = String(process.env.API_URL || '').trim().replace(/\/api\/?$/i, '').replace(/\/$/, '');
  if (apiUrl && !apiUrl.includes('localhost') && !apiUrl.includes('127.0.0.1')) {
    return apiUrl;
  }

  return 'https://monteurwohnung-dumser.de';
};

const findBlockingConflict = async (booking) => {
  const apartmentKeys = getBookedApartmentKeysForOption(booking.wohnung);

  for (const apartmentKey of apartmentKeys) {
    const overlap = await Booking.findOne({
      ...activeBookingFilter,
      _id: { $ne: booking._id },
      wohnung: apartmentKey,
      startDate: { $lte: booking.endDate },
      endDate: { $gte: booking.startDate }
    });

    if (overlap) {
      return { type: 'booking', item: overlap, apartmentKey };
    }

    const blockedOverlap = await BlockedDate.findOne({
      wohnung: apartmentKey,
      startDate: { $lte: booking.endDate },
      endDate: { $gte: booking.startDate }
    });

    if (blockedOverlap) {
      return { type: 'blocked', item: blockedOverlap, apartmentKey };
    }
  }

  return null;
};

const createBookingBlocksForBooking = async (booking) => {
  const apartmentKeys = getBookedApartmentKeysForOption(booking.wohnung);

  for (const apartmentKey of apartmentKeys) {
    await BlockedDate.create({
      wohnung: apartmentKey,
      startDate: booking.startDate,
      endDate: booking.endDate,
      reason: 'Buchung',
      createdBy: booking.email || 'admin'
    });
  }

  if (booking.isPartialBooking && booking.paidThroughDate && booking.originalEndDate) {
    const secondPeriodStart = addDays(booking.paidThroughDate, 1);

    for (const apartmentKey of apartmentKeys) {
      await BlockedDate.create({
        wohnung: apartmentKey,
        startDate: secondPeriodStart,
        endDate: booking.originalEndDate,
        reason: 'Reservierung',
        createdBy: booking.email || 'admin'
      });
    }

    if (booking.cleaningBufferDays > 0) {
      for (const apartmentKey of apartmentKeys) {
        await BlockedDate.create({
          wohnung: apartmentKey,
          startDate: addDays(booking.originalEndDate, 1),
          endDate: addDays(booking.originalEndDate, booking.cleaningBufferDays),
          reason: 'Reinigung',
          createdBy: 'system-cleaning-buffer'
        });
      }
    }

    return;
  }

  if (booking.cleaningBufferDays > 0) {
    for (const apartmentKey of apartmentKeys) {
      await BlockedDate.create({
        wohnung: apartmentKey,
        startDate: addDays(booking.endDate, 1),
        endDate: addDays(booking.endDate, booking.cleaningBufferDays),
        reason: 'Reinigung',
        createdBy: 'system-cleaning-buffer'
      });
    }
  }
};

const applySelectedOfferOptionToBooking = (booking, selectedOption) => {
  const variant = buildOfferVariantFromBooking(booking, selectedOption);

  booking.wohnung = selectedOption;
  booking.wohnungLabel = getOfferOptionLabel(selectedOption);
  booking.selectedOfferApartment = selectedOption;
  booking.offerApartmentSelectionAt = new Date();

  booking.pricePerNight = variant.pricePerNight;
  booking.cleaningFee = variant.cleaningFee;
  booking.nights = variant.nights;
  booking.subtotal = variant.subtotal;
  booking.discount = variant.discount;
  booking.vat = variant.vat;
  booking.total = variant.total;
};

const notifyAdminOfferAccepted = async (booking) => {
  const baseUrl = getPublicAppBaseUrl();
  const adminLink = `${baseUrl}/admin?booking=${booking._id}`;
  const startDate = new Date(booking.startDate).toLocaleDateString('de-DE');
  const title = 'Angebot wurde angenommen';
  const message = `${booking.company || booking.name}\n${booking.wohnungLabel || booking.wohnung}\n${startDate}\nJetzt im Admin final bestaetigen.`;
  await sendPushNotification(title, message, adminLink);
};

const parseLegacyAddress = (address) => {
  const raw = String(address || '').trim();
  if (!raw) {
    return { street: '', zip: '', city: '' };
  }

  const lines = raw.split(/\r?\n|,/).map((entry) => entry.trim()).filter(Boolean);
  const street = lines[0] || '';
  const zipCity = lines[1] || '';
  const match = zipCity.match(/^(\d{4,5})\s+(.+)$/);

  return {
    street,
    zip: match ? match[1] : '',
    city: match ? match[2] : zipCity
  };
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
    const bookings = await Booking.find({
      ...activeBookingFilter,
      wohnung
    });
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
      ...activeBookingFilter,
      wohnung,
      startDate: { $lte: end },
      endDate: { $gte: start }
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
    const bookingMode = String(req.body?.bookingMode || '').toLowerCase();
    const isInquiryRequested = bookingMode === 'inquiry' || req.body?.isInquiry === true;

    if (req.body.paymentMethod && req.body.paymentMethod !== 'invoice') {
      return res.status(400).json({ error: 'Nur Zahlung auf Rechnung ist aktuell verfügbar.' });
    }

    // Prüfe auf Überschneidung mit bestehenden Buchungen
    const { wohnung, startDate, endDate } = req.body;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const requestedNights = Number(req.body?.nights) || Math.max(0, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));

    if (!adminRequest) {
      if (isInquiryRequested) {
        if (requestedNights < 10 || requestedNights > 27) {
          return res.status(400).json({ error: 'Anfragen sind nur für 10 bis 27 Nächte möglich.' });
        }
      } else if (requestedNights < 28) {
        return res.status(400).json({ error: 'Direktbuchungen sind erst ab 28 Nächten möglich.' });
      }
    }

    const overlapping = await Booking.findOne({
      ...activeBookingFilter,
      wohnung,
      startDate: { $lte: end },
      endDate: { $gte: start }
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
      nights: requestedNights,
      bookingMode,
      isInquiry: isInquiryRequested,
      inquiryStatus: isInquiryRequested ? 'pending' : 'none',
      isPartialBooking: isInquiryRequested ? false : Boolean(req.body.isPartialBooking),
      paymentMethod: 'invoice',
      paymentStatus: req.body.paymentStatus === 'paid' ? 'pending' : (req.body.paymentStatus || 'pending')
    });
    booking.cleaningBufferDays = getCleaningBufferDays(req.body.cleaningBufferDays);

    const customer = await findOrCreateCustomerFromBooking(req.body);
    booking.customerId = customer._id;

    await booking.save();

    // Bei Teilbuchung (>28 Tage): Automatisch zweite Buchung für restliche Tage erstellen
    let followUpBooking = null;
    if (!booking.isInquiry && booking.isPartialBooking) {
      const remainingNightsStart = addDays(new Date(booking.paidThroughDate), 1);
      const remainingNights = booking.totalNights - booking.nights;
      
      // Berechne Preise für die zweite Buchung
      const followUpSubtotal = booking.pricePerNight * remainingNights;
      const followUpDiscount = booking.discount || 0;
      const followUpSubtotalAfterDiscount = followUpSubtotal * (1 - followUpDiscount);
      const followUpVat = followUpSubtotalAfterDiscount * 0.07;
      const followUpTotal = followUpSubtotalAfterDiscount + followUpVat;

      followUpBooking = new Booking({
        customerId: customer._id,
        name: booking.name,
        email: booking.email,
        phone: booking.phone,
        company: booking.company,
        vatId: booking.vatId,
        street: booking.street,
        zip: booking.zip,
        city: booking.city,
        country: booking.country,
        countryLabel: booking.countryLabel,
        addressLine2: booking.addressLine2,
        region: booking.region,
        wohnung: booking.wohnung,
        wohnungLabel: booking.wohnungLabel,
        startDate: remainingNightsStart,
        endDate: booking.originalEndDate,
        nights: remainingNights,
        people: booking.people,
        pricePerNight: booking.pricePerNight,
        cleaningFee: 0, // Keine zweite Reinigungsgebühr
        subtotal: followUpSubtotal,
        discount: followUpDiscount,
        vat: followUpVat,
        total: followUpTotal,
        paymentMethod: 'invoice',
        paymentStatus: 'pending',
        bookingStatus: 'confirmed',
        isPartialBooking: false, // Diese ist nicht mehr "partial"
        adminNote: 'Rechnung wird automatisch eine Woche vor Buchungsbeginn erstellt und dem Kunden gesendet.',
        createdAt: new Date(),
        updatedAt: new Date()
      });

      await followUpBooking.save();

      console.log('\n📋 FOLLOW-UP BUCHUNG ERSTELLT - ID:', followUpBooking._id);
      console.log('   Zeitraum:', remainingNightsStart.toISOString().slice(0, 10), '-', booking.originalEndDate);
      console.log('   Nächte:', remainingNights);
      console.log('   Betrag:', followUpTotal, '€');
    }

    // Zeitraum nur bei echten Buchungen blockieren, nicht bei offenen Anfragen.
    if (!booking.isInquiry) {
      try {
        const BlockedDate = (await import('../models/BlockedDate.js')).default;

        if (booking.isPartialBooking && followUpBooking) {
          await BlockedDate.create({
            wohnung: booking.wohnung,
            startDate: booking.startDate,
            endDate: booking.endDate,
            reason: 'Buchung',
            createdBy: booking.email || 'system'
          });

          await BlockedDate.create({
            wohnung: followUpBooking.wohnung,
            startDate: followUpBooking.startDate,
            endDate: followUpBooking.endDate,
            reason: 'Buchung',
            createdBy: followUpBooking.email || 'system'
          });

          if (!adminRequest && booking.cleaningBufferDays > 0) {
            await BlockedDate.create({
              wohnung: booking.wohnung,
              startDate: addDays(new Date(followUpBooking.endDate), 1),
              endDate: addDays(new Date(followUpBooking.endDate), booking.cleaningBufferDays),
              reason: 'Reinigung',
              createdBy: 'system-cleaning-buffer'
            });
          }
        } else {
          await BlockedDate.create({
            wohnung: booking.wohnung,
            startDate: booking.startDate,
            endDate: booking.endDate,
            reason: 'Buchung',
            createdBy: booking.email || 'system'
          });

          if (!adminRequest && booking.cleaningBufferDays > 0) {
            await BlockedDate.create({
              wohnung: booking.wohnung,
              startDate: addDays(booking.endDate, 1),
              endDate: addDays(booking.endDate, booking.cleaningBufferDays),
              reason: 'Reinigung',
              createdBy: 'system-cleaning-buffer'
            });
          }
        }
      } catch (blockError) {
        console.error('❌ Fehler beim Blockieren des Zeitraums:', blockError);
      }
    }

    // Versende Email im Hintergrund (nicht-blockierend)
    // Damit die Buchung nicht von Email-Problemen blockiert wird
    console.log('\n🎯 NEUE BUCHUNG ERSTELLT - ID:', booking._id);
    console.log('   Kunde:', booking.name);
    console.log('   Email:', booking.email);
    console.log('   Wohnung:', booking.wohnung);
    console.log('   Betrag:', booking.total, '€');
    console.log('   Typ:', booking.isInquiry ? 'ANFRAGE (unverbindlich)' : 'DIREKTBUCHUNG');
    
    // Email im Hintergrund versenden (für Direktbuchung + Anfrage)
    console.log('\n📧 Starte Email-Versand im Hintergrund...');
    const emailType = booking.isInquiry ? 'inquiry-confirmation' : 'confirmation';
    sendBookingConfirmation(booking, emailType)
      .then(result => {
        console.log('\n📬 HINTERGRUND-EMAIL-RESULT:');
        console.log('   Status:', result.status);
        if (result.status === 'sent') {
          console.log(`✅ ${booking.isInquiry ? 'Anfrage' : 'Bestätigungs'}-Email erfolgreich versendet`);
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

    // Sende Push-Benachrichtigung im Hintergrund
    if (process.env.PUSHOVER_API_TOKEN && process.env.PUSHOVER_USER_KEY) {
      const baseUrl = process.env.BASE_URL || 'https://monteur-wohnung.dumser.net';
      sendBookingPushNotification(booking, baseUrl, booking.isInquiry)
        .then(result => {
          console.log('\n📱 PUSHOVER RESULT:');
          console.log('   Status:', result.status);
          if (result.status === 'sent') {
            console.log(`✅ ${booking.isInquiry ? 'Anfrage' : 'Buchungs'}-Push erfolgreich versendet`);
          }
        })
        .catch(err => {
          console.error('❌ FEHLER beim Push-Versand:');
          console.error('   Message:', err.message);
        });
    }

    res.status(201).json(booking);
  } catch (error) {
    console.error('❌ Fehler beim Booking erstellen:', error.message);
    res.status(400).json({ error: error.message });
  }
});

// Buchung aktualisieren (Admin)
router.patch('/:id', async (req, res) => {
  try {
    const { _id, ...updateData } = req.body;
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

// Angebot annehmen
router.post('/:id/accept-offer', async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ error: 'Angebot nicht gefunden' });

    if (!booking.isInquiry || booking.inquiryStatus !== 'pending') {
      return res.status(400).json({ error: 'Dieses Angebot wurde bereits bearbeitet.' });
    }

    const offerOptions = normalizeOfferOptions(booking.offerApartmentOptions, booking.wohnung);
    const requestedOption = String(req.body?.selectedApartment || req.query?.option || '').trim().toLowerCase();
    let selectedOption = offerOptions[0];

    if (requestedOption) {
      if (!offerOptions.includes(requestedOption)) {
        return res.status(400).json({ error: 'Die gewaehlte Wohnungsoption ist fuer dieses Angebot nicht verfuegbar.' });
      }
      selectedOption = requestedOption;
    }

    applySelectedOfferOptionToBooking(booking, selectedOption);

    const blockingConflict = await findBlockingConflict(booking);
    if (blockingConflict) {
      booking.offerStatus = 'unavailable';
      booking.updatedAt = new Date();
      await booking.save();

      return res.status(409).json({
        error: 'Das Angebot ist leider nicht mehr verfuegbar, da der Zeitraum inzwischen anderweitig vergeben wurde.'
      });
    }

    if (!hasRequiredInvoiceData(booking)) {
      booking.offerStatus = 'missing-data';
      booking.updatedAt = new Date();
      await booking.save();
      await sendMissingDataEmail(booking);

      return res.json({ 
        success: true, 
        message: 'Angebot angenommen. Bitte vervollständigen Sie Ihre Daten.',
        redirectUrl: `/daten-vervollstaendigen/${booking._id}` 
      });
    }

    if (booking.inquirySource === 'email') {
      booking.offerStatus = 'awaiting-admin-confirmation';
      booking.updatedAt = new Date();
      await booking.save();
      await notifyAdminOfferAccepted(booking);

      return res.json({
        success: true,
        message: 'Vielen Dank. Ihr Angebot wurde angenommen und wird jetzt von uns final bestaetigt. Danach erhalten Sie Buchungsbestaetigung und Rechnung per E-Mail.'
      });
    }

    booking.isInquiry = false;
    booking.inquiryStatus = 'approved';
    booking.bookingStatus = 'confirmed';
    booking.offerStatus = 'accepted';
    booking.updatedAt = new Date();
    booking.cleaningBufferDays = getCleaningBufferDays(booking.cleaningBufferDays);
    await booking.save();

    await createBookingBlocksForBooking(booking);
    await findOrCreateCustomerFromBooking(booking);

    await sendBookingConfirmation(booking, 'confirmation');
    await sendBookingPushNotification(booking, getPublicAppBaseUrl());

    return res.json({ success: true, message: 'Angebot erfolgreich verbindlich gebucht!' });

  } catch (error) {
    console.error('Fehler bei /accept-offer:', error);
    res.status(500).json({ error: error.message });
  }
});

// Daten vervollständigen (nach Angebot)
router.post('/:id/complete-data', async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ error: 'Buchung nicht gefunden' });

    const {
      company,
      companyName,
      street,
      zip,
      city,
      country,
      countryLabel,
      addressLine2,
      phone,
      address
    } = req.body;

    const parsedLegacyAddress = parseLegacyAddress(address);

    if (company || companyName) booking.company = String(company || companyName).trim();
    if (street || parsedLegacyAddress.street) booking.street = String(street || parsedLegacyAddress.street).trim();
    if (zip || parsedLegacyAddress.zip) booking.zip = String(zip || parsedLegacyAddress.zip).trim();
    if (city || parsedLegacyAddress.city) booking.city = String(city || parsedLegacyAddress.city).trim();
    if (country) booking.country = String(country).trim();
    if (countryLabel) booking.countryLabel = String(countryLabel).trim();
    if (addressLine2 !== undefined) booking.addressLine2 = String(addressLine2 || '').trim();
    if (phone) booking.phone = String(phone).trim();

    if (hasRequiredInvoiceData(booking)) {
      if (booking.inquirySource === 'email') {
        const blockingConflict = await findBlockingConflict(booking);
        if (blockingConflict) {
          booking.offerStatus = 'unavailable';
          booking.updatedAt = new Date();
          await booking.save();

          return res.status(409).json({
            error: 'Das Angebot ist leider nicht mehr verfuegbar, da der Zeitraum inzwischen vergeben wurde.'
          });
        }

        booking.offerStatus = 'awaiting-admin-confirmation';
        booking.updatedAt = new Date();
        await booking.save();
        await notifyAdminOfferAccepted(booking);

        return res.json({ success: true, message: 'Daten erfolgreich gespeichert. Ihre Buchung wird jetzt final bestaetigt.' });
      }

      booking.isInquiry = false;
      booking.inquiryStatus = 'approved';
      booking.bookingStatus = 'confirmed';
      booking.offerStatus = 'accepted';
      booking.updatedAt = new Date();
      booking.cleaningBufferDays = getCleaningBufferDays(booking.cleaningBufferDays);
      await booking.save();

      await createBookingBlocksForBooking(booking);
      await findOrCreateCustomerFromBooking(booking);
      await sendBookingConfirmation(booking, 'confirmation');
      await sendBookingPushNotification(booking, getPublicAppBaseUrl());
      
      return res.json({ success: true, message: 'Daten erfolgreich gespeichert und Buchung bestätigt.' });
    } else {
      booking.offerStatus = 'missing-data';
      await booking.save();
      return res.json({ success: true, message: 'Daten aktualisiert, aber noch nicht vollständig.' });
    }
  } catch (error) {
    console.error('Fehler bei /complete-data:', error);
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
