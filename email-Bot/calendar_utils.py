import os.path
from datetime import datetime, timedelta
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build

# Google Calendar API Berechtigungen
SCOPES = ['https://www.googleapis.com/auth/calendar']

def create_booking_event(guest_email, start_date, end_date, summary="Buchung: Monteurwohnung", description="", color_id="1"):
    creds = None

    # Token aus vorherigem Login wiederverwenden
    if os.path.exists('token.json'):
        creds = Credentials.from_authorized_user_file('token.json', SCOPES)

    # Wenn keine gültigen Zugangsdaten vorhanden sind → Login starten
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file(
                r'C:\iCloudDrive\iCloudDrive\Wohnung-Vermietung\Projekt-Automatisierung-Kunden\credentials.json',
                SCOPES
            )
            creds = flow.run_local_server(port=0)

        # Zugangsdaten speichern
        with open('token.json', 'w') as token:
            token.write(creds.to_json())

    # Google Calendar Service aufbauen
    service = build('calendar', 'v3', credentials=creds)

    # 📅 Start- und Enddatum prüfen und ggf. korrigieren
    if "unbekannt" in start_date or "unbekannt" in end_date:
        start = datetime.now() + timedelta(days=1)
        end = start + timedelta(days=28)
    else:
        try:
            start = datetime.strptime(start_date, "%Y-%m-%d")
            end = datetime.strptime(end_date, "%Y-%m-%d")

            # 🔍 Korrektur: wenn Jahr in der Vergangenheit liegt, anpassen
            today = datetime.today()
            if start < today:
                print(f"⚠️ Startdatum {start_date} liegt in der Vergangenheit – wird angepasst")
                start = start.replace(year=today.year)
                if start < today:
                    start = start.replace(year=today.year + 1)

            if end <= start:
                end = start + timedelta(days=28)

        except ValueError:
            start = datetime.now() + timedelta(days=1)
            end = start + timedelta(days=28)

    # 📆 Ereignis vorbereiten
    event = {
        'summary': summary,
        'location': 'Krailling',
        'description': description,
        'start': {
            'date': start.strftime('%Y-%m-%d'),
            'timeZone': 'Europe/Berlin',
        },
        'end': {
            'date': end.strftime('%Y-%m-%d'),
            'timeZone': 'Europe/Berlin',
        },
        'attendees': [{'email': guest_email}],
        'colorId': color_id
    }

    # 📤 Ereignis im Kalender erstellen
    created_event = service.events().insert(calendarId='primary', body=event).execute()
    print(f"📅 Termin erstellt: {created_event.get('htmlLink')} ({start.strftime('%Y-%m-%d')} → {end.strftime('%Y-%m-%d')})")
