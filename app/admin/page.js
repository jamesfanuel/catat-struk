'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { initAdmin } from '@/lib/client/admin-client';

export default function AdminPage() {
  useEffect(() => {
    initAdmin();
  }, []);

  return (
    <>
      <style>{`
        .admin-shell { max-width: 960px; margin: 0 auto; padding: 16px 16px 64px; }
        .admin-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 16px; }
        .admin-stat-card { background: var(--surface); border: 1px solid var(--border); border-radius: 16px; padding: 14px 16px; box-shadow: var(--shadow-sm); }
        .admin-stat-card span { display: block; font-size: 0.78rem; color: var(--text-muted); margin-bottom: 4px; }
        .admin-stat-card strong { font-size: 1.35rem; color: var(--text); }
        .admin-toolbar { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; justify-content: space-between; margin-bottom: 14px; }
        .admin-toolbar-left { display: flex; flex: 1; gap: 8px; align-items: center; min-width: 240px; }
        .admin-toolbar-left .search-box { flex: 1; margin-bottom: 0; }
        .admin-table-wrap { overflow-x: auto; border: 1px solid var(--border); border-radius: 14px; background: var(--surface); }
        .admin-table { width: 100%; border-collapse: collapse; font-size: 0.85rem; text-align: left; }
        .admin-table th, .admin-table td { padding: 11px 12px; border-bottom: 1px solid var(--border); vertical-align: middle; }
        .admin-table th { background: var(--surface-alt); font-weight: 600; color: var(--text-muted); white-space: nowrap; }
        .admin-table tr:last-child td { border-bottom: none; }
        .badge-tier { display: inline-block; padding: 3px 9px; border-radius: 999px; font-size: 0.74rem; font-weight: 600; white-space: nowrap; }
        .badge-tier.lifetime { background: rgba(15, 118, 110, 0.14); color: #0f766e; }
        .badge-tier.active { background: rgba(37, 99, 235, 0.14); color: #1d4ed8; }
        .badge-tier.expired { background: rgba(239, 68, 68, 0.14); color: #b91c1c; }
        .badge-tier.regular { background: rgba(100, 116, 139, 0.14); color: #475569; }
        .admin-actions { display: flex; gap: 6px; white-space: nowrap; }
        .admin-actions .btn { padding: 6px 10px; font-size: 0.78rem; }
        .sheet-cell-link { color: var(--primary); text-decoration: none; font-weight: 600; }
        .sheet-cell-link:hover { text-decoration: underline; }
        @media (max-width: 600px) { .admin-stats { grid-template-columns: 1fr; } }
      `}</style>

      <div className="admin-shell">
        <header className="topbar">
          <div className="brand">
            <div className="brand-icon" aria-hidden="true">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </div>
            <div>
              <h1>CatatStruk Admin</h1>
              <span className="brand-sub">Kelola Data User &amp; Paket Premium</span>
            </div>
          </div>
          <div className="topbar-actions" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <Link href="/" className="btn btn-ghost" style={{ padding: '8px 12px', fontSize: '0.84rem' }}>&larr; Aplikasi</Link>
            <button type="button" id="btn-admin-logout" className="btn btn-danger-outline hidden" style={{ padding: '8px 12px', fontSize: '0.84rem' }}>Logout</button>
          </div>
        </header>

        <main id="admin-main" className="hidden" style={{ marginTop: '16px' }}>
          <section className="admin-stats">
            <div className="admin-stat-card">
              <span>Total User</span>
              <strong id="stat-total-users">0</strong>
            </div>
            <div className="admin-stat-card">
              <span>User Premium Aktif</span>
              <strong id="stat-premium-users">0</strong>
            </div>
            <div className="admin-stat-card">
              <span>Reguler / Kadaluarsa</span>
              <strong id="stat-regular-users">0</strong>
            </div>
          </section>

          <section className="card">
            <div className="admin-toolbar">
              <div className="admin-toolbar-left">
                <div className="search-box">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.3-4.3" />
                  </svg>
                  <input type="search" id="admin-search" placeholder="Cari username atau email..." />
                </div>
                <select id="admin-tier-filter" className="mini-select" aria-label="Filter Status">
                  <option value="all">Semua Status</option>
                  <option value="premium">Premium Aktif</option>
                  <option value="regular">Reguler</option>
                  <option value="expired">Kadaluarsa</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button type="button" id="btn-refresh-users" className="btn btn-secondary">Refresh</button>
                <button type="button" id="btn-new-user" className="btn btn-primary">+ Tambah User</button>
              </div>
            </div>

            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Username</th>
                    <th>Email</th>
                    <th>Status Paket</th>
                    <th>Google Sheet</th>
                    <th>Terdaftar</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody id="admin-users-tbody"></tbody>
              </table>
            </div>
            <p id="admin-empty" className="muted hidden" style={{ textAlign: 'center', margin: '18px 0 4px' }}>Tidak ada user yang cocok.</p>
          </section>
        </main>
      </div>

      <div id="modal-admin-login" className="modal modal-center" role="dialog" aria-modal="true" aria-labelledby="modal-admin-login-title">
        <div className="modal-backdrop"></div>
        <div className="modal-sheet">
          <div className="modal-header auth-header">
            <div>
              <span className="auth-badge">ADMIN</span>
              <h3 id="modal-admin-login-title">Masuk Admin Panel</h3>
            </div>
          </div>
          <form id="admin-login-form" className="modal-body">
            <p className="muted">Masukkan password admin (<code>ADMIN_PASSWORD</code> di <code>.env</code>).</p>
            <div className="field">
              <label htmlFor="admin-password-input">Password Admin</label>
              <input type="password" id="admin-password-input" required autoComplete="current-password" placeholder="Masukkan password admin" />
            </div>
            <p id="admin-login-error" className="form-error hidden"></p>
            <div className="modal-footer auth-footer-center">
              <button type="submit" id="btn-admin-login-submit" className="btn btn-primary btn-full">Masuk Admin</button>
            </div>
          </form>
        </div>
      </div>

      <div id="modal-user-form" className="modal modal-center hidden" role="dialog" aria-modal="true" aria-labelledby="modal-user-title">
        <div className="modal-backdrop" data-close="modal-user-form"></div>
        <div className="modal-sheet">
          <div className="modal-header">
            <h3 id="modal-user-title">Tambah User</h3>
            <button type="button" className="icon-btn" data-close="modal-user-form" aria-label="Tutup">&times;</button>
          </div>
          <form id="user-crud-form" className="modal-body">
            <input type="hidden" id="user-form-mode" defaultValue="create" />

            <div className="field">
              <label htmlFor="user-form-username">Username</label>
              <input type="text" id="user-form-username" required placeholder="Contoh: budi" />
            </div>

            <div className="field">
              <label htmlFor="user-form-email">Email</label>
              <input type="email" id="user-form-email" placeholder="nama@email.com" />
            </div>

            <div className="field">
              <label htmlFor="user-form-password" id="user-form-password-label">Password</label>
              <input type="password" id="user-form-password" placeholder="Minimal 4 karakter" />
            </div>

            <div className="field">
              <label htmlFor="tier-dropdown-trigger">Status Paket Premium</label>
              <input type="hidden" id="user-form-tier" defaultValue="lifetime" />
              <div className="custom-select" id="tier-custom-select">
                <button type="button" id="tier-dropdown-trigger" className="custom-select-trigger" aria-haspopup="listbox" aria-expanded="false">
                  <span className="custom-select-left">
                    <span id="tier-trigger-icon">👑</span>
                    <span id="tier-trigger-label">Premium Selamanya (9999-01-01)</span>
                  </span>
                  <svg className="custom-select-chevron" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </button>
                <div id="tier-dropdown-menu" className="custom-select-menu hidden" role="listbox">
                  <button type="button" className="custom-select-option selected" data-value="lifetime" data-icon="👑" data-label="Premium Selamanya (9999-01-01)">
                    <span className="custom-option-main">
                      <span className="custom-option-icon">👑</span>
                      <span className="custom-option-text">
                        <strong>Premium Selamanya</strong>
                        <small>Akses penuh tanpa batas waktu</small>
                      </span>
                    </span>
                    <span className="custom-option-check">✓</span>
                  </button>
                  <button type="button" className="custom-select-option" data-value="date" data-icon="📅" data-label="Premium Sampai Tanggal Tertentu">
                    <span className="custom-option-main">
                      <span className="custom-option-icon">📅</span>
                      <span className="custom-option-text">
                        <strong>Premium Sampai Tanggal</strong>
                        <small>Atur tanggal kadaluarsa khusus</small>
                      </span>
                    </span>
                    <span className="custom-option-check">✓</span>
                  </button>
                  <button type="button" className="custom-select-option" data-value="regular" data-icon="👤" data-label="User Reguler (Non-Premium)">
                    <span className="custom-option-main">
                      <span className="custom-option-icon">👤</span>
                      <span className="custom-option-text">
                        <strong>User Reguler</strong>
                        <small>Mode demo tanpa sync Google Sheet</small>
                      </span>
                    </span>
                    <span className="custom-option-check">✓</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="field hidden" id="user-form-date-wrap">
              <label htmlFor="user-form-until">Berlaku Sampai Tanggal</label>
              <input type="date" id="user-form-until" />
            </div>

            <div className="field">
              <label htmlFor="user-form-sheet">Link Google Sheet (Opsional)</label>
              <input type="url" id="user-form-sheet" placeholder="https://docs.google.com/spreadsheets/d/..." />
            </div>

            <p id="user-form-error" className="form-error hidden"></p>

            <div className="modal-footer">
              <div className="footer-right">
                <button type="button" className="btn btn-ghost" data-close="modal-user-form">Batal</button>
                <button type="submit" id="btn-user-form-submit" className="btn btn-primary">Simpan</button>
              </div>
            </div>
          </form>
        </div>
      </div>

      <div id="toast-container" className="toast-container" aria-live="polite"></div>
    </>
  );
}
