import pandas as pd
import json

# Excel-Datei einlesen
df = pd.read_excel('Rechnungsdatenbank.xlsx')

# NaN-Werte durch leere Strings ersetzen
df = df.fillna('')

# DataFrame zu JSON konvertieren
data = df.to_dict('records')

# JSON-Datei schreiben
with open('customers-data.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2, default=str)

print(f"✅ {len(data)} Einträge nach customers-data.json exportiert")
