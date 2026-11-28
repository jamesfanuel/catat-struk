'use client';

export default function TopMerchantsCard() {
  return (
    <section className="card" id="dashboard-top-merchants">
      <div className="card-header">
        <h3 data-i18n="topMerchantTitle">🏪 Top Merchant</h3>
        <div className="merchant-group-tabs" role="tablist" aria-label="Filter Top Merchant">
          <button type="button" className="merchant-group-btn dash-mgroup-btn active" data-dash-mgroup="month" data-i18n="filterMonth">Bulan Ini</button>
          <button type="button" className="merchant-group-btn dash-mgroup-btn" data-dash-mgroup="year" data-i18n="filterYear">Tahun Ini</button>
          <button type="button" className="merchant-group-btn dash-mgroup-btn" data-dash-mgroup="all" data-i18n="filterAll">Semua</button>
        </div>
      </div>
      <div className="dash-merchant-toolbar">
        <div className="merchant-group-tabs" role="tablist" aria-label="Urutkan Top Merchant">
          <button type="button" className="merchant-group-btn dash-msort-btn active" data-dash-msort="spent" id="btn-dash-msort-spent">
            💰 Total Expenses
          </button>
          <button type="button" className="merchant-group-btn dash-msort-btn" data-dash-msort="visits" id="btn-dash-msort-visits">
            👣 Total Visits
          </button>
        </div>
      </div>
      <div id="dashboard-top-merchants-list" className="dashboard-top-merchants-list"></div>
    </section>
  );
}
