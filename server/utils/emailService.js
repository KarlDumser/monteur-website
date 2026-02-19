import nodemailer from 'nodemailer';
import { generateInvoicePDF } from './pdfGenerator.js';

// Email Transporter konfigurieren
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// Buchungsbestätigung mit Rechnung senden
export async function sendBookingConfirmation(booking) {
  try {
    // PDF-Rechnung generieren
    const pdfBuffer = await generateInvoicePDF(booking);
    
    const wohnungName = booking.wohnung === 'hackerberg' 
      ? 'Hackerberg – Penthouse' 
      : 'Neubau – Frühligstraße';
    
    const mailOptions = {
      from: `"Monteurwohnung Dumser" <${process.env.SMTP_USER}>`,
      to: booking.email,
      subject: `Buchungsbestätigung - ${wohnungName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
            .info-box { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #2563eb; }
            .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
            .detail-label { font-weight: bold; color: #6b7280; }
            .detail-value { color: #111827; }
            .highlight { background: #dbeafe; padding: 15px; border-radius: 8px; margin: 15px 0; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>✅ Buchung bestätigt!</h1>
              <p>Vielen Dank für Ihre Buchung</p>
            </div>
            
            <div class="content">
              <p>Sehr geehrte/r ${booking.name},</p>
              
              <p>Ihre Buchung wurde erfolgreich bestätigt. Im Anhang finden Sie Ihre Rechnung.</p>
              
              <div class="info-box">
                <h3 style="margin-top: 0; color: #2563eb;">📋 Buchungsdetails</h3>
                <div class="detail-row">
                  <span class="detail-label">Wohnung:</span>
                  <span class="detail-value">${wohnungName}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Check-in:</span>
                  <span class="detail-value">${new Date(booking.startDate).toLocaleDateString('de-DE')} ab ${booking.checkInTime} Uhr</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Check-out:</span>
                  <span class="detail-value">${new Date(booking.endDate).toLocaleDateString('de-DE')} bis ${booking.checkOutTime} Uhr</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Anzahl Nächte:</span>
                  <span class="detail-value">${booking.nights}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Personen:</span>
                  <span class="detail-value">${booking.people}</span>
                </div>
              </div>
              
              <div class="highlight">
                <h3 style="margin-top: 0;">💶 Gesamtpreis: ${Number(booking.total).toFixed(2)}€</h3>
                <p style="margin: 5px 0; font-size: 14px; color: #6b7280;">
                  (inkl. 19% MwSt.)
                </p>
              </div>
              
              <div class="info-box">
                <h3 style="margin-top: 0; color: #2563eb;">🏠 Wichtige Informationen</h3>
                <ul>
                  <li><strong>Check-in Zeit:</strong> ${booking.checkInTime} Uhr</li>
                  <li><strong>Check-out Zeit:</strong> ${booking.checkOutTime} Uhr</li>
                  <li><strong>Endreinigung:</strong> Im Preis inbegriffen (90€)</li>
                </ul>
              </div>
              
              <p>Bei Fragen stehen wir Ihnen gerne zur Verfügung.</p>
              
              <p>Mit freundlichen Grüßen,<br>
              <strong>Monteurwohnung Dumser</strong></p>
            </div>
            
            <div class="footer">
              <p>Diese E-Mail wurde automatisch generiert. Bitte antworten Sie nicht auf diese E-Mail.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      attachments: [
        {
          filename: `Rechnung_${booking._id}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf'
        }
      ]
    };
    
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ E-Mail gesendet:', info.messageId);
    return info;
  } catch (error) {
    console.error('❌ E-Mail-Fehler:', error);
    throw error;
  }
}

// Test-E-Mail senden
export async function sendTestEmail() {
  try {
    const mailOptions = {
      from: process.env.SMTP_USER,
      to: process.env.SMTP_USER,
      subject: 'Test E-Mail - Monteurwohnung',
      text: 'Dies ist eine Test-E-Mail. Der E-Mail-Service funktioniert!'
    };
    
    const info = await transporter.sendMail(mailOptions);
    console.log('Test-E-Mail gesendet:', info.messageId);
    return info;
  } catch (error) {
    console.error('Test-E-Mail Fehler:', error);
    throw error;
  }
}
