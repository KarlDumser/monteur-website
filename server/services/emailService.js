import { generateInvoice } from './invoiceGenerator.js';

/**
 * Sendet Buchungsbestätigung mit Rechnung als PDF-Anhang
 * @param {Object} booking - Vollständiges Booking-Objekt aus MongoDB
 */
export async function sendBookingConfirmation(booking) {
  try {
    // Prüfe ob SMTP konfiguriert ist
    const smtpPassword = process.env.SMTP_PASSWORD;
    if (!smtpPassword) {
      console.log('ℹ️ SMTP nicht konfiguriert - Email wird übersprungen');
      return { status: 'skipped', reason: 'SMTP_PASSWORD missing' };
    try {
      // Prüfe ob SMTP konfiguriert ist
      const smtpPassword = process.env.SMTP_PASSWORD;
      if (!smtpPassword) {
        console.log('ℹ️ SMTP nicht konfiguriert - Email wird übersprungen');
        return { status: 'skipped', reason: 'SMTP_PASSWORD missing' };
      }

      console.log('📧 Erstelle Buchungsbestätigungs-Email...');

      // Lade nodemailer dynamisch
      let nodemailer;
      try {
        const mod = await import('nodemailer');
        nodemailer = mod.default || mod;
        console.log('✅ nodemailer geladen');
      } catch (importError) {
        console.error('❌ nodemailer Import fehlgeschlagen:', importError.message);
        console.warn('⚠️ Emails deaktiviert');
        return { status: 'skipped', reason: 'nodemailer import failed', error: importError.message };
      }

      if (!nodemailer || !nodemailer.createTransport) {
        console.warn('⚠️ nodemailer.createTransport nicht verfügbar');
        return { status: 'skipped', reason: 'nodemailer createTransport missing' };
      }

      // Generiere PDF-Rechnung
      console.log('📄 Generiere PDF-Rechnung...');
      const invoicePDF = await generateInvoice(booking);
      console.log('✅ PDF-Rechnung erstellt');

      // Erstelle Transporter mit Konfiguration
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.ionos.de',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: false,
        auth: {
          user: process.env.SMTP_USER || 'monteur-wohnung@dumser.net',
          pass: smtpPassword
        },
        tls: {
          rejectUnauthorized: false
        }
      });

      // DEBUG: Teste SMTP-Verbindung
      console.log('🔍 DEBUG SMTP-Konfiguration:');
      console.log('  Host:', process.env.SMTP_HOST || 'smtp.ionos.de');
      console.log('  Port:', process.env.SMTP_PORT || '587');
      console.log('  User:', process.env.SMTP_USER || 'monteur-wohnung@dumser.net');
      console.log('  Password vorhanden:', !!smtpPassword, `(${smtpPassword?.length} zeichen)`);

      let verifyWarning = null;
      // Teste Verbindung (nicht-blockierend)
      console.log('📡 Teste SMTP-Verbindung...');
      try {
        await transporter.verify();
        console.log('✅ SMTP-Verbindung erfolgreich!');
      } catch (verifyError) {
        console.warn('⚠️ SMTP-Verbindungstest fehlgeschlagen:', verifyError.message);
        console.warn('   Code:', verifyError.code);
        console.warn('   Versuche trotzdem zu senden...');
        verifyWarning = {
          message: verifyError.message,
          code: verifyError.code,
          response: verifyError.response
        };
        // Nicht werfen - versuche trotzdem zu senden
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

      const mailOptions = {
        from: 'Ferienwohnungen Dumser <monteur-wohnung@dumser.net>',
        to: booking.email,
        subject: `Buchungsbestätigung: ${wohnungName} (${startDate} - ${endDate})`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">Vielen Dank für Ihre Buchung!</h2>
            <p>Sehr geehrte Damen und Herren von ${booking.company},</p>
            <p>Ihre Buchung wurde erfolgreich bestätigt. Anbei finden Sie die Rechnung als PDF.</p>
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
            <div style="background-color: #dbeafe; padding: 15px; border-radius: 8px; border-left: 4px solid #2563eb; margin: 20px 0;">
              <p style="margin: 0;"><strong>💳 Zahlung:</strong> Der Betrag wurde bereits per Kreditkarte bezahlt.</p>
            </div>
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
              Email: monteur-wohnung@dumser.net
            </p>
          </div>
        `,
        attachments: [
          {
            filename: `Rechnung_${invoiceNumber.replace(/\./g, '-')}.pdf`,
            content: invoicePDF,
            contentType: 'application/pdf'
          }
        ]
      };

      // Zusätzliche Debug-Ausgaben
      console.log('📧 MailOptions:', {
        to: mailOptions.to,
        from: mailOptions.from,
        subject: mailOptions.subject,
        attachments: mailOptions.attachments?.map(a => a.filename),
        htmlLength: mailOptions.html?.length
      });

      // Sende Email
      console.log('📤 Sende Email an:', booking.email);
      let info;
      try {
        info = await transporter.sendMail(mailOptions);
        console.log('✅ Email gesendet:', info.messageId, info.response);
      } catch (sendError) {
        console.error('❌ Email-Versand fehlgeschlagen:', sendError.message || sendError);
        if (sendError.response) {
          console.error('❌ SMTP-Server Response:', sendError.response);
        }
        return {
          status: 'failed',
          error: sendError.message,
          code: sendError.code,
          response: sendError.response
        };
      }

      return { status: 'sent', messageId: info.messageId, verifyWarning, response: info.response };
    } catch (error) {
      console.error('❌ Email-Versand (allgemeiner Fehler):', error.message || error);
      return {
        status: 'failed',
        error: error.message,
        code: error.code,
        response: error.response
      };
    }
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
          
          <div style="background-color: #dbeafe; padding: 15px; border-radius: 8px; border-left: 4px solid #2563eb; margin: 20px 0;">
            <p style="margin: 0;"><strong>💳 Zahlung:</strong> Der Betrag wurde bereits per Kreditkarte bezahlt.</p>
          </div>
          
          <div style="margin: 30px 0;">
            <h3 style="color: #374151;">Adresse der Wohnung:</h3>
            ${booking.wohnung === 'kombi'
              ? `<p style="margin: 5px 0;">Frühlingstraße 8<br>82152 Krailling b. München</p>
                 <p style="margin: 5px 0;">Hackerbergstraße 8<br>82152 Krailling b. München</p>`
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
            Email: monteur-wohnung@dumser.net
          </p>
        </div>
      `,
      attachments: [
        {
          filename: `Rechnung_${invoiceNumber.replace(/\./g, '-')}.pdf`,
          content: invoicePDF,
          contentType: 'application/pdf'
        }
      ]
    };

    // Sende Email
    console.log('📤 Sende Email an:', booking.email);
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email gesendet:', info.messageId);
    
    return { status: 'sent', messageId: info.messageId, verifyWarning };
  } catch (error) {
    console.error('❌ Email-Versand fehlgeschlagen:', error.message || error);
    // Nicht werfen - Email-Fehler sollten die Buchung nicht blockieren
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
