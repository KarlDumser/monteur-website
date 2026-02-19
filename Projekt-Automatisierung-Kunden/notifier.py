import os
import requests
from dotenv import load_dotenv

load_dotenv()

PUSHOVER_USER_KEY = os.getenv("PUSHOVER_USER_KEY")
PUSHOVER_API_TOKEN = os.getenv("PUSHOVER_API_TOKEN")

def send_push(title, message):
    data = {
        "token": PUSHOVER_API_TOKEN,
        "user": PUSHOVER_USER_KEY,
        "title": title,
        "message": message
    }

    try:
        response = requests.post("https://api.pushover.net/1/messages.json", data=data)
        if response.status_code == 200:
            print("📱 Push-Nachricht gesendet!")
        else:
            print("❌ Fehler beim Senden der Push-Nachricht:", response.text)
    except Exception as e:
        print("❌ Push-Fehler:", str(e))
