import Customer from '../models/Customer.js';

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function buildAddress(street, zip, city) {
  const s = String(street || '').trim();
  const z = String(zip || '').trim();
  const c = String(city || '').trim();
  return [s, [z, c].filter(Boolean).join(' ')].filter(Boolean).join(', ');
}

export async function findOrCreateCustomerFromBooking(bookingData) {
  const email = normalizeEmail(bookingData.email);
  const company = String(bookingData.company || '').trim();
  const street = String(bookingData.street || '').trim();
  const zip = String(bookingData.zip || '').trim();
  const city = String(bookingData.city || '').trim();
  const address = buildAddress(street, zip, city);

  let customer = null;

  if (email) {
    customer = await Customer.findOne({ email });
  }

  if (!customer && company && street && zip) {
    customer = await Customer.findOne({
      name: company,
      address,
      isActive: true
    });
  }

  if (!customer) {
    customer = new Customer({
      name: company || String(bookingData.name || '').trim() || 'Unbekannter Kunde',
      email,
      phone: String(bookingData.phone || '').trim(),
      address,
      contactPerson: String(bookingData.name || '').trim(),
      preferredApartment: bookingData.wohnung === 'kombi' ? 'both' : bookingData.wohnung || null,
      isActive: true
    });
  } else {
    customer.name = company || customer.name;
    customer.phone = String(bookingData.phone || customer.phone || '').trim();
    customer.address = address || customer.address;
    customer.contactPerson = String(bookingData.name || customer.contactPerson || '').trim();
    customer.email = email || customer.email;
    customer.preferredApartment = bookingData.wohnung === 'kombi' ? 'both' : (bookingData.wohnung || customer.preferredApartment);
    customer.isActive = true;
    customer.updatedAt = new Date();
  }

  await customer.save();
  return customer;
}
