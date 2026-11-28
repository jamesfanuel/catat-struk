'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AppNavigation from '@/components/AppNavigation';
import CustomSelect from '@/components/CustomSelect';
import { I18N, getSavedLang } from '@/lib/i18n';

function formatRupiah(num) {
  return 'Rp ' + Math.max(0, Math.round(Number(num) || 0)).toLocaleString('id-ID');
}

function getStorageKey() {
  try {
    const authRaw = localStorage.getItem('catatstruk_auth_v1');
    const auth = authRaw ? JSON.parse(authRaw) : null;
    const uname = auth?.user?.username;
    return uname ? `catatstruk_itineraries_v1_${uname}` : 'catatstruk_itineraries_v1';
  } catch {
    return 'catatstruk_itineraries_v1';
  }
}

export default function ItineraryPage() {
  const [plans, setPlans] = useState([]);
  const [activeId, setActiveId] = useState('');
  const [transactions, setTransactions] = useState([]);
  const [groupsData, setGroupsData] = useState({ groups: [], friends: [] });
  const [day, setDay] = useState(1);
  const [time, setTime] = useState('09:00');
  const [activity, setActivity] = useState('');
  const [costText, setCostText] = useState('');
  const [payMode, setPayMode] = useState('personal'); // 'personal' | 'split'
  const [selectedDay, setSelectedDay] = useState('all');
  const [lang, setLang] = useState('id');

  useEffect(() => {
    setLang(getSavedLang());
    const onLang = (e) => setLang(e.detail || getSavedLang());
    window.addEventListener('catatstruk-lang-change', onLang);
    return () => window.removeEventListener('catatstruk-lang-change', onLang);
  }, []);

  const t = I18N[lang] || I18N.id;

  useEffect(() => {
    try {
      const raw = localStorage.getItem(getStorageKey());
      const parsed = raw ? JSON.parse(raw) : [];
      const list = Array.isArray(parsed) && parsed.length > 0
        ? parsed
        : [
            {
              id: 'itin_dev_bali',
              title: 'Trip Bali Squad (3H2M)',
              limit: 3000000,
              groupName: 'Trip Bali Squad',
              items: [
                { id: 'it_b1', day: 1, time: '08:00', activity: 'Tiket Pesawat PP (Bayar Sendiri)', cost: 1450000, payMode: 'personal' },
                { id: 'it_b2', day: 1, time: '14:00', activity: 'Villa Seminyak (Split Bill Grup)', cost: 1800000, payMode: 'split' },
                { id: 'it_b3', day: 1, time: '19:30', activity: 'Makan Malam Bebek Tepi Sawah', cost: 600000, payMode: 'split' },
                { id: 'it_b4', day: 2, time: '10:00', activity: 'Sewa Motor & Bensin', cost: 150000, payMode: 'personal' },
              ],
            },
            {
              id: 'itin_dev_dinas',
              title: 'Dinas Kantor Bandung',
              limit: 1500000,
              groupName: 'Tim Kantor Dev',
              items: [
                { id: 'it_d1', day: 1, time: '07:30', activity: 'Kereta Whoosh Jakarta-Bandung', cost: 300000, payMode: 'personal' },
                { id: 'it_d2', day: 1, time: '12:30', activity: 'Lunch Tim Dev', cost: 420000, payMode: 'split' },
              ],
            },
          ];
      setPlans(list);
      setActiveId(list[0].id);

      const txRaw = localStorage.getItem('catatstruk_transactions_v1');
      const txs = txRaw ? JSON.parse(txRaw) : [];
      if (Array.isArray(txs)) setTransactions(txs);

      const grpRaw = localStorage.getItem('catatstruk_groups_v1');
      const grp = grpRaw ? JSON.parse(grpRaw) : null;
      if (grp && Array.isArray(grp.groups)) {
        setGroupsData({ groups: grp.groups, friends: Array.isArray(grp.friends) ? grp.friends : [] });
      }

      const authRaw = localStorage.getItem('catatstruk_auth_v1');
      const auth = authRaw ? JSON.parse(authRaw) : null;
      const headers = auth?.token ? { Authorization: `Bearer ${auth.token}` } : {};

      fetch('/api/itineraries', { headers })
        .then((r) => r.json())
        .then((d) => {
          if (d?.ok && Array.isArray(d.itineraries) && d.itineraries.length > 0) {
            setPlans(d.itineraries);
            setActiveId(d.itineraries[0].id);
            localStorage.setItem(getStorageKey(), JSON.stringify(d.itineraries));
          }
        })
        .catch(() => { });

      fetch('/api/friends', { headers })
        .then((r) => r.json())
        .then((d) => {
          if (d?.ok) {
            const nextGrp = { groups: d.groups || [], friends: d.friends || [] };
            setGroupsData(nextGrp);
            localStorage.setItem('catatstruk_groups_v1', JSON.stringify(nextGrp));
          }
        })
        .catch(() => { });

      if (auth?.token) {
        fetch('/api/transactions', { headers })
          .then((r) => r.json())
          .then((d) => {
            if (d?.ok && Array.isArray(d.transactions) && d.transactions.length > 0) {
              setTransactions(d.transactions);
            }
          })
          .catch(() => { });
      }
    } catch { }
  }, []);

  const persistPlans = (next) => {
    setPlans(next);
    try {
      localStorage.setItem(getStorageKey(), JSON.stringify(next));
      const authRaw = localStorage.getItem('catatstruk_auth_v1');
      const auth = authRaw ? JSON.parse(authRaw) : null;
      const headers = {
        'Content-Type': 'application/json',
        ...(auth?.token ? { Authorization: `Bearer ${auth.token}` } : {}),
      };
      fetch('/api/itineraries', {
        method: 'POST',
        headers,
        body: JSON.stringify({ itineraries: next }),
      }).catch(() => { });
    } catch { }
  };

  const activePlan = plans.find((p) => p.id === activeId) || plans[0];

  const handleNewPlan = () => {
    const nextPlan = {
      id: `itin_${Date.now()}`,
      title: `Rencana #${plans.length + 1}`,
      limit: 2000000,
      items: [],
    };
    const next = [...plans, nextPlan];
    persistPlans(next);
    setActiveId(nextPlan.id);
  };

  const handleDeletePlan = () => {
    if (!activePlan) return;
    if (plans.length <= 1) {
      persistPlans([{ ...activePlan, items: [] }]);
      return;
    }
    const next = plans.filter((p) => p.id !== activePlan.id);
    persistPlans(next);
    setActiveId(next[0].id);
  };

  const updateActivePlan = (patch) => {
    if (!activePlan) return;
    persistPlans(plans.map((p) => (p.id === activePlan.id ? { ...p, ...patch } : p)));
  };

  const handleAddAgenda = (e) => {
    e.preventDefault();
    if (!activePlan || !activity.trim()) return;
    const cost = Math.max(0, parseInt(String(costText).replace(/[^\d]/g, ''), 10) || 0);
    const newItem = {
      id: `item_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      day: Math.max(1, Number(day) || 1),
      time: time || '09:00',
      activity: activity.trim(),
      cost,
      payMode: payMode === 'split' ? 'split' : 'personal',
    };
    updateActivePlan({ items: [...(activePlan.items || []), newItem] });
    setActivity('');
    setCostText('');
  };

  const handleDeleteItem = (itemId) => {
    if (!activePlan) return;
    updateActivePlan({ items: (activePlan.items || []).filter((i) => i.id !== itemId) });
  };

  const limit = Math.max(0, Number(activePlan?.limit) || 0);
  const allItems = activePlan?.items || [];
  const plannedTotal = allItems.reduce((s, it) => s + (Number(it.cost) || 0), 0);
  const personalPlanned = allItems.filter((it) => it.payMode !== 'split').reduce((s, it) => s + (Number(it.cost) || 0), 0);
  const splitPlanned = allItems.filter((it) => it.payMode === 'split').reduce((s, it) => s + (Number(it.cost) || 0), 0);
  const groupMembersCount = activePlan?.groupName
    ? groupsData.friends.filter((f) => (f.groupName || 'Umum') === activePlan.groupName).length + 1
    : 1;
  const splitPerPerson = groupMembersCount > 1 ? Math.round(splitPlanned / groupMembersCount) : splitPlanned;
  const linkedTxs = activePlan
    ? transactions.filter((t) => t.status !== 'outstanding' && t.itineraryId === activePlan.id)
    : [];
  const actualSpent = linkedTxs.reduce((s, t) => s + (Number(t.total) || 0), 0);
  const remaining = limit > 0 ? limit - actualSpent : 0;
  const effectiveUsed = actualSpent > 0 ? actualSpent : plannedTotal;
  const pct = limit > 0 ? Math.round((effectiveUsed / limit) * 100) : 0;

  // Group agenda per hari
  const dayMap = new Map();
  (activePlan?.items || []).forEach((it) => {
    const d = Math.max(1, Number(it.day) || 1);
    if (!dayMap.has(d)) dayMap.set(d, []);
    dayMap.get(d).push(it);
  });
  const sortedDays = Array.from(dayMap.keys()).sort((a, b) => a - b);

  return (
    <div className="app-shell">
      <AppNavigation />

      <div className="route-page-head">
        <div>
          <span className="auth-badge">{t.itinBadge}</span>
          <h2>{t.itinHeading}</h2>
        </div>
        <Link href="/" className="btn btn-secondary">{t.backDashboard}</Link>
      </div>

      <div className="route-grid-2col">
        <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div className="itinerary-plan-bar">
            <CustomSelect
              value={activeId}
              onChange={(val) => setActiveId(val)}
              ariaLabel="Pilih Rencana"
              options={plans.map((p) => ({ value: p.id, label: p.title || 'Plan' }))}
            />
            <button type="button" className="btn btn-secondary" onClick={handleNewPlan}>{t.itinNewPlan}</button>
            <button type="button" className="btn btn-danger-outline" onClick={handleDeletePlan}>{t.itinDelete}</button>
          </div>

          <div className="form-grid">
            <div className="field">
              <label>{t.itinNameLbl}</label>
              <input
                type="text"
                value={activePlan?.title || ''}
                onChange={(e) => updateActivePlan({ title: e.target.value })}
                placeholder="e.g. Bandung Trip / Bali"
              />
            </div>
            <div className="field">
              <label>{t.itinLimitLbl}</label>
              <div className="currency-input">
                <span className="currency-prefix">Rp</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={limit > 0 ? limit.toLocaleString('id-ID') : ''}
                  onChange={(e) => {
                    const num = Math.max(0, parseInt(e.target.value.replace(/[^\d]/g, ''), 10) || 0);
                    updateActivePlan({ limit: num });
                  }}
                  placeholder="2.000.000"
                />
              </div>
            </div>
            {groupsData.groups.length > 0 && (
              <div className="field full" style={{ gridColumn: '1 / -1' }}>
                <label>👥 {lang === 'en' ? 'Linked Group (Optional)' : 'Terkait Grup (Opsional)'}</label>
                <CustomSelect
                  value={activePlan?.groupName || ''}
                  onChange={(val) => updateActivePlan({ groupName: val })}
                  options={[
                    { value: '', label: `— ${lang === 'en' ? 'Personal / No Group' : 'Pribadi / Tanpa Grup'} —` },
                    ...groupsData.groups.map((g) => ({ value: g, label: g })),
                  ]}
                />
                {activePlan?.groupName && (
                  <small className="muted" style={{ display: 'block', marginTop: '4px' }}>
                    {lang === 'en' ? 'Members:' : 'Anggota:'}{' '}
                    {groupsData.friends
                      .filter((f) => (f.groupName || 'Umum') === activePlan.groupName)
                      .map((f) => `@${f.username}`)
                      .join(', ') || '-'}
                  </small>
                )}
              </div>
            )}
          </div>

          <div className="itinerary-budget-box">
            <div className="itinerary-stats-row">
              <div className="itin-stat-cell">
                <span>{t.itinMaxBudget}</span>
                <strong>{limit > 0 ? formatRupiah(limit) : '-'}</strong>
              </div>
              <div className="itin-stat-cell">
                <span>{t.itinUsedReceipts}</span>
                <strong>{formatRupiah(actualSpent)}</strong>
              </div>
              <div className="itin-stat-cell">
                <span>{t.itinRemaining}</span>
                <strong className={limit > 0 && remaining < 0 ? 'over-limit' : ''}>
                  {limit > 0 ? `${remaining < 0 ? '-' : ''}${formatRupiah(Math.abs(remaining))}` : '-'}
                </strong>
              </div>
            </div>
            <div className="itinerary-budget-top">
              <span>{t.itinPlannedTotal}</span>
              <strong>{limit > 0 ? `${formatRupiah(plannedTotal)} / ${formatRupiah(limit)}` : formatRupiah(plannedTotal)}</strong>
            </div>
            <div className="itin-split-summary-row">
              <div className="itin-split-pill personal">
                <span>👤 {lang === 'en' ? 'Personal Pay' : 'Bayar Sendiri'}</span>
                <strong>{formatRupiah(personalPlanned)}</strong>
              </div>
              <div className="itin-split-pill split">
                <span>👥 {lang === 'en' ? 'Split Bill' : 'Split Bill'}{groupMembersCount > 1 ? ` (${groupMembersCount} org)` : ''}</span>
                <strong>{formatRupiah(splitPlanned)}{groupMembersCount > 1 && splitPlanned > 0 ? ` • ${formatRupiah(splitPerPerson)}/org` : ''}</strong>
              </div>
            </div>
            <div className="itinerary-progress-track">
              <div
                className={`itinerary-progress-fill${limit > 0 && effectiveUsed > limit ? ' danger' : limit > 0 && pct >= 80 ? ' warn' : ''}`}
                style={{ width: `${Math.min(100, pct)}%` }}
              />
            </div>
            {limit > 0 && effectiveUsed > limit && (
              <div className="itinerary-limit-warning danger">
                🚨 Melebihi Limit! Pengeluaran melewati batas sebesar {formatRupiah(effectiveUsed - limit)} ({pct}%).
              </div>
            )}
            {limit > 0 && effectiveUsed <= limit && pct >= 80 && (
              <div className="itinerary-limit-warning warn">
                ⚠️ Mendekati Limit! Sudah mencapai {pct}% dari batas (sisa {formatRupiah(limit - effectiveUsed)}).
              </div>
            )}
          </div>

          <form className="itinerary-add-form" onSubmit={handleAddAgenda}>
            <h4>{t.itinAddHeading}</h4>
            <div className="itinerary-add-grid">
              <div className="field">
                <label>{t.itinDayLbl}</label>
                <input type="number" min="1" max="30" value={day} onChange={(e) => setDay(e.target.value)} required />
              </div>
              <div className="field">
                <label>{t.itinTimeLbl}</label>
                <input type="time" value={time} onChange={(e) => setTime(e.target.value)} required />
              </div>
              <div className="field itin-activity-col">
                <label>{t.itinActivityLbl}</label>
                <input type="text" value={activity} onChange={(e) => setActivity(e.target.value)} placeholder="e.g. Train Ticket, Hotel, Lunch..." required />
              </div>
              <div className="field itin-cost-col">
                <label>{t.itinCostLbl}</label>
                <div className="currency-input">
                  <span className="currency-prefix">Rp</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={costText}
                    onChange={(e) => {
                      const num = Math.max(0, parseInt(e.target.value.replace(/[^\d]/g, ''), 10) || 0);
                      setCostText(num > 0 ? num.toLocaleString('id-ID') : '');
                    }}
                    placeholder="0"
                  />
                </div>
              </div>
              <div className="field" style={{ gridColumn: '1 / -1' }}>
                <label>{lang === 'en' ? 'Payment Split Mode' : 'Tipe Pembayaran Agenda'}</label>
                <CustomSelect
                  value={payMode}
                  onChange={(val) => setPayMode(val)}
                  options={[
                    { value: 'personal', label: `👤 ${lang === 'en' ? 'Personal (Pay Yourself)' : 'Bayar Sendiri'}` },
                    { value: 'split', label: `👥 ${lang === 'en' ? 'Split Bill with Group' : 'Split Bill (Patungan Grup)'}` },
                  ]}
                />
              </div>
            </div>
            <button type="submit" className="btn btn-primary btn-full">{t.itinAddBtn}</button>
          </form>
        </section>

        <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div className="card-header" style={{ marginBottom: 0 }}>
            <h3>{t.itinTimelineHeading}</h3>
            <span className="muted" style={{ fontSize: '0.8rem' }}>{(activePlan?.items || []).length} items</span>
          </div>

          {sortedDays.length === 0 ? (
            <div className="itinerary-empty">{t.itinEmpty}</div>
          ) : (
            <>
              {sortedDays.length > 1 && (
                <div className="dash-itin-day-tabs" role="tablist">
                  <button
                    type="button"
                    className={`dash-itin-day-tab${selectedDay === 'all' ? ' active' : ''}`}
                    onClick={() => setSelectedDay('all')}
                  >
                    {lang === 'en' ? 'All Days' : 'Semua Hari'}
                  </button>
                  {sortedDays.map((dNum) => (
                    <button
                      key={dNum}
                      type="button"
                      className={`dash-itin-day-tab${selectedDay === dNum ? ' active' : ''}`}
                      onClick={() => setSelectedDay(dNum)}
                    >
                      {lang === 'en' ? `Day ${dNum}` : `Hari ${dNum}`}
                    </button>
                  ))}
                </div>
              )}
              <div className="itinerary-timeline">
              {(selectedDay === 'all' ? sortedDays : sortedDays.filter((d) => d === selectedDay)).map((dNum) => {
                const items = dayMap.get(dNum).sort((a, b) => (a.time || '').localeCompare(b.time || ''));
                const sub = items.reduce((s, it) => s + (Number(it.cost) || 0), 0);
                return (
                  <div key={dNum} className="itin-day-group">
                    <div className="itin-day-header">
                      <span className="itin-day-pill">Hari {dNum}</span>
                      <span className="itin-day-subtotal">Subtotal: <strong>{formatRupiah(sub)}</strong></span>
                    </div>
                    <div className="itin-day-rows">
                      {items.map((it) => (
                        <div key={it.id} className="itin-row">
                          <div className="itin-time-col">
                            <span className="itin-time-badge">{it.time || '00:00'}</span>
                            <span className="itin-dot" aria-hidden="true" />
                          </div>
                          <div className="itin-card">
                            <div className="itin-card-info">
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                <strong>{it.activity}</strong>
                                <span className={`itin-mode-tag ${it.payMode === 'split' ? 'split' : 'personal'}`}>
                                  {it.payMode === 'split'
                                    ? `👥 Split Bill${groupMembersCount > 1 && it.cost > 0 ? ` (${formatRupiah(Math.round(it.cost / groupMembersCount))}/org)` : ''}`
                                    : `👤 ${lang === 'en' ? 'Personal' : 'Bayar Sendiri'}`}
                                </span>
                              </div>
                              <span className="itin-cost">{it.cost > 0 ? formatRupiah(it.cost) : 'Gratis / Rp 0'}</span>
                            </div>
                            <button type="button" className="btn-del-itin-item" onClick={() => handleDeleteItem(it.id)} title="Hapus agenda">&times;</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
              </div>
            </>
          )}

          {linkedTxs.length > 0 && (
            <div className="itinerary-linked-txs">
              <div className="itin-linked-head">
                <strong>🧾 Struk Terhubung ({linkedTxs.length})</strong>
                <span>-{formatRupiah(actualSpent)}</span>
              </div>
              <ul className="itin-linked-list">
                {linkedTxs.map((t) => (
                  <li key={t.id}>
                    <span>{t.merchant} ({t.date})</span>
                    <strong>{formatRupiah(t.total)}</strong>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
