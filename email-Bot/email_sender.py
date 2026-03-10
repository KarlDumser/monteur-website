import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime
import html
import os
from dotenv import load_dotenv

load_dotenv()

EMAIL = os.getenv("EMAIL_ADDRESS")
PASSWORD = os.getenv("EMAIL_PASSWORD")
SMTP_SERVER = os.getenv("SMTP_SERVER")
SMTP_PORT = int(os.getenv("SMTP_PORT"))

def _plain_to_html(text: str) -> str:
    """Wandelt Plain-Text mit \\n-Absätzen in sauberes HTML um."""
    escaped = html.escape(text)
    # Doppelte Leerzeilen → Absatz-Trennung, einzelne Zeilenumbrüche → <br>
    paragraphs = escaped.split("\n\n")
    html_parts = []
    for para in paragraphs:
        para = para.strip()
        if para:
            inner = para.replace("\n", "<br>\n")
            html_parts.append(f"<p>{inner}</p>")
    return (
        "<!DOCTYPE html><html><body style='font-family:Arial,sans-serif;"
        "font-size:14px;line-height:1.6;color:#222;max-width:600px;'>\n"
        + "\n".join(html_parts)
        + "\n</body></html>"
    )

def send_email(to_address, subject, body):
    msg = MIMEMultipart("alternative")
    msg["Subject"] = "Re: " + subject
    msg["From"] = EMAIL
    msg["To"] = to_address
    msg.attach(MIMEText(body, "plain", "utf-8"))
    msg.attach(MIMEText(_plain_to_html(body), "html", "utf-8"))

    try:
        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.starttls()
        server.login(EMAIL, PASSWORD)
        server.send_message(msg)
        print(f"✅ Antwort erfolgreich an {to_address} gesendet.")

        # ➕ Kopie der Antwort an dich selbst – klar als Bot-Benachrichtigung formatiert
        zeitpunkt = datetime.now().strftime("%d.%m.%Y um %H:%M Uhr")
        copy_body = "\n".join([
            "BOT-ANTWORT AUTOMATISCH GESENDET",
            "",
            f"Anfrage von: {to_address}",
            f"Betreff: {subject}",
            f"Zeitpunkt: {zeitpunkt}",
            "",
            "VERSENDETE ANTWORT:",
            "",
            body.strip(),
            "",
            "Diese Nachricht wurde automatisch vom Bot erstellt.",
        ])
        copy = MIMEText(copy_body, "plain", "utf-8")
        copy["Subject"] = f"[Bot] Antwort an {to_address} – {subject[:50]}"
        copy["From"] = EMAIL
        copy["To"] = EMAIL
        server.send_message(copy)
        print("📥 Kopie an dich selbst gesendet.")

        server.quit()
    except Exception as e:
        print("❌ Fehler beim Senden:", str(e))








