import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../api';

const DAYS_RU = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];
const MONTHS_RU = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
const MONTHS_GEN = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];

function dateKey(d) {
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
}

function pluralize(n, one, few, many) {
  n = Math.abs(n) % 100;
  const n1 = n % 10;
  if (n > 10 && n < 20) return many;
  if (n1 > 1 && n1 < 5) return few;
  if (n1 === 1) return one;
  return many;
}

function calcStreak(records, qualifies, from) {
  let count = 0;
  const d = new Date(from);
  for (let i = 0; i < 3650; i++) {
    const key = dateKey(d);
    const s = records[key];
    if (s && qualifies(s)) { count++; d.setDate(d.getDate() - 1); }
    else if (i === 0 && !s) { d.setDate(d.getDate() - 1); continue; }
    else break;
  }
  return count;
}

export default function SobrietyPage() {
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [records, setRecords] = useState({});
  const [modalDate, setModalDate] = useState(null);

  const loadRecords = useCallback(async () => {
    const cached = localStorage.getItem('sobrietyCalendar');
    if (cached) try { setRecords(JSON.parse(cached)); } catch {}
    try {
      const res = await apiFetch('/api/sobriety/records');
      const server = await res.json();
      if (Object.keys(server).length > 0) {
        setRecords(server);
        localStorage.setItem('sobrietyCalendar', JSON.stringify(server));
      }
    } catch {}
  }, []);

  const saveRecords = useCallback(async (r) => {
    localStorage.setItem('sobrietyCalendar', JSON.stringify(r));
    try { await apiFetch('/api/sobriety/records', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(r) }); } catch {}
  }, []);

  useEffect(() => { loadRecords(); }, [loadRecords]);

  function prevMonth() {
    let m = viewMonth - 1, y = viewYear;
    if (m < 0) { m = 11; y--; }
    setViewMonth(m); setViewYear(y);
  }

  function nextMonth() {
    let m = viewMonth + 1, y = viewYear;
    if (m > 11) { m = 0; y++; }
    setViewMonth(m); setViewYear(y);
  }

  function setStatus(status) {
    if (!modalDate) return;
    const key = dateKey(modalDate);
    const r = { ...records };
    if (status === 'none' || r[key] === status) delete r[key];
    else r[key] = status;
    setRecords(r);
    saveRecords(r);
    setModalDate(null);
  }

  const qualifiesTotal = s => s === 'sober';
  const qualifiesAlc = s => s === 'sober' || s === 'no_alcohol';
  const qualifiesNic = s => s === 'sober' || s === 'no_nicotine';

  const streakTotal = calcStreak(records, qualifiesTotal, now);
  const streakAlc = calcStreak(records, qualifiesAlc, now);
  const streakNic = calcStreak(records, qualifiesNic, now);

  let sober = 0, noAlc = 0, noNic = 0;
  for (const key in records) {
    const s = records[key];
    if (s === 'sober') { sober++; noAlc++; noNic++; }
    else if (s === 'no_alcohol') noAlc++;
    else if (s === 'no_nicotine') noNic++;
  }

  const firstDay = new Date(viewYear, viewMonth, 1);
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const startCol = (firstDay.getDay() + 6) % 7;
  const today = new Date();
  const todayStr = dateKey(today);

  return (
    <div id="app">
      <div className="top-bar">
        <Link to="/" className="back-btn">&larr; Назад</Link>
      </div>
      <header>
        <h1 className="gradient">Календарь трезвости</h1>
        <p>Выберите дату, чтобы отметить состояние</p>
      </header>

      <div className="stats">
        <div className="stat-card">
          <span className="stat-value" style={{color:'var(--accent)'}}>{streakTotal}</span>
          <span className="stat-label">{pluralize(streakTotal, 'день', 'дня', 'дней')} подряд</span>
        </div>
        <div className="stat-card">
          <span className="stat-value" style={{color:'var(--orange)'}}>{streakAlc}</span>
          <span className="stat-label">{pluralize(streakAlc, 'день', 'дня', 'дней')} без алкоголя подряд</span>
        </div>
        <div className="stat-card">
          <span className="stat-value" style={{color:'var(--purple)'}}>{streakNic}</span>
          <span className="stat-label">{pluralize(streakNic, 'день', 'дня', 'дней')} без никотина подряд</span>
        </div>
      </div>

      <div className="totals">
        <span>всего {sober}</span>
        <span>алкоголь {noAlc}</span>
        <span>никотин {noNic}</span>
      </div>

      <div className="nav">
        <button onClick={prevMonth}>&larr;</button>
        <span className="month-title">{MONTHS_RU[viewMonth]} {viewYear}</span>
        <button onClick={nextMonth}>&rarr;</button>
      </div>

      <div className="calendar">
        {DAYS_RU.map(d => <div key={d} className="day-header">{d}</div>)}
        {Array.from({length: startCol}).map((_, i) => <div key={'e'+i} className="day-cell empty"></div>)}
        {Array.from({length: daysInMonth}).map((_, i) => {
          const d = i + 1;
          const date = new Date(viewYear, viewMonth, d);
          const key = dateKey(date);
          const status = records[key];
          const isToday = key === todayStr;
          const isFuture = date > today;
          let cls = 'day-cell';
          if (isToday) cls += ' today';
          if (isFuture) cls += ' future';
          if (status && status !== 'none') cls += ' status-' + status;
          return <div key={d} className={cls} onClick={() => !isFuture && setModalDate(date)}>{d}</div>;
        })}
        {Array.from({length: (7 - (startCol + daysInMonth) % 7) % 7}).map((_, i) => <div key={'t'+i} className="day-cell empty"></div>)}
      </div>

      {modalDate && (
        <div className="overlay active" onClick={e => e.target === e.currentTarget && setModalDate(null)}>
          <div className="modal-card">
            <h3>{modalDate.getDate()} {MONTHS_GEN[modalDate.getMonth()]} {modalDate.getFullYear()}</h3>
            <div className="modal-buttons">
              {[
                { label: 'Трезвость', status: 'sober', color: 'var(--accent)' },
                { label: 'Без алкоголя', status: 'no_alcohol', color: 'var(--orange)' },
                { label: 'Без никотина', status: 'no_nicotine', color: 'var(--purple)' },
                { label: 'Срыв', status: 'relapse', color: 'var(--red)' },
              ].map(b => {
                const key = dateKey(modalDate);
                const isActive = records[key] === b.status;
                return (
                  <button key={b.status} className="modal-btn" style={isActive ? {borderColor:'var(--text-secondary)',background:'rgba(255,255,255,.06)'} : {}}
                    onClick={() => setStatus(b.status)}>
                    <span className="modal-btn-dot" style={{background:b.color}}></span>
                    {b.label}
                  </button>
                );
              })}
              <button className="modal-btn btn-cancel" onClick={() => setModalDate(null)}>Закрыть</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
