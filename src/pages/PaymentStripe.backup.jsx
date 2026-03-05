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
      try {
        const apiUrl = getApiUrl();
        const response = await fetch(`${apiUrl}/payment/confirm-payment`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            paymentIntentId: paymentIntent.id,
            bookingData: bookingInfo
          })
        });

        const data = await response.json();

        if (data.success) {
          const bookingResponse = {
            ...bookingInfo,
            _id: data.booking?._id,
            email: bookingInfo.email
          };
          localStorage.setItem('bookingInfo', JSON.stringify(bookingResponse));
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
        {isLoading
          ? 'Zahlung wird verarbeitet...'
          : `Jetzt ${bookingInfo.total.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}€ bezahlen`}
      </button>

      {message && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {message}
        </div>
      )}
    </form>
  );
}

export default function PaymentStripeBackup() {
  const [bookingInfo, setBookingInfo] = useState(null);
  const [clientSecret, setClientSecret] = useState('');
  const [stripePromise, setStripePromise] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const info = localStorage.getItem('bookingInfo');
    if (!info) {
      window.location.href = '/booking';
      return;
    }

    const booking = JSON.parse(info);
    setBookingInfo(booking);

    const apiUrl = getApiUrl();

    Promise.all([
      fetch(`${apiUrl}/payment/config`)
        .then(res => {
          if (!res.ok) throw new Error(`Config Error: ${res.status}`);
          return res.json();
        })
        .then(data => {
          if (!data.stripePublishableKey) {
            throw new Error('Keine Stripe Publishable Key vom Backend');
          }
          return loadStripe(data.stripePublishableKey);
        }),
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
        setStripePromise(stripe);
        setClientSecret(paymentData.clientSecret);
        setLoading(false);
      })
      .catch(err => {
        setError(`Fehler beim Laden: ${err.message}`);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div className="container mx-auto px-4 py-12 text-center"><p className="text-gray-600">Zahlung wird vorbereitet...</p></div>;
  }

  if (error || !bookingInfo) {
    return <div className="container mx-auto px-4 py-12 text-center"><p className="text-gray-600">{error || 'Buchungsdaten nicht gefunden'}</p></div>;
  }

  const options = {
    clientSecret,
    appearance: {
      theme: 'stripe',
      variables: { colorPrimary: '#2563eb' }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-8">
          {clientSecret && stripePromise ? (
            <Elements stripe={stripePromise} options={options}>
              <CheckoutForm bookingInfo={bookingInfo} />
            </Elements>
          ) : (
            <p className="text-gray-600">Stripe lädt...</p>
          )}
        </div>
      </div>
    </div>
  );
}
