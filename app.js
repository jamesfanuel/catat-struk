/**
 * CatatStruk — Aplikasi Pencatat Keuangan Ringan
 * Foto Struk -> AI Gemini Extraction -> Google Sheets Pribadi
 */

const STORAGE_KEYS = {
  TXS: 'catatstruk_transactions_v1',
  SETTINGS: 'catatstruk_settings_v1',
  THEME: 'catatstruk_theme_v1',
  SHEET_SESSION: 'catatstruk_sheet_session_v1',
  AUTH: 'catatstruk_auth_v1',
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

const GAS_CODE = `function doGet(e) {
  try {
    var sheetUrl = e && e.parameter && e.parameter.sheetUrl ? String(e.parameter.sheetUrl) : '';
    var ss = sheetUrl ? SpreadsheetApp.openByUrl(sheetUrl) : SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('CatatStruk') || ss.getSheets()[0];
    if (!sheet || sheet.getLastRow() <= 1) {
      return jsonOut({ ok: true, rows: [] });
    }
    var values = sheet.getDataRange().getValues();
    var rows = [];
    var currentMeta = null;
    for (var i = 1; i < values.length; i++) {
      var r = values[i];
      var itemCell = String(r[4] || '').trim();
      if (!r[0] && itemCell.toUpperCase() === 'TOTAL') continue;
      if (!r[0] && !itemCell && !r[2]) continue;
      if (r[0]) {
        currentMeta = {
          id: String(r[0]),
          date: r[1] instanceof Date ? Utilities.formatDate(r[1], ss.getSpreadsheetTimeZone(), 'yyyy-MM-dd') : String(r[1] || '').slice(0, 10),
          merchant: String(r[2] || 'Struk'),
          category: String(r[3] || 'Lainnya'),
          paymentMethod: String(r[6] || 'QRIS'),
          notes: String(r[7] || '')
        };
      }
      if (!currentMeta) continue;
      rows.push({
        id: currentMeta.id,
        date: currentMeta.date,
        merchant: currentMeta.merchant,
        category: currentMeta.category,
        itemsText: itemCell,
        total: Math.max(0, Number(r[5]) || 0),
        paymentMethod: currentMeta.paymentMethod,
        notes: currentMeta.notes
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

    var ss = data.sheetUrl ? SpreadsheetApp.openByUrl(String(data.sheetUrl)) : SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('CatatStruk') || ss.getSheets()[0] || ss.insertSheet('CatatStruk');

    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        'ID', 'Tanggal', 'Toko', 'Kategori',
        'Item', 'Total (Rp)', 'Metode Bayar', 'Catatan', 'Synced At'
      ]);
      sheet.getRange(1, 1, 1, 9).setFontWeight('bold');
    } else {
      var lastRow = sheet.getLastRow();
      if (lastRow > 1) {
        var lastItemVal = String(sheet.getRange(lastRow, 5).getValue() || '').trim().toUpperCase();
        var lastIdVal = String(sheet.getRange(lastRow, 1).getValue() || '').trim();
        if (!lastIdVal && lastItemVal === 'TOTAL') sheet.deleteRow(lastRow);
      }
    }

    var rows = Array.isArray(data.rows) ? data.rows : [data];
    var groups = [];
    var groupMap = {};
    rows.forEach(function(r) {
      var key = String(r.id || ('row_' + groups.length));
      if (!groupMap[key]) {
        groupMap[key] = [];
        groups.push(groupMap[key]);
      }
      groupMap[key].push(r);
    });

    var mergeCols = [1, 2, 3, 4, 7, 8, 9];
    groups.forEach(function(grp) {
      var startRow = sheet.getLastRow() + 1;
      grp.forEach(function(r, idx) {
        var syncedText = r.syncedAt
          ? "'" + String(r.syncedAt)
          : "'" + Utilities.formatDate(new Date(), ss.getSpreadsheetTimeZone(), 'yyyy-MM-dd HH:mm:ss');
        sheet.appendRow([
          idx === 0 ? (r.id || '') : '',
          idx === 0 ? (r.date || '') : '',
          idx === 0 ? (r.merchant || '') : '',
          idx === 0 ? (r.category || '') : '',
          r.itemsText || '',
          Math.max(0, Number(r.total) || 0),
          idx === 0 ? (r.paymentMethod || '') : '',
          idx === 0 ? (r.notes || '') : '',
          idx === 0 ? syncedText : ''
        ]);
      });
      if (grp.length > 1) {
        mergeCols.forEach(function(col) {
          sheet.getRange(startRow, col, grp.length, 1).merge().setVerticalAlignment('middle');
        });
      }
    });

    var lastDataRow = sheet.getLastRow();
    if (lastDataRow >= 2) {
      var totalRow = lastDataRow + 1;
      sheet.appendRow(['', '', '', '', 'TOTAL', '=SUM(F2:F' + lastDataRow + ')', '', '', '']);
      sheet.getRange(totalRow, 1, 1, 9).setFontWeight('bold').setBackground('#e6f4f1');
      sheet.getRange(2, 6, totalRow - 1, 1).setNumberFormat('"Rp "#,##0');
    }

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
    geminiModel: 'gemini-flash-lite-latest',
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

function getLocalSyncedAt() {
  const d = new Date();
  const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
  return `${date} ${time}`;
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

// Persistence (Link Google Sheet disimpan di database user, bukan localStorage)
function loadSheetSession() {
  return String(state.auth?.user?.sheet_url || '').trim();
}

function saveSheetSession(url) {
  const clean = String(url || '').trim();
  state.settings.sheetUrl = clean;
  if (state.auth?.user) {
    state.auth.user.sheet_url = clean;
    saveAuthSession(state.auth);
  }
}

async function saveSheetUrlToDb(url) {
  const clean = String(url || '').trim();
  const res = await fetch('/api/auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'save_sheet',
      token: state.auth?.token,
      sheetUrl: clean,
    }),
  });
  const data = await res.json();
  if (!res.ok || !data.ok) {
    throw new Error(data.error || 'Gagal menyimpan link Google Sheet ke database.');
  }
  saveAuthSession({ user: data.user, token: state.auth.token });
  state.settings.sheetUrl = data.user.sheet_url || '';
}

function loadState() {
  try {
    localStorage.removeItem(STORAGE_KEYS.SHEET_SESSION);
    state.transactions = [];
    const rawSettings = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (rawSettings) state.settings = { ...state.settings, ...JSON.parse(rawSettings) };
    if (['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-2.5-flash-lite', 'gemini-3.5-flash-lite'].includes(state.settings.geminiModel)) {
      state.settings.geminiModel = 'gemini-flash-lite-latest';
    }
    const theme = localStorage.getItem(STORAGE_KEYS.THEME) || 'light';
    applyTheme(theme);
  } catch (e) {
    console.error('Failed to load state:', e);
  }
}

function saveTransactions() {
  // Data transaksi selalu disinkronkan langsung dengan Google Sheet (tanpa cache localStorage)
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
  const model = state.settings.geminiModel || 'gemini-flash-lite-latest';
  const base64Data = dataUrl.split(',')[1];

  const prompt = `Kamu adalah asisten pencatat keuangan Indonesia yang ahli membaca struk cetak maupun nota tulisan tangan. Baca gambar struk/nota pembayaran ini dan ekstrak datanya ke JSON valid dengan struktur persis berikut:
{
  "merchant": "nama toko/bengkel/merchant (lihat kop/stempel jika ada)",
  "date": "YYYY-MM-DD (konversi format DD-MM-YY atau DD/MM/YY jika ada; gunakan ${getTodayDate()} jika tidak terbaca)",
  "category": "salah satu dari: Makanan & Minuman, Belanja, Transportasi, Tagihan, Kesehatan, Hiburan, Lainnya",
  "total": 0,
  "paymentMethod": "salah satu dari: QRIS, Tunai, Debit, Kredit, E-Wallet, Transfer",
  "items": [
    { "name": "nama item", "qty": 1, "price": 0 }
  ],
  "notes": "ringkasan singkat 2-4 kata"
}
Aturan penting:
- Jika harga tertulis memakai 'K' atau 'rb' (misal 350K, 80K, 980K), konversi menjadi angka penuh Rupiah (350000, 80000, 980000).
- Pastikan total dan price berupa angka bulat Rupiah >= 0 tanpa titik/koma.`;

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

function syncScrollLock() {
  const overlayOpen = !$('scan-overlay').classList.contains('hidden');
  const modalOpen = Array.from(document.querySelectorAll('.modal')).some((m) => !m.classList.contains('hidden'));
  document.body.classList.toggle('scroll-locked', overlayOpen || modalOpen);
}

let slowLoaderTimer = null;

function showLoader({ mode = 'scan', thumb = '', title = '', desc = '' }) {
  const overlay = $('scan-overlay');
  const scannerBox = $('scanner-box');
  const syncBox = $('sync-anim-box');
  const slowNotice = $('loader-slow-notice');
  if (mode === 'sync') {
    scannerBox.classList.add('hidden');
    syncBox.classList.remove('hidden');
  } else {
    syncBox.classList.add('hidden');
    scannerBox.classList.remove('hidden');
    if (thumb) $('scan-preview-img').src = thumb;
  }
  $('scan-status-title').textContent = title;
  $('scan-status-desc').textContent = desc;
  if (slowNotice) slowNotice.classList.add('hidden');
  if (slowLoaderTimer) clearTimeout(slowLoaderTimer);
  slowLoaderTimer = setTimeout(() => {
    if (!overlay.classList.contains('hidden') && slowNotice) {
      slowNotice.classList.remove('hidden');
    }
  }, 30000);

  overlay.classList.remove('hidden');
  syncScrollLock();
}

function hideLoader() {
  if (slowLoaderTimer) {
    clearTimeout(slowLoaderTimer);
    slowLoaderTimer = null;
  }
  const slowNotice = $('loader-slow-notice');
  if (slowNotice) slowNotice.classList.add('hidden');
  $('scan-overlay').classList.add('hidden');
  syncScrollLock();
}

function parseLocalReceiptText(rawText) {
  const lines = String(rawText || '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const merchant = lines[0] ? lines[0].slice(0, 48) : 'Struk Belanja';

  // Cari tanggal (DD/MM/YYYY, DD-MM-YYYY, atau YYYY-MM-DD)
  let date = getTodayDate();
  for (const line of lines) {
    const iso = line.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
    if (iso) {
      date = `${iso[1]}-${iso[2].padStart(2, '0')}-${iso[3].padStart(2, '0')}`;
      break;
    }
    const dmy = line.match(/(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})/);
    if (dmy) {
      const y = dmy[3].length === 2 ? `20${dmy[3]}` : dmy[3];
      date = `${y}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;
      break;
    }
  }

  // Deteksi metode bayar & kategori
  const fullUpper = lines.join(' ').toUpperCase();
  let paymentMethod = 'QRIS';
  if (fullUpper.includes('TUNAI') || fullUpper.includes('CASH')) paymentMethod = 'Tunai';
  else if (fullUpper.includes('DEBIT')) paymentMethod = 'Debit';
  else if (fullUpper.includes('KREDIT') || fullUpper.includes('CREDIT')) paymentMethod = 'Kredit';
  else if (fullUpper.includes('GOPAY') || fullUpper.includes('OVO') || fullUpper.includes('DANA') || fullUpper.includes('SHOPEEPAY')) paymentMethod = 'E-Wallet';

  let category = 'Belanja';
  if (/KOPI|CAFE|RESTO|WARUNG|MAKAN|BAKERY|MINUM|MIE|NASI/.test(fullUpper)) category = 'Makanan & Minuman';
  else if (/APOTEK|FARMA|KLINIK|OBAT/.test(fullUpper)) category = 'Kesehatan';
  else if (/BENGKEL|PERTAMINA|SPBU|GRAB|GOJEK|PARKIR|TOL/.test(fullUpper)) category = 'Transportasi';
  else if (/PLN|PDAM|LISTRIK|INTERNET|PULSA/.test(fullUpper)) category = 'Tagihan';

  // Ekstrak item & total dari angka di akhir baris
  const parseAmount = (str) => {
    const clean = str.replace(/\s+/g, '');
    const kMatch = clean.match(/^(\d+)(?:[.,](\d+))?[kK]$/);
    if (kMatch) return Math.round(Number(`${kMatch[1]}.${kMatch[2] || 0}`) * 1000);
    const digits = clean.replace(/[^\d]/g, '');
    return digits ? Math.max(0, parseInt(digits, 10) || 0) : 0;
  };

  let total = 0;
  const items = [];
  for (const line of lines.slice(1)) {
    const upper = line.toUpperCase();
    const amtMatch = line.match(/(?:RP\.?\s*)?(\d[\d.,]*[kK]?)\s*$/);
    if (!amtMatch) continue;
    const val = parseAmount(amtMatch[1]);
    if (val <= 0) continue;

    if (/(GRAND\s*TOTAL|TOTAL\s*BAYAR|TOTAL\s*BELANJA|\bTOTAL\b|JUMLAH\s*RP)/.test(upper)) {
      if (val > total) total = val;
      continue;
    }
    if (/(TUNAI|KEMBALI|CHANGE|SUBTOTAL|PPN|PAJAK|DISKON)/.test(upper)) continue;

    const itemName = line.slice(0, amtMatch.index).replace(/[-:]+$/, '').trim();
    if (itemName.length >= 2) {
      items.push({ name: itemName.slice(0, 48), qty: 1, price: val });
    }
  }

  if (total === 0 && items.length > 0) {
    total = items.reduce((s, i) => s + i.price, 0);
  }

  return {
    merchant,
    date,
    category,
    total,
    paymentMethod,
    items,
    notes: 'Hasil OCR Lokal (Tanpa API)',
  };
}

let tesseractLoaderPromise = null;
function loadTesseract() {
  if (window.Tesseract) return Promise.resolve(window.Tesseract);
  if (!tesseractLoaderPromise) {
    tesseractLoaderPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
      s.onload = () => resolve(window.Tesseract);
      s.onerror = () => reject(new Error('Gagal memuat mesin OCR lokal.'));
      document.head.appendChild(s);
    });
  }
  return tesseractLoaderPromise;
}

async function extractReceiptLocally(dataUrl) {
  const Tesseract = await loadTesseract();
  const result = await Tesseract.recognize(dataUrl, 'ind+eng');
  const text = result?.data?.text || '';
  return parseLocalReceiptText(text);
}

// Handle Image Upload / Camera
async function handleReceiptImage(file) {
  if (!file) return;
  try {
    const compressedForAI = await compressImage(file, 1024, 0.8);
    const thumb = await compressImage(compressedForAI, 340, 0.62);
    state.pendingThumb = thumb;

    showLoader({
      mode: 'scan',
      thumb,
      title: 'Membaca Struk...',
      desc: 'Mengekstrak nama toko, item belanja, dan total.',
    });

    let extracted = null;
    if (state.settings.geminiKey.trim()) {
      try {
        extracted = await extractReceiptWithGemini(compressedForAI);
        showToast('Struk berhasil dibaca AI!', 'success');
      } catch {
        extracted = null;
      }
    } else {
      const base64Data = compressedForAI.split(',')[1];
      const serverRes = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: base64Data,
          model: state.settings.geminiModel || 'gemini-flash-lite-latest',
          today: getTodayDate(),
        }),
      }).catch(() => null);

      const serverJson = serverRes ? await serverRes.json().catch(() => null) : null;
      if (serverRes && serverRes.ok && serverJson?.ok && serverJson.data) {
        extracted = serverJson.data;
        showToast('Struk berhasil dibaca AI!', 'success');
      }
    }

    // Fallback ke OCR Lokal di Browser (100% Tanpa API Key / saat API limit)
    if (!extracted) {
      $('scan-status-title').textContent = 'Membaca Struk dengan OCR Lokal...';
      $('scan-status-desc').textContent = 'Berjalan langsung di browser tanpa API Key.';
      try {
        extracted = await extractReceiptLocally(compressedForAI);
        showToast('Struk dibaca dengan OCR Lokal! Silakan cek kembali.', 'info');
      } catch {
        extracted = {
          merchant: '',
          date: getTodayDate(),
          category: 'Belanja',
          total: '',
          paymentMethod: 'QRIS',
          items: [],
          notes: '',
        };
        showToast('Lengkapi detail struk secara manual.', 'info');
      }
    }

    hideLoader();
    openReceiptModal({ ...extracted, thumb });
  } catch (err) {
    hideLoader();
    console.error(err);
    showToast(err.message || 'Gagal memproses gambar struk.', 'error');
  }
}

// Demo Scan Flow
async function runDemoScan() {
  const demo = DEMO_RECEIPTS[Math.floor(Math.random() * DEMO_RECEIPTS.length)];
  const demoDataUrl = createDemoReceiptImage(demo);
  const thumb = await compressImage(demoDataUrl, 340, 0.65);

  showLoader({
    mode: 'scan',
    thumb,
    title: 'Simulasi Scan Struk AI...',
    desc: `Membaca struk ${demo.merchant}...`,
  });

  await new Promise((r) => setTimeout(r, 1100));
  hideLoader();

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
  syncScrollLock();
}

function closeModal(id) {
  $(id).classList.add('hidden');
  syncScrollLock();
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
  if (!state.auth?.user) {
    openModal('modal-login');
    return false;
  }
  if (!isPremiumUser()) {
    showToast('Fitur Foto Struk & Sync Google Sheet khusus akun Premium. Akun Anda saat ini User Reguler (Mode Demo).', 'info');
    return false;
  }
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

function expandTransactionToSheetRows(tx) {
  const syncedAt = getLocalSyncedAt();
  const items = Array.isArray(tx.items)
    ? tx.items.filter((i) => (i.name || '').trim() !== '' || (Number(i.price) || 0) > 0)
    : [];

  if (items.length === 0) {
    return [
      {
        id: tx.id,
        date: tx.date,
        merchant: tx.merchant,
        category: tx.category,
        itemsText: tx.notes || tx.merchant,
        total: Math.max(0, Number(tx.total) || 0),
        paymentMethod: tx.paymentMethod,
        notes: tx.notes || '',
        syncedAt,
      },
    ];
  }

  const itemsSum = items.reduce((s, i) => s + Math.max(0, Number(i.price) || 0), 0);
  const txTotal = Math.max(0, Number(tx.total) || 0);

  const rows = items.map((item, idx) => {
    const qty = Math.max(1, Number(item.qty) || 1);
    const price = Math.max(0, Number(item.price) || 0);
    const rowTotal = itemsSum > 0 ? price : (idx === 0 ? txTotal : 0);
    return {
      id: tx.id,
      date: tx.date,
      merchant: tx.merchant,
      category: tx.category,
      itemsText: `${item.name || 'Item'} (x${qty})`,
      total: rowTotal,
      paymentMethod: tx.paymentMethod,
      notes: tx.notes || '',
      syncedAt,
    };
  });

  if (itemsSum > 0 && txTotal > itemsSum) {
    rows.push({
      id: tx.id,
      date: tx.date,
      merchant: tx.merchant,
      category: tx.category,
      itemsText: 'Biaya Lain / Pajak',
      total: txTotal - itemsSum,
      paymentMethod: tx.paymentMethod,
      notes: tx.notes || '',
      syncedAt,
    });
  }

  return rows;
}

async function syncSingleTransaction(tx) {
  if (!state.settings.sheetUrl.trim()) return false;
  try {
    await postToGoogleSheet({
      action: 'append',
      rows: expandTransactionToSheetRows(tx),
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

  showLoader({
    mode: 'sync',
    title: 'Mengexport ke Google Sheet...',
    desc: `Mengirim ${pending.length} struk ke Google Sheet Anda.`,
  });
  try {
    await postToGoogleSheet({
      action: 'append',
      rows: pending.flatMap((tx) => expandTransactionToSheetRows(tx)),
    });
    pending.forEach((tx) => { tx.synced = true; });
    saveTransactions();
    renderAll();
    showToast(`${pending.length} struk berhasil diexport ke Google Sheet!`, 'success');
  } catch (err) {
    showToast(`Gagal export: ${err.message}`, 'error');
  } finally {
    hideLoader();
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

async function loadTransactionsFromDb() {
  if (!state.auth?.token) return [];
  const res = await fetch('/api/transactions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'list', token: state.auth.token }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok) return [];
  return Array.isArray(data.transactions) ? data.transactions : [];
}

async function syncTransactionsToDb(txList) {
  if (!state.auth?.token || !Array.isArray(txList) || txList.length === 0) {
    return { inserted: 0, transactions: state.transactions };
  }
  const res = await fetch('/api/transactions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'sync_from_sheet',
      token: state.auth.token,
      transactions: txList.map((t) => ({ ...t, thumb: '' })),
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok) return { inserted: 0, transactions: state.transactions };
  return data;
}

async function deleteTransactionFromDb(txId) {
  if (!state.auth?.token || !txId) return;
  await fetch('/api/transactions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'delete', token: state.auth.token, txId }),
  }).catch(() => {});
}

async function importFromGoogleSheet({ targetUrl = '', silentIfEmpty = false, validateBeforeSave = false } = {}) {
  const url = (targetUrl || $('setting-sheet-url')?.value || state.settings.sheetUrl || '').trim();
  if (!isValidSheetUrl(url)) {
    showToast('Masukkan link Google Sheet publik yang valid terlebih dahulu.', 'error');
    return false;
  }
  if (!validateBeforeSave) {
    state.settings.sheetUrl = url;
    saveSettings();
  }

  showLoader({
    mode: 'sync',
    title: validateBeforeSave ? 'Memeriksa Format Google Sheet...' : 'Menarik Data dari Google Sheet...',
    desc: validateBeforeSave
      ? 'Memastikan Google Sheet masih kosong atau sesuai format header.'
      : 'Memeriksa & mengambil riwayat data dari Google Sheet Anda.',
  });
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

    if (validateBeforeSave) {
      await saveSheetUrlToDb(url);
      state.settings.autoSync = true;
      saveSettings();
    }

    const incoming = Array.isArray(data.rows) ? data.rows : [];
    const grouped = new Map();

    incoming.forEach((r) => {
      const id = String(r.id || '').trim() || `gs_${r.date}_${r.merchant}_${r.total}`;
      const rowPrice = Math.max(0, Math.round(Number(r.total) || 0));
      const itemLabel = String(r.itemsText || '').trim();
      const parsedItems = itemLabel.includes(';')
        ? parseItemsTextToArray(itemLabel)
        : (() => {
            const m = itemLabel.match(/^(.*?)\s*\(x(\d+)\)$/i);
            if (m) return [{ name: m[1].trim(), qty: Math.max(1, Number(m[2]) || 1), price: rowPrice }];
            return itemLabel ? [{ name: itemLabel, qty: 1, price: rowPrice }] : [];
          })();

      if (!grouped.has(id)) {
        grouped.set(id, {
          id,
          date: /^\d{4}-\d{2}-\d{2}$/.test(r.date) ? r.date : getTodayDate(),
          merchant: String(r.merchant || 'Struk'),
          category: CATEGORIES[r.category] ? r.category : 'Lainnya',
          items: [...parsedItems],
          total: rowPrice,
          paymentMethod: r.paymentMethod || 'QRIS',
          notes: r.notes || '',
          thumb: '',
          synced: true,
          createdAt: Date.now(),
        });
      } else {
        const entry = grouped.get(id);
        entry.items.push(...parsedItems);
        entry.total += rowPrice;
      }
    });

    // Mirroring 1:1 dengan isi Google Sheet + simpan ID yang belum ada ke tabel transactions DB
    const existingThumbs = new Map(state.transactions.map((t) => [t.id, t.thumb || '']));
    const unsyncedLocal = state.transactions.filter((t) => !t.synced && !grouped.has(t.id));
    const mirroredFromSheet = Array.from(grouped.values()).map((tx) => ({
      ...tx,
      thumb: existingThumbs.get(tx.id) || '',
    }));

    let dbInserted = 0;
    if (mirroredFromSheet.length > 0 && state.auth?.token) {
      const dbRes = await syncTransactionsToDb(mirroredFromSheet);
      dbInserted = dbRes.inserted || 0;
    }

    state.transactions = [...unsyncedLocal, ...mirroredFromSheet];
    const added = mirroredFromSheet.length;

    saveTransactions();
    renderAll();
    if (added > 0) {
      showToast(
        dbInserted > 0
          ? `Sync berhasil: ${added} struk (${dbInserted} baru disimpan ke database)!`
          : `Sync berhasil: ${added} struk (data sudah sinkron dengan database).`,
        'success'
      );
    } else if (silentIfEmpty) {
      showToast('Google Sheet terhubung! Siap foto struk.', 'success');
    } else {
      showToast('Google Sheet masih kosong.', 'info');
    }
    return true;
  } catch (err) {
    if (validateBeforeSave) {
      return err.message || 'Gagal memeriksa Google Sheet.';
    }
    showToast(`Gagal import: ${err.message}`, 'error');
    return false;
  } finally {
    hideLoader();
  }
}

function getPremiumInfo(user = state.auth?.user) {
  if (!user) {
    return { isPremium: false, isLifetime: false, isExpired: false, isExpiringSoon: false, daysRemaining: 0, until: null };
  }
  const until = user.is_premium_until ? String(user.is_premium_until).slice(0, 10) : null;
  if (!until) {
    return { isPremium: false, isLifetime: false, isExpired: false, isExpiringSoon: false, daysRemaining: 0, until: null };
  }
  if (until === '9999-01-01') {
    return { isPremium: true, isLifetime: true, isExpired: false, isExpiringSoon: false, daysRemaining: null, until };
  }
  const today = getTodayDate();
  const diffDays = Math.floor((Date.parse(`${until}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86400000);
  if (diffDays < 0) {
    return { isPremium: false, isLifetime: false, isExpired: true, isExpiringSoon: false, daysRemaining: 0, until };
  }
  return {
    isPremium: true,
    isLifetime: false,
    isExpired: false,
    isExpiringSoon: diffDays <= 7,
    daysRemaining: diffDays,
    until,
  };
}

function isPremiumUser() {
  return getPremiumInfo().isPremium;
}

function loadAuthSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.AUTH);
    if (!raw) return { user: null, token: '' };
    const parsed = JSON.parse(raw);
    return parsed?.token && parsed?.user ? parsed : { user: null, token: '' };
  } catch {
    return { user: null, token: '' };
  }
}

function saveAuthSession(authData) {
  state.auth = authData;
  if (authData?.token && authData?.user) {
    localStorage.setItem(STORAGE_KEYS.AUTH, JSON.stringify(authData));
  } else {
    localStorage.removeItem(STORAGE_KEYS.AUTH);
  }
}

function logoutUser() {
  saveAuthSession({ user: null, token: '' });
  saveSheetSession('');
  state.transactions = [];
  closeModal('modal-account');
  closeModal('modal-require-sheet');
  renderAll();
  $('login-error').classList.add('hidden');
  $('login-password').value = '';
  openModal('modal-login');
  showToast('Anda telah logout.', 'info');
}

// Rendering
function renderStatusPills() {
  const user = state.auth?.user;
  const premium = isPremiumUser();
  const hasSheet = premium && isValidSheetUrl(state.settings.sheetUrl);

  if (!user) {
    $('pill-sheet').classList.remove('connected');
    $('pill-sheet-text').textContent = 'Belum Login';
  } else if (!premium) {
    $('pill-sheet').classList.remove('connected');
    $('pill-sheet-text').textContent = `${user.username} (Reguler)`;
  } else {
    $('pill-sheet').classList.toggle('connected', hasSheet);
    $('pill-sheet-text').textContent = hasSheet
      ? 'Google Sheet: Aktif'
      : 'Google Sheet: Belum Terhubung';
  }

  renderPremiumBanner();

  const canOpenDirect = hasSheet && isGoogleSpreadsheetUrl(state.settings.sheetUrl);
  const openBtn = $('btn-open-sheet');
  const openSettingsBtn = $('btn-open-sheet-settings');
  if (openBtn) {
    openBtn.classList.toggle('hidden', !canOpenDirect);
    if (canOpenDirect) openBtn.href = state.settings.sheetUrl.trim();
  }
  if (openSettingsBtn) {
    openSettingsBtn.classList.toggle('hidden', !canOpenDirect);
    if (canOpenDirect) openSettingsBtn.href = state.settings.sheetUrl.trim();
  }
}

function renderPremiumBanner() {
  const banner = $('premium-warning-banner');
  const textEl = $('premium-warning-text');
  if (!banner || !textEl) return;

  const user = state.auth?.user;
  if (!user) {
    banner.classList.add('hidden');
    return;
  }

  const info = getPremiumInfo(user);
  banner.classList.remove('expired');
  if (info.isExpiringSoon) {
    const dayText = info.daysRemaining === 0 ? 'hari ini' : `${info.daysRemaining} hari lagi`;
    textEl.textContent = `⚠️ Masa Premium Anda berakhir ${dayText} (${formatDateID(info.until)}). Segera perpanjang agar sinkronisasi Google Sheet tetap aktif.`;
    banner.classList.remove('hidden');
  } else if (info.isExpired) {
    textEl.textContent = `Masa Premium Anda telah berakhir pada ${formatDateID(info.until)}. Akun kini berstatus Reguler (Mode Demo).`;
    banner.classList.add('expired');
    banner.classList.remove('hidden');
  } else {
    banner.classList.add('hidden');
  }
}

let hasUserSelectedMonth = false;

function populateMonthFilter() {
  const select = $('month-filter');
  const months = new Set([getCurrentMonth()]);
  const monthsWithData = new Set();
  state.transactions.forEach((t) => {
    if (t.date && t.date.length >= 7) {
      const ym = t.date.slice(0, 7);
      months.add(ym);
      monthsWithData.add(ym);
    }
  });
  const sorted = Array.from(months).sort().reverse();
  select.innerHTML = sorted
    .map((m) => `<option value="${m}">${formatMonthLabel(m)}</option>`)
    .join('');

  // Default ke bulan paling lama yang memiliki data (kecuali user sudah memilih bulan manual)
  if (!hasUserSelectedMonth && monthsWithData.size > 0) {
    state.selectedMonth = Array.from(monthsWithData).sort()[0];
  } else if (!monthsWithData.has(state.selectedMonth) && monthsWithData.size > 0) {
    state.selectedMonth = Array.from(monthsWithData).sort()[0];
  } else if (!sorted.includes(state.selectedMonth)) {
    state.selectedMonth = sorted[0];
  }
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
  if (badge) {
    badge.textContent = String(pendingTotal);
    badge.classList.toggle('hidden', pendingTotal === 0);
  }
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

  $('nav-sync').addEventListener('click', () => {
    if (requireSheetConfigured()) importFromGoogleSheet({ silentIfEmpty: false });
  });
  $('nav-camera').addEventListener('click', () => {
    if (requireSheetConfigured()) $('input-camera').click();
  });
  $('nav-account').addEventListener('click', () => {
    const u = state.auth?.user;
    if (!u) {
      openModal('modal-login');
      return;
    }
    const info = getPremiumInfo(u);
    $('account-username').textContent = u.username;
    $('account-email').textContent = u.email || 'Email belum diisi';
    $('account-avatar').textContent = (u.username || 'U').slice(0, 1).toUpperCase();

    const tierEl = $('account-tier');
    const expiryEl = $('account-expiry-note');
    tierEl.classList.remove('warn', 'regular');
    if (info.isLifetime) {
      tierEl.textContent = 'Premium Selamanya';
      expiryEl.textContent = 'Aktif selamanya • Sync Google Sheet aktif';
    } else if (info.isPremium) {
      tierEl.textContent = info.isExpiringSoon
        ? `Premium • Sisa ${info.daysRemaining} hari`
        : 'Premium • Aktif';
      if (info.isExpiringSoon) tierEl.classList.add('warn');
      expiryEl.textContent = `Berakhir pada ${formatDateID(info.until)}`;
    } else {
      tierEl.textContent = 'User Reguler (Mode Demo)';
      tierEl.classList.add('regular');
      expiryEl.textContent = info.isExpired
        ? `Premium telah berakhir pada ${formatDateID(info.until)}`
        : 'Belum berlangganan Premium';
    }
    $('account-sheet-wrap').classList.toggle('hidden', !isPremiumUser());
    $('btn-save-account-sheet').classList.toggle('hidden', !isPremiumUser());
    $('account-sheet-url').value = state.settings.sheetUrl || '';
    $('account-sheet-error').classList.add('hidden');
    openModal('modal-account');
  });
  $('btn-logout').addEventListener('click', logoutUser);

  $('account-sheet-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errEl = $('account-sheet-error');
    errEl.classList.add('hidden');
    const url = $('account-sheet-url').value.trim();

    if (!isValidSheetUrl(url)) {
      errEl.textContent = 'Gunakan link Google Sheet https://docs.google.com/spreadsheets/d/...';
      errEl.classList.remove('hidden');
      return;
    }

    const res = await importFromGoogleSheet({
      targetUrl: url,
      silentIfEmpty: true,
      validateBeforeSave: true,
    });

    if (res !== true) {
      errEl.textContent = typeof res === 'string'
        ? res
        : 'Format Google Sheet tidak sesuai.';
      errEl.classList.remove('hidden');
      return;
    }

    closeModal('modal-account');
    renderAll();
  });

  let authMode = 'login'; // 'login' | 'register'
  const setAuthMode = (mode) => {
    authMode = mode;
    const isReg = mode === 'register';
    $('auth-modal-header').classList.toggle('is-register', isReg);
    $('auth-mode-badge').textContent = isReg ? 'REGISTRASI AKUN BARU' : 'LOGIN';
    $('modal-login-title').textContent = isReg ? 'Daftar Akun CatatStruk' : 'Masuk ke CatatStruk';
    $('login-subtitle').textContent = isReg
      ? 'Isi data di bawah untuk membuat akun baru dan mulai sinkron ke Google Sheet.'
      : 'Masuk dengan akun Anda untuk melihat dan mencatat struk belanja.';
    $('register-email-wrap').classList.toggle('hidden', !isReg);
    $('register-confirm-wrap').classList.toggle('hidden', !isReg);
    $('register-sheet-wrap').classList.toggle('hidden', !isReg);
    $('login-email').required = isReg;
    $('login-confirm-password').required = isReg;
    $('btn-login-submit').textContent = isReg ? 'Daftar & Masuk' : 'Masuk';
    $('btn-toggle-auth-mode').textContent = isReg
      ? 'Sudah punya akun? Kembali ke Masuk'
      : 'Belum punya akun? Daftar Akun';
  };

  $('btn-toggle-auth-mode').addEventListener('click', () => {
    $('login-error').classList.add('hidden');
    setAuthMode(authMode === 'login' ? 'register' : 'login');
  });

  $('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errEl = $('login-error');
    const btn = $('btn-login-submit');
    errEl.classList.add('hidden');

    if (authMode === 'register') {
      const pass = $('login-password').value;
      const confirmPass = $('login-confirm-password').value;
      if (pass !== confirmPass) {
        errEl.textContent = 'Konfirmasi password tidak cocok.';
        errEl.classList.remove('hidden');
        return;
      }
    }

    btn.disabled = true;

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: authMode,
          username: $('login-username').value.trim(),
          email: authMode === 'register' ? ($('login-email')?.value || '').trim() : '',
          password: $('login-password').value,
          sheetUrl: authMode === 'register' ? ($('login-sheet-url')?.value || '').trim() : '',
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        if (authMode === 'login' && data.notRegistered) {
          setAuthMode('register');
        }
        errEl.textContent = data.error || 'Login gagal.';
        errEl.classList.remove('hidden');
        return;
      }

      saveAuthSession({ user: data.user, token: data.token });
      const loginSheetUrl = ($('login-sheet-url')?.value || '').trim();
      if (loginSheetUrl) {
        if (!isValidSheetUrl(loginSheetUrl)) {
          errEl.textContent = 'Format link Google Sheet tidak valid. Gunakan https://docs.google.com/spreadsheets/d/...';
          errEl.classList.remove('hidden');
          saveAuthSession({ user: null, token: '' });
          return;
        }
        const checkRes = await importFromGoogleSheet({
          targetUrl: loginSheetUrl,
          silentIfEmpty: true,
          validateBeforeSave: true,
        });
        if (checkRes !== true) {
          errEl.textContent = typeof checkRes === 'string'
            ? checkRes
            : 'Format Google Sheet tidak sesuai.';
          errEl.classList.remove('hidden');
          saveAuthSession({ user: null, token: '' });
          return;
        }
      } else {
        state.settings.sheetUrl = data.user.sheet_url || '';
      }

      closeModal('modal-login');
      renderAll();

      if (isPremiumUser()) {
        if (!loginSheetUrl && isValidSheetUrl(state.settings.sheetUrl)) {
          const dbList = await loadTransactionsFromDb();
          if (dbList.length > 0) {
            state.transactions = dbList;
            renderAll();
          } else {
            await importFromGoogleSheet({ silentIfEmpty: true });
          }
        } else if (!loginSheetUrl) {
          $('req-sheet-error').classList.add('hidden');
          $('req-sheet-url').value = '';
          openModal('modal-require-sheet');
        }
      } else {
        const info = getPremiumInfo(data.user);
        showToast(
          info.isExpired
            ? `Masa Premium berakhir pada ${formatDateID(info.until)}. Anda sekarang User Reguler (Mode Demo).`
            : `Login sebagai ${data.user.username} (User Reguler - Mode Demo).`,
          'info'
        );
      }
      if (isPremiumUser()) {
        const info = getPremiumInfo(data.user);
        if (info.isExpiringSoon) {
          showToast(`Masa Premium Anda tersisa ${info.daysRemaining} hari lagi!`, 'info');
        }
      }
    } catch (err) {
      errEl.textContent = err.message || 'Gagal terhubung ke server.';
      errEl.classList.remove('hidden');
    } finally {
      btn.disabled = false;
    }
  });

  $('pill-sheet').addEventListener('click', () => {
    if (!state.auth?.user) {
      openModal('modal-login');
      return;
    }
    if (!isPremiumUser()) {
      showToast('Sync Google Sheet khusus akun Premium (is_premium = Y). Anda di Mode Demo.', 'info');
      return;
    }
    $('req-sheet-error').classList.add('hidden');
    $('req-sheet-url').value = state.settings.sheetUrl || '';
    openModal('modal-require-sheet');
  });
  $('btn-sync-all')?.addEventListener('click', () => {
    if (!state.auth?.user) {
      openModal('modal-login');
      return;
    }
    if (!isPremiumUser()) {
      showToast('Sync Google Sheet khusus akun Premium (is_premium = Y).', 'info');
      return;
    }
    syncAllPending();
  });

  // Mandatory Google Sheet Setup Form (Validasi kosong atau header sesuai format)
  $('require-sheet-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errEl = $('req-sheet-error');
    errEl.classList.add('hidden');

    const url = $('req-sheet-url').value.trim();
    if (!isValidSheetUrl(url)) {
      errEl.textContent = 'Gunakan link Google Sheet https://docs.google.com/spreadsheets/d/...';
      errEl.classList.remove('hidden');
      return;
    }

    const res = await importFromGoogleSheet({
      targetUrl: url,
      silentIfEmpty: true,
      validateBeforeSave: true,
    });

    if (res !== true) {
      errEl.textContent = typeof res === 'string'
        ? res
        : 'Format Google Sheet tidak sesuai. Gunakan Google Sheet kosong atau header sesuai format.';
      errEl.classList.remove('hidden');
      return;
    }

    closeModal('modal-require-sheet');
    renderAll();
  });

  // Cek otomatis jika sesi 24 jam habis saat kembali ke tab (khusus akun Premium)
  const checkSessionOnReturn = () => {
    if (!state.auth?.user || !isPremiumUser()) return;
    const activeUrl = loadSheetSession();
    if (!isValidSheetUrl(activeUrl)) {
      state.settings.sheetUrl = '';
      renderStatusPills();
      if ($('modal-require-sheet').classList.contains('hidden')) {
        $('req-sheet-error').classList.add('hidden');
        $('req-sheet-url').value = '';
        openModal('modal-require-sheet');
      }
    }
  };
  window.addEventListener('focus', checkSessionOnReturn);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') checkSessionOnReturn();
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
    if (!state.auth?.user) {
      openModal('modal-login');
      return;
    }
    runDemoScan();
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
    hasUserSelectedMonth = true;
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
  let isSavingReceipt = false;
  $('receipt-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (isSavingReceipt) return;
    isSavingReceipt = true;
    const submitBtn = e.target.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.disabled = true;

    try {
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

      if (isPremiumUser() && state.settings.autoSync && state.settings.sheetUrl.trim()) {
        showLoader({
          mode: 'sync',
          title: 'Menyimpan ke Google Sheet...',
          desc: `Mengirim struk ${tx.merchant} ke Google Sheet Anda.`,
        });
        const ok = await syncSingleTransaction(tx);
        await syncTransactionsToDb([tx]);
        hideLoader();
        renderAll();
        showToast(ok ? 'Tersimpan di Google Sheet & Database!' : 'Tersimpan di database (sinkron Sheet tertunda).', ok ? 'success' : 'info');
      } else {
        await syncTransactionsToDb([tx]);
        showToast(isPremiumUser() ? 'Struk berhasil dicatat!' : 'Struk demo tercatat di aplikasi!', 'success');
      }
    } finally {
      isSavingReceipt = false;
      if (submitBtn) submitBtn.disabled = false;
    }
  });

  // Delete Transaction
  $('btn-delete-tx').addEventListener('click', async () => {
    const id = $('form-id').value;
    state.transactions = state.transactions.filter((t) => t.id !== id);
    saveTransactions();
    closeModal('modal-receipt');
    renderAll();
    await deleteTransactionFromDb(id);
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
async function initApp() {
  loadState();
  state.auth = loadAuthSession();
  bindEvents();
  renderAll();
  registerSW();

  if (!state.auth.token) {
    openModal('modal-login');
    return;
  }

  try {
    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'verify', token: state.auth.token }),
    });
    const data = await res.json();
    if (!res.ok || !data.ok) {
      saveAuthSession({ user: null, token: '' });
      renderAll();
      openModal('modal-login');
      return;
    }
    state.auth.user = data.user;
    state.settings.sheetUrl = data.user.sheet_url || '';
    renderAll();
  } catch {
    openModal('modal-login');
    return;
  }

  if (isPremiumUser()) {
    if (isValidSheetUrl(state.settings.sheetUrl)) {
      const dbList = await loadTransactionsFromDb();
      if (dbList.length > 0) {
        state.transactions = dbList;
        renderAll();
      } else {
        importFromGoogleSheet({ silentIfEmpty: true });
      }
    } else {
      openModal('modal-require-sheet');
    }
  }
}

initApp();
