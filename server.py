from flask import Flask, request, jsonify, send_file, send_from_directory
import json
import os

BASE = os.path.dirname(__file__)
SOBRIETY_DATA = os.path.join(BASE, 'data-sobriety.json')
FINANCE_DATA = os.path.join(BASE, 'data-finance.json')
app = Flask(__name__)

def load_json(path, default):
    if os.path.exists(path):
        with open(path, 'r', encoding='utf-8') as f:
            return json.load(f)
    return default

def save_json(path, data):
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

@app.route('/api/sobriety/records', methods=['GET'])
def get_sobriety():
    return jsonify(load_json(SOBRIETY_DATA, {}))

@app.route('/api/sobriety/records', methods=['POST'])
def save_sobriety():
    d = request.get_json()
    if d is None: return jsonify({'error':'invalid json'}), 400
    save_json(SOBRIETY_DATA, d)
    return jsonify({'ok': True})

@app.route('/api/finance/data', methods=['GET'])
def get_finance():
    return jsonify(load_json(FINANCE_DATA, {'credits':[],'payments':{}}))

@app.route('/api/finance/data', methods=['POST'])
def save_finance():
    d = request.get_json()
    if d is None: return jsonify({'error':'invalid json'}), 400
    save_json(FINANCE_DATA, d)
    return jsonify({'ok': True})

@app.route('/')
def home():
    return send_file(os.path.join(BASE, 'index.html'))

@app.route('/sobriety')
def sobriety():
    return send_file(os.path.join(BASE, 'sobriety.html'))

@app.route('/finance')
def finance():
    return send_file(os.path.join(BASE, 'finance.html'))

@app.route('/<path:path>')
def static_files(path):
    return send_from_directory(BASE, path)

@app.after_request
def add_headers(resp):
    resp.headers['Access-Control-Allow-Origin'] = '*'
    resp.headers['Access-Control-Allow-Headers'] = 'Content-Type'
    resp.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
    return resp

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5002))
    app.run(host='0.0.0.0', port=port, debug=True)
