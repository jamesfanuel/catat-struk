'use client';

import { useEffect } from 'react';
import AppNavigation from '@/components/AppNavigation';
import SummaryCard from '@/components/SummaryCard';
import ReceiptHistoryCard from '@/components/ReceiptHistoryCard';
import TopMerchantsCard from '@/components/TopMerchantsCard';
import ItineraryPreviewCard from '@/components/ItineraryPreviewCard';
import LoadingOverlay from '@/components/LoadingOverlay';
import PasswordInput from '@/components/PasswordInput';
import { initApp } from '@/lib/client/app-client';

export default function DashboardPage() {
  useEffect(() => {
    initApp();
  }, []);

  return (
    <>
      <div className="app-shell">
        <AppNavigation showWhatsNew={true} />

        <div id="premium-warning-banner" className="premium-banner hidden" role="alert">
          <span id="premium-warning-text"></span>
        </div>

        <main className="main-content">
          <div className="dashboard-left">
            <SummaryCard />

            <section className="card chart-card" id="chart-section">
              <div className="card-header">
                <h3 data-i18n="expensesByCat">Pengeluaran per Kategori</h3>
                <button id="btn-export-csv" className="link-btn" data-i18n="exportCsv">Ekspor CSV</button>
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
          </div>

          <ReceiptHistoryCard />

          <TopMerchantsCard />

          <ItineraryPreviewCard />
        </main>

        <footer className="app-footer">
          <p>Fast, lightweight, &amp; synced to your personal Google Sheet.</p>
        </footer>
      </div>

      <nav className="bottom-nav" aria-label="Menu Utama">
        <button key="nav-sync" type="button" id="nav-sync" className="bottom-nav-btn hidden" aria-hidden="true">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
            <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
            <path d="M16 16h5v5" />
          </svg>
          <span>Sync</span>
        </button>
        <button key="nav-link-sheet" type="button" id="nav-link-sheet" className="bottom-nav-btn" title="Panduan Hubungkan Google Sheet" aria-label="Panduan Hubungkan Google Sheet">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
          </svg>
          <span>Link Sheet</span>
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
          <form id="receipt-form" className="modal-form" noValidate>
            <div className="modal-body">
              <div id="receipt-form-alert" className="form-alert-error hidden" role="alert"></div>
              <input type="hidden" id="form-id" />
              <div id="form-thumb-wrap" className="thumb-preview hidden">
                <img id="form-thumb" src={null} alt="Foto struk" />
              </div>

              <div className="form-grid">
                <div className="field full">
                  <label htmlFor="form-merchant">Konfirmasi Nama Merchant / Toko <span className="req-star" aria-hidden="true">*</span></label>
                  <input type="text" id="form-merchant" list="merchant-history-list" required placeholder="e.g. Starbucks, Indomaret, Kopi Kenangan" autoComplete="off" />
                  <datalist id="merchant-history-list"></datalist>
                  <div id="merchant-suggest-chips" className="merchant-suggest-chips hidden"></div>
                  <small id="merchant-visit-hint" className="merchant-visit-hint hidden"></small>
                </div>

                <div className="field">
                  <label htmlFor="form-date-btn">Date <span className="req-star" aria-hidden="true">*</span></label>
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
                  <label htmlFor="form-category">Category <span className="req-star" aria-hidden="true">*</span></label>
                  <select id="form-category">
                    <option value="Daily Needs">Daily Needs</option>
                    <option value="Urgent">Urgent</option>
                    <option value="Emergency">Emergency</option>
                    <option value="Self Reward">Self Reward</option>
                  </select>
                </div>

                <div className="field">
                  <label htmlFor="form-payment">Payment Method <span className="req-star" aria-hidden="true">*</span></label>
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
                    <label>Items &amp; Owner Tags <span className="req-star" aria-hidden="true">*</span></label>
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
                  <div id="split-group-quick-wrap" className="split-group-quick-wrap hidden">
                    <label htmlFor="form-split-group">👥 Tagih Cepat ke Grup:</label>
                    <select id="form-split-group">
                      <option value="">— Pilih Grup untuk Split Tagihan —</option>
                    </select>
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
                  <label htmlFor="form-location">Lokasi Pembelian (Google Maps)</label>
                  <div className="location-input-row">
                    <input type="text" id="form-location" placeholder="Link Google Maps atau nama tempat (opsional)" />
                    <button type="button" id="btn-get-location" className="btn btn-secondary btn-loc" title="Ambil koordinat GPS saat ini">
                      📍 GPS
                    </button>
                    <a id="btn-open-location" className="btn btn-secondary btn-loc hidden" href="#" target="_blank" rel="noopener noreferrer" title="Buka di Google Maps">
                      Maps ↗
                    </a>
                  </div>
                </div>

                <div className="field full">
                  <label htmlFor="form-notes">Notes</label>
                  <input type="text" id="form-notes" placeholder="Optional (e.g. team lunch)" />
                </div>

                <div className="field full" id="form-itinerary-wrap">
                  <label htmlFor="form-itinerary-id">🗓️ Hubungkan ke Itinerary (Opsional)</label>
                  <select id="form-itinerary-id">
                    <option value="">— Tidak dihubungkan ke Itinerary —</option>
                  </select>
                </div>

                <div className="field full reimburse-field-card">
                  <label className="reimburse-toggle-row" htmlFor="form-reimburse">
                    <div>
                      <strong>💼 Reimbursement Kantor</strong>
                      <small className="muted" style={{ display: 'block' }}>Tandai struk ini untuk pengingat klaim pengembalian dana ke kantor.</small>
                    </div>
                    <input type="checkbox" id="form-reimburse" />
                  </label>
                  <div id="reimburse-status-wrap" className="reimburse-status-wrap hidden">
                    <label htmlFor="form-reimburse-status">Status Klaim:</label>
                    <select id="form-reimburse-status">
                      <option value="pending">Belum Diklaim</option>
                      <option value="claimed">Sudah Diklaim</option>
                    </select>
                  </div>
                </div>

                <div className="field full reimburse-field-card">
                  <label className="reimburse-toggle-row" htmlFor="form-share-social">
                    <div>
                      <strong>📸 Bagikan ke Social Journal setelah simpan?</strong>
                      <small className="muted" style={{ display: 'block' }}>Jika dicentang, Anda akan diarahkan ke halaman Social Journal untuk menulis ulasan tempat ini.</small>
                    </div>
                    <input type="checkbox" id="form-share-social" />
                  </label>
                </div>

                <div className="field full">
                  <label htmlFor="form-total">Total Payment (Auto) <span className="req-star" aria-hidden="true">*</span></label>
                  <div id="form-total-wrap" className="currency-input currency-input-readonly">
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
                <PasswordInput id="setting-gemini-key" placeholder="AIzaSy..." autoComplete="off" />
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
              <label htmlFor="req-sheet-url">Link Google Sheet Anda <span className="req-star" aria-hidden="true">*</span></label>
              <input type="url" id="req-sheet-url" required placeholder="https://docs.google.com/spreadsheets/d/..." />
            </div>

            <p id="req-sheet-error" className="form-error hidden"></p>

            <div className="modal-footer auth-footer-center">
              <button type="submit" id="btn-save-req-sheet" className="btn btn-primary btn-full">Save</button>
            </div>
          </form>
        </div>
      </div>

      {/* Login Loading Overlay (Reusable Component) */}
      <LoadingOverlay
        id="login-loading-overlay"
        hiddenByDefault={true}
        text="Memverifikasi akun…"
        ariaLabel="Memproses login"
      />

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
              <label htmlFor="login-username" id="login-username-label">Username or Email <span className="req-star" aria-hidden="true">*</span></label>
              <input type="text" id="login-username" required autoComplete="username" placeholder="Enter username or email" />
            </div>

            <div className="field hidden" id="register-email-wrap">
              <label htmlFor="login-email">Email (OTP) <span className="req-star" aria-hidden="true">*</span></label>
              <input type="email" id="login-email" autoComplete="email" placeholder="name@email.com" />
            </div>

            <div className="field">
              <label htmlFor="login-password">Password <span className="req-star" aria-hidden="true">*</span></label>
              <PasswordInput id="login-password" required autoComplete="current-password" placeholder="Enter password" />
            </div>

            <div className="field hidden" id="register-confirm-wrap">
              <label htmlFor="login-confirm-password">Confirm Password</label>
              <PasswordInput id="login-confirm-password" autoComplete="new-password" placeholder="Repeat password" />
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
              <div className="account-card-head">
                <span className="account-card-kicker">ACCOUNT PROFILE</span>
                <span className="account-user-num hidden" id="account-user-number">MEMBER #1</span>
              </div>
              <div className="account-card-body">
                <button type="button" className="account-avatar-btn" id="btn-upload-avatar" title="Upload / ganti foto profil" aria-label="Upload foto profil">
                  <div className="account-avatar" id="account-avatar">U</div>
                  <img id="account-avatar-img" className="account-avatar-img hidden" src={null} alt="Profile" />
                  <span className="account-avatar-cam" aria-hidden="true">📷</span>
                </button>
                <input type="file" id="account-avatar-input" accept="image/*" className="hidden" />
                <div className="account-meta">
                  <div className="account-name" id="account-username">-</div>
                  <div className="account-email" id="account-email">-</div>
                  <span className="account-badge" id="account-tier">-</span>
                  <small className="account-joined hidden" id="account-joined-at"></small>
                </div>
              </div>
            </div>

            <div id="account-email-verify-wrap" className="settings-section">
              <p id="account-email-required-note" className="form-error hidden" style={{ marginTop: 0 }}>
                Your account has no verified email yet. Please verify your email with OTP to continue.
              </p>
              <div className="field">
                <label htmlFor="account-email-input">Update Account Email (OTP Verification)</label>
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
            <div>
              <span className="auth-badge">EKSKLUSIF • MAKS. 50 ANGGOTA</span>
              <h3 id="modal-friends-title">Groups &amp; Invite</h3>
            </div>
            <button type="button" className="icon-btn" data-close="modal-friends" aria-label="Close">&times;</button>
          </div>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Step 1: Buat Grup */}
            <form id="create-group-form" className="field" noValidate>
              <label htmlFor="group-name-input">1. Buat Grup Baru <span className="req-star" aria-hidden="true">*</span></label>
              <div className="input-with-btn">
                <input type="text" id="group-name-input" required placeholder="e.g. Trip Bali, Tim Kantor, Keluarga" />
                <button type="submit" id="btn-create-group" className="btn btn-secondary">+ Buat Grup</button>
              </div>
            </form>

            {/* Step 2: Pilih Grup & Invite Orang */}
            <form id="add-friend-form" className="field" noValidate>
              <label htmlFor="invite-group-select">2. Pilih Grup &amp; Invite Anggota (Email Terdaftar)</label>
              <select id="invite-group-select" style={{ marginBottom: '8px' }}>
                <option value="Umum">Umum</option>
              </select>
              <div className="input-with-btn">
                <input type="email" id="friend-email-input" required placeholder="friend@gmail.com" />
                <button type="submit" id="btn-add-friend" className="btn btn-primary">Invite</button>
              </div>
            </form>

            <div id="friend-not-found-box" className="friend-not-found-box hidden">
              <p id="friend-not-found-text">No registered user found with this email.</p>
              <button type="button" id="btn-invite-friend" className="btn btn-secondary btn-full">
                Send App Invite via Email
              </button>
            </div>

            <div className="settings-section" style={{ marginTop: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h4 style={{ margin: 0 }}>3. Daftar Grup &amp; Anggota</h4>
                <span id="friends-quota-badge" className="merchant-visit-badge">0 / 50 Anggota</span>
              </div>
              <ul id="friends-list" className="friends-list"></ul>
              <p id="friends-empty" className="muted hidden" style={{ textAlign: 'center', margin: '12px 0 0' }}>
                Belum ada grup atau anggota. Buat grup terlebih dahulu di atas.
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
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
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

      {/* Planning Itinerary Modal (v1.1) */}
      <div id="modal-itinerary" className="modal modal-center hidden" role="dialog" aria-modal="true" aria-labelledby="itinerary-modal-title">
        <div className="modal-backdrop" data-close="modal-itinerary"></div>
        <div className="modal-sheet modal-lg itinerary-sheet">
          <div className="modal-header">
            <div>
              <span className="auth-badge">PLANNING ITINERARY</span>
              <h3 id="itinerary-modal-title">Rencana Perjalanan &amp; Biaya</h3>
            </div>
            <button type="button" className="icon-btn" data-close="modal-itinerary" aria-label="Close">&times;</button>
          </div>
          <div className="modal-body itinerary-body">
            <div className="itinerary-plan-bar">
              <select id="itinerary-plan-select" aria-label="Pilih Rencana Itinerary"></select>
              <button type="button" id="btn-itinerary-new" className="btn btn-secondary">+ Rencana Baru</button>
              <button type="button" id="btn-itinerary-delete-plan" className="btn btn-danger-outline" title="Hapus rencana ini">Hapus</button>
            </div>

            <div className="form-grid itinerary-meta-grid">
              <div className="field">
                <label htmlFor="itinerary-title-input">Nama Perjalanan / Kegiatan</label>
                <input type="text" id="itinerary-title-input" placeholder="e.g. Dinas Bandung / Trip Bali" />
              </div>
              <div className="field">
                <label htmlFor="itinerary-limit-input">Limit Budget (Rp)</label>
                <div className="currency-input">
                  <span className="currency-prefix">Rp</span>
                  <input type="text" id="itinerary-limit-input" inputMode="numeric" placeholder="2.000.000" autoComplete="off" />
                </div>
              </div>
            </div>

            <div id="itinerary-budget-box" className="itinerary-budget-box">
              <div className="itinerary-stats-row">
                <div className="itin-stat-cell">
                  <span>Budget Maks</span>
                  <strong id="itinerary-max-budget">Rp 0</strong>
                </div>
                <div className="itin-stat-cell">
                  <span>Terpakai (Struk)</span>
                  <strong id="itinerary-actual-spent">Rp 0</strong>
                </div>
                <div className="itin-stat-cell">
                  <span>Sisa Budget</span>
                  <strong id="itinerary-remaining-budget">Rp 0</strong>
                </div>
              </div>
              <div className="itinerary-budget-top">
                <span>Estimasi Rencana Perjalanan</span>
                <strong id="itinerary-budget-numbers">Rp 0 / Rp 0</strong>
              </div>
              <div className="itinerary-progress-track">
                <div id="itinerary-progress-fill" className="itinerary-progress-fill" style={{ width: '0%' }}></div>
              </div>
              <div id="itinerary-limit-warning" className="itinerary-limit-warning hidden" role="alert"></div>
            </div>

            <form id="itinerary-add-form" className="itinerary-add-form">
              <h4>Tambah Rincian Biaya Per Hari</h4>
              <div className="itinerary-add-grid">
                <div className="field">
                  <label htmlFor="itin-day">Hari ke-</label>
                  <input type="number" id="itin-day" min="1" max="30" defaultValue="1" required />
                </div>
                <div className="field">
                  <label htmlFor="itin-time">Jam</label>
                  <input type="time" id="itin-time" defaultValue="09:00" required />
                </div>
                <div className="field itin-activity-col">
                  <label htmlFor="itin-activity">Aktivitas / Lokasi</label>
                  <input type="text" id="itin-activity" placeholder="e.g. Tiket Kereta, Hotel, Makan Siang..." required />
                </div>
                <div className="field itin-cost-col">
                  <label htmlFor="itin-cost">Estimasi Biaya (Rp)</label>
                  <div className="currency-input">
                    <span className="currency-prefix">Rp</span>
                    <input type="text" id="itin-cost" inputMode="numeric" placeholder="0" autoComplete="off" />
                  </div>
                </div>
              </div>
              <button type="submit" className="btn btn-primary btn-full">+ Tambah ke Rencana</button>
            </form>

            <div id="itinerary-timeline" className="itinerary-timeline"></div>
            <div id="itinerary-linked-txs" className="itinerary-linked-txs hidden"></div>
          </div>
        </div>
      </div>

      {/* Batch Multi-Scan Review Modal (Max 5 Struk) */}
      <div id="modal-batch-scan" className="modal modal-center hidden" role="dialog" aria-modal="true" aria-labelledby="batch-scan-title">
        <div className="modal-backdrop" data-close="modal-batch-scan"></div>
        <div className="modal-sheet modal-lg">
          <div className="modal-header">
            <div>
              <span className="auth-badge">MULTI-SCAN (MAKS. 5 STRUK)</span>
              <h3 id="batch-scan-title">Konfirmasi Hasil Scan Struk</h3>
            </div>
            <button type="button" className="icon-btn" data-close="modal-batch-scan" aria-label="Close">&times;</button>
          </div>
          <form id="batch-scan-form" className="modal-form">
            <div className="modal-body batch-scan-body">
              <p className="muted" style={{ marginTop: 0 }}>
                Periksa &amp; konfirmasi nama merchant tiap struk agar statistik kunjungan dan total belanja Anda tercatat akurat.
              </p>
              <div id="batch-scan-list" className="batch-scan-list"></div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-ghost" data-close="modal-batch-scan">Batal</button>
              <button type="submit" id="btn-batch-save-all" className="btn btn-primary">Simpan Semua Struk</button>
            </div>
          </form>
        </div>
      </div>

      {/* Merchant Visit & Spending Stats Modal */}
      <div id="modal-merchants" className="modal modal-center hidden" role="dialog" aria-modal="true" aria-labelledby="merchants-modal-title">
        <div className="modal-backdrop" data-close="modal-merchants"></div>
        <div className="modal-sheet modal-lg">
          <div className="modal-header">
            <div>
              <span className="auth-badge">MERCHANT TRACKER</span>
              <h3 id="merchants-modal-title">Riwayat Kunjungan Merchant</h3>
            </div>
            <button type="button" className="icon-btn" data-close="modal-merchants" aria-label="Close">&times;</button>
          </div>
          <div className="modal-body merchants-modal-body">
            <div className="merchant-group-bar">
              <div className="merchant-group-tabs" role="tablist" aria-label="Group Merchant">
                <button type="button" className="merchant-group-btn active" data-mgroup="all">Semua Waktu</button>
                <button type="button" className="merchant-group-btn" data-mgroup="month">Per Bulan</button>
                <button type="button" className="merchant-group-btn" data-mgroup="year">Per Tahun</button>
              </div>
              <select id="merchant-group-period" className="mini-select hidden" aria-label="Pilih Periode Merchant"></select>
            </div>
            <div className="search-box" style={{ marginBottom: '12px' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              <input type="search" id="merchant-stats-search" placeholder="Cari nama merchant..." />
            </div>
            <div id="merchant-stats-summary" className="merchant-stats-summary"></div>
            <div id="merchant-stats-list" className="merchant-stats-list"></div>
          </div>
        </div>
      </div>

      {/* Social Share & Nearby Menu Finder Modal (v1.1) */}
      <div id="modal-social-finder" className="modal modal-center hidden" role="dialog" aria-modal="true" aria-labelledby="social-finder-title">
        <div className="modal-backdrop" data-close="modal-social-finder"></div>
        <div className="modal-sheet modal-lg social-finder-sheet">
          <div className="modal-header">
            <div>
              <span className="auth-badge">SOCIAL SHARE &amp; MENU FINDER</span>
              <h3 id="social-finder-title">Cari Menu Terdekat &amp; Bagikan</h3>
            </div>
            <button type="button" className="icon-btn" data-close="modal-social-finder" aria-label="Close">&times;</button>
          </div>
          <div className="modal-body social-finder-body">
            <div className="social-search-grid">
              <div className="field">
                <label htmlFor="social-hashtag-cat">Hashtag</label>
                <select id="social-hashtag-cat">
                  <option value="makanan">#makanan</option>
                  <option value="minuman">#minuman</option>
                  <option value="kopi">#kopi</option>
                  <option value="dessert">#dessert</option>
                  <option value="lainnya">#kuliner</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="social-menu-query">Menu / Makanan</label>
                <input type="text" id="social-menu-query" defaultValue="nasi goreng" placeholder="e.g. nasi goreng, bakso" />
              </div>
              <div className="field social-sort-col">
                <label htmlFor="social-sort-by">Urutkan</label>
                <select id="social-sort-by" aria-label="Urutkan berdasarkan">
                  <option value="rating-desc">⭐ Rating Tertinggi</option>
                  <option value="price-asc">💰 Harga Termurah</option>
                  <option value="price-desc">💎 Harga Termahal</option>
                </select>
              </div>
            </div>

            <div className="social-loc-row">
              <input type="text" id="social-location-input" placeholder="Ketik kota / area atau klik Lokasi Saya..." />
              <button type="button" id="btn-social-gps" className="btn btn-secondary">📍 Lokasi Saya</button>
            </div>

            <div id="social-popular-tags" className="social-popular-tags"></div>

            <div id="social-resto-list" className="social-resto-list"></div>
          </div>
          <div className="modal-footer social-share-actions">
            <button type="button" id="btn-social-copy" className="btn btn-secondary">📋 Copy Caption</button>
            <a id="btn-social-maps" className="btn btn-secondary" href="#" target="_blank" rel="noopener noreferrer">🗺️ Maps</a>
            <button type="button" id="btn-social-wa" className="btn btn-primary">💬 Share WhatsApp</button>
          </div>
        </div>
      </div>

      {/* What's New Modal (Simple WhatsApp-style) */}
      <div id="modal-whats-new" className="modal modal-center hidden" role="dialog" aria-modal="true" aria-labelledby="whats-new-title">
        <div className="modal-backdrop" data-close="modal-whats-new"></div>
        <div className="modal-sheet whats-new-sheet whats-new-wa-sheet">
          <button type="button" id="btn-close-whats-new" className="whats-new-wa-close" data-close="modal-whats-new" aria-label="Close">
            &times;
          </button>
          <div className="whats-new-wa-body">
            <div className="whats-new-wa-hero">
              <div className="whats-new-wa-logo" aria-hidden="true">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" />
                  <path d="M8 7h8M8 11h8M8 15h5" />
                </svg>
              </div>
              <div>
                <h3 id="whats-new-title" className="whats-new-wa-title">Fitur Baru untuk Catatanmu</h3>
                <p id="whats-new-subtitle" className="whats-new-cs-sub">Semua yang kamu butuhkan untuk catat struk, patungan, dan berbagi tempat.</p>
              </div>
            </div>

            <div id="whats-new-scroll-body" className="whats-new-wa-list"></div>

            <div className="whats-new-wa-actions">
              <button type="button" id="btn-whats-new-ok" className="btn btn-primary whats-new-wa-btn">
                Lanjutkan
              </button>
            </div>
          </div>
        </div>
      </div>

      <div id="toast-container" className="toast-container" aria-live="polite"></div>
    </>
  );
}
