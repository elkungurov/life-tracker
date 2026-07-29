import { useAuth } from '../AuthContext';
import { Link } from 'react-router-dom';

export default function HomePage() {
  const { user, logout } = useAuth();

  return (
    <div id="app">
      <header>
        <h1 className="gradient">Life Tracker</h1>
        <p>Выберите календарь</p>
      </header>
      <div className="cards">
        <Link to="/sobriety" className="card">
          <span className="card-icon">&#127808;</span>
          <div className="card-content">
            <span className="card-title">Календарь трезвости</span>
            <span className="card-desc">Дни без алкоголя и никотина</span>
          </div>
          <span className="card-arrow">&rarr;</span>
        </Link>
        <Link to="/finance" className="card">
          <span className="card-icon">&#128176;</span>
          <div className="card-content">
            <span className="card-title">Финансовый менеджер</span>
            <span className="card-desc">Кредиты и платежи</span>
          </div>
          <span className="card-arrow">&rarr;</span>
        </Link>
      </div>
      <div className="footer-info">
        <span>{user?.email}</span>
        <button className="btn-link" onClick={logout}>Выйти</button>
      </div>
    </div>
  );
}
