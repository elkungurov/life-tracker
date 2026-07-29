const TOKEN_KEY = 'token';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export async function apiFetch(url, opts) {
  opts = opts || {};
  if (!opts.headers) opts.headers = {};
  const token = getToken();
  if (token) opts.headers['Authorization'] = 'Bearer ' + token;
  const res = await fetch(url, opts);
  if (res.status === 401) {
    clearToken();
    window.location.href = '/login';
    throw new Error('unauthorized');
  }
  return res;
}

export async function login(email, password) {
  const res = await fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  return res.json();
}

export async function register(email, password) {
  const res = await fetch('/api/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  return res.json();
}
