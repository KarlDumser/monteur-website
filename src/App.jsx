import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import BookingPage from './pages/BookingPage'
import Success from "./pages/Success";
import Cancel from "./pages/Cancel";
import Anfahrt from "./pages/Anfahrt";
import Impressum from "./pages/Impressum";
import Datenschutz from "./pages/Datenschutz";
import AGB from "./pages/AGB";
import Widerruf from "./pages/Widerruf";
import Payment from "./pages/Payment";
import Admin from "./pages/Admin";
import { apiCall } from './utils/api'

const VISITOR_ID_KEY = 'mw_visitor_id';
const EXCLUDED_TRACKING_KEY = 'mw_analytics_excluded';
const LAST_TRACKED_KEY = 'mw_last_tracked';

const getOrCreateVisitorId = () => {
  const existing = localStorage.getItem(VISITOR_ID_KEY);
  if (existing) {
    return existing;
  }

  const generated = typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

  localStorage.setItem(VISITOR_ID_KEY, generated);
  return generated;
};

const shouldSkipTracking = (pathname) => {
  if (!pathname || pathname.startsWith('/admin')) {
    return true;
  }
  if (sessionStorage.getItem('adminAuth')) {
    return true;
  }
  return localStorage.getItem(EXCLUDED_TRACKING_KEY) === '1';
};

function AnalyticsTracker() {
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('excludeTracking') === '1') {
      localStorage.setItem(EXCLUDED_TRACKING_KEY, '1');
    }
    if (params.get('excludeTracking') === '0') {
      localStorage.removeItem(EXCLUDED_TRACKING_KEY);
    }

    if (shouldSkipTracking(location.pathname)) {
      return;
    }

    const now = Date.now();
    const dedupeKey = `${location.pathname}|${window.location.search}`;
    const lastTrackedRaw = sessionStorage.getItem(LAST_TRACKED_KEY);
    if (lastTrackedRaw) {
      const [lastKey, timestamp] = lastTrackedRaw.split('|');
      const lastTimestamp = Number(timestamp || 0);
      if (lastKey === dedupeKey && now - lastTimestamp < 15000) {
        return;
      }
    }

    sessionStorage.setItem(LAST_TRACKED_KEY, `${dedupeKey}|${now}`);

    const visitorId = getOrCreateVisitorId();
    apiCall('/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        visitorId,
        path: location.pathname,
        referrer: document.referrer || ''
      })
    }).catch(() => {
      // Tracking failures should never block the app.
    });
  }, [location.pathname, location.search]);

  return null;
}


export default function App() {
  return (
    <BrowserRouter>
      <AnalyticsTracker />
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/booking" element={<BookingPage />} />
          <Route path="/payment" element={<Payment />} />
          <Route path="/erfolg" element={<Success />} />
          <Route path="/abgebrochen" element={<Cancel />} />
          <Route path="/anfahrt" element={<Anfahrt />} />
          <Route path="/impressum" element={<Impressum />} />
          <Route path="/datenschutz" element={<Datenschutz />} />
          <Route path="/agb" element={<AGB />} />
          <Route path="/widerruf" element={<Widerruf />} />
          <Route path="/admin" element={<Admin />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}
