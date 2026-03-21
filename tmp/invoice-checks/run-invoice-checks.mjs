import fs from 'fs';
import path from 'path';
import { generateInvoice } from '../../server/services/invoiceGenerator.js';

const outDir = path.resolve('./tmp/invoice-checks');
const base = {
  _id: '67dc1234abcd5678ef901234',
  name: 'Karl Ansprechpartner',
  email: 'karl@example.com',
  phone: '+49 176 111111',
  company: 'Karl GmbH',
  street: 'Fruehlingstrasse 8',
  zip: '82152',
  city: 'Krailling',
  country: 'DE',
  countryLabel: 'Deutschland',
  wohnung: 'hackerberg',
  wohnungLabel: 'HB',
  startDate: new Date('2026-06-01'),
  endDate: new Date('2026-06-29'),
  nights: 28,
  people: 4,
  pricePerNight: 100,
  cleaningFee: 100,
  subtotal: 2800,
  discount: 0,
  vat: 182.7,
  total: 2792.7,
  paymentStatus: 'pending',
  paymentMethod: 'invoice',
  createdAt: new Date('2026-03-20')
};

const cases = [
  { key: 'normal-with-vatid', booking: { ...base, vatId: 'DE123456789' } },
  { key: 'admin-new-without-vatid', booking: { ...base, _id: '67dc1234abcd5678ef901235', vatId: '' } },
  {
    key: 'followup-final-with-vatid',
    booking: {
      ...base,
      _id: '67dc1234abcd5678ef901236',
      vatId: 'ATU99999999',
      isFollowUpInvoice: true,
      originalStartDate: new Date('2026-05-01'),
      originalEndDate: new Date('2026-07-05'),
      nights: 8,
      startDate: new Date('2026-06-29'),
      endDate: new Date('2026-07-07'),
      subtotal: 800,
      vat: 63.0,
      total: 963.0
    }
  }
];

for (const item of cases) {
  const { buffer, fileName } = await generateInvoice(item.booking);
  const target = path.join(outDir, `${item.key}-${fileName}`);
  fs.writeFileSync(target, buffer);
  console.log(`${item.key}\t${target}\t${buffer.length}`);
}
