import PDFDocument from 'pdfkit';

export async function generateInvoicePDF(booking) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const buffers = [];
      
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData);
      });
      
      // Header
      doc.fontSize(20)
         .fillColor('#2563eb')
         .text('RECHNUNG', { align: 'right' });
      
      doc.fontSize(10)
         .fillColor('#000')
         .text(`Rechnungsnummer: ${booking._id}`, { align: 'right' })
         .text(`Datum: ${new Date().toLocaleDateString('de-DE')}`, { align: 'right' })
         .moveDown();
      
      // Absender
      doc.fontSize(12)
         .fillColor('#2563eb')
         .text('Monteurwohnung Dumser', 50, 120);
      
      doc.fontSize(9)
         .fillColor('#000')
         .text('[Ihre Adresse]')
         .text('[PLZ Ort]')
         .text('E-Mail: [Ihre E-Mail]')
         .text('Tel: [Ihre Telefonnummer]')
         .moveDown(2);
      
      // Empfänger
      doc.fontSize(11)
         .text(`${booking.name}`)
         .text(`E-Mail: ${booking.email}`)
         .text(`Tel: ${booking.phone}`)
         .moveDown(2);
      
      // Buchungsdetails
      const wohnungName = booking.wohnung === 'hackerberg' 
        ? 'Hackerberg – Penthouse' 
        : 'Neubau – Frühligstraße';
      
      doc.fontSize(14)
         .fillColor('#2563eb')
         .text('Buchungsdetails', 50, doc.y + 10);
      
      doc.fontSize(10)
         .fillColor('#000')
         .moveDown(0.5);
      
      const detailsY = doc.y;
      
      doc.text(`Wohnung: ${wohnungName}`, 50, detailsY)
         .text(`Check-in: ${new Date(booking.startDate).toLocaleDateString('de-DE')} ab ${booking.checkInTime} Uhr`, 50, detailsY + 20)
         .text(`Check-out: ${new Date(booking.endDate).toLocaleDateString('de-DE')} bis ${booking.checkOutTime} Uhr`, 50, detailsY + 40)
         .text(`Anzahl Personen: ${booking.people}`, 50, detailsY + 60)
         .text(`Anzahl Nächte: ${booking.nights}`, 50, detailsY + 80);
      
      doc.moveDown(3);
      
      // Tabelle Header
      const tableTop = doc.y + 20;
      const col1X = 50;
      const col2X = 350;
      const col3X = 450;
      
      doc.fontSize(11)
         .fillColor('#2563eb')
         .text('Beschreibung', col1X, tableTop)
         .text('Menge', col2X, tableTop)
         .text('Betrag', col3X, tableTop);
      
      // Linie unter Header
      doc.moveTo(50, tableTop + 20)
         .lineTo(550, tableTop + 20)
         .stroke();
      
      // Positionen
      let currentY = tableTop + 30;
      
      doc.fontSize(10)
         .fillColor('#000')
         .text(`Unterkunft (${booking.nights} Nächte)`, col1X, currentY)
         .text(`${booking.nights}x ${booking.pricePerNight}€`, col2X, currentY)
         .text(`${booking.nights * booking.pricePerNight}€`, col3X, currentY);
      
      currentY += 20;
      doc.text('Endreinigung', col1X, currentY)
         .text('1x 90€', col2X, currentY)
         .text('90€', col3X, currentY);
      
      currentY += 30;
      
      // Zwischensumme
      doc.moveTo(350, currentY)
         .lineTo(550, currentY)
         .stroke();
      
      currentY += 10;
      doc.text('Zwischensumme:', col2X, currentY)
         .text(`${booking.subtotal}€`, col3X, currentY);
      
      // Rabatt falls vorhanden
      if (booking.discount > 0) {
        currentY += 20;
        const discountAmount = Math.round(booking.subtotal * booking.discount);
        doc.fillColor('#16a34a')
           .text('Frühbucherrabatt (-10%):', col2X, currentY)
           .text(`-${discountAmount}€`, col3X, currentY)
           .fillColor('#000');
        
        currentY += 20;
        const subtotalAfterDiscount = booking.subtotal - discountAmount;
        doc.text('Zwischensumme:', col2X, currentY)
           .text(`${subtotalAfterDiscount}€`, col3X, currentY);
      }
      
      // MwSt
      currentY += 20;
      doc.text('zzgl. 19% MwSt.:', col2X, currentY)
         .text(`${booking.vat}€`, col3X, currentY);
      
      // Gesamtbetrag
      currentY += 30;
      doc.moveTo(350, currentY)
         .lineTo(550, currentY)
         .strokeColor('#2563eb')
         .lineWidth(2)
         .stroke();
      
      currentY += 15;
      doc.fontSize(12)
         .fillColor('#2563eb')
         .text('Gesamtbetrag:', col2X, currentY)
         .text(`${booking.total}€`, col3X, currentY);
      
      // Zahlungsstatus
      currentY += 40;
      doc.fontSize(10)
         .fillColor('#16a34a')
         .text(`✓ Bezahlt am ${new Date(booking.createdAt).toLocaleDateString('de-DE')}`, 50, currentY);
      
      // Footer
      doc.fontSize(8)
         .fillColor('#6b7280')
         .text('Vielen Dank für Ihre Buchung!', 50, 750, { align: 'center' })
         .text('Monteurwohnung Dumser | [Ihre Adresse] | [E-Mail] | [Telefon]', { align: 'center' });
      
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
