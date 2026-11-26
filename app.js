/**
 * CatatStruk — Aplikasi Pencatat Keuangan Ringan
 * Foto Struk -> AI Gemini Extraction -> Google Sheets Pribadi
 */

const STORAGE_KEYS = {
  TXS: 'catatstruk_transactions_v1',
  SETTINGS: 'catatstruk_settings_v1',
  THEME: 'catatstruk_theme_v1',
  SHEET_SESSION: 'catatstruk_sheet_session_v1',
};

const SHEET_SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 jam

const CATEGORIES = {
  'Makanan & Minuman': { color: '#0f766e', icon: '🍜' },
  'Belanja': { color: '#2563eb', icon: '🛍️' },
  'Transportasi': { color: '#f59e0b', icon: '🛵' },
  'Tagihan': { color: '#ef4444', icon: '🧾' },
  'Kesehatan': { color: '#10b981', icon: '💊' },
  'Hiburan': { color: '#8b5cf6', icon: '🎬' },
  'Lainnya': { color: '#64748b', icon: '📦' },
};

const GAS_CODE = `function doGet() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('CatatStruk');
    if (!sheet || sheet.getLastRow() <= 1) {
      return jsonOut({ ok: true, rows: [] });
    }
    var values = sheet.getDataRange().getValues();
    var rows = [];
    for (var i = 1; i < values.length; i++) {
      var r = values[i];
      if (!r[0] && !r[2]) continue;
      rows.push({
        id: String(r[0] || 'gs_' + i),
        date: r[1] instanceof Date ? Utilities.formatDate(r[1], Session.getScriptTimeZone(), 'yyyy-MM-dd') : String(r[1] || '').slice(0, 10),
        merchant: String(r[2] || 'Struk'),
        category: String(r[3] || 'Lainnya'),
        itemsText: String(r[4] || ''),
        total: Math.max(0, Number(r[5]) || 0),
        paymentMethod: String(r[6] || 'QRIS'),
        notes: String(r[7] || '')
      });
    }
    return jsonOut({ ok: true, rows: rows });
  } catch (err) {
    return jsonOut({ ok: false, error: String(err) });
  }
}

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    if (data.action === 'ping') {
      return jsonOut({ ok: true, message: 'Connected to CatatStruk!' });
    }

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('CatatStruk') || ss.insertSheet('CatatStruk');

    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        'ID', 'Tanggal', 'Toko', 'Kategori',
        'Item', 'Total (Rp)', 'Metode Bayar', 'Catatan', 'Synced At'
      ]);
      sheet.getRange(1, 1, 1, 9).setFontWeight('bold');
    }

    var rows = Array.isArray(data.rows) ? data.rows : [data];
    rows.forEach(function(r) {
      sheet.appendRow([
        r.id || '',
        r.date || '',
        r.merchant || '',
        r.category || '',
        r.itemsText || '',
        Number(r.total) || 0,
        r.paymentMethod || '',
        r.notes || '',
        new Date().toISOString()
      ]);
    });

    return jsonOut({ ok: true, count: rows.length });
  } catch (err) {
    return jsonOut({ ok: false, error: String(err) });
  }
}

function jsonOut(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}`;

const DEMO_RECEIPTS = [
  {
    merchant: 'Kopi Kenangan',
    category: 'Makanan & Minuman',
    paymentMethod: 'QRIS',
    total: 42000,
    items: [
      { name: 'Kopi Kenangan Mantan (L)', qty: 1, price: 24000 },
      { name: 'Roti Coklat Klasik', qty: 1, price: 18000 },
    ],
    notes: 'Ngopi sore',
  },
  {
    merchant: 'Indomaret Point',
    category: 'Belanja',
    paymentMethod: 'Debit',
    total: 76500,
    items: [
      { name: 'Air Mineral 1.5L', qty: 2, price: 12000 },
      { name: 'Sabun Cuci Cair 800ml', qty: 1, price: 29500 },
      { name: 'Roti Tawar Gandum', qty: 1, price: 19000 },
      { name: 'Teh Botol 450ml', qty: 2, price: 16000 },
    ],
    notes: 'Belanja harian',
  },
  {
    merchant: 'GoRide / Gojek',
    category: 'Transportasi',
    paymentMethod: 'E-Wallet',
    total: 28000,
    items: [{ name: 'Perjalanan Stasiun - Kantor', qty: 1, price: 28000 }],
    notes: 'Transport pagi',
  },
  {
    merchant: 'Apotek K-24',
    category: 'Kesehatan',
    paymentMethod: 'QRIS',
    total: 54000,
    items: [
      { name: 'Vitamin C 500mg', qty: 1, price: 32000 },
      { name: 'Plester Luka Box', qty: 1, price: 22000 },
    ],
    notes: 'Stok P3K',
  },
];

// App State
let state = {
  transactions: [],
  settings: {
    geminiKey: '',
    geminiModel: 'gemini-2.5-flash',
    sheetUrl: '',
    autoSync: true,
    monthlyBudget: 3000000,
  },
  selectedMonth: getCurrentMonth(),
  categoryFilter: 'all',
  searchQuery: '',
  pendingThumb: '',
};

// DOM Helpers
const $ = (id) => document.getElementById(id);

function getCurrentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function getTodayDate() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatRupiah(num) {
  const safe = Math.max(0, Math.round(Number(num) || 0));
  return 'Rp ' + safe.toLocaleString('id-ID');
}

function formatNumberID(num) {
  const safe = Math.max(0, Math.round(Number(num) || 0));
  return safe > 0 ? safe.toLocaleString('id-ID') : '';
}

function parseRupiahInput(val) {
  const digits = String(val ?? '').replace(/[^\d]/g, '');
  if (!digits) return 0;
  return Math.max(0, parseInt(digits, 10) || 0);
}

function bindCurrencyInput(inputEl, onChange) {
  inputEl.addEventListener('input', () => {
    const numeric = parseRupiahInput(inputEl.value);
    inputEl.value = numeric > 0 ? numeric.toLocaleString('id-ID') : '';
    if (onChange) onChange(numeric);
  });
}

function formatDateID(isoDate) {
  if (!isoDate) return '-';
  const [y, m, d] = isoDate.split('-').map(Number);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  return `${d} ${months[(m || 1) - 1]} ${y}`;
}

function formatMonthLabel(ym) {
  const [y, m] = ym.split('-').map(Number);
  const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  return `${months[(m || 1) - 1]} ${y}`;
}

function showToast(msg, type = 'info') {
  const container = $('toast-container');
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = msg;
  container.appendChild(el);
  setTimeout(() => el.remove(), 3400);
}

// Persistence
function loadSheetSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SHEET_SESSION);
    if (!raw) return '';
    const session = JSON.parse(raw);
    if (!session || !session.url || !session.expiresAt || Date.now() >= session.expiresAt) {
      localStorage.removeItem(STORAGE_KEYS.SHEET_SESSION);
      return '';
    }
    return String(session.url);
  } catch {
    localStorage.removeItem(STORAGE_KEYS.SHEET_SESSION);
    return '';
  }
}

function saveSheetSession(url) {
  const clean = String(url || '').trim();
  if (!clean) {
    localStorage.removeItem(STORAGE_KEYS.SHEET_SESSION);
    state.settings.sheetUrl = '';
    state.settings.sheetExpiresAt = 0;
    return;
  }
  const expiresAt = Date.now() + SHEET_SESSION_TTL_MS;
  localStorage.setItem(
    STORAGE_KEYS.SHEET_SESSION,
    JSON.stringify({ url: clean, expiresAt })
  );
  state.settings.sheetUrl = clean;
  state.settings.sheetExpiresAt = expiresAt;
}

function getSheetRemainingHours() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SHEET_SESSION);
    if (!raw) return 0;
    const session = JSON.parse(raw);
    const diff = (session?.expiresAt || 0) - Date.now();
    if (diff <= 0) {
      localStorage.removeItem(STORAGE_KEYS.SHEET_SESSION);
      state.settings.sheetUrl = '';
      return 0;
    }
    return Math.max(1, Math.ceil(diff / (60 * 60 * 1000)));
  } catch {
    return 0;
  }
}

function loadState() {
  try {
    const rawTx = localStorage.getItem(STORAGE_KEYS.TXS);
    if (rawTx) state.transactions = JSON.parse(rawTx);
    const rawSettings = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (rawSettings) state.settings = { ...state.settings, ...JSON.parse(rawSettings) };
    // Ambil link Google Sheet dari session 24 jam (otomatis terhapus jika expired)
    state.settings.sheetUrl = loadSheetSession();
    const theme = localStorage.getItem(STORAGE_KEYS.THEME) || 'light';
    applyTheme(theme);
  } catch (e) {
    console.error('Failed to load state:', e);
  }
}

function saveTransactions() {
  localStorage.setItem(STORAGE_KEYS.TXS, JSON.stringify(state.transactions));
}

function saveSettings() {
  const { sheetUrl, ...rest } = state.settings;
  localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(rest));
  saveSheetSession(sheetUrl);
}

// Theme
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem(STORAGE_KEYS.THEME, theme);
  const isDark = theme === 'dark';
  document.querySelector('.icon-sun')?.classList.toggle('hidden', isDark);
  document.querySelector('.icon-moon')?.classList.toggle('hidden', !isDark);
}

// Image Compression (keeps localStorage tiny & Gemini upload fast)
function compressImage(fileOrDataUrl, maxWidth = 1024, quality = 0.78) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxWidth / img.width);
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = reject;

    if (typeof fileOrDataUrl === 'string') {
      img.src = fileOrDataUrl;
    } else {
      const reader = new FileReader();
      reader.onload = (e) => { img.src = e.target.result; };
      reader.onerror = reject;
      reader.readAsDataURL(fileOrDataUrl);
    }
  });
}

// Generate realistic demo receipt image on canvas
function createDemoReceiptImage(demo) {
  const canvas = document.createElement('canvas');
  canvas.width = 420;
  canvas.height = 540;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#fafaf9';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#1c1917';
  ctx.font = 'bold 24px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(demo.merchant.toUpperCase(), 210, 60);

  ctx.font = '14px monospace';
  ctx.fillStyle = '#57534e';
  ctx.fillText('STRUK PEMBAYARAN RESMI', 210, 88);
  ctx.fillText(getTodayDate() + '  ' + demo.paymentMethod, 210, 112);

  ctx.textAlign = 'left';
  ctx.fillStyle = '#1c1917';
  ctx.fillText('----------------------------------------', 26, 145);

  let y = 180;
  demo.items.forEach((item) => {
    ctx.font = '15px monospace';
    ctx.fillText(`${item.name.slice(0, 24)} x${item.qty}`, 28, y);
    ctx.textAlign = 'right';
    ctx.fillText(formatRupiah(item.price), 392, y);
    ctx.textAlign = 'left';
    y += 34;
  });

  ctx.fillText('----------------------------------------', 26, y + 10);
  ctx.font = 'bold 20px monospace';
  ctx.fillText('TOTAL', 28, y + 52);
  ctx.textAlign = 'right';
  ctx.fillText(formatRupiah(demo.total), 392, y + 52);

  ctx.textAlign = 'center';
  ctx.font = '13px monospace';
  ctx.fillStyle = '#78716c';
  ctx.fillText('Terima kasih telah berbelanja!', 210, 490);

  return canvas.toDataURL('image/jpeg', 0.85);
}

// Gemini AI Receipt Extraction
async function extractReceiptWithGemini(dataUrl) {
  const apiKey = state.settings.geminiKey.trim();
  const model = state.settings.geminiModel || 'gemini-2.5-flash';
  const base64Data = dataUrl.split(',')[1];

  const prompt = `Kamu adalah asisten pencatat keuangan Indonesia. Baca gambar struk pembayaran ini dan ekstrak datanya ke JSON valid dengan struktur persis berikut:
{
  "merchant": "nama toko/merchant",
  "date": "YYYY-MM-DD (gunakan ${getTodayDate()} jika tidak terbaca)",
  "category": "salah satu dari: Makanan & Minuman, Belanja, Transportasi, Tagihan, Kesehatan, Hiburan, Lainnya",
  "total": 0,
  "paymentMethod": "salah satu dari: QRIS, Tunai, Debit, Kredit, E-Wallet, Transfer",
  "items": [
    { "name": "nama item", "qty": 1, "price": 0 }
  ],
  "notes": "ringkasan singkat 2-4 kata"
}
Pastikan total dan price berupa angka bulat Rupiah tanpa titik/koma.`;

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: prompt },
            { inline_data: { mime_type: 'image/jpeg', data: base64Data } },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.1,
      },
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini API error (${res.status}): ${errText.slice(0, 140)}`);
  }

  const json = await res.json();
  const rawText = json?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText) throw new Error('Respon Gemini kosong.');

  const parsed = JSON.parse(rawText);
  return {
    merchant: parsed.merchant || 'Struk Belanja',
    date: /^\d{4}-\d{2}-\d{2}$/.test(parsed.date) ? parsed.date : getTodayDate(),
    category: CATEGORIES[parsed.category] ? parsed.category : 'Lainnya',
    total: Math.max(0, Math.round(Number(parsed.total) || 0)),
    paymentMethod: parsed.paymentMethod || 'QRIS',
    items: Array.isArray(parsed.items)
      ? parsed.items.map((i) => ({
        name: String(i.name || ''),
        qty: Math.max(1, Math.round(Number(i.qty) || 1)),
        price: Math.max(0, Math.round(Number(i.price) || 0)),
      }))
      : [],
    notes: parsed.notes || '',
  };
}

// Handle Image Upload / Camera
async function handleReceiptImage(file) {
  if (!file) return;
  const overlay = $('scan-overlay');
  try {
    const compressedForAI = await compressImage(file, 1024, 0.8);
    const thumb = await compressImage(compressedForAI, 340, 0.62);
    state.pendingThumb = thumb;

    $('scan-preview-img').src = thumb;
    overlay.classList.remove('hidden');

    let extracted;
    if (state.settings.geminiKey.trim()) {
      $('scan-status-title').textContent = 'Membaca Struk dengan Gemini AI...';
      $('scan-status-desc').textContent = 'Mengekstrak nama toko, item belanja, dan total.';
      extracted = await extractReceiptWithGemini(compressedForAI);
      showToast('Struk berhasil dibaca AI!', 'success');
    } else {
      $('scan-status-title').textContent = 'Memproses Foto Struk...';
      $('scan-status-desc').textContent = 'Mode manual aktif (isi Gemini API Key di Pengaturan untuk auto-scan).';
      await new Promise((r) => setTimeout(r, 700));
      extracted = {
        merchant: '',
        date: getTodayDate(),
        category: 'Belanja',
        total: '',
        paymentMethod: 'QRIS',
        items: [],
        notes: '',
      };
      showToast('Foto siap! Lengkapi detail struk atau masukkan Gemini Key.', 'info');
    }

    overlay.classList.add('hidden');
    openReceiptModal({ ...extracted, thumb });
  } catch (err) {
    overlay.classList.add('hidden');
    console.error(err);
    showToast(err.message || 'Gagal memproses gambar struk.', 'error');
  }
}

// Demo Scan Flow
async function runDemoScan() {
  const demo = DEMO_RECEIPTS[Math.floor(Math.random() * DEMO_RECEIPTS.length)];
  const demoDataUrl = createDemoReceiptImage(demo);
  const thumb = await compressImage(demoDataUrl, 340, 0.65);

  $('scan-preview-img').src = thumb;
  $('scan-status-title').textContent = 'Simulasi Scan Struk AI...';
  $('scan-status-desc').textContent = `Membaca struk ${demo.merchant}...`;
  $('scan-overlay').classList.remove('hidden');

  await new Promise((r) => setTimeout(r, 1100));
  $('scan-overlay').classList.add('hidden');

  openReceiptModal({
    ...demo,
    date: getTodayDate(),
    thumb,
  });
  showToast(`Struk contoh "${demo.merchant}" berhasil diekstrak!`, 'success');
}

// Modal Controls
function openModal(id) {
  $(id).classList.remove('hidden');
}

function closeModal(id) {
  $(id).classList.add('hidden');
}

function itemsToText(items) {
  if (!Array.isArray(items) || items.length === 0) return '';
  return items.map((i) => `${i.name} x${Math.max(1, Number(i.qty) || 1)} - ${Math.max(0, Number(i.price) || 0)}`).join('\n');
}

function createItemRowElement(item = { name: '', qty: 1, price: 0 }) {
  const row = document.createElement('div');
  row.className = 'item-row';

  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.className = 'item-name';
  nameInput.placeholder = 'Nama item';
  nameInput.value = item.name || '';

  const qtyInput = document.createElement('input');
  qtyInput.type = 'text';
  qtyInput.inputMode = 'numeric';
  qtyInput.className = 'item-qty';
  qtyInput.placeholder = '1';
  qtyInput.title = 'Jumlah';
  qtyInput.value = String(Math.max(1, Math.round(Number(item.qty) || 1)));
  qtyInput.addEventListener('input', () => {
    const clean = qtyInput.value.replace(/[^\d]/g, '');
    qtyInput.value = clean;
    updateItemsSubtotal();
  });
  qtyInput.addEventListener('blur', () => {
    const num = Math.max(1, parseInt(qtyInput.value, 10) || 1);
    qtyInput.value = String(num);
    updateItemsSubtotal();
  });

  const priceWrap = document.createElement('div');
  priceWrap.className = 'currency-input';
  const prefix = document.createElement('span');
  prefix.className = 'currency-prefix';
  prefix.textContent = 'Rp';
  const priceInput = document.createElement('input');
  priceInput.type = 'text';
  priceInput.inputMode = 'numeric';
  priceInput.className = 'item-price';
  priceInput.placeholder = '0';
  priceInput.value = formatNumberID(item.price || 0);
  bindCurrencyInput(priceInput, () => updateItemsSubtotal());
  priceWrap.append(prefix, priceInput);

  const removeBtn = document.createElement('button');
  removeBtn.type = 'button';
  removeBtn.className = 'btn-remove-row';
  removeBtn.title = 'Hapus item';
  removeBtn.setAttribute('aria-label', 'Hapus item');
  removeBtn.textContent = '×';
  removeBtn.addEventListener('click', () => {
    row.remove();
    updateItemsSubtotal();
  });

  row.append(nameInput, qtyInput, priceWrap, removeBtn);
  return row;
}

function renderItemRows(items) {
  const container = $('items-container');
  container.innerHTML = '';
  const list = Array.isArray(items) && items.length > 0 ? items : [{ name: '', qty: 1, price: 0 }];
  list.forEach((item) => container.appendChild(createItemRowElement(item)));
  updateItemsSubtotal(false);
}

function addItemRow() {
  const container = $('items-container');
  const row = createItemRowElement({ name: '', qty: 1, price: 0 });
  container.appendChild(row);
  row.querySelector('.item-name')?.focus();
  updateItemsSubtotal(false);
}

function collectItemRows() {
  const rows = Array.from(document.querySelectorAll('#items-container .item-row'));
  return rows
    .map((row) => {
      const name = row.querySelector('.item-name')?.value.trim() || '';
      const qty = Math.max(1, parseInt(row.querySelector('.item-qty')?.value, 10) || 1);
      const price = parseRupiahInput(row.querySelector('.item-price')?.value);
      return { name, qty, price };
    })
    .filter((item) => item.name !== '' || item.price > 0);
}

function updateItemsSubtotal(autoFillTotal = true) {
  const items = collectItemRows();
  const subtotal = items.reduce((sum, item) => sum + item.price, 0);
  const badge = $('items-subtotal');
  if (subtotal > 0) {
    badge.textContent = `Subtotal: ${formatRupiah(subtotal)}`;
    badge.classList.remove('hidden');
    if (autoFillTotal && parseRupiahInput($('form-total').value) === 0) {
      $('form-total').value = formatNumberID(subtotal);
    }
  } else {
    badge.classList.add('hidden');
  }
  return subtotal;
}

function openReceiptModal(data = null) {
  const isEdit = Boolean(data && data.id);
  $('modal-receipt-title').textContent = isEdit ? 'Edit Detail Struk' : 'Konfirmasi Data Struk';
  $('form-id').value = data?.id || '';
  $('form-merchant').value = data?.merchant || '';
  $('form-date').value = data?.date || getTodayDate();
  $('form-category').value = CATEGORIES[data?.category] ? data.category : 'Makanan & Minuman';
  $('form-total').value = data?.total ? formatNumberID(data.total) : '';
  $('form-payment').value = data?.paymentMethod || 'QRIS';
  renderItemRows(data?.items || []);
  $('form-notes').value = data?.notes || '';

  const thumb = data?.thumb || '';
  state.pendingThumb = thumb;
  if (thumb) {
    $('form-thumb').src = thumb;
    $('form-thumb-wrap').classList.remove('hidden');
  } else {
    $('form-thumb-wrap').classList.add('hidden');
  }

  $('btn-delete-tx').classList.toggle('hidden', !isEdit);
  openModal('modal-receipt');
}

// Google Sheets Sync & Validation
const GOOGLE_SHEET_RE = /^https:\/\/docs\.google\.com\/spreadsheets\/d\/[a-zA-Z0-9-_]+(?:\/.*)?$/;
const APPS_SCRIPT_RE = /^https:\/\/script\.google\.com\/macros\/s\/[a-zA-Z0-9-_]+\/exec(?:\?.*)?$/;

function isGoogleSpreadsheetUrl(url) {
  return GOOGLE_SHEET_RE.test(String(url || '').trim());
}

function isValidSheetUrl(url) {
  const clean = String(url || '').trim();
  return isGoogleSpreadsheetUrl(clean) || APPS_SCRIPT_RE.test(clean);
}

function requireSheetConfigured() {
  state.settings.sheetUrl = loadSheetSession();
  if (isValidSheetUrl(state.settings.sheetUrl)) return true;
  renderStatusPills();
  $('req-sheet-url').value = '';
  openModal('modal-require-sheet');
  showToast('Sesi Google Sheet habis atau belum diisi. Masukkan link Google Sheet publik (berlaku 24 jam).', 'info');
  return false;
}

async function postToGoogleSheet(payload) {
  const url = state.settings.sheetUrl.trim();
  if (!isValidSheetUrl(url)) {
    throw new Error('Link Google Sheet tidak valid.');
  }

  // Jika user memasukkan link Google Sheet langsung (docs.google.com), kirim via Vercel API /api/sheets
  if (isGoogleSpreadsheetUrl(url)) {
    const res = await fetch('/api/sheets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, sheetUrl: url }),
    });
    const data = await res.json().catch(() => ({ ok: false, error: `HTTP ${res.status}` }));
    if (!res.ok || data.ok === false) {
      throw new Error(data.error || `HTTP ${res.status}`);
    }
    return data;
  }

  const body = JSON.stringify(payload);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body,
    });
    if (res.ok) {
      const data = await res.json().catch(() => ({ ok: true }));
      if (data.ok === false) throw new Error(data.error || 'Apps Script error');
      return data;
    }
    throw new Error(`HTTP ${res.status}`);
  } catch (err) {
    if (err.name === 'TypeError') {
      await fetch(url, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body,
      });
      return { ok: true, opaque: true };
    }
    throw err;
  }
}

async function syncSingleTransaction(tx) {
  if (!state.settings.sheetUrl.trim()) return false;
  try {
    await postToGoogleSheet({
      action: 'append',
      rows: [
        {
          id: tx.id,
          date: tx.date,
          merchant: tx.merchant,
          category: tx.category,
          itemsText: itemsToText(tx.items).replace(/\n/g, '; '),
          total: tx.total,
          paymentMethod: tx.paymentMethod,
          notes: tx.notes,
        },
      ],
    });
    tx.synced = true;
    saveTransactions();
    return true;
  } catch (err) {
    console.error('Sync failed:', err);
    return false;
  }
}

async function syncAllPending() {
  if (!state.settings.sheetUrl.trim()) {
    showToast('Hubungkan Google Sheet dulu di menu Pengaturan.', 'info');
    openSettingsModal();
    return;
  }
  const pending = state.transactions.filter((t) => !t.synced);
  if (pending.length === 0) {
    showToast('Semua struk sudah tersinkron ke Google Sheet!', 'success');
    return;
  }

  try {
    await postToGoogleSheet({
      action: 'append',
      rows: pending.map((tx) => ({
        id: tx.id,
        date: tx.date,
        merchant: tx.merchant,
        category: tx.category,
        itemsText: itemsToText(tx.items).replace(/\n/g, '; '),
        total: tx.total,
        paymentMethod: tx.paymentMethod,
        notes: tx.notes,
      })),
    });
    pending.forEach((tx) => { tx.synced = true; });
    saveTransactions();
    renderAll();
    showToast(`${pending.length} struk berhasil diexport ke Google Sheet!`, 'success');
  } catch (err) {
    showToast(`Gagal export: ${err.message}`, 'error');
  }
}

function parseItemsTextToArray(itemsText) {
  if (!itemsText) return [];
  return String(itemsText)
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const m = part.match(/^(.*?)(?:\s+x(\d+))?\s*-\s*(\d+)$/i);
      if (m) {
        return { name: m[1].trim(), qty: Math.max(1, Number(m[2]) || 1), price: Math.max(0, Number(m[3]) || 0) };
      }
      return { name: part, qty: 1, price: 0 };
    });
}

async function importFromGoogleSheet() {
  const url = ($('setting-sheet-url')?.value || state.settings.sheetUrl || '').trim();
  if (!isValidSheetUrl(url)) {
    showToast('Masukkan link Google Sheet publik yang valid terlebih dahulu.', 'error');
    return;
  }
  state.settings.sheetUrl = url;
  saveSettings();

  try {
    let data;
    if (isGoogleSpreadsheetUrl(url)) {
      const res = await fetch('/api/sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'import', sheetUrl: url }),
      });
      data = await res.json();
      if (!res.ok || data.ok === false) throw new Error(data.error || `HTTP ${res.status}`);
    } else {
      const res = await fetch(url, { method: 'GET' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      data = await res.json();
      if (data.ok === false) throw new Error(data.error || 'Gagal membaca Sheet');
    }

    const incoming = Array.isArray(data.rows) ? data.rows : [];
    const existingIds = new Set(state.transactions.map((t) => t.id));
    let added = 0;

    incoming.forEach((r) => {
      const id = String(r.id || '').trim() || `gs_${r.date}_${r.merchant}_${r.total}`;
      if (existingIds.has(id)) return;
      existingIds.add(id);
      state.transactions.push({
        id,
        date: /^\d{4}-\d{2}-\d{2}$/.test(r.date) ? r.date : getTodayDate(),
        merchant: String(r.merchant || 'Struk'),
        category: CATEGORIES[r.category] ? r.category : 'Lainnya',
        items: parseItemsTextToArray(r.itemsText),
        total: Math.max(0, Math.round(Number(r.total) || 0)),
        paymentMethod: r.paymentMethod || 'QRIS',
        notes: r.notes || '',
        thumb: '',
        synced: true,
        createdAt: Date.now(),
      });
      added++;
    });

    saveTransactions();
    renderAll();
    showToast(added > 0 ? `${added} data berhasil diimport dari Google Sheet!` : 'Semua data di Google Sheet sudah ada di aplikasi.', 'success');
  } catch (err) {
    showToast(`Gagal import: ${err.message}`, 'error');
  }
}

// Rendering
function renderStatusPills() {
  const hasAI = Boolean(state.settings.geminiKey.trim());
  const remHours = getSheetRemainingHours();
  const hasSheet = isValidSheetUrl(state.settings.sheetUrl) && remHours > 0;

  $('pill-ai').classList.toggle('connected', hasAI);
  $('pill-ai-text').textContent = hasAI ? 'Scan AI: Aktif' : 'Mode Coba (Demo)';

  $('pill-sheet').classList.toggle('connected', hasSheet);
  $('pill-sheet-text').textContent = hasSheet
    ? `Google Sheet: Aktif (${remHours}j)`
    : 'Google Sheet: Belum Terhubung';
}

function populateMonthFilter() {
  const select = $('month-filter');
  const months = new Set([getCurrentMonth()]);
  state.transactions.forEach((t) => {
    if (t.date && t.date.length >= 7) months.add(t.date.slice(0, 7));
  });
  const sorted = Array.from(months).sort().reverse();
  select.innerHTML = sorted
    .map((m) => `<option value="${m}">${formatMonthLabel(m)}</option>`)
    .join('');
  if (!sorted.includes(state.selectedMonth)) state.selectedMonth = sorted[0];
  select.value = state.selectedMonth;
}

function getMonthTransactions() {
  return state.transactions.filter((t) => (t.date || '').startsWith(state.selectedMonth));
}

function renderSummary(monthTxs) {
  const total = monthTxs.reduce((sum, t) => sum + (Number(t.total) || 0), 0);
  const count = monthTxs.length;
  const avg = count ? Math.round(total / count) : 0;
  const syncedCount = monthTxs.filter((t) => t.synced).length;

  $('total-month').textContent = formatRupiah(total);
  $('stat-count').textContent = String(count);
  $('stat-avg').textContent = formatRupiah(avg);
  $('stat-synced').textContent = `${syncedCount} / ${count}`;

  const budget = Number(state.settings.monthlyBudget) || 0;
  const budgetWrap = $('budget-wrap');
  if (budget > 0) {
    budgetWrap.classList.remove('hidden');
    const pct = Math.round((total / budget) * 100);
    $('budget-label').textContent = `Target Budget: ${formatRupiah(budget)}`;
    $('budget-percent').textContent = `${pct}%`;
    const fill = $('budget-progress');
    fill.style.width = `${Math.min(100, pct)}%`;
    fill.classList.remove('warn', 'over');
    if (pct >= 100) fill.classList.add('over');
    else if (pct >= 80) fill.classList.add('warn');
  } else {
    budgetWrap.classList.add('hidden');
  }

  const pendingTotal = state.transactions.filter((t) => !t.synced).length;
  const badge = $('pending-badge');
  badge.textContent = String(pendingTotal);
  badge.classList.toggle('hidden', pendingTotal === 0);
}

function renderDonutChart(monthTxs) {
  const svg = $('donut-svg');
  const legend = $('category-legend');
  const totals = {};
  let grandTotal = 0;

  monthTxs.forEach((t) => {
    const cat = CATEGORIES[t.category] ? t.category : 'Lainnya';
    const amt = Number(t.total) || 0;
    totals[cat] = (totals[cat] || 0) + amt;
    grandTotal += amt;
  });

  const entries = Object.entries(totals).sort((a, b) => b[1] - a[1]);
  const r = 44;
  const c = 2 * Math.PI * r;

  if (entries.length === 0 || grandTotal === 0) {
    svg.innerHTML = `<circle cx="60" cy="60" r="${r}" fill="none" stroke="var(--surface-alt)" stroke-width="16" />`;
    $('donut-top-cat').textContent = '-';
    $('donut-top-pct').textContent = '0%';
    legend.innerHTML = `<li class="muted">Belum ada data kategori.</li>`;
    return;
  }

  let offset = 0;
  const circles = entries.map(([cat, val]) => {
    const frac = val / grandTotal;
    const dash = frac * c;
    const color = CATEGORIES[cat].color;
    const el = `<circle cx="60" cy="60" r="${r}" fill="none" stroke="${color}" stroke-width="16" stroke-dasharray="${dash} ${c}" stroke-dashoffset="${-offset}" />`;
    offset += dash;
    return el;
  });

  svg.innerHTML = circles.join('');
  const [topCat, topVal] = entries[0];
  $('donut-top-cat').textContent = topCat.split(' ')[0];
  $('donut-top-pct').textContent = `${Math.round((topVal / grandTotal) * 100)}%`;

  legend.innerHTML = entries
    .slice(0, 5)
    .map(([cat, val]) => `
      <li class="legend-item">
        <span class="legend-left">
          <span class="legend-dot" style="background:${CATEGORIES[cat].color}"></span>
          <span class="legend-name">${cat}</span>
        </span>
        <span class="legend-val">${formatRupiah(val)}</span>
      </li>
    `)
    .join('');
}

function renderTransactions(monthTxs) {
  const list = $('tx-list');
  const empty = $('empty-state');
  const q = state.searchQuery.trim().toLowerCase();

  const filtered = monthTxs
    .filter((t) => state.categoryFilter === 'all' || t.category === state.categoryFilter)
    .filter((t) => {
      if (!q) return true;
      const itemNames = (t.items || []).map((i) => i.name).join(' ').toLowerCase();
      return (t.merchant || '').toLowerCase().includes(q) || itemNames.includes(q) || (t.notes || '').toLowerCase().includes(q);
    })
    .sort((a, b) => (b.date || '').localeCompare(a.date || '') || b.createdAt - a.createdAt);

  if (filtered.length === 0) {
    list.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }

  empty.classList.add('hidden');
  list.innerHTML = filtered
    .map((tx) => {
      const cat = CATEGORIES[tx.category] || CATEGORIES['Lainnya'];
      const syncTag = tx.synced
        ? '<span class="sync-tag ok">Di Google Sheet ✓</span>'
        : '<span class="sync-tag pending">Tersimpan di HP</span>';
      const itemList = Array.isArray(tx.items) ? tx.items.filter((i) => i.name) : [];
      const itemsPreview = itemList.length > 0
        ? `${itemList.length} item: ${itemList.slice(0, 2).map((i) => i.name).join(', ')}${itemList.length > 2 ? ', ...' : ''}`
        : (tx.notes || 'Ketuk untuk lihat atau edit rincian');
      return `
        <li class="tx-item" data-id="${tx.id}">
          <div class="tx-top">
            <div class="tx-left">
              <div class="tx-icon">${cat.icon}</div>
              <div class="tx-info">
                <div class="tx-merchant">${escapeHtml(tx.merchant)}</div>
                <div class="tx-items-preview">${escapeHtml(itemsPreview)}</div>
              </div>
            </div>
            <div class="tx-right">
              <div class="tx-amount">${formatRupiah(tx.total)}</div>
            </div>
          </div>
          <div class="tx-chips">
            <span class="tx-chip">${formatDateID(tx.date)}</span>
            <span class="tx-chip">${escapeHtml(tx.category)}</span>
            <span class="tx-chip pay">Bayar: ${escapeHtml(tx.paymentMethod || 'QRIS')}</span>
            ${syncTag}
          </div>
        </li>
      `;
    })
    .join('');
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderAll() {
  renderStatusPills();
  populateMonthFilter();
  const monthTxs = getMonthTransactions();
  renderSummary(monthTxs);
  renderDonutChart(monthTxs);
  renderTransactions(monthTxs);
}

// Export CSV
function exportCsv() {
  const monthTxs = getMonthTransactions();
  if (monthTxs.length === 0) {
    showToast('Tidak ada data untuk diexport di bulan ini.', 'info');
    return;
  }
  const headers = ['ID', 'Tanggal', 'Toko', 'Kategori', 'Item', 'Total', 'Metode Bayar', 'Catatan'];
  const rows = monthTxs.map((t) => [
    t.id,
    t.date,
    t.merchant,
    t.category,
    itemsToText(t.items).replace(/\n/g, '; '),
    t.total,
    t.paymentMethod,
    t.notes || '',
  ]);
  const csv = [headers, ...rows]
    .map((r) => r.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `CatatStruk-${state.selectedMonth}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
  showToast('File CSV berhasil diunduh!', 'success');
}

// Settings Modal
function openSettingsModal() {
  $('setting-gemini-key').value = state.settings.geminiKey || '';
  $('setting-gemini-model').value = state.settings.geminiModel || 'gemini-2.5-flash';
  $('setting-sheet-url').value = state.settings.sheetUrl || '';
  $('setting-auto-sync').checked = Boolean(state.settings.autoSync);
  $('setting-budget').value = formatNumberID(state.settings.monthlyBudget || 0);
  $('gas-code-preview').textContent = GAS_CODE;
  openModal('modal-settings');
}

// Event Listeners
function bindEvents() {
  $('btn-theme').addEventListener('click', () => {
    const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    applyTheme(next);
  });

  $('btn-settings').addEventListener('click', openSettingsModal);
  $('nav-settings').addEventListener('click', openSettingsModal);
  $('nav-camera').addEventListener('click', () => {
    if (requireSheetConfigured()) $('input-camera').click();
  });
  $('nav-history').addEventListener('click', () => {
    $('history-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  $('pill-ai').addEventListener('click', openSettingsModal);
  $('pill-sheet').addEventListener('click', openSettingsModal);
  $('btn-sync-all').addEventListener('click', syncAllPending);

  // Mandatory Google Sheet Setup Form
  $('require-sheet-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const url = $('req-sheet-url').value.trim();
    if (!isValidSheetUrl(url)) {
      showToast('Gunakan link Google Sheet https://docs.google.com/spreadsheets/d/...', 'error');
      return;
    }
    state.settings.sheetUrl = url;
    state.settings.autoSync = true;
    saveSettings();
    closeModal('modal-require-sheet');
    renderAll();

    try {
      await postToGoogleSheet({ action: 'ping' });
      showToast('Google Sheet terhubung! Anda siap foto struk.', 'success');
    } catch (err) {
      showToast(`Link disimpan. Catatan: ${err.message}`, 'info');
    }
  });

  // Camera & Gallery
  $('btn-camera').addEventListener('click', () => {
    if (requireSheetConfigured()) $('input-camera').click();
  });
  $('btn-gallery').addEventListener('click', () => {
    if (requireSheetConfigured()) $('input-gallery').click();
  });
  $('btn-manual').addEventListener('click', () => {
    if (requireSheetConfigured()) openReceiptModal();
  });
  $('btn-demo-scan').addEventListener('click', () => {
    if (requireSheetConfigured()) runDemoScan();
  });

  $('input-camera').addEventListener('change', (e) => {
    handleReceiptImage(e.target.files[0]);
    e.target.value = '';
  });
  $('input-gallery').addEventListener('change', (e) => {
    handleReceiptImage(e.target.files[0]);
    e.target.value = '';
  });

  // Drag & Drop
  const dropZone = $('drop-zone');
  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('drag-over');
  });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) handleReceiptImage(file);
  });

  // Filters
  $('month-filter').addEventListener('change', (e) => {
    state.selectedMonth = e.target.value;
    renderAll();
  });
  $('category-filter').addEventListener('change', (e) => {
    state.categoryFilter = e.target.value;
    renderTransactions(getMonthTransactions());
  });
  $('search-input').addEventListener('input', (e) => {
    state.searchQuery = e.target.value;
    renderTransactions(getMonthTransactions());
  });

  $('btn-export-csv').addEventListener('click', exportCsv);

  // Click transaction item
  $('tx-list').addEventListener('click', (e) => {
    const item = e.target.closest('.tx-item');
    if (!item) return;
    const tx = state.transactions.find((t) => t.id === item.dataset.id);
    if (tx) openReceiptModal(tx);
  });

  // Close modals
  document.querySelectorAll('[data-close]').forEach((el) => {
    el.addEventListener('click', () => closeModal(el.dataset.close));
  });

  // Currency inputs (non-negative Rupiah formatting)
  bindCurrencyInput($('form-total'));
  bindCurrencyInput($('setting-budget'));

  // Dynamic item rows
  $('btn-add-item').addEventListener('click', addItemRow);
  $('items-subtotal').addEventListener('click', () => {
    const subtotal = updateItemsSubtotal(false);
    if (subtotal > 0) {
      $('form-total').value = formatNumberID(subtotal);
      showToast('Total pembayaran disesuaikan dengan subtotal item.', 'info');
    }
  });

  // Save Receipt Form
  $('receipt-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const existingId = $('form-id').value;
    const items = collectItemRows();
    const parsedTotal = parseRupiahInput($('form-total').value);
    const itemsTotal = items.reduce((s, i) => s + i.price, 0);
    const tx = {
      id: existingId || `cs_${Date.now()}`,
      merchant: $('form-merchant').value.trim(),
      date: $('form-date').value,
      category: $('form-category').value,
      total: Math.max(0, parsedTotal || itemsTotal),
      paymentMethod: $('form-payment').value,
      items,
      notes: $('form-notes').value.trim(),
      thumb: state.pendingThumb || '',
      synced: false,
      createdAt: Date.now(),
    };

    if (existingId) {
      const idx = state.transactions.findIndex((t) => t.id === existingId);
      if (idx !== -1) {
        tx.createdAt = state.transactions[idx].createdAt;
        state.transactions[idx] = tx;
      }
    } else {
      state.transactions.unshift(tx);
      state.selectedMonth = tx.date.slice(0, 7);
    }

    saveTransactions();
    closeModal('modal-receipt');
    renderAll();

    if (state.settings.autoSync && state.settings.sheetUrl.trim()) {
      const ok = await syncSingleTransaction(tx);
      renderAll();
      showToast(ok ? 'Tersimpan & tersinkron ke Google Sheet!' : 'Tersimpan lokal (sinkron Sheet tertunda).', ok ? 'success' : 'info');
    } else {
      showToast('Struk berhasil dicatat!', 'success');
    }
  });

  // Delete Transaction
  $('btn-delete-tx').addEventListener('click', () => {
    const id = $('form-id').value;
    state.transactions = state.transactions.filter((t) => t.id !== id);
    saveTransactions();
    closeModal('modal-receipt');
    renderAll();
    showToast('Catatan struk dihapus.', 'info');
  });

  // Save Settings
  $('btn-save-settings').addEventListener('click', () => {
    state.settings.geminiKey = $('setting-gemini-key').value.trim();
    state.settings.geminiModel = $('setting-gemini-model').value;
    state.settings.sheetUrl = $('setting-sheet-url').value.trim();
    state.settings.autoSync = $('setting-auto-sync').checked;
    state.settings.monthlyBudget = parseRupiahInput($('setting-budget').value);
    saveSettings();
    closeModal('modal-settings');
    renderAll();
    showToast('Pengaturan disimpan!', 'success');
  });

  // Test, Export & Import Google Sheet
  $('btn-test-sheet').addEventListener('click', async () => {
    const url = $('setting-sheet-url').value.trim();
    if (!url) {
      showToast('Masukkan URL Google Apps Script terlebih dahulu.', 'error');
      return;
    }
    state.settings.sheetUrl = url;
    try {
      await postToGoogleSheet({ action: 'ping' });
      showToast('Koneksi ke Google Sheet berhasil!', 'success');
    } catch (err) {
      showToast(`Gagal terhubung: ${err.message}`, 'error');
    }
  });
  $('btn-export-sheet').addEventListener('click', () => {
    state.settings.sheetUrl = $('setting-sheet-url').value.trim();
    saveSettings();
    syncAllPending();
  });
  $('btn-import-sheet').addEventListener('click', importFromGoogleSheet);

  // Copy GAS Code
  $('btn-copy-gas').addEventListener('click', async () => {
    await navigator.clipboard.writeText(GAS_CODE);
    showToast('Kode Apps Script berhasil disalin!', 'success');
  });

  // Clear Data
  $('btn-clear-data').addEventListener('click', () => {
    if (!confirm('Hapus semua riwayat struk dari perangkat ini?')) return;
    state.transactions = [];
    saveTransactions();
    closeModal('modal-settings');
    renderAll();
    showToast('Semua data lokal telah dihapus.', 'info');
  });
}

// Register PWA Service Worker
function registerSW() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => { });
  }
}

// Init
loadState();
bindEvents();
renderAll();
registerSW();
if (!isValidSheetUrl(state.settings.sheetUrl)) {
  openModal('modal-require-sheet');
}
