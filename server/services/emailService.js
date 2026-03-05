import { generateInvoice } from './invoiceGenerator.js';

/**
 * Sendet Buchungsbestätigung mit Rechnung als PDF-Anhang
 * @param {Object} booking - Vollständiges Booking-Objekt aus MongoDB
 * @param {string} type - Optional: 'invoice-resend' für Rechnungsverschicken
 */
export async function sendBookingConfirmation(booking, type = 'confirmation') {
  try {
    // ========== DEBUG: Umgebungsvariablen prüfen ==========
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('📧 EMAIL SERVICE - START');
    console.log('═══════════════════════════════════════════════════════');
    
    console.log('🔧 Umgebungsvariablen:');
    console.log('  SMTP_HOST:', process.env.SMTP_HOST);
    console.log('  SMTP_PORT:', process.env.SMTP_PORT);
    console.log('  SMTP_USER:', process.env.SMTP_USER);
    console.log('  SMTP_PASSWORD vorhanden:', !!process.env.SMTP_PASSWORD);
    console.log('  NODE_ENV:', process.env.NODE_ENV);
    
    // Prüfe ob SMTP konfiguriert ist
    const smtpPassword = process.env.SMTP_PASSWORD;
    const smtpUser = process.env.SMTP_USER;
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = process.env.SMTP_PORT;
    const smtpPortNumber = parseInt(smtpPort || '587', 10);
    const smtpSecure = process.env.SMTP_SECURE
      ? process.env.SMTP_SECURE === 'true'
      : smtpPortNumber === 465;
    const fromAddress = process.env.EMAIL_FROM || process.env.SMTP_FROM || `Ferienwohnungen Dumser <${smtpUser}>`;
    const ownerInbox = process.env.BOOKING_OWNER_EMAIL || 'karl658@hotmail.de';
    
    if (!smtpPassword || !smtpUser || !smtpHost) {
      console.error('❌ SMTP nicht vollständig konfiguriert!');
      console.error('   Host:', smtpHost ? '✓' : '✗ FEHLT');
      console.error('   User:', smtpUser ? '✓' : '✗ FEHLT');
      console.error('   Password:', smtpPassword ? '✓' : '✗ FEHLT');
      return { 
        status: 'skipped', 
        reason: 'SMTP nicht konfiguriert',
        details: `Host:${!smtpHost}, User:${!smtpUser}, Pass:${!smtpPassword}`
      };
    }

    console.log('✓ SMTP-Konfiguration vollständig');
    console.log('📧 Email-Typ:', type);
    console.log('📧 Empfänger:', booking.email);
    console.log('📧 Buchungs-ID:', booking._id);

    // Lade nodemailer dynamisch
    console.log('\n📦 Lade nodemailer...');
    let nodemailer;
    try {
      const mod = await import('nodemailer');
      nodemailer = mod.default || mod;
      console.log('✅ nodemailer erfolgreich geladen');
      console.log('   Version:', nodemailer.version || 'unbekannt');
    } catch (importError) {
      console.error('❌ nodemailer Import fehlgeschlagen:', importError.message);
      return { status: 'skipped', reason: 'nodemailer import failed', error: importError.message };
    }

    if (!nodemailer || !nodemailer.createTransport) {
      console.error('❌ nodemailer.createTransport nicht verfügbar');
      return { status: 'skipped', reason: 'nodemailer createTransport missing' };
    }

    // Generiere PDF-Rechnung
    console.log('\n📄 Generiere PDF-Rechnung...');
    const invoicePDF = await generateInvoice(booking);
    console.log('✅ PDF-Rechnung erstellt');
    console.log('   Dateiname:', invoicePDF.fileName);
    console.log('   Größe:', (invoicePDF.buffer.length / 1024).toFixed(2), 'KB');

    // Erstelle Transporter mit Konfiguration
    console.log('\n🔗 Erstelle SMTP-Transporter...');
    const transporterConfig = {
      host: smtpHost,
      port: smtpPortNumber,
      secure: smtpSecure,
      auth: {
        user: smtpUser,
        pass: smtpPassword
      },
      tls: {
        rejectUnauthorized: false
      },
      logger: true,
      debug: true
    };
    
    console.log('  Konfiguration:');
    console.log('    Host:', transporterConfig.host);
    console.log('    Port:', transporterConfig.port);
    console.log('    Secure:', transporterConfig.secure);
    console.log('    TLS RejectUnauthorized:', transporterConfig.tls.rejectUnauthorized);
    
    const transporter = nodemailer.createTransport(transporterConfig);
    console.log('✅ Transporter erstellt');

    // Teste Verbindung mit Timeout
    console.log('\n🔐 Teste SMTP-Verbindung (Timeout: 10s)...');
    try {
      const verifyPromise = transporter.verify();
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('SMTP verify timeout nach 10 Sekunden')), 10000)
      );
      
      await Promise.race([verifyPromise, timeoutPromise]);
      console.log('✅ SMTP-Verbindung erfolgreich!');
    } catch (verifyError) {
      console.warn('⚠️ SMTP-Verbindungstest fehlgeschlagen:', verifyError.message);
      console.warn('   Code:', verifyError.code);
      console.warn('   Errno:', verifyError.errno);
      console.warn('   Syscall:', verifyError.syscall);
      console.warn('   Versuche trotzdem zu senden...');
    }

      // Email Optionen
      const wohnungName = booking.wohnungLabel
        || (booking.wohnung === 'neubau'
          ? 'Neubau – Frühlingstraße'
          : booking.wohnung === 'kombi'
            ? 'Kombi-Paket: Hackerberg + Frühlingstraße'
            : 'Hackerberg');
      const startDate = formatGermanDate(booking.startDate);
      const endDate = formatGermanDate(booking.endDate);
      const invoiceNumber = `FD-${formatGermanDate(booking.createdAt)}`;

      // Betreff je nach Typ
      const subject = type === 'invoice-resend'
        ? `Aktualisierte Rechnung: ${wohnungName} (${startDate} - ${endDate})`
        : `Buchungsbestätigung: ${wohnungName} (${startDate} - ${endDate})`;

      const mailOptions = {
        from: fromAddress,
        to: booking.email,
        bcc: ownerInbox,
        replyTo: ownerInbox,
        subject: subject,
        html: `
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
                  <td style="padding: 8px 0;"><strong>Gesamtbetrag:</strong></td>
                  <td><strong>${booking.total.toFixed(2)} €</strong></td>
                </tr>
                <tr>
                  <td style="padding: 8px 0;"><strong>Rechnungsnummer:</strong></td>
                  <td>${invoiceNumber}</td>
                </tr>
              </table>
            </div>
            ${type !== 'invoice-resend' ? `
            <div style="background-color: #dbeafe; padding: 15px; border-radius: 8px; border-left: 4px solid #2563eb; margin: 20px 0;">
              <p style="margin: 0;"><strong>💳 Zahlung:</strong> Der Betrag wurde bereits per Kreditkarte bezahlt.</p>
            </div>
            ` : ''}
            <div style="margin: 30px 0;">
              <h3 style="color: #374151;">Adresse der Wohnung:</h3>
              ${booking.wohnung === 'kombi'
                ? `<p style="margin: 5px 0;">Frühlingstraße 8<br>82152 Krailling b. München</p><p style="margin: 5px 0;">Hackerbergstraße 8<br>82152 Krailling b. München</p>`
                : `<p style="margin: 5px 0;">${booking.wohnung === 'neubau' ? 'Frühlingstraße 8' : 'Hackerbergstraße 8'}<br>82152 Krailling b. München</p>`
              }
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
              Email: karl658@hotmail.de
            </p>
          </div>
        `,
        attachments: [
          {
            filename: invoicePDF.fileName,
            content: invoicePDF.buffer,
            contentType: 'application/pdf'
          }
        ]
      };

      // Zusätzliche Debug-Ausgaben
      console.log('\n📋 Email-Einstellungen:');
      console.log('  An:', mailOptions.to);
      console.log('  Von:', mailOptions.from);
      console.log('  BCC:', mailOptions.bcc);
      console.log('  Betreff:', mailOptions.subject);
      console.log('  HTML-Länge:', mailOptions.html?.length, 'Zeichen');
      console.log('  Anhänge:', mailOptions.attachments?.length || 0);
      if (mailOptions.attachments?.length > 0) {
        mailOptions.attachments.forEach((att, i) => {
          console.log(`    [${i+1}] ${att.filename} (${(att.content.length / 1024).toFixed(2)} KB)`);
        });
      }

      // Sende Email mit Timeout (max 15 Sekunden)
      console.log('\n📤 VERSENDE EMAIL...');
      console.log('  Timeout: 15 Sekunden');
      let info;
      try {
        const sendPromise = transporter.sendMail(mailOptions);
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Email sendmail timeout nach 15 Sekunden - SMTP antwortet nicht')), 15000)
        );
        
        console.log('⏳ Warte auf Versand...');
        info = await Promise.race([sendPromise, timeoutPromise]);
        console.log('✅ EMAIL ERFOLGREICH VERSENDET!');
        console.log('   Message ID:', info.messageId);
        console.log('   SMTP Response:', info.response);
      } catch (sendError) {
        console.error('\n❌ EMAIL-VERSAND FEHLGESCHLAGEN');
        console.error('   Fehler:', sendError.message || sendError);
        console.error('   Code:', sendError.code);
        console.error('   Errno:', sendError.errno);
        console.error('   Syscall:', sendError.syscall);
        if (sendError.response) {
          console.error('   SMTP-Server Response:', sendError.response);
        }
        if (sendError.stack) {
          console.error('   Stack:', sendError.stack);
        }
        return {
          status: 'failed',
          error: sendError.message,
          code: sendError.code,
          errno: sendError.errno,
          syscall: sendError.syscall,
          response: sendError.response
        };
      }

      console.log('\n═══════════════════════════════════════════════════════');
      console.log('✅ EMAIL SERVICE - ERFOLGREICH');
      console.log('═══════════════════════════════════════════════════════\n');
      return { status: 'sent', messageId: info.messageId, response: info.response };
    } catch (error) {
      console.error('\n❌ EMAIL SERVICE - KRITISCHER FEHLER');
      console.error('   Fehler:', error.message || error);
      console.error('   Code:', error.code);
      if (error.stack) {
        console.error('   Stack:', error.stack);
      }
      console.log('═══════════════════════════════════════════════════════\n');
      return {
        status: 'failed',
        error: error.message,
        code: error.code,
        response: error.response
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
