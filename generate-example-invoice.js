import { generateInvoice } from "./server/services/invoiceGenerator.js";
import fs from "fs";

// Beispiel-Buchungsdaten
const booking = {
  name: "Max Mustermann",
  email: "max@mustermann.de",
  phone: "+49 176 234 567 89",
  company: "Musterfirma GmbH",
  street: "Musterstraße 1",
  zip: "12345",
  city: "Musterstadt",
  wohnung: "neubau",
  wohnungLabel: "FS",
  startDate: new Date("2026-03-01"),
  endDate: new Date("2026-03-10"),
  nights: 9,
  people: 2,
  pricePerNight: 80,
  cleaningFee: 90,
  subtotal: 810,
  discount: 0,
  vat: 52.99,
  total: 900,
  paymentStatus: "paid",
  createdAt: new Date("2026-02-20"),
};

(async () => {
  const { buffer, fileName } = await generateInvoice(booking);
  fs.writeFileSync(`./${fileName}`, buffer);
  console.log(`Beispielrechnung als ${fileName} erzeugt.`);
})();
