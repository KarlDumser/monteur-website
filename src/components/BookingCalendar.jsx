import React from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';

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

  // Funktion, um belegte Tage zu markieren
  function tileDisabled({ date, view }) {
    if (view === 'month') {
      return bookedDates.has(date.toISOString().slice(0, 10));
    }
    return false;
  }

  return (
    <div style={{ pointerEvents: 'none', opacity: 0.8 }}>
      <Calendar tileDisabled={tileDisabled} />
      <div style={{ fontSize: 12, marginTop: 4 }}>*Belegte Tage sind ausgegraut</div>
    </div>
  );
}
