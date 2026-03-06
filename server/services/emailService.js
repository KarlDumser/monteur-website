import { generateInvoice } from './invoiceGenerator.js';

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
    const ownerInbox = process.env.BOOKING_OWNER_EMAIL || 'karl658@hotmail.de';
    
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
    console.log('   Owner Inbox (BCC):', ownerInbox);
    console.log('   Email-Typ:', type);
    console.log('   Empfänger:', booking.email);

    // Generiere PDF-Rechnung
    console.log('\n📄 Generiere PDF-Rechnung...');
    const invoicePDF = await generateInvoice(booking);
    console.log('✅ PDF-Rechnung erstellt');
    console.log('   Dateiname:', invoicePDF.fileName);
    console.log('   Größe:', (invoicePDF.buffer.length / 1024).toFixed(2), 'KB');


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

    // Betreff je nach Typ - zeige Gesamtzeitraum für Teilbuchungen
    const displayStartDate = booking.originalStartDate ? formatGermanDate(booking.originalStartDate) : startDate;
    const displayEndDate = booking.originalEndDate ? formatGermanDate(booking.originalEndDate) : endDate;
    const subject = type === 'invoice-resend'
      ? `Aktualisierte Rechnung: ${wohnungName} (${startDate} - ${endDate})`
      : `Buchungsbestätigung: ${wohnungName} (${displayStartDate} - ${displayEndDate})`;

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">${type === 'invoice-resend' ? 'Aktualisierte Rechnung' : 'Vielen Dank für Ihre Buchung!'}</h2>
        <p>Sehr geehrte Damen und Herren${booking.company ? ' von ' + booking.company : ''},</p>
        <p>${type === 'invoice-resend' 
          ? 'anbei erhalten Sie die aktualisierten Rechnungsdaten. Die Rechnung ist dieser E-Mail als PDF-Anhang beigefügt.'
          : 'Ihre Buchung wurde erfolgreich bestätigt. Anbei finden Sie die Rechnung als PDF.'}</p>
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #374151;">Buchungsdetails</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0;"><strong>Wohnung:</strong></td>
              <td>${wohnungName}</td>
            </tr>
            ${booking.originalStartDate ? `
            <tr style="background-color: #fef3c7;">
              <td style="padding: 8px 0;"><strong style="color: #92400e;">Gesamtzeitraum Ihrer Buchung:</strong></td>
              <td style="color: #92400e;">${formatGermanDate(booking.originalStartDate)} bis ${formatGermanDate(booking.originalEndDate)} (${booking.totalNights} Nächte)</td>
            </tr>
            ` : ''}
            <tr>
              <td style="padding: 8px 0;"><strong>${booking.originalStartDate ? 'Diese Rechnung - Anreise:' : 'Anreise:'}</strong></td>
              <td>${startDate} (16:00-19:00 Uhr)</td>
            </tr>
            <tr>
              <td style="padding: 8px 0;"><strong>${booking.originalStartDate ? 'Diese Rechnung - Abreise:' : 'Abreise:'}</strong></td>
              <td>${endDate} (bis 10:00 Uhr)</td>
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
          <div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; margin-top: 15px; border-left: 4px solid #f59e0b;">
            <p style="margin: 0 0 10px 0; color: #92400e; font-weight: bold;">ℹ️ Hinweis zu Ihrer Langzeitbuchung:</p>
            <p style="margin: 0; color: #92400e; font-size: 13px; line-height: 1.5;">
              Diese erste Rechnung gilt für die ersten 4 Wochen (28 Nächte). Für die verbleibenden ${booking.totalNights - 28} Nächte erhalten Sie etwa eine Woche vor Ablauf dieser 4 Wochen automatisch die nächste Rechnung.<br><br>
              <strong>Wiederholungsrechnungen werden jeweils 1 Woche vor Ablauf eines jeden 4-Wochen-Zyklus erstellt.</strong>
            </p>
          </div>
          ` : ''}
        </div>
        <div style="margin: 30px 0;">
          <h3 style="color: #374151;">Schlüsselübergabe:</h3>
          <p style="margin: 5px 0;">Frühlingstraße 8<br>82152 Krailling b. München</p>
        </div>
        <div style="margin: 30px 0;">
          <h3 style="color: #374151;">Check-In / Check-Out:</h3>
          <p style="margin: 5px 0;">
            <strong>Anreise:</strong> 16:00 - 19:00 Uhr<br>
            <strong>Abreise:</strong> bis 10:00 Uhr
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
    `;

    // Mailjet API Payload
    const mailjetPayload = {
      Messages: [
        {
          From: {
            Email: fromAddress,
            Name: "Ferienwohnungen Dumser"
          },
          To: [
            {
              Email: booking.email,
              Name: booking.name || ""
            }
          ],
          Bcc: [
            {
              Email: ownerInbox,
              Name: "Owner Copy"
            }
          ],
          Subject: subject,
          HTMLPart: htmlContent,
          Attachments: [
            {
              ContentType: "application/pdf",
              Filename: invoicePDF.fileName,
              Base64Content: invoicePDF.buffer.toString('base64')
            }
          ]
        }
      ]
    };

    console.log('\n📋 Email-Einstellungen:');
    console.log('  An:', booking.email, '(' + (booking.name || 'kein Name') + ')');
    console.log('  Von:', fromAddress);
    console.log('  BCC:', ownerInbox);
    console.log('  Betreff:', subject);
    console.log('  HTML-Länge:', htmlContent.length, 'Zeichen');
    console.log('  Anhänge: 1');
    console.log('    [1]', invoicePDF.fileName, '(', (invoicePDF.buffer.length / 1024).toFixed(2), 'KB)');
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
