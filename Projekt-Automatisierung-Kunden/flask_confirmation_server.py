from flask import Flask, request
import os
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CONFIRM_FOLDER = "/tmp"

@app.route("/confirm", methods=["GET"])
def confirm():
    confirm_id = request.args.get("id")
    if not confirm_id:
        return "❌ Fehlende ID in der Anfrage.", 400

    filename = os.path.join(CONFIRM_FOLDER, f"gpt_confirm_{confirm_id}.txt")
    with open(filename, "w") as f:
        f.write(f"/ok-{confirm_id}")

    return "✅ Antwort wurde bestätigt. Du kannst das Fenster jetzt schließen."

@app.route("/")
def index():
    return "GPT Bestätigungsserver läuft."

if __name__ == "__main__":
    host = os.getenv("FLASK_CONFIRM_HOST", "0.0.0.0")
    port = int(os.getenv("FLASK_CONFIRM_PORT", 5000))
    app.run(host=host, port=port)
