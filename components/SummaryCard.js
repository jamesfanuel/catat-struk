'use client';

export default function SummaryCard() {
  return (
    <section className="summary-card" aria-label="Financial Summary">
      <div className="summary-header-row">
        <div className="period-filter-wrap">
          <button type="button" id="period-picker-btn" className="period-picker-btn" aria-label="Filter Expense Period" aria-haspopup="dialog">
            <span id="period-picker-label">This Month</span>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>
          <select id="period-filter" className="visually-hidden" aria-hidden="true" tabIndex="-1"></select>
        </div>
        <button type="button" id="btn-open-share" className="share-icon-btn" title="Share Recap" aria-label="Share Recap">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="18" cy="5" r="3" />
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="19" r="3" />
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
          </svg>
          <span data-i18n="btnShare">Bagikan</span>
        </button>
      </div>

      <div className="summary-top">
        <div className="summary-left">
          <p className="summary-label" id="summary-period-label" data-i18n="monthlyExpenses">Pengeluaran Bulanan</p>
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
            <span data-i18n="targetBudget">Target Budget:</span>
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
          <span className="stat-label" data-i18n="statReceipts">Struk</span>
          <strong className="stat-val" id="stat-count">0</strong>
        </div>
        <div className="stat-box">
          <span className="stat-label" data-i18n="statAvg">Rata-rata / Struk</span>
          <strong className="stat-val" id="stat-avg">Rp 0</strong>
        </div>
        <div className="stat-box">
          <span className="stat-label" data-i18n="statSynced">Tersinkron</span>
          <strong className="stat-val" id="stat-synced">0 / 0</strong>
        </div>
      </div>
    </section>
  );
}
