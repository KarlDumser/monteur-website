import imaplib
import email
from email.header import decode_header
import os
from dotenv import load_dotenv

load_dotenv()

EMAIL = os.getenv("EMAIL_ADDRESS")
PASSWORD = os.getenv("EMAIL_PASSWORD")
IMAP_SERVER = os.getenv("IMAP_SERVER")

def safe_decode(payload):
    if isinstance(payload, str):
        return payload  # Bereits dekodiert
    try:
        return payload.decode("utf-8")
    except UnicodeDecodeError:
        try:
            return payload.decode("latin1")
        except:
            return payload.decode("utf-8", errors="replace")

def get_latest_email():
    print(f"🛠️ Verbinde mit {IMAP_SERVER} als {EMAIL}")
    try:
        mail = imaplib.IMAP4_SSL(IMAP_SERVER, 993)
        mail.login(EMAIL, PASSWORD)
        print("✅ IMAP-Login erfolgreich.")
    except imaplib.IMAP4.error as e:
        print("❌ IMAP Login fehlgeschlagen:", str(e))
        return None

    mail.select("inbox")
    status, messages = mail.search(None, 'UNSEEN')
    mail_ids = messages[0].split()

    if not mail_ids:
        print("📭 Keine ungelesenen E-Mails gefunden.")
        return None

    latest_email_id = mail_ids[-1]
    status, data = mail.fetch(latest_email_id, "(RFC822)")
    raw_email = data[0][1]
    msg = email.message_from_bytes(raw_email)

    # Betreff dekodieren
    subject, encoding = decode_header(msg["Subject"])[0]
    if isinstance(subject, bytes):
        subject = subject.decode(encoding or "utf-8", errors="replace")

    from_ = msg.get("From")
    sender = from_.split()[-1].strip("<>")

    # Inhalt extrahieren
    body = ""

    if msg.is_multipart():
        for part in msg.walk():
            content_type = part.get_content_type()
            content_dispo = str(part.get("Content-Disposition"))

            if "attachment" in content_dispo:
                continue

            if content_type == "text/plain":
                payload = part.get_payload(decode=True)
                body = safe_decode(payload)
                break
    else:
        payload = msg.get_payload(decode=True)
        body = safe_decode(payload)

    return {
        "from": sender,
        "subject": subject,
        "body": body
    }

