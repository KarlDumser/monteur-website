import imaplib
import email
import os
from dotenv import load_dotenv

load_dotenv('/home/karldumser/email-Bot/.env')

target_sender = 'd0d6a4c4fbb61c5334e182246a193949@mail.dmz.de'
subject_hint = 'Buchungsanfrage'
answered_log_path = '/home/karldumser/email-Bot/logs/answered_customers.log'


def remove_test_sender_from_answered_log():
    if not os.path.exists(answered_log_path):
        return

    with open(answered_log_path, 'r', encoding='utf-8') as handle:
        lines = handle.readlines()

    filtered = [
        line for line in lines
        if not line.lower().startswith(target_sender.lower() + '|')
    ]

    if filtered != lines:
        with open(answered_log_path, 'w', encoding='utf-8') as handle:
            handle.writelines(filtered)
        print('REMOVED_FROM_ANSWERED_LOG=' + target_sender)

m = imaplib.IMAP4_SSL(os.getenv('IMAP_SERVER'), 993)
m.login(os.getenv('EMAIL_ADDRESS'), os.getenv('EMAIL_PASSWORD'))
m.select('inbox')

_, msgs = m.search(None, 'ALL')
ids = msgs[0].split()
matched = []

for mid in ids:
    _, data = m.fetch(mid, '(RFC822.HEADER)')
    hdr = email.message_from_bytes(data[0][1])
    sender = hdr.get('From', '').split()[-1].strip('<>').lower()
    subj = hdr.get('Subject') or ''
    if sender == target_sender and subject_hint.lower() in subj.lower():
        matched.append(mid)

if not matched:
    print('NO_MATCH')
else:
    latest = matched[-1]
    remove_test_sender_from_answered_log()
    _, before = m.fetch(latest, '(FLAGS)')
    m.store(latest, '-FLAGS', '\\Seen')
    _, after = m.fetch(latest, '(FLAGS)')
    print('MARKED_ID=' + latest.decode())
    print('BEFORE=' + str(before))
    print('AFTER=' + str(after))

m.logout()
