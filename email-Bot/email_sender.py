import smtplib
from email.mime.text import MIMEText
import os
from dotenv import load_dotenv

load_dotenv()

EMAIL = os.getenv("EMAIL_ADDRESS")
PASSWORD = os.getenv("EMAIL_PASSWORD")
SMTP_SERVER = os.getenv("SMTP_SERVER")
SMTP_PORT = int(os.getenv("SMTP_PORT"))

def send_email(to_address, subject, body):
    msg = MIMEText(body, "plain", "utf-8")
    msg["Subject"] = "Re: " + subject
    msg["From"] = EMAIL
    msg["To"] = to_address

    try:
        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.starttls()
        server.login(EMAIL, PASSWORD)
        server.send_message(msg)
        print(f"✅ Antwort erfolgreich an {to_address} gesendet.")

        # ➕ Kopie der Antwort an dich selbst senden
        copy = MIMEText(body, "plain", "utf-8")
        copy["Subject"] = "Kopie: Re: " + subject
        copy["From"] = EMAIL
        copy["To"] = EMAIL
        server.send_message(copy)
        print("📥 Kopie an dich selbst gesendet.")

        server.quit()
    except Exception as e:
        print("❌ Fehler beim Senden:", str(e))








