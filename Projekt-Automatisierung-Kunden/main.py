import time
import uuid
import os
from gpt_logic import is_rental_related, clean_email_body, generate_reply, extract_booking_dates, analyze_booking_interest
from datetime import datetime, timedelta
from email_reader import get_latest_email
from email_sender import send_email
from smart_send_logic import extract_target_email
from notifier import send_push
from calendar_utils import create_booking_event
from gpt_logic import clean_email_body
from forward_detection import extract_forwarded_sender
from dotenv import load_dotenv

load_dotenv()

YOUR_EMAIL = os.getenv("EMAIL_ADDRESS", "monteur-wohnung@dumser.net")

# Nur diese 4 Vermittlungsseiten duerfen Anfragen einreichen
ALLOWED_DOMAINS = {
    "monteurzimmerguru.de",
    "dmz.de",
    "mein-monteurzimmer.de",
    "monteurzimmer.de"
}

ANSWERED_CUSTOMERS_LOG = "logs/answered_customers.log"

# Strategie pro Website für Duplikat-Check
# "sender" = Nutze Sender-Adresse (eindeutige Alias)
# "body" = Nutze Kunden-Email aus Body (generischer Sender)
DUPLIKAT_CHECK_STRATEGIEN = {
    "monteurzimmerguru.de": "body",
    "dmz.de": "sender",  # Eindeutige Alias wie monteurzimmer.de
    "mein-monteurzimmer.de": "body",  # Generischer Sender wie monteurzimmerguru.de
    "monteurzimmer.de": "sender"
}

def is_from_allowed_domain(email_address: str) -> bool:
    """Prüft, ob die E-Mail von einer der erlaubten Domains kommt."""
    domain = email_address.split("@")[-1].lower()
    return domain in ALLOWED_DOMAINS

def get_duplicate_check_key(sender: str, target_email: str) -> str:
    """
    Bestimmt, welche Email-Adresse für Duplikat-Check genutzt wird.
    Abhängig von der Website-Strategie.
    """
    domain = sender.split("@")[-1].lower()
    strategy = DUPLIKAT_CHECK_STRATEGIEN.get(domain, "sender")
    
    if strategy == "body" and target_email and target_email != sender:
        # Nutze Kunden-Email aus Body (z.B. monteurzimmerguru.de)
        print(f"📋 Duplikat-Check Strategie: Body ({target_email})")
        return target_email
    else:
        # Nutze Sender-Email (z.B. monteurzimmer.de)
        print(f"📋 Duplikat-Check Strategie: Sender ({sender})")
        return sender

def has_been_answered(customer_email: str) -> bool:
    """
    Prüft, ob wir diesem Kunden bereits geantwortet haben.
    Ignoriert Einträge, die älter als 1 Jahr sind.
    Format im Log: email|2026-02-18T23:09:28
    """
    if not os.path.exists(ANSWERED_CUSTOMERS_LOG):
        return False
    
    now = datetime.now()
    one_year_ago = now - timedelta(days=365)
    active_entries = []
    
    with open(ANSWERED_CUSTOMERS_LOG, "r", encoding="utf-8") as f:
        lines = f.read().strip().splitlines()
    
    for line in lines:
        if not line.strip():
            continue
        
        try:
            # Format: email|timestamp
            if "|" in line:
                email_part, timestamp_str = line.rsplit("|", 1)
                timestamp = datetime.fromisoformat(timestamp_str)
                
                # Dieser Eintrag ist noch aktiv (jünger als 1 Jahr)
                if timestamp > one_year_ago:
                    active_entries.append(line)
                    if email_part.lower() == customer_email.lower():
                        return True
                # Alte Einträge werden nicht mehr berücksichtigt
            else:
                # Legacy Format (ohne Timestamp) - wird als sehr alt betrachtet
                pass
        except Exception as e:
            print(f"⚠️ Fehler beim Parsing von {line}: {e}")
    
    # Schreibe nur noch aktive Einträge zurück (Cleanup)
    if len(active_entries) < len(lines):
        with open(ANSWERED_CUSTOMERS_LOG, "w", encoding="utf-8") as f:
            for entry in active_entries:
                f.write(f"{entry}\n")
        print(f"🧹 Alte Einträge aus {ANSWERED_CUSTOMERS_LOG} entfernt")
    
    return False

def mark_as_answered(customer_email: str) -> None:
    """Speichert die Kunden-Email mit Timestamp als beantwortet."""
    os.makedirs("logs", exist_ok=True)
    timestamp = datetime.now().isoformat()
    with open(ANSWERED_CUSTOMERS_LOG, "a", encoding="utf-8") as f:
        f.write(f"{customer_email}|{timestamp}\n")

def log(text):
    with open("log.txt", "a", encoding="utf-8") as f:
        f.write(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] {text}\n")

def main():
    print("🛁 Starte E-Mail-Bot... (läuft dauerhaft)")
    log("Bot gestartet.")

    while True:
        mail = get_latest_email()

        if mail:
            sender = mail["from"].lower()
            
            # Check if this is a forwarded email from our own address
            is_own_email = sender == YOUR_EMAIL.lower()
            original_sender = None
            
            if is_own_email:
                # Try to extract original sender from forwarded email
                original_sender = extract_forwarded_sender(mail["body"], sender)
                
                if original_sender and original_sender.lower() != YOUR_EMAIL.lower():
                    print(f"📧 Weitergeleitete E-Mail erkannt. Original: {original_sender}")
                    log(f"📧 Weitergeleitete E-Mail von {original_sender}")
                    sender = original_sender
                else:
                    print("🔁 Eigene E-Mail erkannt – keine Antwort gesendet.")
                    log("🔁 Eigene E-Mail erkannt – ignoriert.")
                    continue
            
            # Filter: Nur E-Mails von erlaubten Domains akzeptieren
            if not is_from_allowed_domain(sender):
                print(f"🚫 E-Mail von {sender} – nicht von erlaubter Domain.")
                log(f"🚫 E-Mail von {sender} – ignoriert (nicht erlaubte Domain).")
                continue
            
            # Extrahiere die Email-Adresse für Antwort-Versand (wenn vorhanden im Body)
            target_email = extract_target_email(sender, mail["body"])
            print(f"📧 Ziel-Email für Antwort: {target_email}")
            
            # Bestimme die Key für Duplikat-Check basierend auf Website-Strategie
            duplicate_check_key = get_duplicate_check_key(sender, target_email)
            
            # Duplikat-Check: Haben wir diesem Kunden bereits geantwortet?
            if has_been_answered(duplicate_check_key):
                print(f"🔄 {duplicate_check_key} – bereits beantwortet, ignoriert.")
                log(f"🔄 {duplicate_check_key} – bereits beantwortet.")
                continue

            log(f"Neue E-Mail von {mail['from']} mit Betreff: {mail['subject']}")
            print(f"\n📬 Neue Anfrage von: {mail['from']}")
            print(f"📝 Betreff: {mail['subject']}")
            print(f"📄 Nachricht:\n{mail['body']}\n")

            if not is_rental_related(mail["body"]):
                log("💪 E-Mail ignoriert (nicht vermietungsbezogen)")
                print("📍 Keine Vermietungsanfrage – ignoriert.")
                continue

            print("⏳ Warte 2 Minuten...")
            time.sleep(12)

            clean_body = clean_email_body(mail["body"])
            reply = generate_reply(clean_body)

            print("🧐 AI-Antwort:")
            print("-" * 40)
            print(reply.strip())
            print("-" * 40)

            log("AI-Antwort generiert:")
            log(reply.strip())

            booking_status = analyze_booking_interest(reply)
            log(f"🧐 GPT-Bewertung: {booking_status}")

            if booking_status in ["zugesagt", "potenziell"]:
                color_id = "1" if booking_status == "zugesagt" else "5"

                if booking_status == "zugesagt":
                    send_push(
                        title="✅ Zusage versendet",
                        message=f"Anfrage von {mail['from']} wurde zugesagt."
                    )
                    log("📱 Push-Benachrichtigung gesendet.")

                start_date, end_date = extract_booking_dates(mail["body"])
                log(f"📅 Zeitraum: {start_date} bis {end_date}")

                # Google Calendar ist optional – fehler ignorieren
                try:
                    create_booking_event(
                        guest_email=mail["from"],
                        start_date=start_date,
                        end_date=end_date,
                        description=f"Anfrage:\n{mail['body']}",
                        color_id=color_id
                    )
                    log("📅 Kalendereintrag erstellt.")
                except Exception as e:
                    log(f"⚠️ Kalender-Fehler (ignoriert): {str(e)}")
            else:
                log("❌ GPT: Keine Buchung erkannt.")

            try:
                send_email(target_email, mail["subject"], reply)
                log(f"📤 Antwort automatisch gesendet an {target_email}")
                print(f"✅ E-Mail versendet an {target_email}")
                
                # Markiere als beantwortet NACH erfolgreichem Versand
                # Nutze die gleiche Key wie beim Duplikat-Check
                mark_as_answered(duplicate_check_key)
                log(f"✓ {duplicate_check_key} nach erfolgreicher Mail-Versand gespeichert")

                os.makedirs("logs", exist_ok=True)
                with open("logs/confirmed_replies.log", "a", encoding="utf-8") as f:
                    f.write(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] Antwort an {target_email}:\n")
                    f.write(reply.strip() + "\n\n")
            except Exception as e:
                log(f"⚠️ Fehler beim Senden: {e}")

        time.sleep(30)

if __name__ == "__main__":
    main()
