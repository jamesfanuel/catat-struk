'use client';

import { useEffect } from 'react';
import { initApp } from '@/lib/client/app-client';

export default function HomePage() {
  useEffect(() => {
    initApp();
  }, []);

  return (
    <>
      <div className="app-shell">
        <header className="topbar">
          <div className="brand">
            <div className="brand-icon" aria-hidden="true">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" />
                <path d="M8 7h8M8 11h8M8 15h5" />
              </svg>
            </div>
            <div>
              <h1>CatatStruk</h1>
              <span className="brand-sub">Snap &amp; Track Receipts</span>
            </div>
          </div>

          <div className="topbar-actions" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button type="button" className="icon-btn sheet-icon-btn" id="pill-sheet" title="Google Sheet Status" aria-label="Google Sheet Status">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="18" height="18" x="3" y="3" rx="2" />
                <path d="M3 9h18M9 21V9" />
              </svg>
              <span className="sheet-status-dot"></span>
              <span id="pill-sheet-text" className="sr-only">Not Connected</span>
            </button>
            <button id="btn-theme" className="icon-btn" title="Toggle Theme" aria-label="Toggle Theme">
              <svg className="icon-sun" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
              </svg>
              <svg className="icon-moon hidden" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
              </svg>
            </button>
          </div>
        </header>

        <div id="premium-warning-banner" className="premium-banner hidden" role="alert">
          <span id="premium-warning-text"></span>
        </div>

        <main className="main-content">
          <section className="summary-card" aria-label="Financial Summary">
            <div className="summary-header-row">
              <div className="period-filter-wrap">
                <button type="button" id="period-picker-btn" className="period-picker-btn" aria-label="Filter Expense Period" aria-haspopup="dialog">
                  <span id="period-picker-label">This Month</span>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="m6 9 6 6 6-6"/>
                  </svg>
                </button>
                {/* Hidden select for compatibility — updated by app-client.js */}
                <select id="period-filter" className="visually-hidden" aria-hidden="true" tabIndex="-1">
                </select>
              </div>
              <button type="button" id="btn-open-share" className="share-icon-btn" title="Share Recap" aria-label="Share Recap">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="18" cy="5" r="3" />
                  <circle cx="6" cy="12" r="3" />
                  <circle cx="18" cy="19" r="3" />
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                  <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                </svg>
                <span>Share</span>
              </button>
            </div>

            <div className="summary-top">
              <div className="summary-left">
                <p className="summary-label" id="summary-period-label">Monthly Expenses</p>
                <h2 className="summary-amount" id="total-month">Rp 0</h2>
              </div>
              <div className="summary-right-actions">
                <div id="summary-trend-badge" className="trend-badge hidden" aria-live="polite">
                  <span id="summary-trend-arrows" className="trend-arrows"></span>
                  <span id="summary-trend-pct" className="trend-pct"></span>
                </div>
              </div>
            </div>

            <div className="budget-wrap" id="budget-wrap">
              <div className="budget-meta">
                <div className="budget-inline-edit" id="budget-inline-edit" title="Click to edit budget">
                  <span>Target Budget:</span>
                  <button type="button" id="budget-val-btn" className="budget-val-btn" aria-label="Edit Target Budget">
                    <span id="budget-val-text">Rp 3.000.000</span>
                    <svg className="budget-edit-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                    </svg>
                  </button>
                  <div id="budget-input-wrap" className="budget-input-wrap hidden">
                    <span className="budget-input-prefix">Rp</span>
                    <input type="text" id="budget-inline-input" inputMode="numeric" placeholder="0" aria-label="Target Budget" />
                  </div>
                </div>
                <span id="budget-percent">0%</span>
              </div>
              <div className="progress-track">
                <div className="progress-fill" id="budget-progress" style={{ width: '0%' }}></div>
              </div>
            </div>

            <div className="summary-stats">
              <div className="stat-box">
                <span className="stat-label">Receipts</span>
                <strong className="stat-val" id="stat-count">0</strong>
              </div>
              <div className="stat-box">
                <span className="stat-label">Avg / Receipt</span>
                <strong className="stat-val" id="stat-avg">Rp 0</strong>
              </div>
              <div className="stat-box">
                <span className="stat-label">Synced</span>
                <strong className="stat-val" id="stat-synced">0 / 0</strong>
              </div>
            </div>
          </section>

          <section className="card chart-card" id="chart-section">
            <div className="card-header">
              <h3>Expenses by Category</h3>
              <button id="btn-export-csv" className="link-btn">Export CSV</button>
            </div>
            <div className="chart-body">
              <div className="donut-wrap" id="donut-wrap">
                <svg id="donut-svg" viewBox="0 0 120 120" className="donut-svg"></svg>
                <div className="donut-center">
                  <span id="donut-top-cat">-</span>
                  <small id="donut-top-pct">0%</small>
                </div>
              </div>
              <ul className="category-legend" id="category-legend"></ul>
            </div>
          </section>

          <section className="card transactions-card" id="history-section">
            <div className="card-header">
              <h3>Receipt History</h3>
              <div className="filter-row">
                <select id="category-filter" className="mini-select" aria-label="Filter Category">
                  <option value="all">All Categories</option>
                  <option value="Makanan & Minuman">Makanan &amp; Minuman</option>
                  <option value="Belanja">Belanja</option>
                  <option value="Transportasi">Transportasi</option>
                  <option value="Tagihan">Tagihan</option>
                  <option value="Kesehatan">Kesehatan</option>
                  <option value="Hiburan">Hiburan</option>
                  <option value="Lainnya">Lainnya</option>
                </select>
              </div>
            </div>

            <div className="view-tabs view-tabs-inline" role="tablist" aria-label="Expense Tabs">
              <button type="button" id="tab-expense" className="view-tab active" role="tab" aria-selected="true" data-tab="expense">
                <span>Expense</span>
              </button>
              <button type="button" id="tab-outstanding" className="view-tab" role="tab" aria-selected="false" data-tab="outstanding">
                <span>Outstanding</span>
                <span id="outstanding-badge" className="tab-badge hidden">0</span>
              </button>
            </div>

            <div className="search-box">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              <input type="search" id="search-input" placeholder="Search merchant or item..." />
            </div>

            <ul className="tx-list" id="tx-list"></ul>
            <div id="tx-pagination" className="tx-pagination hidden" aria-label="Pagination"></div>
            <div className="empty-state hidden" id="empty-state">
              <p>No receipts recorded this month.</p>
            </div>

            <div className="history-scan-wrap history-scan-centered" id="drop-zone">
              <input type="file" id="input-camera" accept="image/*" capture="environment" className="hidden" />
              <input type="file" id="input-gallery" accept="image/*" className="hidden" />

              <div className="scan-hero">
                <div className="scan-illustration" aria-hidden="true">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
                    <circle cx="12" cy="13" r="3" />
                  </svg>
                </div>
                <div>
                  <h3>Upload / Manual</h3>
                  <p>AI automatically extracts merchant, items, date &amp; total.</p>
                </div>
              </div>

              <div className="scan-buttons">
                <button id="btn-gallery" className="btn btn-primary btn-lg">
                  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" x2="12" y1="3" y2="15" />
                  </svg>
                  <span>Upload</span>
                </button>
                <button id="btn-manual" className="btn btn-secondary btn-lg" title="Manual input">
                  <span>+ Manual</span>
                </button>
              </div>

              <div id="history-demo-bar" className="demo-bar demo-bar-centered">
                <span>No receipt handy?</span>
                <button id="btn-demo-scan" className="link-btn">Try Sample Receipt &rarr;</button>
              </div>
            </div>
          </section>
        </main>

        <footer className="app-footer">
          <p>Fast, lightweight, &amp; synced to your personal Google Sheet.</p>
        </footer>
      </div>

      <nav className="bottom-nav" aria-label="Menu Utama">
        <button type="button" id="nav-sync" className="bottom-nav-btn">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
            <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
            <path d="M16 16h5v5" />
          </svg>
          <span>Sync</span>
        </button>
        <button type="button" id="nav-camera" className="bottom-nav-camera" title="Foto Struk" aria-label="Foto Struk">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
            <circle cx="12" cy="13" r="3" />
          </svg>
        </button>
        <button type="button" id="nav-account" className="bottom-nav-btn">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
          <span id="nav-settings-label">Settings</span>
        </button>
      </nav>

      <div id="scan-overlay" className="overlay hidden" role="status" aria-live="polite">
        <div className="scan-loader-card">
          <div id="scanner-box" className="scanner-box">
            <img id="scan-preview-img" src={null} alt="Preview struk" />
            <div className="scan-beam"></div>
            <div className="scan-corners" aria-hidden="true"></div>
          </div>
          <div id="sync-anim-box" className="sync-anim-box hidden" aria-hidden="true">
            <div className="sync-ring"></div>
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect width="18" height="18" x="3" y="3" rx="2" />
              <path d="M3 9h18M9 21V9" />
            </svg>
          </div>
          <div className="loader-title-row">
            <span className="mini-spinner" aria-hidden="true"></span>
            <h3 id="scan-status-title">Membaca Struk dengan AI...</h3>
          </div>
          <p id="scan-status-desc">Mengekstrak toko, item belanja, dan total pembayaran.</p>
          <div id="loader-slow-notice" className="loader-slow-notice hidden">
            <span className="slow-dot" aria-hidden="true"></span>
            <span>Koneksi ke server agak lambat. Mohon tunggu sebentar lagi, proses masih berjalan...</span>
          </div>
          <div className="loader-progress">
            <div className="loader-progress-bar"></div>
          </div>
        </div>
      </div>

      <div id="modal-receipt" className="modal modal-center hidden" role="dialog" aria-modal="true" aria-labelledby="modal-receipt-title">
        <div className="modal-backdrop" data-close="modal-receipt"></div>
        <div className="modal-sheet">
          <div className="modal-header">
            <h3 id="modal-receipt-title">Receipt Details</h3>
            <button type="button" className="icon-btn" data-close="modal-receipt" aria-label="Close">&times;</button>
          </div>
          <form id="receipt-form" className="modal-form">
            <div className="modal-body">
              <input type="hidden" id="form-id" />
              <div id="form-thumb-wrap" className="thumb-preview hidden">
                <img id="form-thumb" src={null} alt="Foto struk" />
              </div>

              <div className="form-grid">
                <div className="field full">
                  <label htmlFor="form-merchant">Merchant / Store Name</label>
                  <input type="text" id="form-merchant" required placeholder="e.g. Starbucks, Whole Foods" />
                </div>

                <div className="field">
                  <label htmlFor="form-date-btn">Date</label>
                  <input type="hidden" id="form-date" />
                  <button type="button" id="form-date-btn" className="custom-date-trigger" aria-haspopup="dialog">
                    <span id="form-date-label">Pilih tanggal</span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                  </button>
                </div>

                <div className="field">
                  <label htmlFor="form-category">Category</label>
                  <select id="form-category">
                    <option value="Makanan & Minuman">Makanan &amp; Minuman</option>
                    <option value="Belanja">Belanja</option>
                    <option value="Transportasi">Transportasi</option>
                    <option value="Tagihan">Tagihan</option>
                    <option value="Kesehatan">Kesehatan</option>
                    <option value="Hiburan">Hiburan</option>
                    <option value="Lainnya">Lainnya</option>
                  </select>
                </div>

                <div className="field">
                  <label htmlFor="form-payment">Payment Method</label>
                  <select id="form-payment">
                    <option value="QRIS">QRIS</option>
                    <option value="Tunai">Cash</option>
                    <option value="Debit">Debit Card</option>
                    <option value="Kredit">Credit Card</option>
                    <option value="E-Wallet">E-Wallet</option>
                    <option value="Transfer">Bank Transfer</option>
                  </select>
                </div>

                <div className="field full">
                  <div className="items-header">
                    <label>Items &amp; Owner Tags</label>
                    <div className="items-header-actions">
                      <span id="items-subtotal" className="items-subtotal hidden">Subtotal: Rp 0</span>
                      <button type="button" id="btn-add-item" className="btn-add-row" title="Add Item" aria-label="Add Item">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 5v14M5 12h14" />
                        </svg>
                        <span>Add</span>
                      </button>
                    </div>
                  </div>
                  <datalist id="user-tag-list"></datalist>
                  <div id="items-container" className="items-container"></div>
                </div>

                <div className="field">
                  <label htmlFor="form-service-pct">Service Charge (% Optional)</label>
                  <div className="currency-input">
                    <input type="text" id="form-service-pct" inputMode="decimal" placeholder="0" autoComplete="off" style={{ paddingLeft: '12px' }} />
                    <span className="currency-prefix" style={{ paddingRight: '12px' }}>%</span>
                  </div>
                </div>

                <div className="field">
                  <label htmlFor="form-tax-pct">Tax / PB1 (% Optional)</label>
                  <div className="currency-input">
                    <input type="text" id="form-tax-pct" inputMode="decimal" placeholder="0" autoComplete="off" style={{ paddingLeft: '12px' }} />
                    <span className="currency-prefix" style={{ paddingRight: '12px' }}>%</span>
                  </div>
                </div>

                <div id="split-summary-box" className="field full split-summary-box hidden">
                  <div className="split-summary-title">Tax, Service &amp; Split Bill Summary</div>
                  <div id="split-summary-content" className="split-summary-content"></div>
                </div>

                <div className="field full">
                  <label htmlFor="form-notes">Notes</label>
                  <input type="text" id="form-notes" placeholder="Optional (e.g. team lunch)" />
                </div>

                <div className="field full">
                  <label htmlFor="form-total">Total Payment (Auto)</label>
                  <div className="currency-input currency-input-readonly">
                    <span className="currency-prefix">Rp</span>
                    <input type="text" id="form-total" inputMode="numeric" required readOnly placeholder="0 (dari item)" autoComplete="off" />
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button type="button" id="btn-delete-tx" className="btn btn-danger hidden">Delete</button>
              <div className="footer-right">
                <button type="button" className="btn btn-ghost" data-close="modal-receipt">Cancel</button>
                <button type="submit" className="btn btn-primary">Save &amp; Sync</button>
              </div>
            </div>
          </form>
        </div>
      </div>

      <div id="modal-settings" className="modal hidden" role="dialog" aria-modal="true" aria-labelledby="modal-settings-title">
        <div className="modal-backdrop" data-close="modal-settings"></div>
        <div className="modal-sheet modal-lg">
          <div className="modal-header">
            <h3 id="modal-settings-title">Pengaturan &amp; Koneksi</h3>
            <button className="icon-btn" data-close="modal-settings" aria-label="Tutup">&times;</button>
          </div>
          <div className="modal-body">
            <div className="settings-section">
              <h4>1. Gemini AI Scanner (Gratis &amp; Privat)</h4>
              <p className="muted">API Key disimpan hanya di browser kamu. Kosongkan jika ingin mencoba Mode Demo.</p>
              <div className="field">
                <label htmlFor="setting-gemini-key">Gemini API Key</label>
                <input type="password" id="setting-gemini-key" placeholder="AIzaSy..." autoComplete="off" />
              </div>
              <div className="field">
                <label htmlFor="setting-gemini-model">Model Gemini</label>
                <select id="setting-gemini-model">
                  <option value="gemini-flash-lite-latest">gemini-flash-lite-latest (Rekomendasi, Cepat &amp; Hemat)</option>
                  <option value="gemini-flash-latest">gemini-flash-latest</option>
                  <option value="gemini-3.8-flash">gemini-3.8-flash</option>
                  <option value="gemini-pro-latest">gemini-pro-latest (Struk Panjang/Buram)</option>
                </select>
              </div>
              <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener" className="link-btn">Dapatkan API Key gratis di Google AI Studio ↗</a>
            </div>

            <hr className="divider" />

            <div className="settings-section">
              <h4>2. Connect Google Sheets Pribadi</h4>
              <p className="muted">Setiap user bisa menghubungkan ke Google Sheet pribadinya sendiri tanpa login rumit.</p>
              <div className="field">
                <label htmlFor="setting-sheet-url">Link Google Sheet Anda (Privat / Restricted)</label>
                <div className="input-with-btn">
                  <input type="url" id="setting-sheet-url" placeholder="https://docs.google.com/spreadsheets/d/.../edit" />
                  <button type="button" id="btn-test-sheet" className="btn btn-secondary">Test</button>
                </div>
              </div>
              <div className="sheet-sync-actions">
                <button type="button" id="btn-export-sheet" className="btn btn-secondary">Export ke Google Sheet</button>
                <button type="button" id="btn-import-sheet" className="btn btn-secondary">Import dari Google Sheet</button>
                <a id="btn-open-sheet-settings" href="#" target="_blank" rel="noopener noreferrer" className="btn btn-primary sheet-open-full hidden">Buka Google Sheet Saya ↗</a>
              </div>
              <label className="checkbox-row">
                <input type="checkbox" id="setting-auto-sync" defaultChecked />
                <span>Otomatis kirim ke Google Sheet setiap simpan struk</span>
              </label>
              <details className="setup-guide">
                <summary>Cara Hubungkan ke Google Sheet Pribadi (1 Menit)</summary>
                <ol>
                  <li>Buka <a href="https://sheets.new" target="_blank" rel="noopener">sheets.new</a> untuk membuat Google Sheet baru.</li>
                  <li>Klik menu <strong>Extensions</strong> &rarr; <strong>Apps Script</strong>.</li>
                  <li>Hapus kode lama, lalu salin &amp; tempel kode di bawah ini:</li>
                </ol>
                <div className="code-box">
                  <button type="button" id="btn-copy-gas" className="copy-btn">Salin Kode</button>
                  <pre><code id="gas-code-preview"></code></pre>
                </div>
                <ol start="4">
                  <li>Klik <strong>Deploy</strong> &rarr; <strong>New deployment</strong> &rarr; pilih tipe <strong>Web app</strong>.</li>
                  <li>Set <em>Who has access</em> ke <strong>Anyone</strong>, lalu klik <strong>Deploy</strong> dan salin URL-nya ke kolom di atas.</li>
                </ol>
              </details>
            </div>

            <hr className="divider" />

            <div className="settings-section">
              <h4>3. Target Budget &amp; Data</h4>
              <div className="field">
                <label htmlFor="setting-budget">Target Budget Bulanan</label>
                <div className="currency-input">
                  <span className="currency-prefix">Rp</span>
                  <input type="text" id="setting-budget" inputMode="numeric" placeholder="3.000.000" autoComplete="off" />
                </div>
              </div>
              <div className="danger-zone">
                <button type="button" id="btn-clear-data" className="btn btn-danger-outline">Hapus Semua Data Lokal</button>
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <div className="footer-right">
              <button type="button" className="btn btn-ghost" data-close="modal-settings">Tutup</button>
              <button type="button" id="btn-save-settings" className="btn btn-primary">Simpan Pengaturan</button>
            </div>
          </div>
        </div>
      </div>

      <div id="modal-require-sheet" className="modal modal-center hidden" role="dialog" aria-modal="true" aria-labelledby="modal-req-title">
        <div className="modal-backdrop" data-close="modal-require-sheet"></div>
        <div className="modal-sheet">
          <div className="modal-header">
            <h3 id="modal-req-title">Hubungkan Google Sheet Anda</h3>
            <button type="button" id="btn-close-req-sheet" className="icon-btn" data-close="modal-require-sheet" aria-label="Close">&times;</button>
          </div>
          <form id="require-sheet-form" className="modal-body">
            <p className="muted">Pilih mode akses Google Sheet Anda terlebih dahulu:</p>

            <div className="sheet-mode-tabs" role="radiogroup" aria-label="Mode Akses Google Sheet">
              <button type="button" id="btn-sheet-mode-private" className="sheet-mode-btn active" data-sheet-mode="private">
                Privat (Invite Bot)
              </button>
              <button type="button" id="btn-sheet-mode-public" className="sheet-mode-btn" data-sheet-mode="public">
                Publik (Tanpa Invite)
              </button>
            </div>

            <div id="guide-sheet-private" className="setup-guide">
              <p className="muted" style={{ marginTop: 0 }}>
                Sheet tetap <strong>Privat (Restricted)</strong> &amp; aman. Anda hanya perlu invite email bot berikut sebagai <strong>Editor</strong>:
              </p>
              <div id="bot-email-box" className="input-with-btn" style={{ margin: '8px 0' }}>
                <input type="text" id="bot-email-display" readOnly defaultValue="Memuat email bot..." aria-label="Email Bot Google Sheet" />
                <button type="button" id="btn-copy-bot-email" className="icon-btn" title="Salin email bot" aria-label="Salin email bot" style={{ flexShrink: 0 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                    <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                  </svg>
                </button>
              </div>
              <ol>
                <li>Buka <a href="https://sheets.new" target="_blank" rel="noopener">sheets.new</a> untuk membuat Google Sheet baru yang kosong.</li>
                <li>Klik tombol <strong>Bagikan (Share)</strong> di kanan atas.</li>
                <li>Biarkan akses umum tetap <strong>Dibatasi (Restricted)</strong>.</li>
                <li>Tempel email bot di atas ke kolom <em>Tambahkan orang</em>, pilih peran <strong>Editor</strong>, lalu klik <strong>Kirim / Bagikan</strong>.</li>
                <li>Salin link Google Sheet Anda dan tempel di bawah ini:</li>
              </ol>
            </div>

            <div id="guide-sheet-public" className="setup-guide hidden">
              <p className="muted" style={{ marginTop: 0 }}>
                Tidak perlu invite email bot secara manual, namun akses Sheet harus diatur menjadi <strong>Publik (Editor)</strong>:
              </p>
              <ol>
                <li>Buka <a href="https://sheets.new" target="_blank" rel="noopener">sheets.new</a> untuk membuat Google Sheet baru yang kosong.</li>
                <li>Klik tombol <strong>Bagikan (Share)</strong> di kanan atas.</li>
                <li>Pada bagian <em>Akses umum (General access)</em>, ubah dari <strong>Dibatasi</strong> menjadi <strong>Siapa saja yang memiliki link (Anyone with the link)</strong>.</li>
                <li>Ubah izin di sebelahnya menjadi <strong>Editor</strong>, lalu klik <strong>Selesai (Done)</strong>.</li>
                <li>Salin link Google Sheet Anda dan tempel di bawah ini:</li>
              </ol>
            </div>

            <div className="field">
              <label htmlFor="req-sheet-url">Link Google Sheet Anda (Wajib)</label>
              <input type="url" id="req-sheet-url" required placeholder="https://docs.google.com/spreadsheets/d/..." />
            </div>

            <p id="req-sheet-error" className="form-error hidden"></p>

            <div className="modal-footer auth-footer-center">
              <button type="submit" id="btn-save-req-sheet" className="btn btn-primary btn-full">Save</button>
            </div>
          </form>
        </div>
      </div>

      <div id="modal-login" className="modal modal-center hidden" role="dialog" aria-modal="true" aria-labelledby="modal-login-title">
        <div className="modal-backdrop"></div>
        <div className="modal-sheet">
          <div className="modal-header auth-header" id="auth-modal-header">
            <div>
              <span id="auth-mode-badge" className="auth-badge">SIGN IN</span>
              <h3 id="modal-login-title">Sign In to CatatStruk</h3>
            </div>
          </div>
          <form id="login-form" className="modal-body">
            <p id="login-subtitle" className="muted">
              Sign in with your account to view and record receipts.
            </p>

            <div className="field">
              <label htmlFor="login-username">Username</label>
              <input type="text" id="login-username" required autoComplete="username" placeholder="Enter username" />
            </div>

            <div className="field hidden" id="register-email-wrap">
              <label htmlFor="login-email">Email (Required for OTP)</label>
              <input type="email" id="login-email" autoComplete="email" placeholder="name@email.com" />
            </div>

            <div className="field">
              <label htmlFor="login-password">Password</label>
              <input type="password" id="login-password" required autoComplete="current-password" placeholder="Enter password" />
            </div>

            <div className="field hidden" id="register-confirm-wrap">
              <label htmlFor="login-confirm-password">Confirm Password</label>
              <input type="password" id="login-confirm-password" autoComplete="new-password" placeholder="Repeat password" />
            </div>

            <div className="field hidden" id="register-sheet-wrap">
              <label htmlFor="login-sheet-url">Google Sheet Link (Optional)</label>
              <input type="url" id="login-sheet-url" placeholder="https://docs.google.com/spreadsheets/d/..." />
            </div>

            <div className="field hidden" id="register-otp-wrap">
              <label htmlFor="login-otp">Email OTP Code (6 Digits)</label>
              <div className="input-with-btn">
                <input type="text" id="login-otp" inputMode="numeric" maxLength={6} placeholder="Enter 6-digit OTP" autoComplete="one-time-code" />
                <button type="button" id="btn-resend-otp" className="btn btn-secondary">Resend</button>
              </div>
              <small className="muted">Check your inbox or spam folder.</small>
            </div>

            <p id="login-error" className="form-error hidden"></p>

            <div className="modal-footer auth-footer-center">
              <button type="submit" id="btn-login-submit" className="btn btn-primary btn-full">Sign In</button>
              <button type="button" id="btn-toggle-auth-mode" className="btn btn-secondary btn-full">Don&apos;t have an account? Sign Up</button>
            </div>
          </form>
        </div>
      </div>

      <div id="modal-account" className="modal modal-center hidden" role="dialog" aria-modal="true" aria-labelledby="modal-account-title">
        <div className="modal-backdrop" id="account-modal-backdrop" data-close="modal-account"></div>
        <div className="modal-sheet">
          <div className="modal-header">
            <h3 id="modal-account-title">Account Settings</h3>
            <button type="button" id="btn-close-account-modal" className="icon-btn" data-close="modal-account" aria-label="Close">&times;</button>
          </div>
          <form id="account-sheet-form" className="modal-body">
            <div className="account-profile-card">
              <div className="account-avatar" id="account-avatar">U</div>
              <div className="account-meta">
                <div className="account-name" id="account-username">-</div>
                <div className="account-email" id="account-email">-</div>
                <span className="account-badge" id="account-tier">-</span>
                <small className="account-expiry" id="account-expiry-note"></small>
              </div>
            </div>

            <div id="account-email-verify-wrap" className="settings-section">
              <p id="account-email-required-note" className="form-error hidden" style={{ marginTop: 0 }}>
                Your account has no verified email yet. Please verify your email with OTP to continue.
              </p>
              <div className="field">
                <label htmlFor="account-email-input">Account Email (OTP Verification)</label>
                <div className="input-with-btn">
                  <input type="email" id="account-email-input" placeholder="name@email.com" autoComplete="email" />
                  <button type="button" id="btn-send-account-otp" className="btn btn-secondary">Send OTP</button>
                </div>
              </div>
              <div className="field hidden" id="account-otp-wrap" style={{ marginTop: '8px' }}>
                <label htmlFor="account-otp-input">OTP Code (6 Digits)</label>
                <div className="input-with-btn">
                  <input type="text" id="account-otp-input" inputMode="numeric" maxLength={6} placeholder="Enter 6-digit OTP" />
                  <button type="button" id="btn-verify-account-email" className="btn btn-primary">Verify</button>
                </div>
              </div>
              <p id="account-email-error" className="form-error hidden"></p>
            </div>

            <div className="modal-footer auth-footer-center">
              <a id="btn-open-sheet" href="#" target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-full hidden" style={{ textDecoration: 'none' }}>Open Google Sheet ↗</a>
              <button type="button" id="btn-open-sheet-guide" className="btn btn-secondary btn-full">📊 Google Sheet Setup &amp; Guide</button>
              <button type="button" id="btn-open-friends" className="btn btn-secondary btn-full">👥 Manage Friends</button>
              <button type="button" id="btn-logout" className="btn btn-danger-outline btn-full">Sign Out</button>
            </div>
          </form>
        </div>
      </div>

      <div id="modal-friends" className="modal modal-center hidden" role="dialog" aria-modal="true" aria-labelledby="modal-friends-title">
        <div className="modal-backdrop" data-close="modal-friends"></div>
        <div className="modal-sheet">
          <div className="modal-header">
            <h3 id="modal-friends-title">Friends &amp; Invite</h3>
            <button type="button" className="icon-btn" data-close="modal-friends" aria-label="Close">&times;</button>
          </div>
          <div className="modal-body">
            <form id="add-friend-form" className="field" style={{ marginBottom: '12px' }}>
              <label htmlFor="friend-email-input">Add Friend by Registered Email</label>
              <div className="input-with-btn">
                <input type="email" id="friend-email-input" required placeholder="friend@gmail.com" />
                <button type="submit" id="btn-add-friend" className="btn btn-primary">Add</button>
              </div>
            </form>

            <div id="friend-not-found-box" className="friend-not-found-box hidden">
              <p id="friend-not-found-text">No registered user found with this email.</p>
              <button type="button" id="btn-invite-friend" className="btn btn-secondary btn-full">
                Send App Invite via Email
              </button>
            </div>

            <div className="settings-section" style={{ marginTop: '14px' }}>
              <h4 style={{ marginBottom: '8px' }}>My Friends</h4>
              <ul id="friends-list" className="friends-list"></ul>
              <p id="friends-empty" className="muted hidden" style={{ textAlign: 'center', margin: '12px 0 0' }}>
                No friends added yet.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div id="modal-share" className="modal modal-center hidden" role="dialog" aria-modal="true" aria-labelledby="modal-share-title">
        <div className="modal-backdrop" data-close="modal-share"></div>
        <div className="modal-sheet">
          <div className="modal-header">
            <h3 id="modal-share-title">Share Expense Recap</h3>
            <button type="button" className="icon-btn" data-close="modal-share" aria-label="Close">&times;</button>
          </div>
          <div className="modal-body">
            <div className="share-preview-wrap">
              <canvas id="share-card-canvas" width={1080} height={1350} className="share-card-canvas"></canvas>
            </div>

            <label className="checkbox-row">
              <input type="checkbox" id="share-hide-amount" />
              <span>Hide exact Rp amount (privacy mode for social media)</span>
            </label>

            <div className="share-actions-grid">
              <button type="button" id="btn-share-story" className="btn btn-primary share-story-btn">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                </svg>
                <span>Share to IG Story</span>
              </button>

              <button type="button" id="btn-share-threads" className="btn btn-secondary share-threads-btn">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12.186 24C5.467 24 0 18.533 0 11.814 0 5.095 5.467 0 12.186 0c6.719 0 12.186 5.095 12.186 11.814 0 1.25-.19 2.47-.557 3.633a1.144 1.144 0 0 1-1.422.753 1.144 1.144 0 0 1-.754-1.422c.307-.978.465-1.996.465-3.036 0-5.485-4.433-9.947-9.918-9.947-5.485 0-9.918 4.462-9.918 9.947 0 5.485 4.433 9.948 9.918 9.948 3.518 0 6.64-1.847 8.35-4.94a1.145 1.145 0 0 1 1.558-.426 1.144 1.144 0 0 1 .426 1.558C20.407 21.68 16.584 24 12.186 24Zm4.512-14.838a1.144 1.144 0 0 0-1.487.674c-.053.15-.357.94-.855 1.536a3.837 3.837 0 0 1-2.17 1.25c-.247-.464-.543-.913-.888-1.339-1.28-1.583-3.076-2.454-5.056-2.454-3.69 0-6.104 2.808-6.104 6.34 0 3.398 2.27 6.096 5.522 6.564 2.822.406 5.42-.767 6.78-3.064.912-.047 1.838-.28 2.704-.73a5.553 5.553 0 0 0 2.228-2.187 7.785 7.785 0 0 0 .97-3.09c.046-.628-.42-1.164-1.048-1.21-.628-.046-1.164.42-1.21 1.048-.094.88-.38 1.7-.852 2.428-.46.708-1.127 1.233-1.932 1.517-.07.025-.138.05-.208.073-.138-.415-.347-.847-.64-1.269a9.664 9.664 0 0 0-1.248-1.396 6.064 6.064 0 0 0 1.048-1.173c.311-.47.532-1.048.568-1.155a1.144 1.144 0 0 0-.674-1.487ZM8.384 15.696c-1.895-.272-3.235-1.826-3.235-3.753 0-2.072 1.455-3.752 3.528-3.752 1.272 0 2.43.593 3.308 1.68.275.34.508.71.696 1.096-1.472.316-2.73 1.054-3.522 2.062a4.444 4.444 0 0 0-.775 2.667Zm3.868-.696c.49-.66 1.34-1.16 2.373-1.408.318.59.508 1.25.56 1.956-.848.452-1.87.525-2.933-.548Z" />
                </svg>
                <span>Share to Threads</span>
              </button>

              <button type="button" id="btn-share-download" className="btn btn-secondary">
                Download PNG
              </button>
              <button type="button" id="btn-share-copy-caption" className="btn btn-secondary">
                Copy Caption
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Period Picker Modal */}
      <div id="modal-period-picker" className="modal modal-center hidden" role="dialog" aria-modal="true" aria-labelledby="period-picker-title">
        <div className="modal-backdrop" data-close="modal-period-picker"></div>
        <div className="modal-sheet period-picker-sheet">
          <div className="period-picker-header">
            <h3 id="period-picker-title">Select Period</h3>
            <button type="button" className="icon-btn" data-close="modal-period-picker" aria-label="Close">&times;</button>
          </div>
          <div className="period-picker-body" id="period-picker-body">
            {/* Dynamically populated by app-client.js */}
          </div>
        </div>
      </div>

      {/* Custom Animated Date Picker Modal */}
      <div id="modal-date-picker" className="modal modal-center hidden" role="dialog" aria-modal="true" aria-labelledby="date-picker-month-label">
        <div className="modal-backdrop" data-close="modal-date-picker"></div>
        <div className="modal-sheet date-picker-sheet">
          <div className="dp-header">
            <button type="button" id="dp-prev-month" className="dp-nav-btn" aria-label="Bulan sebelumnya">&lsaquo;</button>
            <strong id="date-picker-month-label">November 2026</strong>
            <button type="button" id="dp-next-month" className="dp-nav-btn" aria-label="Bulan berikutnya">&rsaquo;</button>
          </div>
          <div className="dp-weekdays">
            <span>Sen</span><span>Sel</span><span>Rab</span><span>Kam</span><span>Jum</span><span>Sab</span><span>Min</span>
          </div>
          <div id="dp-grid" className="dp-grid"></div>
          <div className="dp-footer">
            <button type="button" id="dp-today-btn" className="btn btn-ghost dp-today-btn">Hari Ini</button>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button type="button" className="btn btn-ghost" data-close="modal-date-picker">Batal</button>
              <button type="button" id="dp-apply-btn" className="btn btn-primary">Pilih</button>
            </div>
          </div>
        </div>
      </div>

      {/* Budget Confirm Modal */}
      <div id="modal-budget-confirm" className="modal modal-center hidden" role="dialog" aria-modal="true" aria-labelledby="budget-confirm-title">
        <div className="modal-backdrop"></div>
        <div className="modal-sheet modal-compact">
          <div className="modal-header">
            <h3 id="budget-confirm-title">Konfirmasi Budget</h3>
          </div>
          <div className="modal-body modal-confirm-body">
            <div id="budget-confirm-icon" className="confirm-icon confirm-icon-default">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            </div>
            <p id="budget-confirm-msg" className="confirm-msg"></p>
          </div>
          <div className="modal-footer confirm-footer">
            <button type="button" id="btn-budget-cancel" className="btn btn-ghost">Batal</button>
            <button type="button" id="btn-budget-ok" className="btn btn-primary">Simpan</button>
          </div>
        </div>
      </div>

      <div id="toast-container" className="toast-container" aria-live="polite"></div>
    </>
  );
}
