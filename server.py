from flask import Flask, request, jsonify, send_file, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from datetime import datetime, timedelta
from functools import wraps
import json, os, bcrypt, jwt

BASE = os.path.dirname(__file__)
app = Flask(__name__)

database_url = os.environ.get('DATABASE_URL', 'sqlite:///life-tracker.db')
if database_url.startswith('postgres://'):
    database_url = database_url.replace('postgres://', 'postgresql://', 1)
app.config['SQLALCHEMY_DATABASE_URI'] = database_url
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['JWT_SECRET'] = os.environ.get('JWT_SECRET', 'dev-secret-change-me')
db = SQLAlchemy(app)
CORS(app)

class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    finance_data = db.Column(db.Text, default='{"credits":[],"payments":{}}')
    sobriety_data = db.Column(db.Text, default='{}')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

with app.app_context():
    db.create_all()

def make_token(user):
    return jwt.encode({'user_id': user.id, 'email': user.email, 'exp': datetime.utcnow() + timedelta(days=30)}, app.config['JWT_SECRET'], algorithm='HS256')

def require_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth = request.headers.get('Authorization', '')
        if not auth.startswith('Bearer '):
            return jsonify({'error': 'no token'}), 401
        try:
            payload = jwt.decode(auth[7:], app.config['JWT_SECRET'], algorithms=['HS256'])
            user = db.session.get(User, payload['user_id'])
            if not user:
                return jsonify({'error': 'user not found'}), 401
            request.current_user = user
        except jwt.ExpiredSignatureError:
            return jsonify({'error': 'token expired'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'error': 'invalid token'}), 401
        return f(*args, **kwargs)
    return decorated

@app.route('/api/register', methods=['POST'])
def register():
    data = request.get_json()
    if not data or not data.get('email') or not data.get('password'):
        return jsonify({'error': 'email and password required'}), 400
    email = data['email'].strip().lower()
    if User.query.filter_by(email=email).first():
        return jsonify({'error': 'email already registered'}), 409
    password_hash = bcrypt.hashpw(data['password'].encode(), bcrypt.gensalt()).decode()
    user = User(email=email, password_hash=password_hash)
    db.session.add(user)
    db.session.commit()
    return jsonify({'token': make_token(user), 'user': {'id': user.id, 'email': user.email}})

@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    if not data or not data.get('email') or not data.get('password'):
        return jsonify({'error': 'email and password required'}), 400
    email = data['email'].strip().lower()
    user = User.query.filter_by(email=email).first()
    if not user or not bcrypt.checkpw(data['password'].encode(), user.password_hash.encode()):
        return jsonify({'error': 'invalid email or password'}), 401
    return jsonify({'token': make_token(user), 'user': {'id': user.id, 'email': user.email}})

@app.route('/api/finance/data', methods=['GET'])
@require_auth
def get_finance():
    return jsonify(json.loads(request.current_user.finance_data))

@app.route('/api/finance/data', methods=['POST'])
@require_auth
def save_finance():
    d = request.get_json()
    if d is None: return jsonify({'error':'invalid json'}), 400
    request.current_user.finance_data = json.dumps(d, ensure_ascii=False)
    db.session.commit()
    return jsonify({'ok': True})

@app.route('/api/sobriety/records', methods=['GET'])
@require_auth
def get_sobriety():
    return jsonify(json.loads(request.current_user.sobriety_data))

@app.route('/api/sobriety/records', methods=['POST'])
@require_auth
def save_sobriety():
    d = request.get_json()
    if d is None: return jsonify({'error':'invalid json'}), 400
    request.current_user.sobriety_data = json.dumps(d, ensure_ascii=False)
    db.session.commit()
    return jsonify({'ok': True})

CLIENT_DIST = os.path.join(BASE, 'client', 'dist')
HTML_PAGES = {'', 'login', 'finance', 'sobriety'}

def _serve_client_index():
    if os.path.isfile(os.path.join(CLIENT_DIST, 'index.html')):
        return send_file(os.path.join(CLIENT_DIST, 'index.html'))
    return send_file(os.path.join(BASE, 'index.html'))

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_frontend(path):
    if path.startswith('api/'):
        return jsonify({'error': 'not found'}), 404
    # Try serving from React build
    if os.path.isfile(os.path.join(CLIENT_DIST, 'index.html')):
        file_path = os.path.join(CLIENT_DIST, path)
        if path and os.path.isfile(file_path):
            return send_file(file_path)
        return _serve_client_index()
    # Fallback to old HTML files
    if path in HTML_PAGES:
        page = path if path else 'index'
        f = os.path.join(BASE, page + '.html')
        if os.path.isfile(f):
            return send_file(f)
    return send_file(os.path.join(BASE, 'index.html'))

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5002))
    app.run(host='0.0.0.0', port=port, debug=True)
