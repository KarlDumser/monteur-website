import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import BookingPage from './pages/BookingPage'
import Success from "./pages/Success";
import Cancel from "./pages/Cancel";
import Anfahrt from "./pages/Anfahrt";
import Impressum from "./pages/Impressum";
import Payment from "./pages/Payment";
import Admin from "./pages/Admin";


export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/booking" element={<BookingPage />} />
          <Route path="/payment" element={<Payment />} />
          <Route path="/erfolg" element={<Success />} />
          <Route path="/abgebrochen" element={<Cancel />} />
          <Route path="/anfahrt" element={<Anfahrt />} />
          <Route path="/impressum" element={<Impressum />} />
          <Route path="/admin" element={<Admin />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}
