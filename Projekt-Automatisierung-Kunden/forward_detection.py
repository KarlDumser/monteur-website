"""
Email forwarding detection and original sender extraction.
"""
import re

def extract_forwarded_sender(body_text: str, from_address: str) -> str:
    """
    Extract original sender from forwarded email.
    Returns original sender if detected, otherwise returns from_address.
    """
    # Pattern 1: "Von: Name <email@example.com>" or "From: email@example.com"
    von_pattern = r"(?:Von|From):\s*(?:.*?<)?([\w\.-]+@[\w\.-]+\.\w+)"
    match = re.search(von_pattern, body_text, re.IGNORECASE)
    if match:
        original = match.group(1)
        print(f"📧 Forward erkannt: Original-Absender {original}")
        return original
    
    # Pattern 2: Look for email in first few lines of body
    lines = body_text.strip().split('\n')[:10]
    for line in lines:
        email_match = re.search(r"([\w\.-]+@[\w\.-]+\.\w+)", line)
        if email_match and email_match.group(1).lower() != from_address.lower():
            original = email_match.group(1)
            print(f"📧 Moeglicher Original-Absender gefunden: {original}")
            return original
    
    return from_address
