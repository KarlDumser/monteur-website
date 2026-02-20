// Dummy Push Service: sendPushNotification
// Hier kannst du später z.B. Firebase, Pushover, OneSignal etc. integrieren

import fetch from 'node-fetch';

export async function sendPushNotification(title, message, data = {}) {
  const apiToken = process.env.PUSHOVER_API_TOKEN;
  const userKey = process.env.PUSHOVER_USER_KEY;
  if (!apiToken || !userKey) {
    console.error('❌ Pushover API-Token oder User-Key fehlt!');
    return { status: 'error', reason: 'Missing Pushover credentials' };
  }
  const payload = {
    token: apiToken,
    user: userKey,
    title,
    message,
    priority: 1,
    sound: 'cashregister',
    url: process.env.BOOKING_URL || '',
    url_title: 'Buchungsübersicht',
  };
  try {
    const res = await fetch('https://api.pushover.net/1/messages.json', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(payload).toString()
    });
    const result = await res.json();
    if (result.status === 1) {
      console.log('✅ Pushover-Benachrichtigung gesendet:', result);
      return { status: 'sent', result };
    } else {
      console.error('❌ Pushover Fehler:', result);
      return { status: 'error', result };
    }
  } catch (err) {
    console.error('❌ Pushover Exception:', err);
    return { status: 'error', error: err };
  }
}
}
