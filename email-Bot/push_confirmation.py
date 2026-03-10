import requests
import time
import uuid
import os
from dotenv import load_dotenv

load_dotenv()

PUSHOVER_USER_KEY = os.getenv("PUSHOVER_USER_KEY")
PUSHOVER_API_TOKEN = os.getenv("PUSHOVER_API_TOKEN")
CONFIRM_FOLDER = "/tmp"
CONFIRM_PUBLIC_URL = os.getenv("CONFIRM_PUBLIC_URL")
FLASK_CONFIRM_PORT = int(os.getenv("FLASK_CONFIRM_PORT", "5000"))

def build_confirm_url(confirm_id: str) -> str:
    if CONFIRM_PUBLIC_URL:
        base_url = CONFIRM_PUBLIC_URL.rstrip("/")
    else:
        base_url = f"http://localhost:{FLASK_CONFIRM_PORT}"
    return f"{base_url}/confirm?id={confirm_id}"

def send_push_notification(message: str, confirm_id: str):
    confirm_url = build_confirm_url(confirm_id)
    title = f"Antwort prüfen und bestätigen ({confirm_id})"
    body = f"GPT-Antwort:\n\n{message}\n\n✅ Zur Freigabe hier tippen:\n{confirm_url}"

    response = requests.post("https://api.pushover.net/1/messages.json", data={
        "token": PUSHOVER_API_TOKEN,
        "user": PUSHOVER_USER_KEY,
        "title": title,
        "message": body,
        "url": confirm_url,
        "url_title": "✅ Antwort freigeben"
    })

    if response.status_code != 200:
        print("❌ Fehler beim Senden der Pushover-Nachricht:", response.text)
    else:
        print("📲 Push-Benachrichtigung gesendet.")

def wait_for_ok(confirm_id: str, timeout=300, poll_interval=10) -> bool:
    confirm_file = f"{CONFIRM_FOLDER}/gpt_confirm_{confirm_id}.txt"
    print(f"⏳ Warte auf Bestätigung ({confirm_id})...")
    start_time = time.time()
    while time.time() - start_time < timeout:
        try:
            with open(confirm_file, "r") as f:
                content = f.read().strip()
                if content == f"/ok-{confirm_id}":
                    print("✅ Antwort wurde bestätigt.")
                    return True
        except FileNotFoundError:
            pass
        time.sleep(poll_interval)

    print("⌛ Zeitüberschreitung: Keine Bestätigung erhalten.")
    return False
