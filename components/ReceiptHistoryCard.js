'use client';

export default function ReceiptHistoryCard() {
  return (
    <section className="card transactions-card" id="history-section">
      <div className="card-header">
        <h3 data-i18n="receiptHistory">Riwayat Struk</h3>
        <div className="filter-row" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button type="button" id="btn-open-merchants" className="link-btn merchant-stats-btn" title="Statistik Kunjungan Merchant" data-i18n="btnMerchantStats">🏪 Merchant</button>
          <select id="category-filter" className="mini-select" aria-label="Filter Category">
            <option value="all" data-i18n="allCategories">Semua Kategori</option>
            <option value="Daily Needs">Daily Needs</option>
            <option value="Emergency">Emergency</option>
            <option value="Self Reward">Self Reward</option>
          </select>
        </div>
      </div>

      <div className="view-tabs view-tabs-inline" role="tablist" aria-label="Expense Tabs">
        <button type="button" id="tab-expense" className="view-tab active" role="tab" aria-selected="true" data-tab="expense">
          <span data-i18n="tabExpense">Pengeluaran</span>
        </button>
        <button type="button" id="tab-reimburse" className="view-tab" role="tab" aria-selected="false" data-tab="reimburse">
          <span data-i18n="tabReimburse">Reimburse</span>
          <span id="reimburse-badge" className="tab-badge hidden">0</span>
        </button>
        <button type="button" id="tab-outstanding" className="view-tab" role="tab" aria-selected="false" data-tab="outstanding">
          <span data-i18n="tabOutstanding">Patungan</span>
          <span id="outstanding-badge" className="tab-badge hidden">0</span>
        </button>
      </div>

      <div id="reimburse-summary-bar" className="reimburse-summary-bar hidden">
        <div className="reimburse-stat">
          <span data-i18n="reimbursePendingLbl">Belum Diklaim</span>
          <strong id="reimburse-pending-total">Rp 0</strong>
        </div>
        <div className="reimburse-stat">
          <span data-i18n="reimburseClaimedLbl">Sudah Diklaim</span>
          <strong id="reimburse-claimed-total">Rp 0</strong>
        </div>
      </div>

      <div className="search-box">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <input type="search" id="search-input" data-i18n-placeholder="searchPlaceholder" placeholder="Cari nama toko atau item..." />
      </div>

      <ul className="tx-list" id="tx-list"></ul>
      <div id="tx-pagination" className="tx-pagination hidden" aria-label="Pagination"></div>
      <div className="empty-state hidden" id="empty-state">
        <p data-i18n="emptyMonth">Belum ada struk tercatat di periode ini.</p>
      </div>

      <div className="history-scan-wrap history-scan-centered" id="drop-zone">
        <input type="file" id="input-camera" accept="image/*" capture="environment" className="hidden" />
        <input type="file" id="input-gallery" accept="image/*" multiple className="hidden" />

        <div className="scan-hero">
          <div className="scan-illustration" aria-hidden="true">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
              <circle cx="12" cy="13" r="3" />
            </svg>
          </div>
          <div>
            <h3 data-i18n="uploadTitle">Upload / Manual</h3>
            <p data-i18n="uploadDesc">Pilih 1 s/d 5 foto struk sekaligus — AI ekstrak &amp; simpan langsung.</p>
          </div>
        </div>

        <div className="scan-buttons">
          <button id="btn-gallery" className="btn btn-primary btn-lg">
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" x2="12" y1="3" y2="15" />
            </svg>
            <span data-i18n="btnUpload">Upload</span>
          </button>
          <button id="btn-manual" className="btn btn-secondary btn-lg" title="Manual input">
            <span data-i18n="btnManual">+ Manual</span>
          </button>
        </div>

        <div id="history-demo-bar" className="demo-bar demo-bar-centered">
          <span data-i18n="noReceiptHandy">Belum punya struk?</span>
          <button id="btn-demo-scan" className="link-btn" data-i18n="trySample">Coba Struk Contoh &rarr;</button>
        </div>
      </div>
    </section>
  );
}
