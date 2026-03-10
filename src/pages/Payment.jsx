import { useEffect, useState } from 'react';
import { getApiUrl } from '../utils/api.js';
import { useTranslation } from 'react-i18next';

export default function Payment() {
  const { t } = useTranslation();
  const [bookingInfo, setBookingInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [invoiceError, setInvoiceError] = useState(null);

  useEffect(() => {
    const info = localStorage.getItem('bookingInfo');
    if (!info) {
      window.location.href = '/booking';
      return;
    }

    const booking = JSON.parse(info);
    setBookingInfo(booking);
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <p className="text-gray-600">{t('payment.preparing')}</p>
      </div>
    );
  }

  if (!bookingInfo) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <p className="text-gray-600">{t('payment.bookingDataMissing')}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto">
          <div className="flex justify-center gap-4 mb-8">
            <div className="flex items-center justify-center w-10 h-10 rounded-full font-bold text-white bg-green-600">✓</div>
            <div className="w-12 h-1 bg-gray-300 mt-5"></div>
            <div className="flex items-center justify-center w-10 h-10 rounded-full font-bold text-white bg-green-600">✓</div>
            <div className="w-12 h-1 bg-gray-300 mt-5"></div>
            <div className="flex items-center justify-center w-10 h-10 rounded-full font-bold text-white bg-green-600">✓</div>
            <div className="w-12 h-1 bg-gray-300 mt-5"></div>
            <div className="flex items-center justify-center w-10 h-10 rounded-full font-bold text-white bg-blue-600">4</div>
          </div>

          <h1 className="text-2xl sm:text-4xl font-bold text-gray-800 mb-8 break-words text-center">{t('payment.title')}</h1>

          <div className="bg-white rounded-lg shadow-lg p-8 space-y-6">
            
            {/* Booking Summary */}
            <div className="border-2 border-blue-200 rounded-lg p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">{t('payment.bookingDetails')}</h2>
              
              {bookingInfo.isPartialBooking && (
                <div className="mb-4 bg-sky-50 border-l-4 border-sky-400 p-4 rounded-r-lg">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <span className="text-xl">ℹ️</span>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-sky-800">
                        {t('payment.partialIntro')} <strong>{bookingInfo.originalStartDate} – {bookingInfo.originalEndDate}</strong> ({bookingInfo.totalNights} {t('payment.nights')}).
                        <br/>
                        {t('payment.partialHintPrefix')} <strong>{t('payment.partialHintStrong')}</strong>. {t('payment.partialHintSuffix')}
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="space-y-3 text-gray-700">
                <div className="flex justify-between">
                  <span>{t('payment.apartmentLabel')}</span>
                  <strong>{bookingInfo.wohnungLabel || bookingInfo.wohnung}</strong>
                </div>
                <div className="flex justify-between">
                  <span>{t('payment.reservationPeriod')}</span>
                  <strong>
                    {bookingInfo.isPartialBooking
                      ? `${bookingInfo.originalStartDate} – ${bookingInfo.originalEndDate} (${bookingInfo.totalNights} ${t('payment.nights')})`
                      : `${bookingInfo.startDate} – ${bookingInfo.endDate} (${bookingInfo.nights} ${t('payment.nights')})`}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span>{bookingInfo.isPartialBooking ? t('payment.payNowFirstWeeks') : t('payment.periodLabel')}</span>
                  <strong>{bookingInfo.startDate} – {bookingInfo.endDate}</strong>
                </div>
                <div className="flex justify-between">
                  <span>{bookingInfo.isPartialBooking ? t('payment.invoiceNights') : t('payment.nightCount')}</span>
                  <strong>{bookingInfo.nights}</strong>
                </div>
                <div className="flex justify-between">
                  <span>{t('payment.peopleLabel')}</span>
                  <strong>{bookingInfo.people}</strong>
                </div>
              </div>
            </div>

            {/* Guest Info */}
            <div className="border-2 border-gray-300 rounded-lg p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">{t('payment.contactDetails')}</h2>
              
              <div className="space-y-3 text-gray-700">
                <div className="flex justify-between">
                  <span>{t('payment.name')}</span>
                  <strong>{bookingInfo.name}</strong>
                </div>
                <div className="flex justify-between">
                  <span>{t('payment.email')}</span>
                  <strong>{bookingInfo.email}</strong>
                </div>
                <div className="flex justify-between">
                  <span>{t('payment.mobile')}</span>
                  <strong>{bookingInfo.mobilePhone || bookingInfo.phone || '-'}</strong>
                </div>
                {bookingInfo.landlinePhone && (
                  <div className="flex justify-between">
                    <span>{t('payment.landline')}</span>
                    <strong>{bookingInfo.landlinePhone}</strong>
                  </div>
                )}
              </div>
            </div>

            {/* Price Summary */}
            <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-6">
              <div className="space-y-3 text-gray-700">
                <div className="flex justify-between">
                  <span>{t('payment.accommodationLine', { nights: bookingInfo.nights, price: Number(bookingInfo.pricePerNight).toFixed(0) })}</span>
                  <span>{(bookingInfo.nights * bookingInfo.pricePerNight).toFixed(2).replace('.', ',')}€</span>
                </div>
                <div className="flex justify-between">
                  <span>{bookingInfo.isPartialBooking ? t('payment.monthlyCleaning') : t('payment.finalCleaning')}:</span>
                  <span>{Number(bookingInfo.cleaningFee ?? 90).toFixed(2).replace('.', ',')}€</span>
                </div>
                
                <div className="border-t pt-3 flex justify-between text-lg">
                  <span>{t('payment.netTotal')}</span>
                    <strong>{Number(bookingInfo.subtotal).toFixed(2).replace('.', ',')} €</strong>
                </div>

                {bookingInfo.discount > 0 && (
                  <div className="flex justify-between text-green-700">
                    <span>{t('payment.earlyDiscount')}</span>
                      <span>-{(bookingInfo.subtotal * bookingInfo.discount).toFixed(2).replace('.', ',')} €</span>
                  </div>
                )}

                <div className="flex justify-between">
                  <span>{t('payment.vat')}</span>
                    <span>{Number(bookingInfo.vat).toFixed(2).replace('.', ',')} €</span>
                </div>
                
                <div className="border-t pt-3 flex flex-col sm:flex-row justify-between text-2xl font-bold text-blue-800">
                  <span>{t('payment.invoiceAmount')}</span>
                  <span className="sm:text-right mt-2 sm:mt-0 block w-full sm:w-auto break-all">{Number(bookingInfo.total).toFixed(2).replace('.', ',')} €</span>
                </div>
              </div>
            </div>

            {/* Payment Form */}
            <div>
              <h2 className="text-xl font-bold text-gray-800 mb-4">{t('payment.paymentMethod')}</h2>
              <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
                {t('payment.paymentType')}: <strong>{t('payment.onInvoice')}</strong>
              </div>
              <p className="text-xs text-gray-600 mb-4">
                {t('payment.onlyInvoiceHint')}
              </p>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setInvoiceLoading(true);
                  setInvoiceError(null);
                  try {
                    const apiUrl = getApiUrl();
                    function parseGermanDate(str) {
                      if (typeof str === 'string' && str.match(/^\d{2}\.\d{2}\.\d{4}$/)) {
                        const [d, m, y] = str.split('.');
                        return new Date(`${y}-${m}-${d}T00:00:00Z`).toISOString();
                      }
                      return str;
                    }
                    const payload = {
                      ...bookingInfo,
                      paymentStatus: 'pending',
                      paymentMethod: 'invoice',
                      startDate: parseGermanDate(bookingInfo.startDate),
                      endDate: parseGermanDate(bookingInfo.endDate),
                      ...(bookingInfo.isPartialBooking && {
                        originalStartDate: parseGermanDate(bookingInfo.originalStartDate),
                        originalEndDate: parseGermanDate(bookingInfo.originalEndDate),
                        paidThroughDate: parseGermanDate(bookingInfo.paidThroughDate)
                      })
                    };
                    const response = await fetch(`${apiUrl}/bookings`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(payload)
                    });
                    const data = await response.json();
                    if (response.ok && data._id) {
                      localStorage.setItem('bookingInfo', JSON.stringify({ ...bookingInfo, _id: data._id }));
                      window.location.href = '/erfolg';
                    } else {
                      // Show specific error message from API
                      const errorMsg = data.error || data.message || t('payment.createBookingError');
                      setInvoiceError(errorMsg);
                    }
                  } catch (err) {
                    // Network or parsing error
                    setInvoiceError(t('payment.connectionError'));
                  } finally {
                    setInvoiceLoading(false);
                  }
                }}
                className="space-y-6"
              >
                <button
                  type="submit"
                  disabled={invoiceLoading}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold py-4 px-6 rounded-lg transition shadow-lg text-lg"
                >
                  {invoiceLoading ? t('payment.processing') : t('payment.bookNow')}
                </button>
                {invoiceError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                    {invoiceError}
                  </div>
                )}
              </form>
            </div>

            <p className="text-xs text-gray-500 bg-gray-50 p-4 rounded-lg text-center">
              {t('payment.invoiceByEmail')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
