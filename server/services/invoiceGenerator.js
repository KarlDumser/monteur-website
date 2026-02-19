import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Generiert PDF-Rechnung für Buchung
 * @param {Object} booking - Buchungsobjekt aus MongoDB
 * @returns {Buffer} PDF als Buffer
 */
export async function generateInvoice(booking) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const buffers = [];
      
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers);
        resolve(pdfBuffer);
      });
      doc.on('error', reject);

      // Absender (oben rechts)
      doc.fontSize(9)
         .text('Ferienwohnungen Christine Dumser', 350, 50)
         .text('Frühlingstr. 8', 350, 62)
         .text('D-82152 Krailling b. München', 350, 74)
         .text('Tel. +49(0)89 8571174', 350, 86)
         .moveDown()
         .text('Steuernummer: 161-21280659', 350, 110)
         .text('Umsatzsteuer ID 43806551921', 350, 122);

      // Empfänger (links) - Ansprechpartner raus, Firmenname als erste Zeile
      doc.fontSize(11)
         .text('An:', 50, 180)
         .font('Helvetica-Bold')
         .text(booking.company, 50, 195)
         .font('Helvetica')
         .text(booking.street, 50, 210)
         .text(`${booking.zip} ${booking.city}`, 50, 225);

      // Rechnungstitel
      const invoiceNumber = `FD-${formatGermanDate(booking.createdAt)}`;
      const invoiceDate = formatGermanDate(new Date());
      
      doc.fontSize(14)
         .font('Helvetica-Bold')
         .text('Rechnung für Ihre Ferienwohnungen in Krailling', 50, 280)
         .fontSize(10)
         .font('Helvetica')
         .text(`Rechnungsnummer: ${invoiceNumber}`, 50, 300)
         .text(`Rechnungsdatum: ${invoiceDate}`, 50, 315);

      // Leistungen Tabelle
      doc.fontSize(10)
         .text('Leistungen:', 50, 350);

      // Tabellenkopf
      const tableTop = 380;
      doc.font('Helvetica-Bold')
         .text('Position', 50, tableTop)
         .text('Beschreibung', 100, tableTop)
         .text('Menge', 350, tableTop)
         .text('Einzelpreis €', 410, tableTop)
         .text('Gesamt €', 490, tableTop);

      // Trennlinie
      doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();

      // Zeile 1: Ferienwohnung
         const wohnungName = booking.wohnung === 'neubau'
            ? 'FS'
            : booking.wohnung === 'kombi'
               ? 'HB + FS'
               : 'HB';
      const startDateStr = formatGermanDate(booking.startDate);
      const endDateStr = formatGermanDate(booking.endDate);
      
      doc.font('Helvetica')
         .text('1', 50, tableTop + 25)
         .text(`Ferienwohnung ${wohnungName} (${startDateStr} -`, 100, tableTop + 25)
         .text(`${endDateStr})`, 100, tableTop + 38)
         .text(booking.nights.toString(), 350, tableTop + 25)
         .text(Number(booking.pricePerNight).toFixed(2), 410, tableTop + 25)
         .text(Number(booking.nights * booking.pricePerNight).toFixed(2), 490, tableTop + 25);

      // Zeile 2: Reinigung
      const cleaningRow = tableTop + 70;
      const cleaningFee = Number(booking.cleaningFee ?? 90);
      doc.text('', 50, cleaningRow)
         .text('Reinigung ' + wohnungName, 100, cleaningRow)
         .text('1', 350, cleaningRow)
         .text(Number(cleaningFee).toFixed(2), 410, cleaningRow)
         .text(Number(cleaningFee).toFixed(2), 490, cleaningRow);

      // Trennlinie vor Summen
      const sumTop = cleaningRow + 40;
      doc.moveTo(350, sumTop).lineTo(550, sumTop).stroke();

      // Nettosumme
      const netTotal = booking.total / 1.07; // 7% MwSt rausrechnen
      doc.font('Helvetica')
         .text('Nettosumme:', 350, sumTop + 10)
         .text(Number(netTotal).toFixed(2) + ' €', 490, sumTop + 10);

      // Umsatzsteuer 7%
      const vatAmount = booking.total - netTotal;
      doc.text('Umsatzsteuer 7%:', 350, sumTop + 25)
         .text(Number(vatAmount).toFixed(2) + ' €', 490, sumTop + 25);

      // Gesamtbetrag (fett)
      doc.font('Helvetica-Bold')
         .text('Gesamtbetrag:', 350, sumTop + 40)
         .text(Number(booking.total).toFixed(2) + ' €', 490, sumTop + 40);


      // Hinweis: Bereits bezahlt
      doc.font('Helvetica-Bold')
         .fontSize(12)
         .fillColor('green')
         .text('✔️ Diese Rechnung ist bereits bezahlt.', 50, sumTop + 80);
      doc.fillColor('black');


      // Fußzeile mit Bankverbindung und Pflichtangaben
      doc.fontSize(9)
         .text('Bankverbindung: Kreissparkasse München-Starnberg, IBAN: DE78 7025 0150 0430 6154 01, BIC: BYLADEM1KMS', 50, 780, { width: 500 })
         .text('USt-IdNr.: DE43806551921 | Steuernummer: 161-21280659 | Inhaberin: Christine Dumser, Frühlingstr. 8, 82152 Krailling', 50, 792, { width: 500 })
         .text('Bitte bewahren Sie diese Rechnung für Ihre Unterlagen auf. Es gelten unsere AGB und Datenschutzbestimmungen.', 50, 804, { width: 500 });

      // Adresse der Wohnung
         const wohnungAdresse = booking.wohnung === 'kombi'
            ? 'Frühlingstraße 8 und Hackerbergstraße 8, D-82152 Krailling'
            : booking.wohnung === 'neubau'
               ? 'Frühlingstraße 8, D-82152 Krailling'
               : 'Hackerbergstraße 8, D-82152 Krailling';
      
      doc.fontSize(10)
         .font('Helvetica')
         .text(`Adresse der Wohnung FS: ${wohnungAdresse}`, 50, sumTop + 180)
         .text('Anreise am Anreisetag 16:00-19:00 Uhr, Abreise am Abreisetag bis 10:00 Uhr', 50, sumTop + 195);

      // Abschlusstext
      doc.fontSize(10)
         .text('Vielen Dank für Ihren Aufenthalt!', 50, sumTop + 230);

      doc.fontSize(9)
         .text(`Krailling, den ${invoiceDate}`, 50, sumTop + 260)
         .text('Christine Dumser', 50, sumTop + 275);

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
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
