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


      // Hinweis: Bereits bezahlt ganz oben links
      doc.font('Helvetica-Bold')
         .fontSize(12)
         .fillColor('green')
         .text('Diese Rechnung ist bereits bezahlt.', 50, 30);
      doc.fillColor('black');

      // Absender (oben rechts)
      doc.fontSize(9)
         .text('Monteurwohnungen Christine Dumser', 350, 50)
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
         .font('Helvetica-Bold');
      const rechnungTitel = booking.wohnung === 'kombi'
        ? 'Rechnung für Ihre Monteurwohnungen in Krailling'
        : 'Rechnung für Ihre Monteurwohnung in Krailling';
      doc.text(rechnungTitel, 50, 280)
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


      // (Hinweis unten entfällt, steht jetzt nur noch oben links)



         // Fußzeile: 3 Spalten, alle Zeilen nebeneinander, Y-Position ca. 740, Abstand 12
         const footerY = 740;
         const col1X = 50;
         const col2X = 230;
         const col3X = 410;
         doc.fontSize(8);
         const leftCol = [
            { text: 'Monteurwohnungen Christine Dumser', bold: true },
            { text: 'Frühlingstr. 8, 82152 Krailling' },
            { text: 'Mobil: +49 176 234 567 89' },
            { text: 'monteur-wohnungen@dumser.net' }
         ];
         const midCol = [
            { text: 'KS München-Starnberg-Ebersberg', bold: true },
            { text: 'IBAN: DE78 7025 0150 0430 6154 01' },
            { text: 'BIC: BYLADEM1KMS' },
            { text: 'Kontoinhaber: Christine Dumser' }
         ];
         const rightCol = [
            { text: 'USt-IdNr.: DE43806551921', bold: true },
            { text: 'Geschäftsführerin: Christine Dumser' },
            { text: 'monteurwohnung-dumser.de' },
            { text: '' }
         ];
         for (let i = 0; i < 4; i++) {
            // Linke Spalte
            if (leftCol[i].bold) {
               doc.font('Helvetica-Bold');
            } else {
               doc.font('Helvetica');
            }
            doc.text(leftCol[i].text, col1X, footerY + i * 12, { continued: false });
            // Mittlere Spalte
            if (midCol[i].bold) {
               doc.font('Helvetica-Bold');
            } else {
               doc.font('Helvetica');
            }
            doc.text(midCol[i].text, col2X, footerY + i * 12, { continued: false });
            // Rechte Spalte
            if (rightCol[i].bold) {
               doc.font('Helvetica-Bold');
            } else {
               doc.font('Helvetica');
            }
            doc.text(rightCol[i].text, col3X, footerY + i * 12, { continued: false });
         }

         // Adresse der Wohnung (unten, FS/HB je nach Wohnung)
         let wohnungAdresse = '';
         let wohnungKuerzel = '';
         if (booking.wohnung === 'kombi') {
            wohnungAdresse = 'Frühlingstraße 8 und Hackerberg 4, D-82152 Krailling';
            wohnungKuerzel = 'FS + HB';
         } else if (booking.wohnung === 'neubau') {
            wohnungAdresse = 'Frühlingstraße 8, D-82152 Krailling';
            wohnungKuerzel = 'FS';
         } else {
            wohnungAdresse = 'Hackerberg 4, D-82152 Krailling';
            wohnungKuerzel = 'HB';
         }

         let addressBlockY = sumTop + 100;
         if (addressBlockY > 700) addressBlockY = 700;
         doc.fontSize(10)
            .font('Helvetica')
            .text(`Adresse der Wohnung ${wohnungKuerzel}: ${wohnungAdresse}`, 50, addressBlockY)
            .text('Anreise am Anreisetag 16:00-19:00 Uhr, Abreise am Abreisetag bis 10:00 Uhr', 50, addressBlockY + 15);

         // Abschlusstext
         doc.fontSize(10)
            .text('Vielen Dank für Ihren Aufenthalt!', 50, addressBlockY + 45);

         doc.fontSize(9)
            .text(`Krailling, den ${invoiceDate}`, 50, addressBlockY + 70)
            .text('Christine Dumser', 50, addressBlockY + 85);

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
