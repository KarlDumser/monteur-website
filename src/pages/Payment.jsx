import { useEffect, useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { getApiUrl } from '../utils/api.js';

function CheckoutForm({ bookingInfo }) {
  const stripe = useStripe();
  const elements = useElements();
  const [message, setMessage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsLoading(true);

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
    });

    if (error) {
      setMessage(error.message);
      setIsLoading(false);
    } else if (paymentIntent && paymentIntent.status === 'succeeded') {
      // Zahlung erfolgreich - Buchung in DB speichern
      try {
        const apiUrl = getApiUrl();
        const response = await fetch(`${apiUrl}/payment/confirm-payment`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            paymentIntentId: paymentIntent.id,
            bookingData: bookingInfo,
            debugEmail: true
          })
        });

        const data = await response.json();
        
        if (data.success) {
          if (data.emailStatus) {
            console.log('📧 Email debug:', data.emailStatus);
          }
          // Speichere die Booking-Info NOCHMAL (mit Response-Daten) vor dem Redirect
          console.log('💾 Speichere Booking-Info vor Redirect...');
          const bookingResponse = {
            ...bookingInfo,
            _id: data.booking?._id,
            email: bookingInfo.email
          };
          localStorage.setItem('bookingInfo', JSON.stringify(bookingResponse));
          console.log('✅ Booking-Info gespeichert:', bookingResponse);
          
          // Redirect zur Erfolgsseite
          window.location.href = '/erfolg';
        } else {
          setMessage('Fehler beim Speichern der Buchung');
          setIsLoading(false);
        }
      } catch (err) {
        setMessage('Fehler beim Speichern der Buchung');
        setIsLoading(false);
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />
      
      <button
        disabled={isLoading || !stripe || !elements}
        className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-bold py-4 px-6 rounded-lg transition shadow-lg text-lg"
      >
        {isLoading ? 'Zahlung wird verarbeitet...' : `Jetzt ${bookingInfo.total}€ bezahlen`}
      </button>
      
      {message && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {message}
        </div>
      )}
    </form>
  );
}

export default function Payment() {
  const [bookingInfo, setBookingInfo] = useState(null);
  const [clientSecret, setClientSecret] = useState('');
  const [stripePromise, setStripePromise] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Lade Stripe Key vom Backend UND Payment Intent - beide gleichzeitig
  useEffect(() => {
    const info = localStorage.getItem('bookingInfo');
    if (!info) {
      window.location.href = '/booking';
      return;
    }

    const booking = JSON.parse(info);
    setBookingInfo(booking);

    const apiUrl = getApiUrl();

    // Parallel: Lade Stripe Key + erstelle Payment Intent
    Promise.all([
      // 1. Lade Stripe Public Key vom Backend
      fetch(`${apiUrl}/payment/config`)
        .then(res => {
          if (!res.ok) throw new Error(`Config Error: ${res.status}`);
          return res.json();
        })
        .then(data => {
          console.log('📦 Stripe config erhalten:', data.stripePublishableKey ? '✅' : '❌');
          if (!data.stripePublishableKey) {
            throw new Error('Keine Stripe Publishable Key vom Backend');
          }
          return loadStripe(data.stripePublishableKey);
        }),
      
      // 2. Erstelle Payment Intent
      fetch(`${apiUrl}/payment/create-payment-intent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: booking.total,
          bookingData: booking
        })
      })
        .then(res => {
          if (!res.ok) throw new Error(`Payment Intent Error: ${res.status}`);
          return res.json();
        })
    ])
      .then(([stripe, paymentData]) => {
        console.log('✅ Stripe Setup erfolgreich', stripe ? '✓' : '✗');
        console.log('✅ Payment Intent erstellt:', paymentData.clientSecret ? '✓' : '✗');
        
        setStripePromise(stripe);
        setClientSecret(paymentData.clientSecret);
        setLoading(false);
      })
      .catch(err => {
        console.error('❌ Error:', err);
        setError(`Fehler beim Laden: ${err.message}`);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <p className="text-gray-600">Zahlung wird vorbereitet...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="bg-red-50 border-2 border-red-200 text-red-700 px-6 py-4 rounded-lg">
          <h2 className="text-xl font-bold mb-2">⚠️ Fehler beim Laden der Zahlungsmethode</h2>
          <p className="mb-4">{error}</p>
          <button 
            onClick={() => window.location.href = '/booking'}
            className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
          >
            Zurück zur Buchung
          </button>
        </div>
      </div>
    );
  }

  if (!bookingInfo) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <p className="text-gray-600">Fehler: Buchungsdaten nicht gefunden</p>
      </div>
    );
  }

  const options = {
    clientSecret,
    appearance: {
      theme: 'stripe',
      variables: {
        colorPrimary: '#2563eb',
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-4xl font-bold text-gray-800 mb-8">Buchungsbestätigung</h1>

          <div className="bg-white rounded-lg shadow-lg p-8 space-y-6">
            
            {/* Booking Summary */}
            <div className="border-2 border-blue-200 rounded-lg p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Buchungsdetails</h2>
              
              <div className="space-y-3 text-gray-700">
                <div className="flex justify-between">
                  <span>Wohnung:</span>
                  <strong>{bookingInfo.wohnungLabel || bookingInfo.wohnung}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Zeitraum:</span>
                  <strong>{bookingInfo.startDate} – {bookingInfo.endDate}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Anzahl Nächte:</span>
                  <strong>{bookingInfo.nights}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Personen:</span>
                  <strong>{bookingInfo.people}</strong>
                </div>
              </div>
            </div>

            {/* Guest Info */}
            <div className="border-2 border-gray-300 rounded-lg p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Gästendaten</h2>
              
              <div className="space-y-3 text-gray-700">
                <div className="flex justify-between">
                  <span>Name:</span>
                  <strong>{bookingInfo.name}</strong>
                </div>
                <div className="flex justify-between">
                  <span>E-Mail:</span>
                  <strong>{bookingInfo.email}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Telefon:</span>
                  <strong>{bookingInfo.phone}</strong>
                </div>
              </div>
            </div>

            {/* Price Summary */}
            <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-6">
              <div className="space-y-3 text-gray-700">
                <div className="flex justify-between">
                  <span>Unterkunft ({bookingInfo.nights} Nächte × {bookingInfo.pricePerNight}€):</span>
                    <span>{(bookingInfo.nights * bookingInfo.pricePerNight).toFixed(2)}€</span>
                </div>
                <div className="flex justify-between">
                  <span>Endreinigung:</span>
                    <span>{Number(bookingInfo.cleaningFee ?? 90).toFixed(2)}€</span>
                </div>
                
                <div className="border-t pt-3 flex justify-between text-lg">
                  <span>Nettosumme:</span>
                    <strong>{Number(bookingInfo.subtotal).toFixed(2).replace('.', ',')} €</strong>
                </div>

                {bookingInfo.discount > 0 && (
                  <div className="flex justify-between text-green-700">
                    <span>Frühbucherabatt (-10%):</span>
                      <span>-{(bookingInfo.subtotal * bookingInfo.discount).toFixed(2).replace('.', ',')} €</span>
                  </div>
                )}

                <div className="flex justify-between">
                  <span>zzgl. 7% MwSt.:</span>
                    <span>{Number(bookingInfo.vat).toFixed(2).replace('.', ',')} €</span>
                </div>
                
                <div className="border-t pt-3 flex justify-between text-2xl font-bold text-blue-800">
                  <span>Rechnungsbetrag:</span>
                    <span>{Number(bookingInfo.total).toFixed(2).replace('.', ',')} €</span>
                </div>
              </div>
            </div>

            {/* Payment Form */}
            <div>
              <h2 className="text-xl font-bold text-gray-800 mb-4">Zahlungsmethode</h2>
              
              {clientSecret && stripePromise ? (
                <Elements stripe={stripePromise} options={options}>
                  <CheckoutForm bookingInfo={bookingInfo} />
                </Elements>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-600">⏳ Zahlung wird vorbereitet...</p>
                  <p className="text-sm text-gray-400 mt-2">Stripe lädt...</p>
                </div>
              )}
            </div>

            <p className="text-xs text-gray-500 bg-gray-50 p-4 rounded-lg text-center">
              🔒 Sichere Zahlung über Stripe. Ihre Daten werden verschlüsselt übertragen.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
