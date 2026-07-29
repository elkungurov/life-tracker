import { useState } from 'react';
import { useAuth } from '../AuthContext';
import { login, register } from '../api';

export default function LoginPage() {
  const { loginWithToken } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email.trim() || !password) { setError('Заполните все поля'); return; }
    if (password.length < 6) { setError('Пароль минимум 6 символов'); return; }
    setLoading(true); setError('');
    try {
      const data = await (isLogin ? login(email.trim(), password) : register(email.trim(), password));
      if (data.error) { setError(data.error); return; }
      loginWithToken(data.token);
    } catch { setError('Ошибка соединения'); }
    finally { setLoading(false); }
  }

  return (
    <div className="page-center">
      <div className="card">
        <h1 className="gradient">Life Tracker</h1>
        <p className="sub">{isLogin ? 'Войдите или зарегистрируйтесь' : 'Создайте аккаунт'}</p>
        <form onSubmit={handleSubmit}>
          <label>Email</label>
          <input type="email" placeholder="your@email.com" value={email} onChange={e => setEmail(e.target.value)} />
          <label>Пароль</label>
          <input type="password" placeholder="не менее 6 символов" value={password} onChange={e => setPassword(e.target.value)} />
          <button className="btn" type="submit" disabled={loading}>{loading ? 'Загрузка...' : isLogin ? 'Войти' : 'Зарегистрироваться'}</button>
          <div className="err">{error}</div>
        </form>
        <div className="toggle" onClick={() => { setIsLogin(!isLogin); setError(''); }}>
          {isLogin ? 'Нет аккаунта? Зарегистрироваться' : 'Уже есть аккаунт? Войти'}
        </div>
      </div>
    </div>
  );
}
