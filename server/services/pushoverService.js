/**
 * Pushover Notification Service
 * Sendet Push-Benachrichtigungen an die Pushover App
 */

const PUSHOVER_API_URL = 'https://api.pushover.net/1/messages.json';

export async function sendPushNotification(title, message, url = null) {
  try {
    const pushoverToken = process.env.PUSHOVER_API_TOKEN;
    const pushoverUserKey = process.env.PUSHOVER_USER_KEY;

    // Prüfe ob Pushover konfiguriert ist
    if (!pushoverToken || !pushoverUserKey) {
      console.warn('⚠️  Pushover nicht konfiguriert (PUSHOVER_API_TOKEN oder PUSHOVER_USER_KEY fehlt)');
      return { 
        status: 'skipped', 
        reason: 'Pushover nicht konfiguriert'
      };
    }

    const data = {
      token: pushoverToken,
      user: pushoverUserKey,
      title: title,
      message: message
    };

    // Füge URL hinzu wenn vorhanden
    if (url) {
      data.url = url;
      data.url_title = 'Zum Admin-Bereich';
    }

    console.log('\n📱 Sende Pushover-Benachrichtigung:');
    console.log('  Titel:', title);
    console.log('  Nachricht:', message);
    if (url) console.log('  URL:', url);

    const response = await fetch(PUSHOVER_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams(data)
    });

    const result = await response.json();

    if (response.ok && result.status === 1) {
      console.log('✅ Pushover-Benachrichtigung erfolgreich gesendet');
      return { 
        status: 'sent',
        pushoverStatus: result.status
      };
    } else {
      console.warn('⚠️  Pushover-Fehler:', result);
      return { 
        status: 'failed',
        error: result.errors?.join(', ') || 'Unbekannter Fehler',
        pushoverStatus: result.status
      };
    }
  } catch (error) {
    console.error('❌ Pushover-Service Fehler:', error.message);
    return { 
      status: 'error',
      error: error.message
    };
  }
}

/**
 * Sends booking notification
 * @param {Object} booking - Booking object
 * @param {string} baseUrl - Base URL for admin link (e.g., https://monteur-website.domain.com)
 */
export async function sendBookingPushNotification(booking, baseUrl) {
  try {
    // Baue Admin-Link
    const adminLink = `${baseUrl}/admin?booking=${booking._id}`;
    
    // Formatiere Datum
    const startDate = new Date(booking.startDate).toLocaleDateString('de-DE');
    const wohnungName = booking.wohnungLabel || booking.wohnung;
    
    const title = `📅 Neue Buchung: ${wohnungName}`;
    const message = `${booking.name}
${startDate}
💰 ${booking.total}€`;

    return sendPushNotification(title, message, adminLink);
  } catch (error) {
    console.error('❌ Fehler beim Senden der Buchungs-Push:', error.message);
    return { 
      status: 'error',
      error: error.message
    };
  }
}
