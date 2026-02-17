import { useEffect, useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { getApiUrl } from '../utils/api.js';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_your_key_here');

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
        const response = await fetch(`${apiUrl}/api/payment/confirm-payment`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            paymentIntentId: paymentIntent.id,
            bookingData: bookingInfo
          })
        });

        const data = await response.json();
        
        if (data.success) {
          localStorage.removeItem('bookingInfo');
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const info = localStorage.getItem('bookingInfo');
    if (!info) {
      window.location.href = '/booking';
      return;
    }

    const booking = JSON.parse(info);
    setBookingInfo(booking);

    // Payment Intent erstellen
    const apiUrl = getApiUrl();
    fetch(`${apiUrl}/api/payment/create-payment-intent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: booking.total,
        bookingData: booking
      })
    })
      .then(res => res.json())
      .then(data => {
        setClientSecret(data.clientSecret);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error creating payment intent:', err);
        setLoading(false);
      });
  }, []);

  if (loading || !bookingInfo) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <p className="text-gray-600">Zahlung wird vorbereitet...</p>
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
                  <strong>{bookingInfo.wohnung === 'hackerberg' ? 'Hackerberg – Penthouse' : 'Neubau – Frühligstraße'}</strong>
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
                  <span>{bookingInfo.nights * bookingInfo.pricePerNight}€</span>
                </div>
                <div className="flex justify-between">
                  <span>Endreinigung:</span>
                  <span>90€</span>
                </div>
                
                <div className="border-t pt-3 flex justify-between text-lg">
                  <span>Summe:</span>
                  <strong>{bookingInfo.subtotal}€</strong>
                </div>

                {bookingInfo.discount > 0 && (
                  <div className="flex justify-between text-green-700">
                    <span>Frühbucherabatt (-10%):</span>
                    <span>-{Math.round(bookingInfo.subtotal * bookingInfo.discount)}€</span>
                  </div>
                )}

                <div className="flex justify-between">
                  <span>zzgl. 19% MwSt.:</span>
                  <span>{bookingInfo.vat}€</span>
                </div>
                
                <div className="border-t pt-3 flex justify-between text-2xl font-bold text-blue-800">
                  <span>Gesamtpreis:</span>
                  <span>{bookingInfo.total}€</span>
                </div>
              </div>
            </div>

            {/* Payment Form */}
            <div>
              <h2 className="text-xl font-bold text-gray-800 mb-4">Zahlungsmethode</h2>
              
              {clientSecret ? (
                <Elements stripe={stripePromise} options={options}>
                  <CheckoutForm bookingInfo={bookingInfo} />
                </Elements>
              ) : (
                <p className="text-gray-600">Laden...</p>
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
