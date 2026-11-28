'use client';

import Link from 'next/link';

export default function ItineraryPreviewCard() {
  return (
    <section className="card" id="dashboard-itinerary-card">
      <div className="card-header">
        <h3 data-i18n="planningItinerary">🗓️ Planning Itinerary</h3>
        <Link href="/itinerary" className="link-btn" data-i18n="manageLink">Kelola &rarr;</Link>
      </div>
      <div id="dashboard-itinerary-body" className="dashboard-itinerary-body"></div>
    </section>
  );
}
