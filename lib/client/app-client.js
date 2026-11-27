/**
 * CatatStruk — Aplikasi Pencatat Keuangan Ringan
 * Foto Struk -> AI Gemini Extraction -> Google Sheets Pribadi
 */

import { enhanceAllSelects, syncSelectUI } from './select-ui.js';

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
  selectedPeriod: getCurrentMonth(),
    selectedMonth: getCurrentMonth(),
  categoryFilter: 'all',
  searchQuery: '',
  pendingThumb: '',
  activeTab: 'expense',
  knownUsers: [],
  friends: [],
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

function getAuthHeaders(extra = {}) {
  const headers = { 'Content-Type': 'application/json', ...extra };
  if (state.auth?.token) {
    headers.Authorization = `Bearer ${state.auth.token}`;
  }
  return headers;
}

async function saveSheetUrlToDb(url) {
  const clean = String(url || '').trim();
  const res = await fetch('/api/auth/save-sheet', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ sheetUrl: clean }),
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
  "tax": 0,
  "service": 0,
  "taxPct": 0,
  "servicePct": 0,
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
    tax: Math.max(0, Math.round(Number(parsed.tax) || 0)),
    service: Math.max(0, Math.round(Number(parsed.service) || 0)),
    taxPct: Math.max(0, Number(parsed.taxPct) || 0),
    servicePct: Math.max(0, Number(parsed.servicePct) || 0),
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
        headers: getAuthHeaders(),
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

function createItemRowElement(item = { name: '', qty: 1, price: 0, owner: '' }) {
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

  const ownerPicker = document.createElement('div');
  ownerPicker.className = 'owner-picker';

  const ownerWrap = document.createElement('div');
  ownerWrap.className = 'owner-picker-input-wrap';

  const ownerInput = document.createElement('input');
  ownerInput.type = 'text';
  ownerInput.className = 'item-owner';
  ownerInput.placeholder = 'Pemilik (misal: Saya, budi)';
  ownerInput.title = 'Pilih dari friendlist atau ketik nama (pisah koma)';
  ownerInput.value = item.owner || item.ownerUsername || item.ownerName || '';

  const dropBtn = document.createElement('button');
  dropBtn.type = 'button';
  dropBtn.className = 'owner-dropdown-btn';
  dropBtn.title = 'Pilih dari Friendlist';
  dropBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>`;

  ownerWrap.append(ownerInput, dropBtn);

  const ownerMenu = document.createElement('div');
  ownerMenu.className = 'owner-dropdown-menu hidden';

  const renderOwnerDropdown = () => {
    const me = state.auth?.user?.username || 'Saya';
    const currentTokens = String(ownerInput.value || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const lowerSet = new Set(currentTokens.map((t) => t.toLowerCase()));
    const query = (currentTokens[currentTokens.length - 1] || '').toLowerCase();

    const friends = state.friends || [];
    const options = [
      { key: me, label: `Saya (${me})`, sub: 'Pengeluaran pribadi', isSelf: true },
      ...friends.map((f) => ({ key: f.username, label: `@${f.username}`, sub: f.email || 'Teman terdaftar', isSelf: false })),
    ];

    ownerMenu.innerHTML = '';
    options.forEach((opt) => {
      const isSelected = opt.isSelf
        ? (lowerSet.size === 0 || lowerSet.has('saya') || lowerSet.has(me.toLowerCase()))
        : lowerSet.has(opt.key.toLowerCase());
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `owner-option${isSelected ? ' selected' : ''}`;
      btn.innerHTML = `
        <span class="owner-option-left">
          <span class="owner-avatar">${escapeHtml((opt.key || 'S').slice(0, 2).toUpperCase())}</span>
          <span class="owner-option-meta">
            <strong>${escapeHtml(opt.label)}</strong>
            <small>${escapeHtml(opt.sub)}</small>
          </span>
        </span>
        <span class="owner-option-check">✓</span>
      `;
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        let next = String(ownerInput.value || '')
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
        const targetVal = opt.isSelf ? 'Saya' : opt.key;
        const existsIdx = next.findIndex((t) => t.toLowerCase() === targetVal.toLowerCase() || (opt.isSelf && t.toLowerCase() === me.toLowerCase()));
        if (existsIdx !== -1) {
          next.splice(existsIdx, 1);
        } else {
          next.push(targetVal);
        }
        ownerInput.value = next.join(', ');
        renderOwnerDropdown();
        renderSplitSummary();
      });
      ownerMenu.appendChild(btn);
    });

    if (friends.length === 0) {
      const hint = document.createElement('div');
      hint.className = 'muted';
      hint.style.cssText = 'font-size:0.75rem;padding:6px 10px;';
      hint.textContent = 'Belum ada teman. Ketik nama manual atau tambah di menu 👥 Teman.';
      ownerMenu.appendChild(hint);
    } else if (query && !options.some((o) => o.key.toLowerCase() === query || o.key.toLowerCase().includes(query))) {
      const manualHint = document.createElement('div');
      manualHint.className = 'muted';
      manualHint.style.cssText = 'font-size:0.74rem;padding:6px 10px;';
      manualHint.textContent = `Nama manual "${currentTokens[currentTokens.length - 1]}" akan disimpan di catatan split.`;
      ownerMenu.appendChild(manualHint);
    }
  };

  const openOwnerMenu = () => {
    document.querySelectorAll('.owner-dropdown-menu').forEach((m) => {
      if (m !== ownerMenu) m.classList.add('hidden');
    });
    renderOwnerDropdown();
    ownerMenu.classList.remove('hidden');
  };

  ownerInput.addEventListener('focus', openOwnerMenu);
  ownerInput.addEventListener('input', () => {
    renderOwnerDropdown();
    renderSplitSummary();
  });
  dropBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (ownerMenu.classList.contains('hidden')) openOwnerMenu();
    else ownerMenu.classList.add('hidden');
  });
  document.addEventListener('click', (e) => {
    if (!ownerPicker.contains(e.target)) ownerMenu.classList.add('hidden');
  });

  ownerPicker.append(ownerWrap, ownerMenu);

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

  row.append(nameInput, qtyInput, priceWrap, ownerPicker, removeBtn);
  return row;
}

function renderItemRows(items) {
  const container = $('items-container');
  container.innerHTML = '';
  const list = Array.isArray(items) && items.length > 0 ? items : [{ name: '', qty: 1, price: 0, owner: '' }];
  list.forEach((item) => container.appendChild(createItemRowElement(item)));
  updateItemsSubtotal(false);
}

function addItemRow() {
  const container = $('items-container');
  const row = createItemRowElement({ name: '', qty: 1, price: 0, owner: '' });
  container.appendChild(row);
  row.querySelector('.item-name')?.focus();
  updateItemsSubtotal(false);
}

function parseOwnerTokens(rawOwner, currentUsername, knownUsers = []) {
  const selfName = currentUsername || 'Saya';
  const rawTokens = String(rawOwner || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  if (rawTokens.length === 0) {
    return [{
      key: selfName,
      displayName: selfName,
      ownerUsername: currentUsername || '',
      ownerName: '',
      isRegistered: true,
      isSelf: true,
    }];
  }

  const seen = new Set();
  const result = [];
  for (const token of rawTokens) {
    const lower = token.toLowerCase();
    const isSelf = lower === 'saya' || (currentUsername && lower === currentUsername.toLowerCase());
    if (isSelf) {
      if (!seen.has(selfName)) {
        seen.add(selfName);
        result.push({
          key: selfName,
          displayName: selfName,
          ownerUsername: currentUsername || '',
          ownerName: '',
          isRegistered: true,
          isSelf: true,
        });
      }
      continue;
    }

    const matchedRegistered = (knownUsers || []).find((u) => u.toLowerCase() === lower);
    if (matchedRegistered) {
      if (!seen.has(matchedRegistered)) {
        seen.add(matchedRegistered);
        result.push({
          key: matchedRegistered,
          displayName: matchedRegistered,
          ownerUsername: matchedRegistered,
          ownerName: '',
          isRegistered: true,
          isSelf: false,
        });
      }
    } else {
      const manualKey = `manual:${lower}`;
      if (!seen.has(manualKey)) {
        seen.add(manualKey);
        result.push({
          key: manualKey,
          displayName: token,
          ownerUsername: '',
          ownerName: token,
          isRegistered: false,
          isSelf: false,
        });
      }
    }
  }
  return result;
}

function getFriendUsernames() {
  return (state.friends || []).map((f) => f.username).filter(Boolean);
}

function collectItemRows() {
  const currentUsername = state.auth?.user?.username || '';
  const friendNames = getFriendUsernames();
  const rows = Array.from(document.querySelectorAll('#items-container .item-row'));
  return rows
    .map((row) => {
      const name = row.querySelector('.item-name')?.value.trim() || '';
      const qty = Math.max(1, parseInt(row.querySelector('.item-qty')?.value, 10) || 1);
      const price = parseRupiahInput(row.querySelector('.item-price')?.value);
      const owner = row.querySelector('.item-owner')?.value.trim() || '';
      const parsedOwners = parseOwnerTokens(owner, currentUsername, friendNames);
      const ownerUsername = parsedOwners.filter((o) => o.isRegistered).map((o) => o.ownerUsername).filter(Boolean).join(', ');
      const ownerName = parsedOwners.filter((o) => !o.isRegistered).map((o) => o.ownerName).filter(Boolean).join(', ');
      return { name, qty, price, owner, ownerUsername, ownerName };
    })
    .filter((item) => item.name !== '' || item.price > 0);
}

function calculateSplitBreakdown({ items, tax, service, formTotal, currentUsername, knownUsers = [] }) {
  const itemsSubtotal = items.reduce((sum, item) => sum + item.price, 0);
  const taxVal = Math.max(0, Math.round(Number(tax) || 0));
  const serviceVal = Math.max(0, Math.round(Number(service) || 0));
  const selfName = currentUsername || 'Saya';

  if (items.length === 0 || itemsSubtotal === 0) {
    const total = Math.max(0, Math.round(Number(formTotal) || 0)) || (taxVal + serviceVal);
    return {
      itemsSubtotal,
      tax: taxVal,
      service: serviceVal,
      total,
      hasSharedOthers: false,
      groups: [
        {
          key: selfName,
          owner: selfName,
          ownerUsername: currentUsername || '',
          ownerName: '',
          isRegistered: true,
          isSelf: true,
          items,
          subtotal: Math.max(0, total - taxVal - serviceVal),
          tax: taxVal,
          service: serviceVal,
          total,
        },
      ],
    };
  }

  // Step 1: Hitung proporsi pajak & service per item terlebih dahulu
  const itemShares = items.map((it) => {
    const ratio = it.price / itemsSubtotal;
    return {
      item: it,
      subtotal: it.price,
      tax: Math.round(taxVal * ratio),
      service: Math.round(serviceVal * ratio),
    };
  });
  const sumTax = itemShares.reduce((s, x) => s + x.tax, 0);
  const sumSvc = itemShares.reduce((s, x) => s + x.service, 0);
  if (itemShares.length > 0) {
    itemShares[0].tax = Math.max(0, itemShares[0].tax + (taxVal - sumTax));
    itemShares[0].service = Math.max(0, itemShares[0].service + (serviceVal - sumSvc));
  }

  // Step 2: Bagi setiap item (item + tax + service) ke orang-orang yang di-tag pada item tersebut
  const groupMap = new Map();
  for (const share of itemShares) {
    const owners = parseOwnerTokens(share.item.owner, currentUsername, knownUsers);
    const k = owners.length;

    const baseSub = Math.floor(share.subtotal / k);
    const remSub = share.subtotal % k;
    const baseTax = Math.floor(share.tax / k);
    const remTax = share.tax % k;
    const baseSvc = Math.floor(share.service / k);
    const remSvc = share.service % k;

    owners.forEach((o, idx) => {
      if (!groupMap.has(o.key)) {
        groupMap.set(o.key, {
          key: o.key,
          owner: o.displayName,
          ownerUsername: o.ownerUsername,
          ownerName: o.ownerName,
          isRegistered: o.isRegistered,
          isSelf: o.isSelf,
          items: [],
          subtotal: 0,
          tax: 0,
          service: 0,
          total: 0,
        });
      }
      const g = groupMap.get(o.key);
      const partSub = baseSub + (idx < remSub ? 1 : 0);
      const partTax = baseTax + (idx < remTax ? 1 : 0);
      const partSvc = baseSvc + (idx < remSvc ? 1 : 0);
      const partLabel = k > 1 ? `${share.item.name || 'Item'} (1/${k} bagian)` : (share.item.name || 'Item');
      g.items.push({
        name: partLabel,
        qty: share.item.qty,
        price: partSub,
        owner: o.displayName,
        ownerUsername: o.ownerUsername,
        ownerName: o.ownerName,
      });
      g.subtotal += partSub;
      g.tax += partTax;
      g.service += partSvc;
      g.total += partSub + partTax + partSvc;
    });
  }

  const groups = Array.from(groupMap.values());
  const hasSharedOthers = groups.some((g) => !g.isSelf);
  return {
    itemsSubtotal,
    tax: taxVal,
    service: serviceVal,
    total: itemsSubtotal + taxVal + serviceVal,
    hasSharedOthers,
    groups,
  };
}

function moveManualOwnerToRegistered(manualName, targetUsername) {
  if (!manualName || !targetUsername) return;
  const rows = Array.from(document.querySelectorAll('#items-container .item-row'));
  rows.forEach((row) => {
    const input = row.querySelector('.item-owner');
    if (!input) return;
    const tokens = String(input.value || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const updated = tokens.map((t) => (t.toLowerCase() === manualName.toLowerCase() ? targetUsername : t));
    input.value = [...new Set(updated)].join(', ');
  });
  renderSplitSummary();
  showToast(`"${manualName}" dipindahkan ke user @${targetUsername}. Klik Simpan & Sync untuk mengirim ke Outstanding.`, 'success');
}

function parsePercentInput(val) {
  const clean = String(val || '').replace(',', '.').replace(/[^\d.]/g, '');
  const num = parseFloat(clean);
  if (!Number.isFinite(num) || num < 0) return 0;
  return Math.min(100, num);
}

function computeChargesFromPercents(subtotal, servicePct, taxPct) {
  const base = Math.max(0, Number(subtotal) || 0);
  const svcPct = parsePercentInput(servicePct);
  const txPct = parsePercentInput(taxPct);
  const service = Math.round(base * (svcPct / 100));
  const tax = Math.round((base + service) * (txPct / 100));
  return { service, tax, servicePct: svcPct, taxPct: txPct };
}

function renderSplitSummary() {
  const box = $('split-summary-box');
  const content = $('split-summary-content');
  if (!box || !content) return;

  const items = collectItemRows();
  const itemsSubtotal = items.reduce((sum, item) => sum + item.price, 0);
  const formTotal = parseRupiahInput($('form-total')?.value);
  const baseForPct = itemsSubtotal > 0 ? itemsSubtotal : formTotal;
  const { service, tax, servicePct, taxPct } = computeChargesFromPercents(
    baseForPct,
    $('form-service-pct')?.value,
    $('form-tax-pct')?.value
  );
  const currentUsername = state.auth?.user?.username || '';
  const friendNames = getFriendUsernames();
  const breakdown = calculateSplitBreakdown({
    items,
    tax,
    service,
    formTotal,
    currentUsername,
    knownUsers: friendNames,
  });

  if (service === 0 && tax === 0 && !breakdown.hasSharedOthers) {
    box.classList.add('hidden');
    content.innerHTML = '';
    return;
  }

  box.classList.remove('hidden');
  const userOptions = friendNames
    .filter((u) => u !== currentUsername)
    .map((u) => `<option value="${escapeHtml(u)}">@${escapeHtml(u)}</option>`)
    .join('');

  const feeInfo = (service > 0 || tax > 0)
    ? `<div class="muted" style="font-size:0.75rem;margin-bottom:4px;">Service ${servicePct}% (${formatRupiah(service)}) + Pajak ${taxPct}% dari (Item + Service) (${formatRupiah(tax)})</div>`
    : '';

  content.innerHTML = feeInfo + breakdown.groups
    .map((g) => {
      const label = g.isSelf
        ? `Saya (${escapeHtml(g.owner)})`
        : (g.isRegistered ? `@${escapeHtml(g.owner)}` : `${escapeHtml(g.owner)} (Manual)`);
      const dest = g.isSelf
        ? 'Expense + Sheet'
        : (g.isRegistered ? 'Kirim ke Outstanding' : 'Belum Terdaftar (Catatan Split)');
      const moveControl = !g.isSelf && !g.isRegistered && userOptions
        ? `<div class="split-move-row">
             <select class="split-move-select" data-manual-name="${escapeHtml(g.ownerName || g.owner)}">
               <option value="">Pindahkan ke user...</option>
               ${userOptions}
             </select>
           </div>`
        : '';
      return `
        <div class="split-person-row">
          <div class="split-person-meta">
            <strong>${label}</strong>
            <small>Item ${formatRupiah(g.subtotal)} + Pajak ${formatRupiah(g.tax)} + Service ${formatRupiah(g.service)} &bull; ${dest}</small>
            ${moveControl}
          </div>
          <span class="split-person-total">${formatRupiah(g.total)}</span>
        </div>
      `;
    })
    .join('');

  content.querySelectorAll('.split-move-select').forEach((sel) => {
    sel.addEventListener('change', (e) => {
      if (e.target.value) {
        moveManualOwnerToRegistered(sel.dataset.manualName, e.target.value);
      }
    });
  });
}

function updateItemsSubtotal(autoFillTotal = true) {
  const items = collectItemRows();
  const subtotal = items.reduce((sum, item) => sum + item.price, 0);
  const { service, tax } = computeChargesFromPercents(
    subtotal,
    $('form-service-pct')?.value,
    $('form-tax-pct')?.value
  );
  const badge = $('items-subtotal');
  if (subtotal > 0) {
    badge.textContent = `Subtotal: ${formatRupiah(subtotal)}`;
    badge.classList.remove('hidden');
    if (autoFillTotal) {
      $('form-total').value = formatNumberID(subtotal + service + tax);
    }
  } else {
    badge.classList.add('hidden');
  }
  renderSplitSummary();
  return subtotal;
}

async function loadKnownUsers() {
  if (!state.auth?.token) return;
  try {
    const res = await fetch('/api/auth/users', {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.ok && Array.isArray(data.users)) {
      state.knownUsers = data.users;
      syncUserTagDatalist();
    }
  } catch {
    // ignore autocomplete load errors
  }
}

function syncUserTagDatalist() {
  const datalist = $('user-tag-list');
  if (!datalist) return;
  const me = state.auth?.user?.username || '';
  const friendNames = getFriendUsernames().filter((u) => u !== me);
  datalist.innerHTML = friendNames.map((u) => `<option value="${escapeHtml(u)}"></option>`).join('');
}

function renderFriendsList() {
  const listEl = $('friends-list');
  const emptyEl = $('friends-empty');
  if (!listEl || !emptyEl) return;
  const friends = state.friends || [];
  if (friends.length === 0) {
    listEl.innerHTML = '';
    emptyEl.classList.remove('hidden');
    return;
  }
  emptyEl.classList.add('hidden');
  listEl.innerHTML = friends
    .map((f) => `
      <li class="friend-row">
        <div class="friend-meta">
          <strong>@${escapeHtml(f.username)}</strong>
          <small>${escapeHtml(f.email || '-')}</small>
        </div>
        <button type="button" class="btn btn-danger-outline btn-remove-friend" data-username="${escapeHtml(f.username)}" style="padding:5px 10px;font-size:0.76rem;">Hapus</button>
      </li>
    `)
    .join('');
}

async function loadFriends() {
  if (!state.auth?.token) return;
  try {
    const res = await fetch('/api/friends', {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.ok && Array.isArray(data.friends)) {
      state.friends = data.friends;
      renderFriendsList();
      syncUserTagDatalist();
    }
  } catch {
    // ignore
  }
}

function openReceiptModal(data = null) {
  const isEdit = Boolean(data && data.id);
  $('modal-receipt-title').textContent = isEdit ? 'Edit Detail Struk' : 'Konfirmasi Data Struk';
  $('form-id').value = data?.id || '';
  $('form-merchant').value = data?.merchant || '';
  $('form-date').value = data?.date || getTodayDate();
  $('form-category').value = CATEGORIES[data?.category] ? data.category : 'Makanan & Minuman';
  const itemsArr = Array.isArray(data?.items) ? data.items : [];
  const itemsSub = itemsArr.reduce((s, i) => s + Math.max(0, Number(i.price) || 0), 0);
  let svcPct = data?.servicePct > 0 ? data.servicePct : '';
  let txPct = data?.taxPct > 0 ? data.taxPct : '';
  if (svcPct === '' && data?.service > 0 && itemsSub > 0) {
    svcPct = Math.round((data.service / itemsSub) * 1000) / 10;
  }
  if (txPct === '' && data?.tax > 0 && (itemsSub + (data?.service || 0)) > 0) {
    txPct = Math.round((data.tax / (itemsSub + (data?.service || 0))) * 1000) / 10;
  }
  if ($('form-service-pct')) $('form-service-pct').value = svcPct ? String(svcPct) : '';
  if ($('form-tax-pct')) $('form-tax-pct').value = txPct ? String(txPct) : '';
  $('form-total').value = data?.total ? formatNumberID(data.total) : '';
  $('form-payment').value = data?.paymentMethod || 'QRIS';
  syncSelectUI($('form-category'));
  syncSelectUI($('form-payment'));
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
  if (state.friends.length === 0) loadFriends();
  renderSplitSummary();
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

function openAccountModal({ requireEmail = false } = {}) {
  const u = state.auth?.user;
  if (!u) return;
  const info = getPremiumInfo(u);
  $('account-username').textContent = u.username || '-';
  const rawEmail = String(u.email || '').trim();
  const maskedUiEmail = rawEmail && rawEmail.includes('@') && !rawEmail.includes('****')
    ? (() => {
      const [loc, dom] = rawEmail.split('@');
      return `${loc.length <= 2 ? `${loc[0]}****` : `${loc.slice(0, 2)}****${loc.length > 4 ? loc.slice(-1) : ''}`}@${dom}`;
    })()
    : rawEmail;
  $('account-email').textContent = maskedUiEmail || 'Email not set';
  $('account-avatar').textContent = (u.username || 'U').slice(0, 1).toUpperCase();

  const tierEl = $('account-tier');
  const expiryEl = $('account-expiry-note');
  tierEl.classList.remove('warn', 'regular');
  if (info.isLifetime) {
    tierEl.textContent = 'Lifetime Premium';
    expiryEl.textContent = 'Active forever • Google Sheet sync enabled';
  } else if (info.isPremium) {
    tierEl.textContent = info.isExpiringSoon
      ? `Premium • ${info.daysRemaining} days left`
      : 'Premium • Active';
    if (info.isExpiringSoon) tierEl.classList.add('warn');
    expiryEl.textContent = `Expires on ${formatDateID(info.until)}`;
  } else {
    tierEl.textContent = 'Free User (Demo Mode)';
    tierEl.classList.add('regular');
    expiryEl.textContent = info.isExpired
      ? `Premium expired on ${formatDateID(info.until)}`
      : 'Not subscribed to Premium';
  }

  const missingEmail = !rawEmail;
  const mustVerify = requireEmail || missingEmail;
  $('btn-close-account-modal')?.classList.toggle('hidden', mustVerify);
  $('account-email-required-note')?.classList.toggle('hidden', !missingEmail);
  $('account-email-input').value = '';
  $('account-otp-input').value = '';
  $('account-otp-wrap')?.classList.add('hidden');
  $('account-email-error')?.classList.add('hidden');

  $('account-sheet-wrap')?.classList.toggle('hidden', !isPremiumUser() || missingEmail);
  $('btn-save-account-sheet')?.classList.toggle('hidden', !isPremiumUser() || missingEmail);
  if ($('account-sheet-url')) $('account-sheet-url').value = state.settings.sheetUrl || '';
  $('account-sheet-error')?.classList.add('hidden');
  openModal('modal-account');
}

function requireSheetConfigured() {
  if (!state.auth?.user) {
    openModal('modal-login');
    return false;
  }
  if (!String(state.auth.user.email || '').trim()) {
    openAccountModal({ requireEmail: true });
    showToast('Harap isi & verifikasi email akun Anda dengan OTP terlebih dahulu.', 'info');
    return false;
  }
  if (!isPremiumUser()) {
    showToast('Fitur Foto Struk & Sync Google Sheet khusus akun Premium. Akun Anda saat ini User Reguler (Mode Demo).', 'info');
    return false;
  }
  const activeUrl = state.settings.sheetUrl || loadSheetSession() || state.auth?.user?.sheet_url || '';
  if (isValidSheetUrl(activeUrl)) {
    state.settings.sheetUrl = activeUrl;
    saveSheetSession(activeUrl);
    return true;
  }
  renderStatusPills();
  $('req-sheet-url').value = '';
  openModal('modal-require-sheet');
  showToast('Please connect your Google Sheet link first.', 'info');
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
      headers: getAuthHeaders(),
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
  const splitNote = Array.isArray(tx.splitDetails) && tx.splitDetails.length > 1
    ? `Split: ${tx.splitDetails.map((s) => `${s.isRegistered && !s.isSelf ? `@${s.owner}` : s.owner}: ${formatRupiah(s.total)}`).join(' | ')}`
    : '';
  const combinedNotes = [tx.notes || '', splitNote].filter(Boolean).join(' • ');

  const rows = items.map((item, idx) => {
    const qty = Math.max(1, Number(item.qty) || 1);
    const price = Math.max(0, Number(item.price) || 0);
    const rowTotal = itemsSum > 0 ? price : (idx === 0 ? txTotal : 0);
    const ownerTag = item.owner ? ` [${item.owner}]` : '';
    return {
      id: tx.id,
      date: tx.date,
      merchant: tx.merchant,
      category: tx.category,
      itemsText: `${item.name || 'Item'} (x${qty})${ownerTag}`,
      total: rowTotal,
      paymentMethod: tx.paymentMethod,
      notes: combinedNotes,
      syncedAt,
    };
  });

  if (itemsSum > 0 && txTotal > itemsSum) {
    rows.push({
      id: tx.id,
      date: tx.date,
      merchant: tx.merchant,
      category: tx.category,
      itemsText: 'Pajak & Service',
      total: txTotal - itemsSum,
      paymentMethod: tx.paymentMethod,
      notes: combinedNotes,
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
  const pending = state.transactions.filter((t) => !t.synced && t.status !== 'outstanding');
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
    method: 'GET',
    headers: getAuthHeaders(),
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
    headers: getAuthHeaders(),
    body: JSON.stringify({
      transactions: txList.map((t) => ({ ...t, thumb: '' })),
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok) return { inserted: 0, transactions: state.transactions };
  return data;
}

async function upsertTransactionToDb(tx) {
  if (!state.auth?.token || !tx?.id) return;
  await fetch('/api/transactions', {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify({ transaction: { ...tx, thumb: '' } }),
  }).catch(() => { });
}

async function deleteTransactionFromDb(txId) {
  if (!state.auth?.token || !txId) return;
  await fetch(`/api/transactions/${encodeURIComponent(txId)}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  }).catch(() => { });
}

async function shareSplitToDb(shares) {
  if (!state.auth?.token || !Array.isArray(shares) || shares.length === 0) {
    return { ok: true, sharedCount: 0, missingUsers: [] };
  }
  const res = await fetch('/api/transactions/share', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ shares }),
  });
  const data = await res.json().catch(() => ({ ok: false, error: 'Gagal mengirim split bill' }));
  if (!res.ok || data.ok === false) {
    throw new Error(data.error || 'Gagal mengirim split bill');
  }
  return data;
}

async function acceptOutstandingTx(txId) {
  const tx = state.transactions.find((t) => t.id === txId && t.status === 'outstanding');
  if (!tx) return;

  try {
    if (state.auth?.token) {
      const res = await fetch('/api/transactions/accept', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ txId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Gagal menerima outstanding');
      }
    }

    tx.status = 'expense';
    tx.synced = false;
    saveTransactions();
    renderAll();

    if (isPremiumUser() && state.settings.autoSync && state.settings.sheetUrl.trim()) {
      showLoader({
        mode: 'sync',
        title: 'Memindahkan ke Expense & Sheet...',
        desc: `Menyinkronkan ${tx.merchant} ke Google Sheet Anda.`,
      });
      const ok = await syncSingleTransaction(tx);
      hideLoader();
      renderAll();
      showToast(ok ? 'Berhasil diaccept ke Expense & Google Sheet!' : 'Berhasil diaccept ke Expense (sinkron Sheet tertunda).', ok ? 'success' : 'info');
    } else {
      showToast('Berhasil diaccept & dipindahkan ke Expense!', 'success');
    }
  } catch (err) {
    hideLoader();
    showToast(err.message || 'Gagal menerima transaksi outstanding.', 'error');
  }
}

async function rejectOutstandingTx(txId) {
  if (!confirm('Tolak dan hapus tagihan outstanding ini?')) return;
  state.transactions = state.transactions.filter((t) => t.id !== txId);
  saveTransactions();
  renderAll();
  await deleteTransactionFromDb(txId);
  showToast('Tagihan outstanding ditolak.', 'info');
}

async function importFromGoogleSheet({ targetUrl = '', silentIfEmpty = false, validateBeforeSave = false } = {}) {
  const url = (targetUrl || $('setting-sheet-url')?.value || state.settings.sheetUrl || '').trim();
  if (!isValidSheetUrl(url)) {
    showToast('Masukkan link Google Sheet yang valid terlebih dahulu.', 'error');
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
        headers: getAuthHeaders(),
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
    $('pill-sheet-text').textContent = 'Signed Out';
    $('pill-sheet').title = 'Signed Out';
  } else if (!premium) {
    $('pill-sheet').classList.remove('connected');
    $('pill-sheet-text').textContent = `${user.username} (Free)`;
    $('pill-sheet').title = `${user.username} (Free Mode)`;
  } else {
    $('pill-sheet').classList.toggle('connected', hasSheet);
    const label = hasSheet ? 'Google Sheet: Connected' : 'Google Sheet: Not Linked';
    $('pill-sheet-text').textContent = label;
    $('pill-sheet').title = label;
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

let hasUserSelectedPeriod = false;

function formatPeriodLabel(period) {
  if (!period) return '';
  if (/^\d{4}$/.test(period)) {
    return `Tahun ${period}`;
  }
  return formatMonthLabel(period);
}

function openPeriodPicker() {
  const body = $('period-picker-body');
  if (!body) return;

  // Build grouped list of periods
  const transactions = state.transactions || [];
  const periodSet = new Set();
  transactions.forEach((t) => {
    if (t.date) {
      const d = new Date(t.date);
      if (!isNaN(d)) {
        periodSet.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
      }
    }
  });

  // Also add current month
  const now = new Date();
  periodSet.add(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);

  // Build year set
  const yearSet = new Set();
  periodSet.forEach((p) => yearSet.add(p.slice(0, 4)));

  const MONTHS_ID = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];

  // Sort descending
  const sortedPeriods = Array.from(periodSet).sort((a, b) => b.localeCompare(a));
  const sortedYears = Array.from(yearSet).sort((a, b) => b - a);

  const current = state.selectedPeriod || sortedPeriods[0] || '';

  let html = '';

  // Per Bulan section
  html += '<div class="picker-section-label">Per Bulan</div>';
  html += '<div class="picker-chips">';
  sortedPeriods.forEach((p) => {
    const [yr, mo] = p.split('-');
    const label = `${MONTHS_ID[parseInt(mo, 10) - 1]} ${yr}`;
    const isActive = current === p;
    html += `<button type="button" class="picker-chip${isActive ? ' active' : ''}" data-period="${p}">${label}</button>`;
  });
  html += '</div>';

  // Per Tahun section
  html += '<div class="picker-section-label" style="margin-top:16px">Per Tahun</div>';
  html += '<div class="picker-chips">';
  sortedYears.forEach((yr) => {
    const val = `year-${yr}`;
    const isActive = current === val;
    html += `<button type="button" class="picker-chip picker-chip-year${isActive ? ' active' : ''}" data-period="${val}">${yr}</button>`;
  });
  html += '</div>';

  body.innerHTML = html;

  // Bind chip clicks
  body.querySelectorAll('.picker-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      const period = chip.dataset.period;
      state.selectedPeriod = period;
      state.selectedMonth = period;

      // Sync hidden select
      const sel = $('period-filter');
      if (sel) {
        // Try to match option value
        const opt = Array.from(sel.options).find((o) => o.value === period);
        if (opt) sel.value = period;
      }

      // Update button label
      updatePeriodBtnLabel();

      closeModal('modal-period-picker');
      renderSummary(getMonthTransactions());
    });
  });

  openModal('modal-period-picker');
}

function updatePeriodBtnLabel() {
  const btn = $('period-picker-btn');
  const labelEl = $('period-picker-label');
  if (!labelEl) return;
  const MONTHS_ID = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  const p = state.selectedPeriod || '';
  if (!p) { labelEl.textContent = 'Bulan Ini'; return; }
  if (p.startsWith('year-')) {
    labelEl.textContent = p.replace('year-', '') + ' (Tahunan)';
  } else {
    const [yr, mo] = p.split('-');
    labelEl.textContent = `${MONTHS_ID[parseInt(mo, 10) - 1]} ${yr}`;
  }
}

function populatePeriodFilter() {
  const select = $('period-filter') || $('month-filter');
  if (!select) return;

  const currentM = getCurrentMonth();
  const currentY = currentM.slice(0, 4);

  const monthsSet = new Set([currentM]);
  const yearsSet = new Set([currentY]);
  const periodsWithData = new Set();

  state.transactions.forEach((t) => {
    if (t.date && t.date.length >= 7) {
      const ym = t.date.slice(0, 7);
      const y = t.date.slice(0, 4);
      monthsSet.add(ym);
      yearsSet.add(y);
      periodsWithData.add(ym);
      periodsWithData.add(y);
    }
  });

  const sortedMonths = Array.from(monthsSet).sort().reverse();
  const sortedYears = Array.from(yearsSet).sort().reverse();

  let html = '<optgroup label="Per Bulan">';
  sortedMonths.forEach((m) => {
    html += `<option value="${m}">${formatMonthLabel(m)}</option>`;
  });
  html += '</optgroup><optgroup label="Per Tahun">';
  sortedYears.forEach((y) => {
    html += `<option value="${y}">Tahun ${y}</option>`;
  });
  html += '</optgroup>';

  select.innerHTML = html;

  if (!state.selectedPeriod) {
    state.selectedPeriod = state.selectedMonth || currentM;
  }

  const allValidPeriods = [...sortedMonths, ...sortedYears];

  // Default ke bulan yang memiliki data bila user belum manual memilih
  if (!hasUserSelectedPeriod && periodsWithData.size > 0) {
    const dataMonths = Array.from(monthsSet).filter((m) => periodsWithData.has(m)).sort();
    if (dataMonths.length > 0) {
      state.selectedPeriod = dataMonths[0];
    }
  } else if (!allValidPeriods.includes(state.selectedPeriod)) {
    state.selectedPeriod = sortedMonths[0] || currentM;
  }

  select.value = state.selectedPeriod;
  state.selectedMonth = state.selectedPeriod;
}

function getMonthExpenseTransactions() {
  const period = state.selectedPeriod || state.selectedMonth || getCurrentMonth();
  return state.transactions.filter((t) => t.status !== 'outstanding' && (t.date || '').startsWith(period));
}

function getMonthTransactions() {
  if (state.activeTab === 'outstanding') {
    return state.transactions.filter((t) => t.status === 'outstanding');
  }
  return getMonthExpenseTransactions();
}

function renderTabs() {
  const isOut = state.activeTab === 'outstanding';
  $('tab-expense')?.classList.toggle('active', !isOut);
  $('tab-expense')?.setAttribute('aria-selected', String(!isOut));
  $('tab-outstanding')?.classList.toggle('active', isOut);
  $('tab-outstanding')?.setAttribute('aria-selected', String(isOut));

  const outCount = state.transactions.filter((t) => t.status === 'outstanding').length;
  const badge = $('outstanding-badge');
  if (badge) {
    badge.textContent = String(outCount);
    badge.classList.toggle('hidden', outCount === 0);
  }
}

function renderSummary(monthTxs) {
  const total = monthTxs.reduce((sum, t) => sum + (Number(t.total) || 0), 0);
  const count = monthTxs.length;
  const avg = count ? Math.round(total / count) : 0;
  const syncedCount = monthTxs.filter((t) => t.synced).length;

  const currentPeriod = state.selectedPeriod || state.selectedMonth || '';
  const isYearly = /^\d{4}$/.test(currentPeriod);
  const labelEl = $('summary-period-label');
  if (labelEl) {
    labelEl.textContent = isYearly ? `Yearly Expenses (${currentPeriod})` : 'Monthly Expenses';
  }

  $('total-month').textContent = formatRupiah(total);
  $('stat-count').textContent = String(count);
  $('stat-avg').textContent = formatRupiah(avg);
  $('stat-synced').textContent = `${syncedCount} / ${count}`;

  const budget = Number(state.settings.monthlyBudget) || 0;
  const budgetWrap = $('budget-wrap');
  if (budget > 0) {
    budgetWrap.classList.remove('hidden');
    const pct = Math.round((total / budget) * 100);
    if ($('budget-label')) $('budget-label').textContent = `Target Budget: ${formatRupiah(budget)}`;
    if ($('budget-val-text')) $('budget-val-text').textContent = formatRupiah(budget);
    $('budget-percent').textContent = `${pct}%`;
    const fill = $('budget-progress');
    fill.style.width = `${Math.min(100, pct)}%`;
    fill.classList.remove('warn', 'over');
    if (pct >= 100) fill.classList.add('over');
    else if (pct >= 80) fill.classList.add('warn');
  } else {
    budgetWrap.classList.add('hidden');
  }

  const pendingTotal = state.transactions.filter((t) => !t.synced && t.status !== 'outstanding').length;
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
    if (state.activeTab === 'outstanding') {
      empty.innerHTML = '<p>No outstanding bills.</p><small>No pending split bill requests from friends.</small>';
    } else {
      empty.innerHTML = '<p>No receipts recorded this month.</p><small>Snap or upload a receipt, or click <strong>Try Sample Receipt</strong> above!</small>';
    }
    empty.classList.remove('hidden');
    return;
  }

  empty.classList.add('hidden');
  list.innerHTML = filtered
    .map((tx) => {
      const cat = CATEGORIES[tx.category] || CATEGORIES['Lainnya'];
      const isOut = tx.status === 'outstanding';
      const syncTag = isOut
        ? `<span class="sync-tag outstanding">From: @${escapeHtml(tx.sharedBy || 'Friend')}</span>`
        : (tx.synced
          ? '<span class="sync-tag ok">Sheet ✓</span>'
          : '<span class="sync-tag pending">Pending Sync</span>');
      const outstandingActions = isOut
        ? `<div class="tx-outstanding-actions">
             <button type="button" class="btn btn-primary btn-accept-outstanding" data-id="${escapeHtml(tx.id)}">Accept &amp; Move to Expense</button>
             <button type="button" class="btn btn-danger-outline btn-reject-outstanding" data-id="${escapeHtml(tx.id)}">Decline</button>
           </div>`
        : '';
      return `
        <li class="tx-item compact" data-id="${tx.id}">
          <div class="tx-top">
            <div class="tx-left">
              <div class="tx-icon">${cat.icon}</div>
              <div class="tx-info">
                <div class="tx-merchant">${escapeHtml(tx.merchant)}</div>
                <div class="tx-items-preview">${formatDateID(tx.date)}</div>
              </div>
            </div>
            <div class="tx-right tx-right-compact">
              <div class="tx-amount">${formatRupiah(tx.total)}</div>
              ${syncTag}
            </div>
          </div>
          ${outstandingActions}
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
  renderTabs();
  populatePeriodFilter();
  updatePeriodBtnLabel();
  $('period-picker-btn')?.addEventListener('click', () => openPeriodPicker());
  const expenseMonthTxs = getMonthExpenseTransactions();
  renderSummary(expenseMonthTxs);
  renderDonutChart(expenseMonthTxs);
  renderTransactions(getMonthTransactions());
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

// Social Share Recap Card
function getShareRecapData() {
  const txns = getMonthExpenseTransactions();
  const totalExpense = txns.reduce((sum, t) => sum + (Number(t.total) || 0), 0);
  const receiptCount = txns.length;

  const catMap = {};
  for (const t of txns) {
    const cat = t.category || 'Lainnya';
    catMap[cat] = (catMap[cat] || 0) + (Number(t.total) || 0);
  }

  const topCategories = Object.entries(catMap)
    .map(([name, amount]) => ({
      name,
      amount,
      pct: totalExpense > 0 ? Math.round((amount / totalExpense) * 100) : 0,
      color: (CATEGORIES[name] && CATEGORIES[name].color) || '#10b981',
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 3);

  const activePeriod = state.selectedPeriod || state.selectedMonth;
  return {
    monthKey: activePeriod,
    monthLabel: formatPeriodLabel(activePeriod),
    totalExpense,
    receiptCount,
    topCategory: topCategories[0] || null,
    topCategories,
    hideAmount: Boolean($('share-hide-amount')?.checked),
  };
}

function buildShareCaption(data) {
  const appUrl = typeof window !== 'undefined' ? window.location.origin : '';
  if (data.receiptCount === 0) {
    return `Tracking my ${data.monthLabel} expenses with CatatStruk! Snap receipts & track spending in seconds.\n\n${appUrl}`;
  }
  const amountText = data.hideAmount ? '••••••' : formatRupiah(data.totalExpense);
  const topText = data.topCategory ? `${data.topCategory.name} (${data.topCategory.pct}%)` : '-';
  return `My ${data.monthLabel} Expense Recap on CatatStruk:\nTotal: ${amountText} (${data.receiptCount} receipts)\nTop category: ${topText}\n\nSnap receipts & track spending effortlessly!\n${appUrl}`;
}

function drawRoundedRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function updateShareLinks(data) {
  // Handled dynamically by Threads and IG Story handlers
}

function renderShareCardCanvas() {
  const canvas = $('share-card-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;
  const data = getShareRecapData();

  updateShareLinks(data);

  // Background gradient
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#064e3b');
  bg.addColorStop(0.55, '#065f46');
  bg.addColorStop(1, '#0f172a');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Subtle decorative glow circles
  ctx.save();
  ctx.globalAlpha = 0.14;
  ctx.fillStyle = '#34d399';
  ctx.beginPath();
  ctx.arc(W - 120, 140, 260, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#10b981';
  ctx.beginPath();
  ctx.arc(110, H - 160, 220, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Header: Brand + Month pill
  ctx.fillStyle = '#ffffff';
  ctx.font = '700 44px Inter, system-ui, sans-serif';
  ctx.fillText('CatatStruk', 72, 118);

  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.font = '500 24px Inter, system-ui, sans-serif';
  ctx.fillText('Snap & Track Receipts', 72, 156);

  const monthText = data.monthLabel;
  ctx.font = '600 26px Inter, system-ui, sans-serif';
  const monthWidth = ctx.measureText(monthText).width + 52;
  ctx.fillStyle = 'rgba(255,255,255,0.16)';
  drawRoundedRect(ctx, W - 72 - monthWidth, 84, monthWidth, 58, 29);
  ctx.fill();
  ctx.fillStyle = '#ecfdf5';
  ctx.fillText(monthText, W - 72 - monthWidth + 26, 122);

  // Main Hero Card
  ctx.fillStyle = 'rgba(255,255,255,0.96)';
  drawRoundedRect(ctx, 72, 220, W - 144, 410, 36);
  ctx.fill();

  ctx.fillStyle = '#047857';
  ctx.font = '700 24px Inter, system-ui, sans-serif';
  ctx.fillText('MONTHLY EXPENSE RECAP', 120, 292);

  const amountDisplay = data.hideAmount ? 'Rp ••••••' : formatRupiah(data.totalExpense);
  ctx.fillStyle = '#0f172a';
  ctx.font = '800 84px Inter, system-ui, sans-serif';
  ctx.fillText(amountDisplay, 120, 404);

  // Divider inside hero card
  ctx.fillStyle = '#e2e8f0';
  ctx.fillRect(120, 462, W - 240, 2);

  // Sub-metrics
  ctx.fillStyle = '#64748b';
  ctx.font = '600 22px Inter, system-ui, sans-serif';
  ctx.fillText('RECEIPTS LOGGED', 120, 518);
  ctx.fillText('TOP CATEGORY', 540, 518);

  ctx.fillStyle = '#0f172a';
  ctx.font = '700 40px Inter, system-ui, sans-serif';
  ctx.fillText(`${data.receiptCount} Receipts`, 120, 574);
  const topLabel = data.topCategory ? `${data.topCategory.name} (${data.topCategory.pct}%)` : 'No expenses';
  ctx.fillText(topLabel, 540, 574);

  // Top Categories Breakdown Card
  ctx.fillStyle = 'rgba(15, 23, 42, 0.45)';
  drawRoundedRect(ctx, 72, 672, W - 144, 430, 36);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.14)';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = '#ecfdf5';
  ctx.font = '700 28px Inter, system-ui, sans-serif';
  ctx.fillText('Top Spending Categories', 120, 744);

  if (data.topCategories.length === 0) {
    ctx.fillStyle = 'rgba(255,255,255,0.65)';
    ctx.font = '500 28px Inter, system-ui, sans-serif';
    ctx.fillText('No expense transactions recorded for this month.', 120, 860);
  } else {
    data.topCategories.forEach((cat, idx) => {
      const baseY = 815 + idx * 96;
      ctx.fillStyle = '#ffffff';
      ctx.font = '600 28px Inter, system-ui, sans-serif';
      ctx.fillText(cat.name, 120, baseY);

      const rightText = data.hideAmount
        ? `${cat.pct}%`
        : `${formatRupiah(cat.amount)} · ${cat.pct}%`;
      ctx.font = '600 26px Inter, system-ui, sans-serif';
      const rightW = ctx.measureText(rightText).width;
      ctx.fillStyle = '#a7f3d0';
      ctx.fillText(rightText, W - 120 - rightW, baseY);

      // Bar track
      const barW = W - 240;
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      drawRoundedRect(ctx, 120, baseY + 18, barW, 18, 9);
      ctx.fill();

      // Bar fill
      const fillW = Math.max(18, Math.round((cat.pct / 100) * barW));
      ctx.fillStyle = cat.color || '#34d399';
      drawRoundedRect(ctx, 120, baseY + 18, fillW, 18, 9);
      ctx.fill();
    });
  }

  // Footer Marketing Tagline
  ctx.fillStyle = '#a7f3d0';
  ctx.font = '700 28px Inter, system-ui, sans-serif';
  ctx.fillText('Snap Receipts. Track Spending. Stay on Budget.', 72, 1200);

  const host = typeof window !== 'undefined' ? window.location.host : 'catatstruk';
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.font = '500 24px Inter, system-ui, sans-serif';
  ctx.fillText(`Tracked with CatatStruk · ${host}`, 72, 1248);
}

function downloadShareCardPng() {
  const canvas = $('share-card-canvas');
  if (!canvas) return;
  const link = document.createElement('a');
  link.download = `CatatStruk-Recap-${state.selectedMonth}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
  showToast('Recap image downloaded!', 'success');
}

function openShareModal() {
  renderShareCardCanvas();
  openModal('modal-share');
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
let eventsBound = false;
function bindEvents() {
  if (eventsBound) return;
  eventsBound = true;
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
    if (!state.auth?.user) {
      openModal('modal-login');
      return;
    }
    openAccountModal({ requireEmail: !String(state.auth.user.email || '').trim() });
  });
  $('btn-logout').addEventListener('click', logoutUser);

  let accountOtpToken = '';
  $('btn-send-account-otp')?.addEventListener('click', async () => {
    const errEl = $('account-email-error');
    errEl?.classList.add('hidden');
    const email = $('account-email-input')?.value.trim() || '';
    const btn = $('btn-send-account-otp');
    btn.disabled = true;
    try {
      const res = await fetch('/api/auth/email-otp', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        errEl.textContent = data.error || 'Gagal mengirim OTP.';
        errEl.classList.remove('hidden');
        return;
      }
      accountOtpToken = data.otpToken;
      $('account-otp-wrap')?.classList.remove('hidden');
      $('account-otp-input')?.focus();
      showToast(data.message || 'Kode OTP dikirim ke email Anda!', 'success');
    } finally {
      btn.disabled = false;
    }
  });

  $('btn-verify-account-email')?.addEventListener('click', async () => {
    const errEl = $('account-email-error');
    errEl?.classList.add('hidden');
    const email = $('account-email-input')?.value.trim() || '';
    const otp = $('account-otp-input')?.value.trim() || '';
    const btn = $('btn-verify-account-email');
    btn.disabled = true;
    try {
      const res = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ email, otp, otpToken: accountOtpToken }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        errEl.textContent = data.error || 'Kode OTP salah.';
        errEl.classList.remove('hidden');
        return;
      }
      accountOtpToken = '';
      saveAuthSession({ user: data.user, token: state.auth.token });
      showToast('Email berhasil diverifikasi!', 'success');
      closeModal('modal-account');
      if (isPremiumUser() && !isValidSheetUrl(state.settings.sheetUrl)) {
        openModal('modal-require-sheet');
      }
    } finally {
      btn.disabled = false;
    }
  });

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
  let pendingOtpToken = '';
  let lastInviteEmail = '';

  const setAuthMode = (mode) => {
    authMode = mode;
    pendingOtpToken = '';
    const isReg = mode === 'register';
    $('auth-modal-header').classList.toggle('is-register', isReg);
    $('auth-mode-badge').textContent = isReg ? 'REGISTRASI AKUN BARU' : 'LOGIN';
    $('modal-login-title').textContent = isReg ? 'Daftar Akun CatatStruk' : 'Masuk ke CatatStruk';
    $('login-subtitle').textContent = isReg
      ? 'Isi data di bawah, lalu verifikasi email menggunakan kode OTP.'
      : 'Masuk dengan akun Anda untuk melihat dan mencatat struk belanja.';
    $('register-email-wrap').classList.toggle('hidden', !isReg);
    $('register-confirm-wrap').classList.toggle('hidden', !isReg);
    $('register-sheet-wrap').classList.toggle('hidden', !isReg);
    $('register-otp-wrap')?.classList.add('hidden');
    if ($('login-otp')) {
      $('login-otp').value = '';
      $('login-otp').required = false;
    }
    $('login-email').required = isReg;
    $('login-confirm-password').required = isReg;
    $('btn-login-submit').textContent = isReg ? 'Kirim Kode OTP' : 'Masuk';
    $('btn-toggle-auth-mode').textContent = isReg
      ? 'Sudah punya akun? Kembali ke Masuk'
      : 'Belum punya akun? Daftar Akun';
  };

  $('btn-toggle-auth-mode').addEventListener('click', () => {
    $('login-error').classList.add('hidden');
    setAuthMode(authMode === 'login' ? 'register' : 'login');
  });

  const requestRegisterOtp = async () => {
    const errEl = $('login-error');
    const res = await fetch('/api/auth/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: $('login-username').value.trim(),
        email: ($('login-email')?.value || '').trim(),
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      errEl.textContent = data.error || 'Gagal mengirim OTP.';
      errEl.classList.remove('hidden');
      return false;
    }
    pendingOtpToken = data.otpToken;
    $('register-otp-wrap')?.classList.remove('hidden');
    if ($('login-otp')) {
      $('login-otp').required = true;
      $('login-otp').focus();
    }
    $('btn-login-submit').textContent = 'Verifikasi OTP & Daftar';
    showToast(data.message || 'Kode OTP dikirim ke email Anda!', 'success');
    return true;
  };

  $('btn-resend-otp')?.addEventListener('click', async () => {
    $('login-error').classList.add('hidden');
    await requestRegisterOtp();
  });

  // Friends Modal & Invite
  $('btn-open-friends')?.addEventListener('click', async () => {
    if (!state.auth?.user) {
      const saved = loadAuthSession();
      if (saved?.token && saved?.user) {
        state.auth = saved;
      } else {
        openModal('modal-login');
        return;
      }
    }
    closeModal('modal-account');
    $('friend-not-found-box')?.classList.add('hidden');
    openModal('modal-friends');
    await loadFriends();
  });

  $('add-friend-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const emailInput = $('friend-email-input');
    const email = emailInput.value.trim();
    const notFoundBox = $('friend-not-found-box');
    notFoundBox?.classList.add('hidden');
    lastInviteEmail = '';

    try {
      const res = await fetch('/api/friends', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 404 && data.notFound) {
        lastInviteEmail = email;
        $('friend-not-found-text').textContent = `User dengan email "${email}" belum terdaftar di CatatStruk.`;
        notFoundBox?.classList.remove('hidden');
        return;
      }
      if (!res.ok || !data.ok) {
        showToast(data.error || 'Gagal menambahkan teman.', 'error');
        return;
      }
      emailInput.value = '';
      showToast(`@${data.friend.username} berhasil ditambahkan sebagai teman!`, 'success');
      await loadFriends();
    } catch {
      showToast('Gagal menghubungi server.', 'error');
    }
  });

  $('btn-invite-friend')?.addEventListener('click', async () => {
    if (!lastInviteEmail) return;
    const btn = $('btn-invite-friend');
    btn.disabled = true;
    try {
      const res = await fetch('/api/friends/invite', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ email: lastInviteEmail }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        showToast(data.error || 'Gagal mengirim undangan.', 'error');
        return;
      }
      showToast(data.message || 'Undangan terkirim!', 'success');
      $('friend-not-found-box')?.classList.add('hidden');
      $('friend-email-input').value = '';
      lastInviteEmail = '';
    } finally {
      btn.disabled = false;
    }
  });

  $('friends-list')?.addEventListener('click', async (e) => {
    const btn = e.target.closest('.btn-remove-friend');
    if (!btn) return;
    const uname = btn.dataset.username;
    if (!confirm(`Hapus @${uname} dari daftar teman?`)) return;
    await fetch('/api/friends', {
      method: 'DELETE',
      headers: getAuthHeaders(),
      body: JSON.stringify({ friendUsername: uname }),
    }).catch(() => { });
    showToast(`@${uname} dihapus dari teman.`, 'info');
    await loadFriends();
  });

  $('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errEl = $('login-error');
    const btn = $('btn-login-submit');
    errEl.classList.add('hidden');

    if (authMode === 'register') {
      const email = ($('login-email')?.value || '').trim();
      if (!email || !email.includes('@')) {
        errEl.textContent = 'Email wajib diisi untuk pendaftaran.';
        errEl.classList.remove('hidden');
        return;
      }
      const pass = $('login-password').value;
      const confirmPass = $('login-confirm-password').value;
      if (pass !== confirmPass) {
        errEl.textContent = 'Konfirmasi password tidak cocok.';
        errEl.classList.remove('hidden');
        return;
      }
      if (!pendingOtpToken) {
        btn.disabled = true;
        try {
          await requestRegisterOtp();
        } finally {
          btn.disabled = false;
        }
        return;
      }
    }

    btn.disabled = true;

    try {
      const authEndpoint = authMode === 'register' ? '/api/auth/register' : '/api/auth/login';
      const res = await fetch(authEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: $('login-username').value.trim(),
          email: authMode === 'register' ? ($('login-email')?.value || '').trim() : '',
          password: $('login-password').value,
          sheetUrl: authMode === 'register' ? ($('login-sheet-url')?.value || '').trim() : '',
          otp: authMode === 'register' ? ($('login-otp')?.value || '').trim() : '',
          otpToken: authMode === 'register' ? pendingOtpToken : '',
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

      if (authMode === 'register' && data.userNumber) {
        showToast(`Selamat datang! Anda adalah user ke-${data.userNumber} di CatatStruk.`, 'success');
      }

      saveAuthSession({ user: data.user, token: data.token });
      loadSheetBotEmail();
      loadFriends();
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
        if (isValidSheetUrl(state.settings.sheetUrl)) saveSheetSession(state.settings.sheetUrl);
      }

      closeModal('modal-login');
      renderAll();

      if (!String(data.user.email || '').trim()) {
        openAccountModal({ requireEmail: true });
        return;
      }

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

  document.querySelectorAll('.sheet-mode-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const mode = btn.dataset.sheetMode === 'public' ? 'public' : 'private';
      document.querySelectorAll('.sheet-mode-btn').forEach((b) => {
        b.classList.toggle('active', b.dataset.sheetMode === mode);
      });
      $('guide-sheet-private')?.classList.toggle('hidden', mode !== 'private');
      $('guide-sheet-public')?.classList.toggle('hidden', mode !== 'public');
    });
  });

  $('btn-copy-bot-email')?.addEventListener('click', async () => {
    const email = $('bot-email-display')?.value || '';
    if (!email || email.includes('Memuat') || email.includes('Belum')) {
      showToast('Email bot belum tersedia.', 'error');
      return;
    }
    try {
      await navigator.clipboard.writeText(email);
      showToast('Email bot berhasil disalin!', 'success');
    } catch {
      $('bot-email-display')?.select();
      showToast('Salin email bot secara manual dari kotak.', 'info');
    }
  });

  const openSheetGuideModal = () => {
    if (!state.auth?.user) {
      openModal('modal-login');
      return;
    }
    if (!isPremiumUser()) {
      showToast('Sync Google Sheet khusus akun Premium. Akun Anda saat ini User Reguler (Mode Demo).', 'info');
      return;
    }
    closeModal('modal-account');
    $('req-sheet-error').classList.add('hidden');
    $('req-sheet-url').value = state.settings.sheetUrl || state.auth?.user?.sheet_url || '';
    $('btn-close-req-sheet')?.classList.remove('hidden');
    openModal('modal-require-sheet');
  };

  $('btn-open-sheet-guide')?.addEventListener('click', openSheetGuideModal);
  $('pill-sheet')?.addEventListener('click', () => {
    if (!isValidSheetUrl(state.settings.sheetUrl)) {
      openSheetGuideModal();
    } else {
      showToast('Google Sheet is connected and ready to sync.', 'success');
    }
  });
  $('btn-sync-all')?.addEventListener('click', () => {
    if (!state.auth?.user) {
      openModal('modal-login');
      return;
    }
    if (!isPremiumUser()) {
      showToast('Sync Google Sheet khusus akun Premium. Akun Anda saat ini User Reguler (Mode Demo).', 'info');
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
    const activeUrl = state.settings.sheetUrl || loadSheetSession() || state.auth?.user?.sheet_url || '';
    if (!isValidSheetUrl(activeUrl)) {
      state.settings.sheetUrl = '';
      renderStatusPills();
      if ($('modal-require-sheet').classList.contains('hidden')) {
        $('req-sheet-error').classList.add('hidden');
        $('req-sheet-url').value = '';
        openModal('modal-require-sheet');
      }
    } else {
      state.settings.sheetUrl = activeUrl;
      saveSheetSession(activeUrl);
    }
  };
  window.addEventListener('focus', checkSessionOnReturn);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') checkSessionOnReturn();
  });

  // Camera & Gallery
  $('btn-camera')?.addEventListener('click', () => {
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

  // View Tabs (Expense vs Outstanding)
  document.querySelectorAll('.view-tab').forEach((tabBtn) => {
    tabBtn.addEventListener('click', () => {
      const nextTab = tabBtn.dataset.tab === 'outstanding' ? 'outstanding' : 'expense';
      if (state.activeTab === nextTab) return;
      state.activeTab = nextTab;
      renderAll();
    });
  });

  // Filters
  const periodSelect = $('period-filter') || $('month-filter');
  if (periodSelect) {
    periodSelect.addEventListener('change', (e) => {
      hasUserSelectedPeriod = true;
      state.selectedPeriod = e.target.value;
      state.selectedMonth = e.target.value;
      renderAll();
    });
  }
  $('category-filter').addEventListener('change', (e) => {
    state.categoryFilter = e.target.value;
    renderTransactions(getMonthTransactions());
  });
  $('search-input').addEventListener('input', (e) => {
    state.searchQuery = e.target.value;
    renderTransactions(getMonthTransactions());
  });

  $('btn-export-csv').addEventListener('click', exportCsv);
  $('btn-open-share').addEventListener('click', openShareModal);
  $('share-hide-amount').addEventListener('change', renderShareCardCanvas);
  $('btn-share-download').addEventListener('click', downloadShareCardPng);

  // Inline Budget Editor dengan Warning & Custom Konfirmasi Modal
  const budgetValBtn = $('budget-val-btn');
  const budgetInputWrap = $('budget-input-wrap');
  const budgetInlineInput = $('budget-inline-input');

  if (budgetValBtn && budgetInputWrap && budgetInlineInput) {
    bindCurrencyInput(budgetInlineInput, (val) => {
      const currentExpense = getMonthExpenseTransactions().reduce((sum, t) => sum + (Number(t.total) || 0), 0);
      if (val > 0 && val < currentExpense) {
        budgetInputWrap.classList.add('warning');
      } else {
        budgetInputWrap.classList.remove('warning');
      }
    });

    const closeBudgetInput = () => {
      budgetInputWrap.classList.remove('warning');
      budgetInputWrap.classList.add('hidden');
      budgetValBtn.classList.remove('hidden');
    };

    const saveInlineBudget = () => {
      if (budgetInputWrap.classList.contains('hidden')) return;
      const newBudget = parseRupiahInput(budgetInlineInput.value);

      if (newBudget <= 0 || newBudget === state.settings.monthlyBudget) {
        closeBudgetInput();
        return;
      }

      const currentExpense = getMonthExpenseTransactions().reduce((sum, t) => sum + (Number(t.total) || 0), 0);
      const isOverBudget = newBudget < currentExpense;

      const confirmModal = $('modal-budget-confirm');
      const confirmTitle = $('budget-confirm-title');
      const confirmMsg = $('budget-confirm-msg');
      const confirmIcon = $('budget-confirm-icon');
      const okBtn = $('btn-budget-ok');

      if (isOverBudget) {
        confirmTitle.textContent = 'Peringatan Over Budget';
        confirmMsg.textContent = `Target budget ${formatRupiah(newBudget)} lebih kecil dari pengeluaran saat ini ${formatRupiah(currentExpense)}. Budget akan langsung melebihi 100%. Lanjutkan?`;
        confirmMsg.className = 'confirm-msg confirm-msg-warning';
        confirmIcon.className = 'confirm-icon confirm-icon-warning';
        okBtn.className = 'btn btn-danger';
      } else {
        confirmTitle.textContent = 'Konfirmasi Budget';
        confirmMsg.textContent = `Ubah target budget menjadi ${formatRupiah(newBudget)}?`;
        confirmMsg.className = 'confirm-msg';
        confirmIcon.className = 'confirm-icon confirm-icon-default';
        okBtn.className = 'btn btn-primary';
      }

      confirmModal.dataset.pendingBudget = newBudget;
      closeBudgetInput();
      openModal('modal-budget-confirm');
    };

    budgetValBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      budgetValBtn.classList.add('hidden');
      budgetInputWrap.classList.remove('hidden');
      budgetInputWrap.classList.remove('warning');
      budgetInlineInput.value = formatNumberID(state.settings.monthlyBudget || 0);
      budgetInlineInput.focus();
      budgetInlineInput.select();
    });

    budgetInlineInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        saveInlineBudget();
      } else if (e.key === 'Escape') {
        closeBudgetInput();
      }
    });

    budgetInlineInput.addEventListener('blur', () => {
      setTimeout(() => {
        if (!$('modal-budget-confirm').classList.contains('hidden')) return;
        saveInlineBudget();
      }, 120);
    });

    $('btn-budget-ok')?.addEventListener('click', () => {
      const confirmModal = $('modal-budget-confirm');
      const newBudget = Number(confirmModal.dataset.pendingBudget);
      closeModal('modal-budget-confirm');
      if (newBudget > 0) {
        state.settings.monthlyBudget = newBudget;
        saveSettings();
        renderSummary(getMonthTransactions());
        showToast(`Target budget diperbarui ke ${formatRupiah(newBudget)}`, 'success');
      }
    });

    $('btn-budget-cancel')?.addEventListener('click', () => {
      closeModal('modal-budget-confirm');
      showToast('Perubahan budget dibatalkan', 'info');
    });
  }

  // 1. Instagram Story: fokus kirim gambar recap (Story mode)
  $('btn-share-story')?.addEventListener('click', async () => {
    const canvas = $('share-card-canvas');
    const data = getShareRecapData();

    if (canvas && navigator.share) {
      try {
        const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
        if (blob) {
          const file = new File([blob], `CatatStruk-Story-${data.monthKey}.png`, { type: 'image/png' });
          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({
              files: [file],
              title: `CatatStruk ${data.monthLabel} Story`,
            });
            return;
          }
        }
      } catch (err) {
        if (err && err.name === 'AbortError') return;
      }
    }

    downloadShareCardPng();
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (isMobile) {
      showToast('Gambar disimpan! Membuka Instagram...', 'info');
      setTimeout(() => {
        window.location.href = 'instagram://story-camera';
      }, 700);
    } else {
      showToast('Gambar disimpan! Pindahkan ke HP untuk post di IG Story.', 'info');
    }
  });

  // 2. Threads: fokus share caption detail & analitik (Threads intent + image ready in clipboard/download)
  $('btn-share-threads')?.addEventListener('click', async () => {
    const data = getShareRecapData();
    const caption = buildShareCaption(data);
    const canvas = $('share-card-canvas');

    // Auto copy caption and image for easy paste into Threads
    try {
      await navigator.clipboard.writeText(caption);
    } catch {}

    downloadShareCardPng();
    showToast('Caption disalin & gambar diunduh! Membuka Threads...', 'info');

    const threadsIntentUrl = `https://www.threads.net/intent/post?text=${encodeURIComponent(caption)}`;
    setTimeout(() => {
      window.open(threadsIntentUrl, '_blank');
    }, 500);
  });

  // 3. Copy Caption button
  $('btn-share-copy-caption')?.addEventListener('click', async () => {
    const caption = buildShareCaption(getShareRecapData());
    try {
      await navigator.clipboard.writeText(caption);
      showToast('Caption berhasil disalin!', 'success');
    } catch {
      showToast('Gagal menyalin caption', 'error');
    }
  });

  // Click transaction item or outstanding actions
  $('tx-list').addEventListener('click', (e) => {
    const acceptBtn = e.target.closest('.btn-accept-outstanding');
    if (acceptBtn) {
      e.stopPropagation();
      acceptOutstandingTx(acceptBtn.dataset.id);
      return;
    }
    const rejectBtn = e.target.closest('.btn-reject-outstanding');
    if (rejectBtn) {
      e.stopPropagation();
      rejectOutstandingTx(rejectBtn.dataset.id);
      return;
    }
    const item = e.target.closest('.tx-item');
    if (!item) return;
    const tx = state.transactions.find((t) => t.id === item.dataset.id);
    if (tx) openReceiptModal(tx);
  });

  // Close modals
  document.querySelectorAll('[data-close]').forEach((el) => {
    el.addEventListener('click', () => {
      if (el.dataset.close === 'modal-account' && state.auth?.user && !String(state.auth.user.email || '').trim()) {
        showToast('Verifikasi email terlebih dahulu sebelum menutup.', 'info');
        return;
      }
      closeModal(el.dataset.close);
    });
  });

  // Currency inputs (non-negative Rupiah formatting)
  bindCurrencyInput($('form-total'), () => renderSplitSummary());
  $('form-service-pct')?.addEventListener('input', () => updateItemsSubtotal(true));
  $('form-tax-pct')?.addEventListener('input', () => updateItemsSubtotal(true));
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
      const itemsSubtotal = items.reduce((s, i) => s + i.price, 0);
      const { service, tax, servicePct, taxPct } = computeChargesFromPercents(
        itemsSubtotal > 0 ? itemsSubtotal : parsedTotal,
        $('form-service-pct')?.value,
        $('form-tax-pct')?.value
      );
      const currentUsername = state.auth?.user?.username || '';
      const breakdown = calculateSplitBreakdown({
        items,
        tax,
        service,
        formTotal: parsedTotal,
        currentUsername,
        knownUsers: getFriendUsernames(),
      });

      const baseId = existingId || `cs_${Date.now()}`;
      const merchant = $('form-merchant').value.trim();
      const date = $('form-date').value;
      const category = $('form-category').value;
      const paymentMethod = $('form-payment').value;
      const notes = $('form-notes').value.trim();

      const selfGroup = breakdown.groups.find((g) => g.isSelf);
      const registeredOthers = breakdown.groups.filter((g) => !g.isSelf && g.isRegistered);
      const manualOthers = breakdown.groups.filter((g) => !g.isSelf && !g.isRegistered);

      if (registeredOthers.length > 0 && state.auth?.token) {
        const shares = registeredOthers.map((g) => ({
          targetUsername: g.ownerUsername || g.owner,
          tx: {
            id: `${baseId}_share_${g.ownerUsername || g.owner}`,
            sourceTxId: baseId,
            date,
            merchant,
            category,
            total: g.total,
            tax: g.tax,
            service: g.service,
            paymentMethod,
            items: g.items,
            splitDetails: [],
            notes: notes ? `${notes} (Split @${currentUsername})` : `Split bill dari @${currentUsername}`,
          },
        }));
        const shareRes = await shareSplitToDb(shares);
        if (shareRes.missingUsers?.length > 0) {
          showToast(`Username tidak ditemukan: ${shareRes.missingUsers.join(', ')}`, 'error');
        } else if (shareRes.sharedCount > 0) {
          showToast(`Tagihan dikirim ke Outstanding: ${registeredOthers.map((g) => `@${g.owner}`).join(', ')}`, 'success');
        }
      }

      if (manualOthers.length > 0) {
        showToast(`Tagihan manual (${manualOthers.map((g) => g.owner).join(', ')}) disimpan di rincian split.`, 'info');
      }

      const existingTx = existingId ? state.transactions.find((t) => t.id === existingId) : null;
      const hasSelfShare = Boolean(selfGroup && (selfGroup.items.length > 0 || !breakdown.hasSharedOthers || manualOthers.length > 0));

      if (!hasSelfShare && !existingId) {
        closeModal('modal-receipt');
        renderAll();
        return;
      }

      const tx = {
        id: baseId,
        merchant,
        date,
        category,
        total: selfGroup ? selfGroup.total : Math.max(0, parsedTotal || breakdown.total),
        tax: selfGroup ? selfGroup.tax : tax,
        service: selfGroup ? selfGroup.service : service,
        taxPct,
        servicePct,
        paymentMethod,
        items: items.length > 0 ? items : (selfGroup?.items || []),
        notes,
        status: existingTx?.status || 'expense',
        sharedBy: existingTx?.sharedBy || '',
        sourceTxId: existingTx?.sourceTxId || '',
        splitDetails: breakdown.groups.map((g) => ({
          owner: g.owner,
          ownerUsername: g.ownerUsername || '',
          ownerName: g.ownerName || '',
          isRegistered: g.isRegistered,
          isSelf: g.isSelf,
          subtotal: g.subtotal,
          tax: g.tax,
          service: g.service,
          total: g.total,
        })),
        thumb: state.pendingThumb || '',
        synced: false,
        createdAt: existingTx ? existingTx.createdAt : Date.now(),
      };

      if (existingId) {
        const idx = state.transactions.findIndex((t) => t.id === existingId);
        if (idx !== -1) {
          state.transactions[idx] = tx;
        }
      } else {
        state.transactions.unshift(tx);
        state.selectedMonth = tx.date.slice(0, 7);
      }

      saveTransactions();
      closeModal('modal-receipt');
      renderAll();

      const dbSavePromise = existingId ? upsertTransactionToDb(tx) : syncTransactionsToDb([tx]);

      if (tx.status !== 'outstanding' && isPremiumUser() && state.settings.autoSync && state.settings.sheetUrl.trim()) {
        showLoader({
          mode: 'sync',
          title: 'Menyimpan ke Google Sheet...',
          desc: `Mengirim struk ${tx.merchant} ke Google Sheet Anda.`,
        });
        const ok = await syncSingleTransaction(tx);
        await dbSavePromise;
        hideLoader();
        renderAll();
        showToast(ok ? 'Tersimpan di Google Sheet & Database!' : 'Tersimpan di database (sinkron Sheet tertunda).', ok ? 'success' : 'info');
      } else {
        await dbSavePromise;
        showToast(isPremiumUser() ? 'Struk berhasil dicatat!' : 'Struk demo tercatat di aplikasi!', 'success');
      }
    } catch (err) {
      hideLoader();
      showToast(err.message || 'Gagal menyimpan struk.', 'error');
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

// Ambil email bot Service Account dari /api/sheets agar user bisa Share Restricted Sheet
async function loadSheetBotEmail() {
  const input = $('bot-email-display');
  if (!input || !state.auth?.token) return;
  try {
    const res = await fetch('/api/sheets', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ action: 'config' }),
    });
    const data = await res.json().catch(() => ({}));
    if (data.ok && data.botEmail) {
      input.value = data.botEmail;
    } else {
      input.value = 'Belum dikonfigurasi (GOOGLE_CLIENT_EMAIL)';
    }
  } catch {
    input.value = 'Gagal memuat email bot';
  }
}

// Init
export async function initApp() {
  loadState();
  state.auth = loadAuthSession();
  enhanceAllSelects();
  bindEvents();
  renderAll();
  registerSW();

  if (!state.auth.token) {
    openModal('modal-login');
    return;
  }

  try {
    const res = await fetch('/api/auth/verify', {
      method: 'POST',
      headers: getAuthHeaders(),
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
    if (isValidSheetUrl(state.settings.sheetUrl)) saveSheetSession(state.settings.sheetUrl);
    renderAll();
    loadSheetBotEmail();
    loadFriends();
  } catch {
    openModal('modal-login');
    return;
  }

  if (!String(state.auth.user.email || '').trim()) {
    openAccountModal({ requireEmail: true });
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
