#!/usr/bin/env python3
"""
Bot Control HTTP Server
Läuft auf dem Raspberry Pi und steuert den Wohnungsbot-Service via systemctl.
Nur über Tailscale erreichbar für zusätzliche Sicherheit.
"""

from flask import Flask, jsonify, request
import subprocess
import os
from functools import wraps

app = Flask(__name__)

# Sicherheits-Token aus Umgebungsvariable
API_TOKEN = os.environ.get('BOT_CONTROL_TOKEN', 'change-me-in-production')
SERVICE_NAME = 'wohnungsbot.service'
LOG_FILE = os.path.join(os.path.dirname(__file__), 'log.txt')

def require_token(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization', '')
        if token != f'Bearer {API_TOKEN}':
            return jsonify({'error': 'Unauthorized'}), 401
        return f(*args, **kwargs)
    return decorated

def run_command(cmd, timeout=5):
    """Führt einen Shell-Befehl aus und gibt stdout/stderr zurück."""
    try:
        result = subprocess.run(
            cmd,
            shell=True,
            capture_output=True,
            text=True,
            timeout=timeout
        )
        return {
            'success': result.returncode == 0,
            'stdout': result.stdout.strip(),
            'stderr': result.stderr.strip(),
            'returncode': result.returncode
        }
    except subprocess.TimeoutExpired:
        return {'success': False, 'error': 'Command timeout', 'returncode': -1}
    except Exception as e:
        return {'success': False, 'error': str(e), 'returncode': -1}

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint (kein Token nötig)."""
    return jsonify({'status': 'ok', 'service': 'bot-control-server'})

@app.route('/status', methods=['GET'])
@require_token
def status():
    """Prüft ob der Bot-Service läuft."""
    result = run_command(f'sudo systemctl is-active {SERVICE_NAME}')
    is_active = result['stdout'] == 'active'
    
    return jsonify({
        'status': 'active' if is_active else 'inactive',
        'service': SERVICE_NAME,
        'details': result['stdout']
    })

@app.route('/start', methods=['POST'])
@require_token
def start():
    """Startet den Bot-Service."""
    result = run_command(f'sudo systemctl start {SERVICE_NAME}')
    
    if result['success']:
        return jsonify({'success': True, 'message': 'Bot gestartet'})
    else:
        return jsonify({
            'success': False,
            'error': result.get('stderr', result.get('error', 'Unknown error'))
        }), 500

@app.route('/stop', methods=['POST'])
@require_token
def stop():
    """Stoppt den Bot-Service."""
    result = run_command(f'sudo systemctl stop {SERVICE_NAME}')
    
    if result['success']:
        return jsonify({'success': True, 'message': 'Bot gestoppt'})
    else:
        return jsonify({
            'success': False,
            'error': result.get('stderr', result.get('error', 'Unknown error'))
        }), 500

@app.route('/logs', methods=['GET'])
@require_token
def logs():
    """Gibt die letzten Log-Zeilen zurück."""
    lines = request.args.get('lines', '200')
    
    try:
        lines = int(lines)
        lines = max(1, min(lines, 1000))  # Begrenzen auf 1-1000 Zeilen
    except ValueError:
        lines = 200
    
    # Versuche zuerst log.txt
    if os.path.exists(LOG_FILE):
        result = run_command(f'tail -n {lines} "{LOG_FILE}"', timeout=3)
        if result['success']:
            return jsonify({
                'logs': result['stdout'],
                'source': 'log.txt'
            })
    
    # Fallback: journalctl
    result = run_command(
        f'sudo journalctl -u {SERVICE_NAME} -n {lines} --no-pager',
        timeout=5
    )
    
    if result['success']:
        return jsonify({
            'logs': result['stdout'],
            'source': 'journalctl'
        })
    else:
        return jsonify({
            'logs': '',
            'error': 'Keine Logs verfügbar',
            'source': 'none'
        })

@app.route('/clear-logs', methods=['POST'])
@require_token
def clear_logs():
    """Löscht die Log-Datei."""
    if not os.path.exists(LOG_FILE):
        return jsonify({'success': True, 'message': 'keine Log-Datei vorhanden'})
    
    try:
        with open(LOG_FILE, 'w') as f:
            f.write('')  # Truncate the file
        return jsonify({'success': True, 'message': 'Logs gelöscht'})
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/info', methods=['GET'])
@require_token
def info():
    """Gibt Systeminformationen zurück."""
    hostname = run_command('hostname')['stdout']
    
    return jsonify({
        'hostname': hostname,
        'service': SERVICE_NAME,
        'log_file': LOG_FILE
    })

if __name__ == '__main__':
    # Nur auf Tailscale Interface lauschen (100.x.x.x)
    # Oder 0.0.0.0 wenn Firewall richtig konfiguriert ist
    app.run(host='0.0.0.0', port=5555, debug=False)
