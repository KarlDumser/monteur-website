import re

# Zuordnung der bekannten Vermittlungsdomains
VERMITTLER_DOMAINS = {
    "monteurzimmerguru.de": "text",
    "dmz.de": "text",
    "mein-monteurzimmer.de": "text",
    "monteurzimmer.de": "text"
}

def extract_customer_email_from_body(body_text: str) -> str:
    """
    Extrahiert die echte Kunden-E-Mail aus dem Mail-Body.
    Sucht nach Patterns wie Email-Labels oder Kontaktinformationen.
    """
    if not body_text:
        print("⚠️ [smart_send_logic] Leerer Mail-Body")
        return None
    
    patterns = [
        r"(?:E-Mail|Email):\s*([\w\.-]+@[\w\.-]+\.\w+)",
        r"(?:Kontaktadresse|Kontakt E-Mail):\s*([\w\.-]+@[\w\.-]+\.\w+)",
        r"Telefon:.*?\n.*?([\w\.-]+@[\w\.-]+\.\w+)",
    ]
    
    for pattern in patterns:
        match = re.search(pattern, body_text, re.IGNORECASE)
        if match:
            email = match.group(1)
            print(f"✅ [smart_send_logic] Pattern gefunden: {email}")
            if "monteurzimmer" not in email.lower() and "pension.de" not in email.lower():
                return email
    
    # Fallback: erste E-Mail, die nicht von Vermittler kommt
    print("[smart_send_logic] Keine Pattern gefunden, suche nach Email-Adressen im Body...")
    emails = re.findall(r"([\w\.-]+@[\w\.-]+\.\w+)", body_text)
    print(f"[smart_send_logic] Gefundene Emails: {emails}")
    for email in emails:
        if "monteurzimmer" not in email.lower() and "pension.de" not in email.lower() and "dumser" not in email.lower():
            print(f"✅ [smart_send_logic] Fallback Email gefunden: {email}")
            return email
    
    print("⚠️ [smart_send_logic] KEINE Kunden-Email im Body gefunden")
    return None

def extract_target_email(from_address, body_text):
    domain = from_address.split("@")[-1].lower()

    for vermittler_domain, modus in VERMITTLER_DOMAINS.items():
        if vermittler_domain in domain:
            # Versuche echte Kunden-Email aus Body zu extrahieren
            customer_email = extract_customer_email_from_body(body_text)
            if customer_email:
                print(f"📌 Vermittler erkannt ({vermittler_domain}) – Kunden-Email gefunden: {customer_email}")
                return customer_email
            else:
                print(f"📌 Vermittler erkannt ({vermittler_domain}) – Keine Kunden-Email im Body, nutze Absender als Fallback.")
                return from_address

    # Kein bekannter Vermittler → direkter Kundenkontakt
    print(f"📎 Kein Vermittler erkannt – normale Adresse: {from_address}")
    return from_address
