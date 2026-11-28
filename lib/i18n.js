'use client';

export const LANG_STORAGE_KEY = 'catatstruk_lang_v1';

export const I18N = {
  id: {
    brandSub: 'Foto & Catat Struk',
    navDashboard: 'Beranda',
    navDashboardSub: 'Pengeluaran, Struk & Toko',
    navItinerary: 'Rencana Perjalanan',
    navItinerarySub: 'Jadwal, Rincian Biaya & Batas',
    navSocial: 'Jelajah Kuliner',
    navSocialSub: 'Tagar Tempat Makan, Harga & Rating',
    navSheet: 'Sinkron Google Sheet',
    navSheetSub: 'Panduan & Sinkronisasi 2-Arah',
    navSettings: 'Akun & Pengaturan',
    navSettingsSub: 'Profil, Kunci AI & Anggaran Bulanan',
    navGroups: 'Grup & Teman',
    navGroupsSub: 'Kelola grup & anggota (maks. 50)',
    navLogout: 'Keluar Akun',
    navLogoutSub: 'Akhiri sesi masuk saat ini',
    navLoading: 'Membuka halaman…',
    navFooter: 'CatatStruk • Keamanan Zero-Trust',
    backDashboard: '← Kembali ke Beranda',

    // Dashboard
    thisMonth: 'Bulan Ini',
    monthlyExpenses: 'Pengeluaran Bulanan',
    yearlyExpenses: 'Pengeluaran Tahunan',
    targetBudget: 'Batas Anggaran:',
    statReceipts: 'Jumlah Struk',
    statAvg: 'Rata-rata / Struk',
    statSynced: 'Tersinkron',
    btnShare: 'Bagikan',
    expensesByCat: 'Pengeluaran per Kategori',
    exportCsv: 'Unduh CSV',
    noCatData: 'Belum ada data kategori.',
    topMerchantTitle: '🏪 Toko Teratas',
    filterMonth: 'Bulan Ini',
    filterYear: 'Tahun Ini',
    filterAll: 'Semua',
    noMerchantData: 'Belum ada data toko untuk periode ini.',
    receiptHistory: 'Riwayat Struk',
    btnMerchantStats: '🏪 Daftar Toko',
    allCategories: 'Semua Kategori',
    tabExpense: 'Pengeluaran',
    tabReimburse: 'Klaim Dana',
    tabOutstanding: 'Patungan',
    searchPlaceholder: 'Cari nama toko atau item...',
    emptyMonth: 'Belum ada struk tercatat di periode ini.',
    emptyReimburse: 'Belum ada struk klaim dana.',
    emptyOutstanding: 'Tidak ada tagihan patungan.',
    uploadTitle: 'Unggah / Input Manual',
    uploadDesc: 'Pilih 1 s/d 5 foto struk sekaligus — AI ekstrak & simpan langsung.',
    btnUpload: 'Unggah Foto',
    btnManual: '+ Input Manual',
    noReceiptHandy: 'Belum punya foto struk?',
    trySample: 'Coba Struk Contoh →',
    planningItinerary: '🗓️ Rencana Perjalanan',
    manageLink: 'Kelola →',
    emptyItineraryDash: 'Belum ada jadwal perjalanan. Klik Kelola → untuk membuat rencana & anggaran.',
    reimbursePendingLbl: 'Belum Diklaim',
    reimburseClaimedLbl: 'Sudah Diklaim',
    bottomLinkSheet: 'Tautkan Sheet',
    bottomSync: 'Sinkron',
    bottomSettings: 'Pengaturan',

    // Itinerary Page
    itinBadge: 'RENCANA PERJALANAN',
    itinHeading: 'Rencana Perjalanan & Anggaran',
    itinNewPlan: '+ Rencana Baru',
    itinDelete: 'Hapus',
    itinNameLbl: 'Nama Perjalanan / Kegiatan',
    itinLimitLbl: 'Batas Anggaran (Rp)',
    itinMaxBudget: 'Batas Anggaran',
    itinUsedReceipts: 'Terpakai (Struk)',
    itinRemaining: 'Sisa Anggaran',
    itinPlannedTotal: 'Total Estimasi Rencana',
    itinAddHeading: 'Tambah Rincian Biaya Per Hari',
    itinDayLbl: 'Hari ke-',
    itinTimeLbl: 'Jam',
    itinActivityLbl: 'Aktivitas / Lokasi',
    itinCostLbl: 'Estimasi Biaya (Rp)',
    itinAddBtn: '+ Tambah ke Rencana',
    itinTimelineHeading: 'Jadwal Per Hari & Jam',
    itinEmpty: 'Belum ada jadwal. Tambahkan rincian biaya per hari dan jam di samping.',

    // Social Page
    socialBadge: 'JURNAL KULINER',
    socialHeading: 'Jelajah Menu Terdekat & Bagikan',
    socialCatLbl: 'Tagar Kategori',
    socialMenuLbl: 'Cari Menu / Makanan',
    socialSortLbl: 'Urutkan Hasil',
    socialSortRating: '⭐ Rating Tertinggi',
    socialSortCheap: '💰 Harga Termurah',
    socialSortExpensive: '💎 Harga Termahal',
    socialLocPlaceholder: 'Masukkan nama kota/area, atau gunakan GPS lokasi Anda...',
    socialUseGps: '📍 Gunakan Lokasi GPS',
    socialCopyAll: '📋 Salin Daftar Rekomendasi',
    socialCopied: '✓ Teks Tersalin!',
    socialOpenMaps: '🗺️ Buka di Google Maps',
    socialShareWa: '💬 Bagikan ke WhatsApp',
    socialCopyCard: '📋 Salin Info',
    socialViewLoc: '🗺️ Lihat Lokasi',
  },
  en: {
    brandSub: 'Snap & Track Receipts',
    navDashboard: 'Dashboard',
    navDashboardSub: 'Expenses, Receipts & Merchants',
    navItinerary: 'Itinerary Planner',
    navItinerarySub: 'Schedule, Cost Breakdown & Limit',
    navSocial: 'Social Journal',
    navSocialSub: 'Hashtag Places, Price & Rating',
    navSheet: 'Google Sheet Sync',
    navSheetSub: 'Guide & 2-Way Synchronization',
    navSettings: 'Account & Settings',
    navSettingsSub: 'Profile, AI Key & Monthly Budget',
    navGroups: 'Groups & Friends',
    navGroupsSub: 'Manage groups & members (max 50)',
    navLogout: 'Sign Out',
    navLogoutSub: 'End current session',
    navLoading: 'Opening page…',
    navFooter: 'CatatStruk • Zero-Trust Secured',
    backDashboard: '← Back to Dashboard',

    // Dashboard
    thisMonth: 'This Month',
    monthlyExpenses: 'Monthly Expenses',
    yearlyExpenses: 'Yearly Expenses',
    targetBudget: 'Target Budget:',
    statReceipts: 'Receipts',
    statAvg: 'Avg / Receipt',
    statSynced: 'Synced',
    btnShare: 'Share',
    expensesByCat: 'Expenses by Category',
    exportCsv: 'Export CSV',
    noCatData: 'No category data yet.',
    topMerchantTitle: '🏪 Top Merchants',
    filterMonth: 'This Month',
    filterYear: 'This Year',
    filterAll: 'All Time',
    noMerchantData: 'No merchant data for this period.',
    receiptHistory: 'Receipt History',
    btnMerchantStats: '🏪 Merchants',
    allCategories: 'All Categories',
    tabExpense: 'Expenses',
    tabReimburse: 'Reimburse',
    tabOutstanding: 'Split Bills',
    searchPlaceholder: 'Search merchant or item...',
    emptyMonth: 'No receipts recorded in this period.',
    emptyReimburse: 'No reimbursement receipts yet.',
    emptyOutstanding: 'No pending split bills.',
    uploadTitle: 'Upload / Manual Entry',
    uploadDesc: 'Select 1 to 5 receipt photos at once — AI extracts & saves automatically.',
    btnUpload: 'Upload Photos',
    btnManual: '+ Manual Entry',
    noReceiptHandy: 'No receipt handy?',
    trySample: 'Try Sample Receipt →',
    planningItinerary: '🗓️ Itinerary Planner',
    manageLink: 'Manage →',
    emptyItineraryDash: 'No active itinerary yet. Click Manage → to plan your trip & budget.',
    reimbursePendingLbl: 'Pending Claim',
    reimburseClaimedLbl: 'Claimed',
    bottomLinkSheet: 'Link Sheet',
    bottomSync: 'Sync',
    bottomSettings: 'Settings',

    // Itinerary Page
    itinBadge: 'ITINERARY PLANNER',
    itinHeading: 'Trip Plan & Budget Tracker',
    itinNewPlan: '+ New Plan',
    itinDelete: 'Delete',
    itinNameLbl: 'Trip / Activity Name',
    itinLimitLbl: 'Maximum Budget (Rp)',
    itinMaxBudget: 'Max Budget',
    itinUsedReceipts: 'Spent (Receipts)',
    itinRemaining: 'Remaining Budget',
    itinPlannedTotal: 'Total Planned Estimate',
    itinAddHeading: 'Add Daily Cost Item',
    itinDayLbl: 'Day',
    itinTimeLbl: 'Time',
    itinActivityLbl: 'Activity / Location',
    itinCostLbl: 'Estimated Cost (Rp)',
    itinAddBtn: '+ Add to Plan',
    itinTimelineHeading: 'Daily & Hourly Schedule',
    itinEmpty: 'No schedule yet. Add your daily & hourly cost items on the left.',

    // Social Page
    socialBadge: 'SOCIAL JOURNAL',
    socialHeading: 'Explore Nearby Menus & Share',
    socialCatLbl: 'Hashtag Category',
    socialMenuLbl: 'Search Menu / Food',
    socialSortLbl: 'Sort Results',
    socialSortRating: '⭐ Highest Rating',
    socialSortCheap: '💰 Lowest Price',
    socialSortExpensive: '💎 Highest Price',
    socialLocPlaceholder: 'Enter city/area name, or use your GPS location...',
    socialUseGps: '📍 Use GPS Location',
    socialCopyAll: '📋 Copy Recommendations',
    socialCopied: '✓ Copied!',
    socialOpenMaps: '🗺️ Open in Google Maps',
    socialShareWa: '💬 Share on WhatsApp',
    socialCopyCard: '📋 Copy Info',
    socialViewLoc: '🗺️ View Location',
  },
};

export function getSavedLang() {
  try {
    const val = localStorage.getItem(LANG_STORAGE_KEY);
    return val === 'en' ? 'en' : 'id';
  } catch {
    return 'id';
  }
}

export function applyDomTranslations(lang) {
  const dict = I18N[lang] || I18N.id;
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('lang', lang);

  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    if (key && dict[key]) el.textContent = dict[key];
  });

  document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (key && dict[key]) el.setAttribute('placeholder', dict[key]);
  });
}

export function setSavedLang(lang) {
  const next = lang === 'en' ? 'en' : 'id';
  try {
    localStorage.setItem(LANG_STORAGE_KEY, next);
  } catch { }
  applyDomTranslations(next);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('catatstruk-lang-change', { detail: next }));
  }
  return next;
}
