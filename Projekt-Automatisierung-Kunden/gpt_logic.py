import os
import re
from dotenv import load_dotenv
import openai

# .env einlesen (legt OPENAI_API_KEY, OPENAI_MODEL, OPENAI_TIMEOUT fest)
load_dotenv()

# OpenAI‑Client einmal global anlegen
aiclient = openai.OpenAI(api_key=os.environ["OPENAI_API_KEY"])


def chat(messages: list[dict], temperature: float = 0.4, max_tokens: int = 1024):
    """Zentrale Chat‑Funktion – alle Modelle & Parameter an einer Stelle.

    Liest das gewünschte Modell aus der Umgebungsvariable OPENAI_MODEL (Fallback
    gpt‑4.1‑mini) und gibt `openai.Message` (role+content) zurück.
    """
    model = os.getenv("OPENAI_MODEL", "gpt-4.1-mini")
    response = aiclient.chat.completions.create(
        model=model,
        messages=messages,
        temperature=temperature,
        max_tokens=max_tokens,
        timeout=float(os.getenv("OPENAI_TIMEOUT", 30)),
    )
    return response.choices[0].message  # enthält role + content


# -----------------------------------------------------------------------------
# Prompt‑Dateien
# -----------------------------------------------------------------------------
PROMPT_ROLE_PATH = "promts/prompt_role.txt"
PROMPT_FORMAT_PATH = "promts/prompt_format.txt"



# -----------------------------------------------------------------------------
# Hilfsfunktionen
# -----------------------------------------------------------------------------

def clean_email_body(text: str) -> str:
    """Entfernt Footer, Werbung, Links usw. und liefert die Kernanfrage."""

    # 1. Werbung / Banner abschneiden
    if "Anfrage von:" in text:
        text = text.split("Anfrage von:")[-1]

    footer_triggers = [
        "Jede Anfrage wird sicher",
        "Verwenden Sie einfach die Antwortfunktion",
        "Ihr Monteurzimmer.de-Team",
        "Passion 4 Gästezimmer GmbH",
        "Impressum",
        "service@monteurzimmer.de",
        "Friedrichstr.",
    ]
    for trigger in footer_triggers:
        if trigger in text:
            text = text.split(trigger)[0]

    # 2. Links entfernen
    text = re.sub(r"https?://\S+", "", text)

    # 3. Blacklist‑Phrasen löschen
    blacklist = [
        "Standort",
        "Passion 4 Gästezimmer Logo",
        "Villa Penthouse",
        "Liebe Frau Dumser,",
        "Sie haben eine Anfrage für Ihre Unterkunft",
        "Monteurzimmer.de",
        "Christine Dumser",
        "Frühlingsstraße",
        "Pension.de",
        "Deinzimmer.de",
        "Sprechzeiten",
        "Telefon:",
    ]
    for phrase in blacklist:
        text = text.replace(phrase, "")

    # 4. Nur ab dem mutmaßlichen Anfang der Nachricht behalten
    starts = ["haben sie", "wir suchen", "ich suche", "guten tag", "hallo"]
    for start in starts:
        if start in text.lower():
            text = text[text.lower().index(start) :]
            break

    # 5. Leere Zeilen trimmen
    text = "\n".join(line.strip() for line in text.splitlines() if line.strip())
    return text.strip()


# -----------------------------------------------------------------------------
# GPT‑gestützte Funktionen
# -----------------------------------------------------------------------------

def generate_reply(customer_message: str) -> str:
    """Erzeugt eine Antwort‑E‑Mail im definierten Format."""
    with open(PROMPT_ROLE_PATH, "r", encoding="utf-8") as f:
        role_prompt = f.read()
    with open(PROMPT_FORMAT_PATH, "r", encoding="utf-8") as f:
        format_prompt = f.read()

    prompt = f"""{role_prompt}\n\n{format_prompt}\n\nHier ist die Kundenanfrage:\n{customer_message}"""

    msg = chat([{"role": "user", "content": prompt}])
    return msg.content


def is_booking_confirmed(response_text: str) -> bool:
    """True, wenn Vermieter in seiner Antwort eindeutig zugesagt hat."""
    prompt = (
        "Analysiere folgenden Text und antworte **nur mit Ja oder Nein**.\n\nText:\n""")
    prompt += response_text + """\n\nHat der Vermieter der Anfrage **definitiv zugesagt**?"""

    msg = chat([{"role": "user", "content": prompt}])
    return "ja" in msg.content.strip().lower()


def extract_booking_dates(text: str):
    """Gibt (start, end) als Strings oder ("unbekannt", "unbekannt") zurück."""
    prompt = (
        "Lies den folgenden Text und erkenne das Start- und Enddatum eines gewünschten "
        "Buchungszeitraums.\n\nText:\n" + text + """\n\nAntwortformat:\nStart: JJJJ-MM-TT\nEnde: JJJJ-MM-TT\n\nWenn keine Daten erkennbar sind, gib:\nStart: unbekannt\nEnde: unbekannt"""
    )

    msg = chat([{"role": "user", "content": prompt}])
    reply = msg.content.strip().lower()

    start, end = "unbekannt", "unbekannt"
    for line in reply.splitlines():
        if "start" in line:
            start = line.split(":", 1)[-1].strip()
        elif "ende" in line:
            end = line.split(":", 1)[-1].strip()
    return start, end


def analyze_booking_interest(response_text: str) -> str:
    """klassifiziert Antwort in zugesagt / potenziell / abgelehnt"""
    prompt = (
        "Beurteile den folgenden Text, ob der Vermieter einem Kunden eine Unterkunft zugesagt hat.\n\n"
        "Antwortmöglichkeiten (bitte genau so):\n- zugesagt\n- potenziell\n- abgelehnt\n\nText:\n" + response_text
    )

    msg = chat([{"role": "user", "content": prompt}])
    result = msg.content.strip().lower()

    if "zugesagt" in result:
        return "zugesagt"
    elif "potenziell" in result:
        return "potenziell"
    else:
        return "abgelehnt"


def is_rental_related(text: str) -> bool:
    prompt = (
        "Beantworte mit \"ja\" oder \"nein\":  \nGeht es in folgendem Text um das Thema "
        "Wohnung, Vermietung, Unterkunft oder eine Anfrage zur Buchung einer Monteurwohnung?\n\nText:\n"
        + text
    )

    msg = chat([{"role": "user", "content": prompt}])
    return "ja" in msg.content.strip().lower()
