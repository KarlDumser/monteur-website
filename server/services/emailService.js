import nodemailerModule from 'nodemailer';
import { generateInvoice } from './invoiceGenerator.js';

const nodemailer = nodemailerModule.default || nodemailerModule;

/**
 * Sendet Buchungsbestätigung mit Rechnung als PDF-Anhang
 * @param {Object} booking - Vollständiges Booking-Objekt aus MongoDB
 */
export async function sendBookingConfirmation(booking) {
  try {
    // Prüfe ob SMTP konfiguriert ist
    if (!process.env.SMTP_PASSWORD) {
      console.warn('⚠️ SMTP nicht konfiguriert - Email wird übersprungen');
      return null;
    }

    console.log('📧 Erstelle Buchungsbestätigungs-Email...');
    
    // Generiere PDF-Rechnung
    console.log('📄 Generiere PDF-Rechnung...');
    const invoicePDF = await generateInvoice(booking);
    console.log('✅ PDF-Rechnung erstellt');

    // Erstelle Transporter
    const transporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST || 'smtp.ionos.de',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER || 'monteur-wohnung@dumser.net',
        pass: process.env.SMTP_PASSWORD
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    // Email Optionen
    const wohnungName = booking.wohnung === 'neubau' ? 'Neubau – Frühlingstraße' : 'Hackerberg';
    const startDate = formatGermanDate(booking.startDate);
    const endDate = formatGermanDate(booking.endDate);
    const invoiceNumber = `FD-${formatGermanDate(booking.createdAt)}`;

    const mailOptions = {
      from: '"Ferienwohnungen Dumser" <monteur-wohnung@dumser.net>',
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
            <p style="margin: 5px 0;">
              ${booking.wohnung === 'neubau' ? 'Frühlingstraße 8' : 'Hackerbergstraße 8'}<br>
              82152 Krailling b. München
            </p>
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
    
    return info;
  } catch (error) {
    console.error('❌ Email-Versand fehlgeschlagen:', error.message);
    throw error;
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
