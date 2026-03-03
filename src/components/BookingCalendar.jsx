import React from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import './BookingCalendar.css';

export default function BookingCalendar({ periods }) {
  // Erstelle ein Set aller belegten Tage
  const bookedDates = new Set();
  periods.forEach(({ start, end }) => {
    let current = new Date(start);
    const last = new Date(end);
    while (current <= last) {
      bookedDates.add(current.toISOString().slice(0, 10));
      current.setDate(current.getDate() + 1);
    }
  });

  // Funktion, um belegte/verfügbare Tage zu markieren
  function tileClassName({ date, view }) {
    if (view === 'month') {
      const dateString = date.toISOString().slice(0, 10);
      const today = new Date().toISOString().slice(0, 10);
      
      // Zukünftige Tage
      if (dateString >= today) {
        if (bookedDates.has(dateString)) {
          return 'booked-day';
        } else {
          return 'available-day';
        }
      }
      return '';
    }
    return '';
  }

  // Funktion, um belegte Tage zu deaktivieren
  function tileDisabled({ date, view }) {
    if (view === 'month') {
      return bookedDates.has(date.toISOString().slice(0, 10));
    }
    return false;
  }

  return (
    <div className="booking-calendar-wrapper">
      <Calendar 
        tileDisabled={tileDisabled}
        tileClassName={tileClassName}
      />
      <div className="calendar-legend">
        <div className="legend-item">
          <div className="legend-color available"></div>
          <span>Verfügbar</span>
        </div>
        <div className="legend-item">
          <div className="legend-color booked"></div>
          <span>Gebucht</span>
        </div>
      </div>
    </div>
  );
}
