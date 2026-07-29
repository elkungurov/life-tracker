import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../api';

const DAYS_RU = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];
const MONTHS_RU = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
const MONTHS_GEN = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];

function fmtFull(n) { return n.toLocaleString('ru-RU') + ' \u20BD'; }
function esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

function dateKey(d) {
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
}

function isActiveInMonth(c, year, month) {
  if (!c.lastMonth) return true;
  return (year + '-' + String(month+1).padStart(2,'0')) <= c.lastMonth;
}

export default function FinancePage() {
  const now = new Date();
  const [data, setData] = useState({ balance: 0, transactions: [], credits: [], payments: {} });
  const [view, setView] = useState('dashboard');
  const [vYear, setVYear] = useState(now.getFullYear());
  const [vMonth, setVMonth] = useState(now.getMonth());
  const [editingCredit, setEditingCredit] = useState(null);
  const [paymentDay, setPaymentDay] = useState(null);
  const [showIncome, setShowIncome] = useState(false);
  const [showPayment, setShowPayment] = useState(false);

  const saveData = useCallback(async (d) => {
    localStorage.setItem('financeData', JSON.stringify(d));
    try { await apiFetch('/api/finance/data', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(d) }); } catch {}
  }, []);

  const loadData = useCallback(async () => {
    const cached = localStorage.getItem('financeData');
    let d = { balance: 0, transactions: [], credits: [], payments: {} };
    if (cached) try { d = JSON.parse(cached); } catch {}
    try {
      const res = await apiFetch('/api/finance/data');
      const server = await res.json();
      if ((server.credits?.length || 0) > 0 || Object.keys(server.payments || {}).length > 0) {
        d = server;
        localStorage.setItem('financeData', JSON.stringify(d));
      } else if ((d.credits?.length || 0) > 0) {
        await apiFetch('/api/finance/data', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(d) });
      }
    } catch {}
    setData(d);
  }, [saveData]);

  useEffect(() => { loadData(); }, [loadData]);

  function updateData(updater) {
    setData(prev => {
      const next = typeof updater === 'function' ? updater(prev) : { ...prev, ...updater };
      saveData(next);
      return next;
    });
  }

  // Income
  function handleIncome(e) {
    e.preventDefault();
    const fd = e.target;
    const amount = parseFloat(fd.amount.value);
    const date = fd.date.value;
    const source = fd.source.value.trim();
    if (!amount || !date || !source) return;
    updateData(prev => ({
      ...prev,
      transactions: [...(prev.transactions || []), { id: Date.now().toString(36), amount, date, source }],
      balance: (prev.balance ?? 0) + amount
    }));
    setShowIncome(false);
  }

  // Credit modal
  function saveCredit(e) {
    e.preventDefault();
    const fd = e.target;
    const name = fd.name.value.trim();
    const monthly = parseFloat(fd.monthly.value);
    const day = parseInt(fd.day.value);
    const lastRaw = fd.last.value.trim();
    let lastMonth = '';
    if (lastRaw) { const m = lastRaw.match(/^(\d{2})\.(\d{4})$/); if (m) lastMonth = m[2] + '-' + m[1]; }
    if (!name || !monthly || !day || day < 1 || day > 31) return;

    updateData(prev => {
      const credits = [...(prev.credits || [])];
      if (editingCredit) {
        const idx = credits.findIndex(x => x.id === editingCredit.id);
        if (idx >= 0) credits[idx] = { ...credits[idx], name, monthly, day, lastMonth: lastMonth || undefined };
      } else {
        credits.push({ id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2), name, monthly, day, lastMonth: lastMonth || undefined });
      }
      return { ...prev, credits };
    });
    setEditingCredit(null);
  }

  function deleteCredit(idx) {
    if (!confirm('Удалить кредит «' + data.credits[idx].name + '»?')) return;
    const id = data.credits[idx].id;
    updateData(prev => {
      const payments = { ...prev.payments };
      delete payments[id];
      return { ...prev, credits: prev.credits.filter((_, i) => i !== idx), payments };
    });
  }

  function editBalance() {
    const current = data.balance ?? 0;
    const input = prompt('Введите текущий баланс:', current);
    if (input === null) return;
    const val = parseFloat(input.replace(/\s/g, '').replace(',', '.'));
    if (!isNaN(val)) updateData(prev => ({ ...prev, balance: val }));
  }

  function payCredit(cid, ym, early) {
    updateData(prev => {
      const payments = { ...prev.payments };
      if (!payments[cid]) payments[cid] = {};
      payments[cid] = { ...payments[cid], [ym]: { status: early ? 'early' : 'paid', date: dateKey(new Date()) } };
      return { ...prev, payments };
    });
    setShowPayment(false);
  }

  function unpayCredit(cid, ym) {
    updateData(prev => {
      const payments = { ...prev.payments };
      if (payments[cid]) { const p = { ...payments[cid] }; delete p[ym]; payments[cid] = p; }
      return { ...prev, payments };
    });
    setShowPayment(false);
  }

  function openPaymentModal(year, month, day) {
    setPaymentDay({ year, month, day });
    setShowPayment(true);
  }

  // Derived data
  const ym = vYear + '-' + String(vMonth+1).padStart(2, '0');
  const activeCredits = (data.credits || []).filter(c => isActiveInMonth(c, vYear, vMonth));
  const totalMonthly = activeCredits.reduce((s, c) => s + (c.monthly || 0), 0);
  let paidThisMonth = 0;
  for (const c of activeCredits) {
    const p = data.payments?.[c.id]?.[ym];
    if (p?.status === 'paid' || p?.status === 'early') paidThisMonth += c.monthly;
  }

  function getDayIcons(year, month, day) {
    const icons = [];
    for (const c of (data.credits || [])) {
      if (c.day === day && isActiveInMonth(c, year, month)) {
        const p = data.payments[c.id]?.[ym];
        if (p?.status === 'paid') icons.push(<span key={c.id} className="icon-paid">{'\u2713'}</span>);
        else if (p?.status === 'early') icons.push(<span key={c.id} className="icon-early">{'\u26A1'}</span>);
        else icons.push(<span key={c.id} className={new Date(year, month, day) <= new Date() ? 'icon-unpaid' : 'icon-future'}></span>);
      }
    }
    return icons;
  }

  const today = new Date();
  const todayStr = dateKey(today);

  return (
    <div id="app">
      <div className="top-bar">
        <Link to="/" className="back-btn">&larr; Назад</Link>
      </div>
      <header>
        <h1 className="gradient">Финансовый менеджер</h1>
        <p>Расходы и доходы под контролем</p>
      </header>

      <div className="tabs">
        <button className={view === 'dashboard' ? 'active' : ''} onClick={() => setView('dashboard')}>Главная</button>
        <button className={view === 'credits' ? 'active' : ''} onClick={() => setView('credits')}>Кредиты</button>
      </div>

      {view === 'dashboard' && (
        <>
          <div className="balance-card" onClick={editBalance}>
            <div className="label">Текущий баланс</div>
            <div className="value">{fmtFull(data.balance ?? 0)}</div>
            <div className="hint">Нажмите, чтобы изменить</div>
          </div>

          <div className="action-btns">
            <button className="btn-income" onClick={() => setShowIncome(true)}>+ Приход</button>
          </div>

          <div className="section-header">Последние операции</div>
          <div className="tx-list">
            {(data.transactions || []).length === 0 ? (
              <div className="empty-state">Пока нет операций</div>
            ) : (
              [...(data.transactions || [])].reverse().slice(0, 20).map((t, i) => {
                const d = t.date ? t.date.slice(8,10) + '.' + t.date.slice(5,7) + '.' + t.date.slice(0,4) : '';
                return (
                  <div key={t.id || i} className="tx-item">
                    <span className="tx-date">{d}</span>
                    <span className="tx-source">{esc(t.source || '')}</span>
                    <span className="tx-amount">+{fmtFull(t.amount)}</span>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}

      {view === 'credits' && (
        <>
          <div className="stats">
            <div className="stat-card">
              <span className="stat-value">{activeCredits.length}</span>
              <span className="stat-label">активных кредитов</span>
            </div>
            <div className="stat-card">
              <span className="stat-value" style={{color:'var(--orange)'}}>{fmtFull(totalMonthly)}</span>
              <span className="stat-label">платежей в {MONTHS_RU[vMonth].toLowerCase()}</span>
            </div>
            <div className="stat-card">
              <span className="stat-value" style={{color:'var(--red)'}}>{fmtFull(totalMonthly - paidThisMonth)}</span>
              <span className="stat-label">осталось в {MONTHS_RU[vMonth].toLowerCase()}</span>
            </div>
          </div>

          <div className="section-title">
            <button onClick={() => setEditingCredit({})}>+ Добавить</button>
          </div>

          <div className="credits">
            {(!data.credits || data.credits.length === 0) ? (
              <div className="empty-state">Нет кредитов. Нажмите «+ Добавить»</div>
            ) : (
              data.credits.map((c, i) => {
                const p = data.payments?.[c.id]?.[ym];
                let badge = null;
                if (p?.status === 'paid') badge = <span className="credit-badge paid">{'\u2713'}</span>;
                else if (p?.status === 'early') badge = <span className="credit-badge early">{'\u26A1'}</span>;
                return (
                  <div key={c.id || i} className="credit-item">
                    <div className="credit-info" onClick={() => openPaymentModal(vYear, vMonth, c.day)}>
                      <div className="credit-name">{esc(c.name)}</div>
                      <div className="credit-details">{fmtFull(c.monthly)}/мес, {c.day}-го числа</div>
                    </div>
                    <div className="credit-right">
                      {badge}
                      <div className="credit-actions">
                        <button onClick={() => { const d = document.getElementById('inp-'+i+'-name'); d && d.focus(); setEditingCredit(c); }}>{'\u270E'}</button>
                        <button onClick={() => deleteCredit(i)}>{'\u2716'}</button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="nav">
            <button onClick={() => { let m=vMonth-1,y=vYear; if(m<0){m=11;y--} setVMonth(m); setVYear(y) }}>&larr;</button>
            <span className="month-title">{MONTHS_RU[vMonth]} {vYear}</span>
            <button onClick={() => { let m=vMonth+1,y=vYear; if(m>11){m=0;y++} setVMonth(m); setVYear(y) }}>&rarr;</button>
          </div>

          <div className="legend">
            <span className="legend-item"><span style={{color:'var(--accent)',fontWeight:700}}>{'\u2713'}</span> Оплачено</span>
            <span className="legend-item"><span style={{color:'var(--yellow)'}}>{'\u26A1'}</span> Досрочно</span>
            <span className="legend-item"><span className="dot red"></span> Не оплачено</span>
            <span className="legend-item"><span className="dot gray"></span> Нет платежа</span>
          </div>

          <div className="calendar">
            {DAYS_RU.map(d => <div key={d} className="day-header">{d}</div>)}
            {Array.from({length: (new Date(vYear, vMonth, 1).getDay() + 6) % 7}).map((_, i) => <div key={'e'+i} className="day-cell empty"></div>)}
            {Array.from({length: new Date(vYear, vMonth + 1, 0).getDate()}).map((_, i) => {
              const d = i + 1;
              const date = new Date(vYear, vMonth, d);
              const isToday = dateKey(date) === todayStr;
              const isFuture = date > today;
              const icons = getDayIcons(vYear, vMonth, d);
              let cls = 'day-cell';
              if (isToday) cls += ' today';
              if (isFuture) cls += ' future';
              return (
                <div key={d} className={cls} onClick={() => {
                  const hasPayments = (data.credits || []).some(c => c.day === d);
                  if (hasPayments) openPaymentModal(vYear, vMonth, d);
                  else setEditingCredit({ day: d });
                }}>
                  <span className="day-num">{d}</span>
                  {icons.length > 0 && <div className="day-dots">{icons}</div>}
                </div>
              );
            })}
            {Array.from({length: (7 - (((new Date(vYear, vMonth, 1).getDay() + 6) % 7) + new Date(vYear, vMonth + 1, 0).getDate()) % 7) % 7}).map((_, i) => <div key={'t'+i} className="day-cell empty"></div>)}
          </div>
        </>
      )}

      {/* Income Modal */}
      {showIncome && (
        <div className="overlay active" onClick={e => e.target === e.currentTarget && setShowIncome(false)}>
          <div className="modal-card">
            <h3>Добавить приход</h3>
            <form onSubmit={handleIncome}>
              <label>Сумма, ₽</label>
              <input name="amount" type="number" placeholder="45000" autoFocus />
              <label>Дата</label>
              <input name="date" type="date" defaultValue={todayStr} />
              <label>Источник</label>
              <input name="source" placeholder="Зарплата, фриланс, ..." />
              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowIncome(false)}>Отмена</button>
                <button type="submit" className="btn-primary">Добавить</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Credit Modal */}
      {editingCredit && (
        <div className="overlay active" onClick={e => e.target === e.currentTarget && setEditingCredit(null)}>
          <div className="modal-card">
            <h3>{editingCredit.id ? 'Редактировать кредит' : 'Добавить кредит'}</h3>
            <form onSubmit={saveCredit}>
              <label>Название</label>
              <input name="name" defaultValue={editingCredit.name || ''} placeholder="например: Ипотека" autoFocus />
              <label>Ежемесячный платёж, ₽</label>
              <input name="monthly" type="number" defaultValue={editingCredit.monthly || ''} placeholder="45000" />
              <label>День платежа</label>
              <input name="day" type="number" min="1" max="31" defaultValue={editingCredit.day || ''} placeholder="15" />
              <label>Последний платёж (ММ.ГГГГ)</label>
              <input name="last" placeholder="07.2030 — оставьте пустым, если ещё идёт"
                defaultValue={editingCredit.lastMonth ? editingCredit.lastMonth.slice(3) + '.' + editingCredit.lastMonth.slice(0,2) : ''} />
              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setEditingCredit(null)}>Отмена</button>
                <button type="submit" className="btn-primary">Сохранить</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPayment && paymentDay && (
        <div className="overlay active" onClick={e => e.target === e.currentTarget && setShowPayment(false)}>
          <div className="modal-card">
            <h3>Платежи на {paymentDay.day} {MONTHS_GEN[paymentDay.month]} {paymentDay.year}</h3>
            <div className="payment-list">
              {(data.credits || []).filter(c => c.day === paymentDay.day && isActiveInMonth(c, paymentDay.year, paymentDay.month)).map(c => {
                const pYm = paymentDay.year + '-' + String(paymentDay.month+1).padStart(2,'0');
                const payment = data.payments[c.id]?.[pYm];
                const status = payment?.status || 'unpaid';
                const statusLabel = { paid: 'Оплачено', early: 'Досрочно', unpaid: 'Не оплачено' } [status];
                const date = new Date(paymentDay.year, paymentDay.month, paymentDay.day);
                const isLate = date < new Date() && !payment;
                return (
                  <div key={c.id} className="payment-item">
                    <div className="payment-info">
                      <div className="payment-name">{esc(c.name)}</div>
                      <div className="payment-amount">{fmtFull(c.monthly)}</div>
                    </div>
                    <div className="payment-right">
                      <span className={'payment-status ' + status}>{statusLabel}</span>
                      <div className="payment-actions">
                        {status === 'unpaid' ? (
                          <>
                            <button className="btn-pay" onClick={() => payCredit(c.id, pYm, false)}>Оплатить</button>
                            {date > new Date() && <button className="btn-early" onClick={() => payCredit(c.id, pYm, true)}>Досрочно</button>}
                          </>
                        ) : (
                          <button className="btn-unpay" onClick={() => unpayCredit(c.id, pYm)}>Отменить</button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="modal-actions" style={{marginTop:12}}>
              <button className="btn-cancel" onClick={() => setShowPayment(false)}>Закрыть</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
