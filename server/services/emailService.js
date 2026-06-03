import { generateInvoice } from './invoiceGenerator.js';
import {
  buildOfferVariantsFromBooking,
  getApartmentInfoForOption,
  getApartmentPreviewImages,
  getOfferOptionLabel,
  normalizeOfferOptions
} from '../../shared/apartmentCatalog.js';

/**
 * Sendet Buchungsbestätigung mit Rechnung als PDF-Anhang via Mailjet HTTP API
 * @param {Object} booking - Vollständiges Booking-Objekt aus MongoDB
 * @param {string} type - Optional: 'invoice-resend' für Rechnungsverschicken
 */
export async function sendBookingConfirmation(booking, type = 'confirmation') {
  try {
    // ========== DEBUG: Umgebungsvariablen prüfen ==========
    console.log('\n╔══════════════════════════════════════════════════════════╗');
    console.log('║         EMAIL SERVICE (MAILJET API) - START               ║');
    console.log('╚══════════════════════════════════════════════════════════╝');
    console.log('⏰ Timestamp:', new Date().toISOString());
    console.log('📍 Funktion aufgerufen mit:');
    console.log('   Booking ID:', booking?._id || '❌ KEINE ID');
    console.log('   Booking Email:', booking?.email || '❌ KEINE EMAIL');
    console.log('   Type:', type);
    console.log('   Booking Object vorhanden:', !!booking);
    
    if (!booking) {
      console.error('❌ KRITISCHER FEHLER: Booking Object ist null/undefined!');
      return { status: 'failed', error: 'Booking Object fehlt' };
    }
    
    if (!booking.email) {
      console.error('❌ KRITISCHER FEHLER: Booking hat keine Email-Adresse!');
      return { status: 'failed', error: 'Keine Email-Adresse in Booking' };
    }
    
    console.log('\n🔧 Umgebungsvariablen Check (Mailjet API):');
    console.log('  MAILJET_API_KEY:', process.env.MAILJET_API_KEY ? '✓ gesetzt (' + process.env.MAILJET_API_KEY.length + ' Zeichen)' : '❌ NICHT GESETZT');
    console.log('  MAILJET_SECRET_KEY:', process.env.MAILJET_SECRET_KEY ? '✓ gesetzt (' + process.env.MAILJET_SECRET_KEY.length + ' Zeichen)' : '❌ NICHT GESETZT');
    console.log('  EMAIL_FROM:', process.env.EMAIL_FROM || '(Standard)');
    console.log('  BOOKING_OWNER_EMAIL:', process.env.BOOKING_OWNER_EMAIL || '(Fallback)');
    console.log('  NODE_ENV:', process.env.NODE_ENV || 'development');
    
    // Prüfe ob Mailjet konfiguriert ist
    const mailjetApiKey = process.env.MAILJET_API_KEY;
    const mailjetSecretKey = process.env.MAILJET_SECRET_KEY;
    const fromAddress = process.env.EMAIL_FROM || 'karl658@hotmail.de';
    const fromName = process.env.EMAIL_FROM_NAME || 'Monteurwohnungen Dumser';
    const configuredOwnerInbox = String(process.env.BOOKING_OWNER_EMAIL || '').trim().toLowerCase();
    const ownerInbox = (!configuredOwnerInbox
      || configuredOwnerInbox === 'karl658@hotmail.de'
      || configuredOwnerInbox === 'karl658@hotamil.de')
      ? 'monteur-wohnung@dumser.net'
      : configuredOwnerInbox;
    
    if (!mailjetApiKey || !mailjetSecretKey) {
      console.error('\n❌❌❌ MAILJET API NICHT KONFIGURIERT!');
      console.error('   API Key:', mailjetApiKey ? '✓ vorhanden' : '✗✗✗ FEHLT');
      console.error('   Secret Key:', mailjetSecretKey ? '✓ vorhanden' : '✗✗✗ FEHLT');
      console.log('╚══════════════════════════════════════════════════════════╝\n');
      return { 
        status: 'skipped', 
        reason: 'Mailjet API nicht konfiguriert',
        details: `API Key: ${!mailjetApiKey}, Secret Key: ${!mailjetSecretKey}`
      };
    }

    console.log('✅ Mailjet API vollständig konfiguriert');
    console.log('📧 Berechnete Werte:');
    console.log('   From Address:', fromAddress);
    console.log('   Owner Inbox (Kopie):', ownerInbox);
    console.log('   Email-Typ:', type);
    console.log('   Empfänger:', booking.email);

    // Generiere PDF-Rechnung (nicht für Anfragen)
    let invoicePDF = null;
    if (type !== 'inquiry-confirmation') {
      console.log('\n📄 Generiere PDF-Rechnung...');
      invoicePDF = await generateInvoice(booking);
      console.log('✅ PDF-Rechnung erstellt');
      console.log('   Dateiname:', invoicePDF.fileName);
      console.log('   Größe:', (invoicePDF.buffer.length / 1024).toFixed(2), 'KB');
    } else {
      console.log('\n📄 Keine PDF-Rechnung für unverbindliche Anfrage');
    }

    // Bereite Email-Daten vor
    const wohnungName = booking.wohnungLabel
      || (booking.wohnung === 'neubau'
        ? 'Neubau – Frühlingstraße'
        : booking.wohnung === 'kombi'
          ? 'Kombi-Paket: Hackerberg + Frühlingstraße'
          : 'Wohnung Hackerberg');
    const startDate = formatGermanDate(booking.startDate);
    const endDate = formatGermanDate(booking.endDate);
    const invoiceNumber = `FD-${formatGermanDate(booking.createdAt)}`;

    // Betreff je nach Typ
    let subject;
    if (type === 'inquiry-confirmation') {
      subject = `Buchungsanfrage erhalten: ${wohnungName} (${startDate} - ${endDate})`;
    } else {
      // Zeige Gesamtzeitraum für Teilbuchungen
      const displayStartDate = booking.originalStartDate ? formatGermanDate(booking.originalStartDate) : startDate;
      const displayEndDate = booking.originalEndDate ? formatGermanDate(booking.originalEndDate) : endDate;
      const isFollowUpInvoice = Boolean(booking.isFollowUpInvoice);
      subject = type === 'invoice-resend'
        ? `Aktualisierte Rechnung: ${wohnungName} (${startDate} - ${endDate})`
        : `${isFollowUpInvoice ? 'Folgebuchung bestätigt' : 'Buchungsbestätigung'}: ${wohnungName} (${displayStartDate} - ${displayEndDate})`;
    }

    // Berechne weitere Variablen nur wenn nicht Inquiry
    const displayStartDate = booking.originalStartDate ? formatGermanDate(booking.originalStartDate) : startDate;
    const displayEndDate = booking.originalEndDate ? formatGermanDate(booking.originalEndDate) : endDate;
    const isSplitBooking = Boolean(booking.originalStartDate);
    const isFollowUpInvoice = Boolean(booking.isFollowUpInvoice);
    const isFinalFollowUpInvoice = isFollowUpInvoice && Number(booking.nights || 0) < 28;
    const showCheckoutTime = !isSplitBooking || isFinalFollowUpInvoice;
    const periodStartLabel = isFollowUpInvoice ? 'Buchungsbeginn:' : (booking.originalStartDate ? 'Anreisedatum:' : 'Anreise:');
    const periodEndLabel = isFollowUpInvoice ? 'Buchungsende:' : (booking.originalStartDate ? 'Letzter Tag dieser Rechnung:' : 'Abreise:');
    const periodStartValue = isFollowUpInvoice ? startDate : `${startDate} (16:00-19:00 Uhr)`;
    const periodEndValue = isFollowUpInvoice
      ? (isFinalFollowUpInvoice ? `${endDate} (Check-out bis 10:00 Uhr)` : endDate)
      : (booking.originalStartDate ? endDate : `${endDate} (bis 10:00 Uhr)`);

    const htmlContent = type === 'inquiry-confirmation'
      ? `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Vielen Dank für Ihre Buchungsanfrage!</h2>
        <p>Sehr geehrte Damen und Herren${booking.company ? ' von ' + booking.company : ''},</p>
        <p>wir haben Ihre unverbindliche Buchungsanfrage erhalten und werden diese schnellstmöglich prüfen und uns mit Ihnen in Verbindung setzen.</p>
        
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #374151;">Ihre Anfrage-Details</h3>
          <div style="background-color: #fef3c7; padding: 12px; border-radius: 8px; margin-bottom: 14px; border-left: 4px solid #fbbf24; color: #92400e;">
            <strong>Status:</strong> Unverbindliche Anfrage - wird in Kürze geprüft
          </div>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; width: 35%;"><strong>Kontaktperson:</strong></td>
              <td>${booking.name || '-'}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0;"><strong>Firma:</strong></td>
              <td>${booking.company || '-'}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0;"><strong>E-Mail:</strong></td>
              <td>${booking.email || '-'}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0;"><strong>Telefon:</strong></td>
              <td>${booking.phone || '-'}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0;"><strong>Rechnungsadresse:</strong></td>
              <td>${booking.street || '-'}, ${booking.zip || '-'} ${booking.city || '-'}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0;"><strong>Wohnung:</strong></td>
              <td>${wohnungName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0;"><strong>Anreise:</strong></td>
              <td>${startDate} (16:00-19:00 Uhr)</td>
            </tr>
            <tr>
              <td style="padding: 8px 0;"><strong>Abreise:</strong></td>
              <td>${endDate} (bis 10:00 Uhr)</td>
            </tr>
            <tr>
              <td style="padding: 8px 0;"><strong>Nächte:</strong></td>
              <td>${booking.nights}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0;"><strong>Personen:</strong></td>
              <td>${booking.people}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0;"><strong>Gesamtpreis:</strong></td>
              <td><strong>${booking.total.toFixed(2)} €</strong></td>
            </tr>
          </table>
        </div>
        
        <div style="background-color: #eef6ff; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #60a5fa;">
          <p style="margin: 5px 0; color: #1e3a8a;">
            <strong>Was ist der nächste Schritt?</strong><br>
            Wir kontaktieren Sie in Kürze per Telefon oder E-Mail, um die Details zu besprechen und Ihre Anfrage zu bestätigen. Der oben angegebene Betrag ist eine geschätzte Summe und dient nur zur Information.
          </p>
        </div>
        
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
        <p>Bei Fragen oder Wünschen stehen wir Ihnen gerne zur Verfügung.</p>
        <p>
          Mit freundlichen Grüßen<br>
          <strong>Christine Dumser</strong><br>
          Ferienwohnungen Christine Dumser<br>
          Frühlingstr. 8<br>
          82152 Krailling b. München<br>
          Tel: +49(0)89 8571174<br>
          Email: ${fromAddress}
        </p>
      </div>
    `
      : `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">${type === 'invoice-resend' ? 'Aktualisierte Rechnung' : 'Vielen Dank für Ihre Buchung!'}</h2>
        <p>Sehr geehrte Damen und Herren${booking.company ? ' von ' + booking.company : ''},</p>
        <p>${type === 'invoice-resend'
          ? 'anbei erhalten Sie die aktualisierten Rechnungsdaten. Die Rechnung ist dieser E-Mail als PDF-Anhang beigefügt.'
          : (isFollowUpInvoice
            ? 'Ihre Folgebuchung wurde erfolgreich erstellt. Anbei finden Sie die Rechnung als PDF.'
            : 'Ihre Buchung wurde erfolgreich bestätigt. Anbei finden Sie die Rechnung als PDF.')}</p>
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #374151;">Buchungsdetails</h3>
          ${isFollowUpInvoice ? `
          <div style="background-color: #eef6ff; padding: 12px; border-radius: 8px; margin-bottom: 14px; border-left: 4px solid #60a5fa; color: #1e3a8a;">
            <strong>Hinweis:</strong> Diese Rechnung betrifft eine Folgebuchung.
          </div>
          ` : ''}
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; width: 35%;"><strong>Kontaktperson:</strong></td>
              <td>${booking.name || '-'}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0;"><strong>Firma:</strong></td>
              <td>${booking.company || '-'}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0;"><strong>E-Mail:</strong></td>
              <td>${booking.email || '-'}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0;"><strong>Telefon:</strong></td>
              <td>${booking.phone || '-'}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0;"><strong>Rechnungsadresse:</strong></td>
              <td>${booking.street || '-'}, ${booking.zip || '-'} ${booking.city || '-'}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0;"><strong>Wohnung:</strong></td>
              <td>${wohnungName}</td>
            </tr>
            ${booking.originalStartDate ? `
            <tr>
              <td style="padding: 8px 0;"><strong>Gesamtzeitraum Ihrer Buchung:</strong></td>
              <td>${formatGermanDate(booking.originalStartDate)} bis ${formatGermanDate(booking.originalEndDate)} (${booking.totalNights} Nächte)</td>
            </tr>
            ` : ''}
            <tr>
              <td style="padding: 8px 0;"><strong>${periodStartLabel}</strong></td>
              <td>${periodStartValue}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0;"><strong>${periodEndLabel}</strong></td>
              <td>${periodEndValue}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0;"><strong>${booking.originalStartDate ? 'Nächte dieser Rechnung:' : 'Nächte:'}</strong></td>
              <td>${booking.nights}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0;"><strong>Personen:</strong></td>
              <td>${booking.people}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0;"><strong>${booking.originalStartDate ? 'Betrag dieser Rechnung:' : 'Gesamtbetrag:'}</strong></td>
              <td><strong>${booking.total.toFixed(2)} €</strong></td>
            </tr>
            <tr>
              <td style="padding: 8px 0;"><strong>Rechnungsnummer:</strong></td>
              <td>${invoiceNumber}</td>
            </tr>
          </table>
          ${booking.originalStartDate ? `
          <div style="background-color: #eef6ff; padding: 15px; border-radius: 8px; margin-top: 15px; border-left: 4px solid #60a5fa;">
            <p style="margin: 0 0 10px 0; color: #1e3a8a; font-weight: bold;">Gut zu wissen zu Ihrer Langzeitbuchung:</p>
            <p style="margin: 0; color: #1e3a8a; font-size: 13px; line-height: 1.5;">
              Wir rechnen längere Aufenthalte in 28-Tage-Zyklen ab. Diese erste Rechnung deckt die ersten 4 Wochen (28 Nächte) ab.<br><br>
              Für die verbleibenden ${booking.totalNights - 28} Nächte erhalten Sie rechtzeitig automatisch eine Folgerechnung - Sie müssen nichts weiter tun.
            </p>
          </div>
          ` : ''}
        </div>
        ${!isFollowUpInvoice ? `
        <div style="margin: 30px 0;">
          <h3 style="color: #374151;">Schlüsselübergabe:</h3>
          <p style="margin: 5px 0;">Frühlingstraße 8<br>82152 Krailling b. München</p>
        </div>
        ` : ''}
        ${!isFollowUpInvoice ? `
        <div style="margin: 30px 0;">
          <h3 style="color: #374151;">Check-In / Check-Out:</h3>
          <p style="margin: 5px 0;">
            <strong>Anreise:</strong> 16:00 - 19:00 Uhr${showCheckoutTime ? '<br><strong>Abreise:</strong> bis 10:00 Uhr' : ''}
          </p>
        </div>
        ` : ''}
        ${isFinalFollowUpInvoice ? `
        <div style="margin: 30px 0;">
          <h3 style="color: #374151;">Check-out:</h3>
          <p style="margin: 5px 0;">
            <strong>Buchungsende:</strong> bis 10:00 Uhr<br>
            Bitte lassen Sie den Schlüssel beim Check-out auf dem Tisch liegen.
          </p>
        </div>
        ` : ''}
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
        <p>Bei Fragen oder Wünschen stehen wir Ihnen gerne zur Verfügung.</p>
        <p>
          Mit freundlichen Grüßen<br>
          <strong>Christine Dumser</strong><br>
          Ferienwohnungen Christine Dumser<br>
          Frühlingstr. 8<br>
          82152 Krailling b. München<br>
          Tel: +49(0)89 8571174<br>
          Email: ${fromAddress}
        </p>
      </div>
    `;

    const sendOwnerCopy = ownerInbox && ownerInbox.toLowerCase() !== String(booking.email || '').toLowerCase();

    // Mailjet API Payload
    const mailjetPayload = {
      Messages: [
        {
          From: {
            Email: fromAddress,
            Name: fromName
          },
          To: [
            {
              Email: booking.email,
              Name: booking.name || ""
            }
          ],
          Subject: subject,
          HTMLPart: htmlContent,
          ...(invoicePDF ? {
            Attachments: [
              {
                ContentType: "application/pdf",
                Filename: invoicePDF.fileName,
                Base64Content: invoicePDF.buffer.toString('base64')
              }
            ]
          } : {})
        },
        ...(sendOwnerCopy
          ? [{
              From: {
                Email: fromAddress,
                Name: fromName
              },
              To: [
                {
                  Email: ownerInbox,
                  Name: "Owner Copy"
                }
              ],
              Subject: `[Kopie] ${subject}`,
              HTMLPart: htmlContent,
              ...(invoicePDF ? {
                Attachments: [
                  {
                    ContentType: "application/pdf",
                    Filename: invoicePDF.fileName,
                    Base64Content: invoicePDF.buffer.toString('base64')
                  }
                ]
              } : {})
            }]
          : [])
      ]
    };

    console.log('\n📋 Email-Einstellungen:');
    console.log('  An:', booking.email, '(' + (booking.name || 'kein Name') + ')');
    console.log('  Von:', fromAddress);
    console.log('  Interne Kopie an:', sendOwnerCopy ? ownerInbox : 'deaktiviert (gleich wie Empfänger oder leer)');
    console.log('  Betreff:', subject);
    console.log('  HTML-Länge:', htmlContent.length, 'Zeichen');
    if (invoicePDF) {
      console.log('  Anhänge: 1');
      console.log('    [1]', invoicePDF.fileName, '(', (invoicePDF.buffer.length / 1024).toFixed(2), 'KB)');
    } else {
      console.log('  Anhänge: 0 (Buchungsanfrage ohne PDF)');
    }
    console.log('  Payload-Größe:', JSON.stringify(mailjetPayload).length, 'Bytes');

    // Sende Email via Mailjet API
    console.log('\n📤 VERSENDE EMAIL VIA MAILJET API...');
    console.log('  Endpoint: POST https://api.mailjet.com/v3.1/send');
    console.log('  Authentifizierung: Basic Auth');
    
    const authString = Buffer.from(`${mailjetApiKey}:${mailjetSecretKey}`).toString('base64');
    
    try {
      console.log('⏳ Sende HTTP Request...');
      const response = await fetch('https://api.mailjet.com/v3.1/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${authString}`
        },
        body: JSON.stringify(mailjetPayload)
      });

      console.log('📡 HTTP Response Status:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('\n❌❌❌ MAILJET API FEHLER');
        console.error('   HTTP Status:', response.status);
        console.error('   Status Text:', response.statusText);
        console.error('   Response Body:', errorText);
        console.log('╚══════════════════════════════════════════════════════════╝\n');
        
        return {
          status: 'failed',
          error: `Mailjet API Error: ${response.status} ${response.statusText}`,
          httpStatus: response.status,
          details: errorText
        };
      }

      const result = await response.json();
      console.log('✅ EMAIL ERFOLGREICH VERSENDET!');
      console.log('   Mailjet Response:', JSON.stringify(result, null, 2));
      
      const messageInfo = result?.Messages?.[0];
      if (messageInfo) {
        console.log('   Status:', messageInfo.Status);
        console.log('   Message ID:', messageInfo.To?.[0]?.MessageID);
        console.log('   Message UUID:', messageInfo.To?.[0]?.MessageUUID);
      }

      console.log('\n╔══════════════════════════════════════════════════════════╗');
      console.log('║         EMAIL SERVICE - ERFOLGREICH ✅✅✅                ║');
      console.log('╚══════════════════════════════════════════════════════════╝');
      console.log('📬 Empfänger:', booking.email);
      console.log('📡 Mailjet Status:', messageInfo?.Status || 'success');
      console.log('╚══════════════════════════════════════════════════════════╝\n');

      return { 
        status: 'sent', 
        messageId: messageInfo?.To?.[0]?.MessageID || 'unknown',
        mailjetResponse: result
      };

    } catch (fetchError) {
      console.error('\n❌❌❌ FETCH FEHLER');
      console.error('   Fehler:', fetchError.message || fetchError);
      console.error('   Name:', fetchError.name);
      console.error('   Code:', fetchError.code);
      if (fetchError.stack) {
        console.error('   Stack:', fetchError.stack);
      }
      console.log('╚══════════════════════════════════════════════════════════╝\n');
      
      return {
        status: 'failed',
        error: fetchError.message,
        code: fetchError.code
      };
    }

  } catch (error) {
    console.error('\n╔══════════════════════════════════════════════════════════╗');
    console.error('║        EMAIL SERVICE - KRITISCHER FEHLER ❌❌❌           ║');
    console.error('╚══════════════════════════════════════════════════════════╝');
    console.error('   Fehler:', error.message || error);
    console.error('   Name:', error.name);
    console.error('   Code:', error.code);
    if (error.stack) {
      console.error('   Stack:', error.stack);
    }
    console.log('╚══════════════════════════════════════════════════════════╝\n');
    return {
      status: 'failed',
      error: error.message,
      code: error.code
    };
  }
}

/**
 * Sendet ein standardisiertes Angebot per E-Mail an den Kunden.
 * Enthält Preise und einen "Angebot annehmen" Link.
 */
export async function sendOfferEmail(booking) {
  try {
    const baseUrl = getPublicAppUrl();
    const acceptLinkBase = `${baseUrl}/angebot-annehmen/${booking._id}`;

    const { buffer: pdfBuffer, fileName } = await generateInvoice(booking, true);

    const offerOptions = normalizeOfferOptions(booking.offerApartmentOptions, booking.wohnung);
    const variants = buildOfferVariantsFromBooking(booking, offerOptions);
    const primaryVariant = variants[0] || null;

    let wohnungName = getOfferOptionLabel(primaryVariant?.option || booking.wohnung || 'hackerberg');

    const startDate = formatGermanDate(booking.originalStartDate || booking.startDate);
    const endDate = formatGermanDate(booking.originalEndDate || booking.endDate);
    const fromAddress = process.env.EMAIL_FROM || 'karl658@hotmail.de';

    const variantCardsHtml = variants.map((variant) => {
      const info = getApartmentInfoForOption(variant.option);
      const acceptLink = `${acceptLinkBase}?option=${encodeURIComponent(variant.option)}`;
      const previewImages = getApartmentPreviewImages(variant.option, 4);
      const imageHtml = previewImages.length > 0
        ? `<div style="margin-top: 12px; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px;">${previewImages
          .map((entry) => `<img src="${baseUrl}/${entry.folder}/${entry.image}" alt="${entry.apartmentLabel}" style="width: 100%; max-width: 260px; height: 110px; object-fit: cover; border-radius: 8px; border: 1px solid #e5e7eb;"/>`)
          .join('')}</div>`
        : '';

      const featuresHtml = (info?.features || []).slice(0, 6).map((feature) => `<li style="margin-bottom: 4px;">${feature}</li>`).join('');

      return `
        <div style="border: 1px solid #dbeafe; border-radius: 12px; padding: 16px; margin-top: 14px; background: #f8fbff;">
          <h3 style="margin: 0 0 8px 0; color: #1d4ed8;">${variant.label}</h3>
          <div style="font-size: 14px; color: #1f2937; line-height: 1.5;">
            <p style="margin: 0 0 6px 0;"><strong>Adresse:</strong> ${info?.address || '-'}</p>
            <p style="margin: 0 0 6px 0;"><strong>Zimmer/Flaeche:</strong> ${(info?.rooms || '-')}${info?.area ? `, ${info.area}` : ''}</p>
            <p style="margin: 0 0 6px 0;"><strong>Beschreibung:</strong> ${info?.description || '-'}</p>
            <p style="margin: 0 0 6px 0;"><strong>Details:</strong> ${info?.details || '-'}</p>
          </div>
          ${featuresHtml ? `<ul style="margin: 10px 0 0 18px; padding: 0; color: #374151; font-size: 13px;">${featuresHtml}</ul>` : ''}
          ${imageHtml}
          <div style="margin-top: 14px; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 10px;">
            <p style="margin: 0 0 6px 0;"><strong>Preis pro Nacht:</strong> ${Number(variant.pricePerNight || 0).toFixed(2)} EUR</p>
            <p style="margin: 0 0 6px 0;"><strong>Naechte:</strong> ${Number(variant.nights || 0)}</p>
            <p style="margin: 0 0 6px 0;"><strong>Reinigung:</strong> ${Number(variant.cleaningFee || 0).toFixed(2)} EUR</p>
            <p style="margin: 0; font-size: 17px; color: #1d4ed8;"><strong>Gesamtpreis: ${Number(variant.total || 0).toFixed(2)} EUR</strong></p>
          </div>
          <div style="text-align: center; margin-top: 14px;">
            <a href="${acceptLink}" style="background-color: #10b981; color: white; padding: 12px 18px; text-decoration: none; font-size: 15px; font-weight: bold; border-radius: 8px; display: inline-block;">${variant.label} jetzt annehmen</a>
          </div>
        </div>
      `;
    }).join('');

    const optionHint = variants.length > 1
      ? '<p style="margin-top: 8px; color: #0f766e;"><strong>Hinweis:</strong> Sie koennen zwischen den angebotenen Wohnungsoptionen waehlen - auch erst auf der Angebotsseite nach Klick auf einen Annahme-Button.</p>'
      : '';
    
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Ihr Angebot für eine Monteurwohnung</h2>
        <p>Sehr geehrte Damen und Herren${booking.company ? ' von ' + booking.company : ''},</p>
        <p>vielen Dank für Ihre Anfrage. Wir freuen uns, Ihnen hiermit ein Angebot für Ihren gewünschten Aufenthalt unterbreiten zu können.</p>
        
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #374151;">Rahmendaten Ihres Angebots</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0;"><strong>Zeitraum:</strong></td>
              <td>${startDate} bis ${endDate}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0;"><strong>Nächte:</strong></td>
              <td>${Number(booking.totalNights || booking.nights || 0)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0;"><strong>Personen:</strong></td>
              <td>${booking.people}</td>
            </tr>
          </table>
          ${optionHint}
          <p style="margin-top: 10px; font-size: 12px; color: #666;"><strong>Wichtiger Hinweis:</strong> Die genaue Aufschluesselung aller Preispositionen finden Sie im angehaengten PDF-Angebot.</p>
        </div>

        <h3 style="color: #1f2937; margin: 24px 0 8px 0;">Wohnungsdetails und Auswahl</h3>
        ${variantCardsHtml}
        
        <p style="margin: 16px 0; font-size: 12px; color: #6b7280;">Falls Ihr Mailprogramm Bilder blockiert, sehen Sie alle Inhalte auch direkt hier: <a href="${acceptLinkBase}">${acceptLinkBase}</a></p>
        
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
        <p>Bei Fragen melden Sie sich bitte direkt bei Karl Dumser unter 015221557400.</p>
        <p>
          Mit freundlichen Grüßen<br>
          <strong>Christine Dumser</strong><br>
          Ferienwohnungen Christine Dumser<br>
          Frühlingstr. 8<br>
          82152 Krailling b. München<br>
          Tel: +49(0)89 8571174<br>
          Email: ${fromAddress}
        </p>
      </div>
    `;

    const ownerCopyHtmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #fff7ed; border: 1px solid #fdba74; color: #9a3412; padding: 12px 14px; border-radius: 8px; margin: 0 0 16px 0; font-weight: bold;">
          KOPIE: Diese Angebots-E-Mail wurde als interne Kopie an Sie gesendet.
        </div>
        ${htmlContent}
      </div>
    `;

    // Mailjet Payload (vereinfacht, wie in sendBookingConfirmation)
    const payload = {
      Messages: [{
        From: { Email: fromAddress, Name: process.env.EMAIL_FROM_NAME || 'Monteurwohnungen Dumser' },
        To: [{ Email: booking.email }],
        Subject: `Angebot: ${wohnungName} (${startDate} - ${endDate})`,
        HTMLPart: htmlContent,
        Attachments: [
          {
            ContentType: 'application/pdf',
            Filename: fileName,
            Base64Content: pdfBuffer.toString('base64')
          }
        ]
      }]
    };
    
    // Configured Owner Inbox for internal copy (separate message with disclaimer)
    const configuredOwnerInbox = String(process.env.BOOKING_OWNER_EMAIL || '').trim().toLowerCase();
    const ownerInbox = (!configuredOwnerInbox || configuredOwnerInbox === 'karl658@hotmail.de' || configuredOwnerInbox === 'karl658@hotamil.de') ? 'monteur-wohnung@dumser.net' : configuredOwnerInbox;
    if (ownerInbox && ownerInbox.toLowerCase() !== booking.email.toLowerCase()) {
      payload.Messages.push({
        From: { Email: fromAddress, Name: process.env.EMAIL_FROM_NAME || 'Monteurwohnungen Dumser' },
        To: [{ Email: ownerInbox, Name: 'Owner Copy' }],
        Subject: `[Kopie] Angebot: ${wohnungName} (${startDate} - ${endDate})`,
        HTMLPart: ownerCopyHtmlContent,
        Attachments: [
          {
            ContentType: 'application/pdf',
            Filename: fileName,
            Base64Content: pdfBuffer.toString('base64')
          }
        ]
      });
    }

    const response = await fetch('https://api.mailjet.com/v3.1/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Basic ' + Buffer.from(`${process.env.MAILJET_API_KEY}:${process.env.MAILJET_SECRET_KEY}`).toString('base64')
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Mailjet API Request failed with status ${response.status}`);
    }

    return { status: 'sent' };
  } catch (err) {
    console.error('Fehler beim Senden der Angebots-Email:', err);
    return { status: 'failed', error: err.message };
  }
}

/**
 * Sendet eine E-Mail an den Kunden, um fehlende Daten nachzufordern.
 */
export async function sendMissingDataEmail(booking) {
  try {
    const baseUrl = getPublicAppUrl();
    // Dies löst das Frontend-Formular für fehlende Daten auf, was wir bauen müssen.
    const formLink = `${baseUrl}/daten-vervollstaendigen/${booking._id}`;
    const fromAddress = process.env.EMAIL_FROM || 'karl658@hotmail.de';

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #ea580c;">Wichtige Daten für Ihre Buchung fehlen</h2>
        <p>Sehr geehrte Damen und Herren${booking.company ? ' von ' + booking.company : ''},</p>
        <p>vielen Dank für die Annahme unseres Angebotes! Um Ihre Buchung verbindlich abzuschließen und die korrekte Rechnung für Sie erstellen zu können, benötigen wir noch Ihre vollständige Rechnungsadresse und/oder Telefonnummer.</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${formLink}" style="background-color: #ea580c; color: white; padding: 15px 30px; text-decoration: none; font-size: 16px; font-weight: bold; border-radius: 8px; display: inline-block;">Fehlende Daten eintragen</a>
        </div>
        
        <p>Sobald Sie die Daten eingegeben haben, erhalten Sie sofort im Anschluss Ihre gültige Buchungsbestätigung inkl. Rechnung per E-Mail.</p>
        
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
        <p>
          Mit freundlichen Grüßen<br>
          <strong>Christine Dumser</strong><br>
        </p>
      </div>
    `;

    const payload = {
      Messages: [{
        From: { Email: fromAddress, Name: process.env.EMAIL_FROM_NAME || 'Monteurwohnungen Dumser' },
        To: [{ Email: booking.email }],
        Subject: 'Wichtig: Rechnungsdaten vervollständigen',
        HTMLPart: htmlContent
      }]
    };

    const response = await fetch('https://api.mailjet.com/v3.1/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Basic ' + Buffer.from(`${process.env.MAILJET_API_KEY}:${process.env.MAILJET_SECRET_KEY}`).toString('base64')
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) throw new Error(`Mailjet API ${response.status}`);
    return { status: 'sent' };
  } catch (err) {
    console.error('Fehler beim Senden der Daten-Anfrage:', err);
    return { status: 'failed' };
  }
}

/**
 * Formatiert Date Object zu deutschem Datumsformat DD.MM.YYYY
 */
function formatGermanDate(date) {
  if (!date) return '';
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}.${month}.${year}`;
}

function normalizeUrl(value) {
  return String(value || '').trim().replace(/\/$/, '');
}

function isLocalUrl(value) {
  const normalized = normalizeUrl(value).toLowerCase();
  return normalized.includes('localhost') || normalized.includes('127.0.0.1');
}

function getPublicAppUrl() {
  const directCandidates = [
    process.env.APP_URL,
    process.env.PUBLIC_APP_URL,
    process.env.FRONTEND_URL,
    process.env.WEBSITE_URL,
    process.env.VITE_URL
  ].map(normalizeUrl).filter(Boolean);

  const firstDirect = directCandidates.find((entry) => !isLocalUrl(entry));
  if (firstDirect) {
    return firstDirect;
  }

  const railwayDomain = normalizeUrl(process.env.RAILWAY_PUBLIC_DOMAIN);
  if (railwayDomain) {
    return railwayDomain.startsWith('http') ? railwayDomain : `https://${railwayDomain}`;
  }

  const apiUrl = normalizeUrl(process.env.API_URL).replace(/\/api\/?$/i, '');
  if (apiUrl && !isLocalUrl(apiUrl)) {
    return apiUrl;
  }

  if (process.env.NODE_ENV === 'production') {
    return 'https://monteurwohnung-dumser.de';
  }

  return 'http://localhost:5173';
}
