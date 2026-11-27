import crypto from 'node:crypto';

const SHEET_URL_RE = /^https:\/\/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9-_]+)(?:\/.*)?$/;
const HEADERS = [
  'ID',
  'Tanggal',
  'Toko',
  'Kategori',
  'Item',
  'Total (Rp)',
  'Metode Bayar',
  'Catatan',
  'Synced At',
];

const MONTH_NAMES_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

function extractSheetId(url) {
  const match = String(url || '').trim().match(SHEET_URL_RE);
  return match ? match[1] : null;
}

function base64Url(input) {
  return Buffer.from(input).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function normalizePrivateKey(raw) {
  let key = String(raw || '').trim();
  if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) {
    key = key.slice(1, -1);
  }
  return key.replace(/\\r\\n/g, '\n').replace(/\\n/g, '\n').replace(/\r\n/g, '\n').trim();
}

function hexToRgb(hex) {
  const clean = hex.replace('#', '');
  const n = parseInt(clean, 16);
  return {
    red: ((n >> 16) & 255) / 255,
    green: ((n >> 8) & 255) / 255,
    blue: (n & 255) / 255,
  };
}

function getWibTimestamp() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(new Date());
  const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  const hour = map.hour === '24' ? '00' : map.hour;
  return `${map.year}-${map.month}-${map.day} ${hour}:${map.minute}:${map.second}`;
}

function getWibYear() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric' }).format(new Date());
}

function getWibDate() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function isMonthBannerCell(val) {
  const s = String(val || '').trim();
  if (!s) return false;
  if (s.startsWith('📅')) return true;
  return /^(Januari|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember)(\s+\d{4})?$/i.test(s);
}

function extractYear(dateStr) {
  const m = String(dateStr || '').trim().match(/^(\d{4})/);
  return m ? m[1] : getWibYear();
}

function extractMonth(dateStr) {
  const m = String(dateStr || '').trim().match(/^\d{4}-(\d{2})/);
  if (m) {
    const num = parseInt(m[1], 10);
    if (num >= 1 && num <= 12) return String(num).padStart(2, '0');
  }
  return '01';
}

function isHeaderValid(row1) {
  if (!row1 || row1.length === 0) return true;
  return HEADERS.every((h, idx) => String(row1[idx] || '').trim() === h);
}

function parseSheetValues(values) {
  if (!values || values.length <= 1) return [];
  const rows = [];
  let currentMeta = null;

  for (let i = 1; i < values.length; i++) {
    const r = values[i] || [];
    const colA = String(r[0] || '').trim();
    const itemCell = String(r[4] || '').trim();
    const itemUpper = itemCell.toUpperCase();

    if (isMonthBannerCell(colA)) {
      currentMeta = null;
      continue;
    }
    if (itemUpper === 'TOTAL' || itemUpper.startsWith('TOTAL ') || itemUpper.startsWith('SUBTOTAL')) {
      currentMeta = null;
      continue;
    }
    if (!colA && !itemCell && !r[2]) continue;

    if (colA) {
      currentMeta = {
        id: colA,
        date: String(r[1] || '').trim().slice(0, 10),
        merchant: String(r[2] || 'Struk'),
        category: String(r[3] || 'Lainnya'),
        paymentMethod: String(r[6] || 'QRIS'),
        notes: String(r[7] || ''),
        syncedAt: String(r[8] || '').replace(/^'/, '').trim(),
      };
    }
    if (!currentMeta) continue;

    const rawTotal = r[5];
    const numTotal = typeof rawTotal === 'number'
      ? rawTotal
      : Number(String(rawTotal || '0').replace(/[^\d]/g, ''));

    rows.push({
      id: currentMeta.id,
      date: currentMeta.date,
      merchant: currentMeta.merchant,
      category: currentMeta.category,
      itemsText: itemCell,
      total: Math.max(0, Math.round(numTotal || 0)),
      paymentMethod: currentMeta.paymentMethod,
      notes: currentMeta.notes,
      syncedAt: currentMeta.syncedAt,
    });
  }
  return rows;
}

function groupRowsToReceipts(rows) {
  const receipts = [];
  const map = new Map();
  const fallbackNow = getWibTimestamp();
  const fallbackDate = getWibDate();

  for (const r of rows || []) {
    const key = String(r.id || `row_${receipts.length}`);
    if (!map.has(key)) {
      const rec = {
        id: key,
        date: String(r.date || '').trim().slice(0, 10) || fallbackDate,
        merchant: String(r.merchant || 'Struk'),
        category: String(r.category || 'Lainnya'),
        paymentMethod: String(r.paymentMethod || 'QRIS'),
        notes: String(r.notes || ''),
        syncedAt: String(r.syncedAt || '').replace(/^'/, '').trim() || fallbackNow,
        items: [],
      };
      map.set(key, rec);
      receipts.push(rec);
    }
    map.get(key).items.push({
      itemsText: String(r.itemsText || ''),
      total: Math.max(0, Math.round(Number(r.total) || 0)),
    });
  }
  return receipts;
}

async function getGoogleAccessToken(clientEmail, privateKey) {
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim = base64Url(
    JSON.stringify({
      iss: clientEmail,
      scope: 'https://www.googleapis.com/auth/spreadsheets',
      aud: 'https://oauth2.googleapis.com/token',
      exp: now + 3600,
      iat: now,
    })
  );
  const signingInput = `${header}.${claim}`;
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(signingInput);
  const signature = base64Url(signer.sign(normalizePrivateKey(privateKey)));

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${signingInput}.${signature}`,
    }),
  });
  const tokenJson = await tokenRes.json();
  if (!tokenRes.ok || !tokenJson.access_token) {
    throw new Error(tokenJson.error_description || 'Gagal autentikasi Google Service Account');
  }
  return tokenJson.access_token;
}

async function sheetsApiFetch(url, token, options = {}, clientEmail = '') {
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const rawMsg = data?.error?.message || '';
    if (res.status === 403 || rawMsg.toLowerCase().includes('permission')) {
      throw new Error(
        `Akses ditolak. Pastikan Anda sudah Share Google Sheet sebagai Editor ke email bot: ${clientEmail}`
      );
    }
    throw new Error(rawMsg || 'Gagal mengakses Google Sheet.');
  }
  return data;
}

async function getSpreadsheetMeta(spreadsheetId, token, clientEmail) {
  return sheetsApiFetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=properties.timeZone,sheets.properties`,
    token,
    {},
    clientEmail
  );
}

function getRelevantSheets(sheets = []) {
  const matched = sheets.filter((s) => {
    const t = s?.properties?.title || '';
    return /^\d{4}$/.test(t) || t === 'CatatStruk' || t === 'Sheet1';
  });
  if (matched.length > 0) return matched;
  return sheets.length > 0 ? [sheets[0]] : [];
}

async function readSheetValues(spreadsheetId, sheetTitle, token, clientEmail) {
  const range = `'${sheetTitle.replace(/'/g, "''")}'!A1:I`;
  const data = await sheetsApiFetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueRenderOption=UNFORMATTED_VALUE`,
    token,
    {},
    clientEmail
  );
  return data.values || [];
}

async function getOrCreateYearSheet(spreadsheetId, meta, year, token, clientEmail) {
  const sheets = meta.sheets || [];
  const existing = sheets.find((s) => s?.properties?.title === year);
  if (existing) return existing.properties;

  const defaultSheet = sheets.find((s) => s?.properties?.title === 'Sheet1');
  if (defaultSheet) {
    const vals = await readSheetValues(spreadsheetId, 'Sheet1', token, clientEmail);
    if (vals.length === 0) {
      await sheetsApiFetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
        token,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            requests: [
              {
                updateSheetProperties: {
                  properties: { sheetId: defaultSheet.properties.sheetId, title: year },
                  fields: 'title',
                },
              },
            ],
          }),
        },
        clientEmail
      );
      defaultSheet.properties.title = year;
      return defaultSheet.properties;
    }
  }

  const created = await sheetsApiFetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
    token,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: [{ addSheet: { properties: { title: year } } }],
      }),
    },
    clientEmail
  );
  const props = created?.replies?.[0]?.addSheet?.properties;
  meta.sheets.push({ properties: props });
  return props;
}

async function renderYearSheetApi(spreadsheetId, sheetProps, year, receipts, token, clientEmail) {
  const numericSheetId = sheetProps.sheetId;
  const sheetTitle = sheetProps.title;

  receipts.sort((a, b) => {
    if (a.date < b.date) return -1;
    if (a.date > b.date) return 1;
    if (a.id < b.id) return -1;
    if (a.id > b.id) return 1;
    return 0;
  });

  const byMonth = {};
  for (const rec of receipts) {
    const m = extractMonth(rec.date);
    if (!byMonth[m]) byMonth[m] = [];
    byMonth[m].push(rec);
  }

  const monthKeys = Object.keys(byMonth).sort();
  const allValues = [HEADERS.slice()];
  const monthBannerRows = [];
  const subtotalRows = [];
  const mergeReceiptOps = [];
  const mergeCols = [0, 1, 2, 3, 6, 7, 8];

  for (const mKey of monthKeys) {
    const mIdx = parseInt(mKey, 10) - 1;
    const monthLabel = MONTH_NAMES_ID[mIdx] || mKey;

    const bannerRowNum = allValues.length + 1;
    allValues.push([`📅 ${monthLabel}`, '', '', '', '', '', '', '', '']);
    monthBannerRows.push(bannerRowNum);

    const monthStartRow = allValues.length + 1;
    for (const rec of byMonth[mKey]) {
      const recStartRow = allValues.length + 1;
      rec.items.forEach((item, idx) => {
        allValues.push([
          idx === 0 ? rec.id : '',
          idx === 0 ? `'${rec.date}` : '',
          idx === 0 ? rec.merchant : '',
          idx === 0 ? rec.category : '',
          item.itemsText,
          item.total,
          idx === 0 ? rec.paymentMethod : '',
          idx === 0 ? rec.notes : '',
          idx === 0 ? `'${rec.syncedAt}` : '',
        ]);
      });
      if (rec.items.length > 1) {
        mergeReceiptOps.push({ startRow: recStartRow, numRows: rec.items.length });
      }
    }
    const monthEndRow = allValues.length;

    const subtotalRowNum = allValues.length + 1;
    allValues.push([
      'Total Transaksi',
      '',
      `=COUNTA(A${monthStartRow}:A${monthEndRow})`,
      '',
      `Subtotal ${monthLabel}`,
      `=SUM(F${monthStartRow}:F${monthEndRow})`,
      '',
      '',
      '',
    ]);
    subtotalRows.push(subtotalRowNum);
  }

  const lastDataRow = allValues.length;
  let grandTotalRow = null;
  if (lastDataRow >= 2 && subtotalRows.length > 0) {
    allValues.push(['', '', '', '', '', '', '', '', '']);
    grandTotalRow = allValues.length + 1;
    const grandTxFormula = '=' + subtotalRows.map((r) => `C${r}`).join('+');
    const grandTotalFormula = '=' + subtotalRows.map((r) => `F${r}`).join('+');
    allValues.push(['Total Transaksi', '', grandTxFormula, '', 'TOTAL', grandTotalFormula, '', '', '']);
  }

  const numRows = allValues.length;
  const escapedTitle = sheetTitle.replace(/'/g, "''");

  await sheetsApiFetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(`'${escapedTitle}'!A:Z`)}:clear`,
    token,
    { method: 'POST', headers: { 'Content-Type': 'application/json' } },
    clientEmail
  );

  await sheetsApiFetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(`'${escapedTitle}'!A1:I${numRows}`)}?valueInputOption=USER_ENTERED`,
    token,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ values: allValues }),
    },
    clientEmail
  );

  const requests = [
    { unmergeCells: { range: { sheetId: numericSheetId } } },
    {
      updateSheetProperties: {
        properties: { sheetId: numericSheetId, gridProperties: { frozenRowCount: 1 } },
        fields: 'gridProperties.frozenRowCount',
      },
    },
    {
      repeatCell: {
        range: { sheetId: numericSheetId, startRowIndex: 0, endRowIndex: numRows, startColumnIndex: 0, endColumnIndex: 9 },
        cell: { userEnteredFormat: { wrapStrategy: 'WRAP' } },
        fields: 'userEnteredFormat.wrapStrategy',
      },
    },
    {
      repeatCell: {
        range: { sheetId: numericSheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 9 },
        cell: { userEnteredFormat: { backgroundColor: hexToRgb('#f8fafc'), textFormat: { bold: true } } },
        fields: 'userEnteredFormat(backgroundColor,textFormat.bold)',
      },
    },
  ];

  if (numRows > 1) {
    requests.push({
      repeatCell: {
        range: { sheetId: numericSheetId, startRowIndex: 1, endRowIndex: numRows, startColumnIndex: 5, endColumnIndex: 6 },
        cell: { userEnteredFormat: { numberFormat: { type: 'CURRENCY', pattern: '"Rp "#,##0' } } },
        fields: 'userEnteredFormat.numberFormat',
      },
    });
  }

  for (const rNum of monthBannerRows) {
    requests.push(
      { mergeCells: { range: { sheetId: numericSheetId, startRowIndex: rNum - 1, endRowIndex: rNum, startColumnIndex: 0, endColumnIndex: 9 }, mergeType: 'MERGE_ALL' } },
      { repeatCell: { range: { sheetId: numericSheetId, startRowIndex: rNum - 1, endRowIndex: rNum, startColumnIndex: 0, endColumnIndex: 9 }, cell: { userEnteredFormat: { backgroundColor: hexToRgb('#d1fae5'), textFormat: { bold: true, foregroundColor: hexToRgb('#065f46') } } }, fields: 'userEnteredFormat(backgroundColor,textFormat)' } }
    );
  }

  for (const op of mergeReceiptOps) {
    for (const col of mergeCols) {
      requests.push(
        { mergeCells: { range: { sheetId: numericSheetId, startRowIndex: op.startRow - 1, endRowIndex: op.startRow - 1 + op.numRows, startColumnIndex: col, endColumnIndex: col + 1 }, mergeType: 'MERGE_ALL' } },
        { repeatCell: { range: { sheetId: numericSheetId, startRowIndex: op.startRow - 1, endRowIndex: op.startRow - 1 + op.numRows, startColumnIndex: col, endColumnIndex: col + 1 }, cell: { userEnteredFormat: { verticalAlignment: 'MIDDLE' } }, fields: 'userEnteredFormat.verticalAlignment' } }
      );
    }
  }

  const addSummaryRowRequests = (rNum, bgHex) => {
    requests.push(
      { repeatCell: { range: { sheetId: numericSheetId, startRowIndex: rNum - 1, endRowIndex: rNum, startColumnIndex: 0, endColumnIndex: 9 }, cell: { userEnteredFormat: { backgroundColor: hexToRgb(bgHex), textFormat: { bold: true } } }, fields: 'userEnteredFormat(backgroundColor,textFormat.bold)' } },
      { mergeCells: { range: { sheetId: numericSheetId, startRowIndex: rNum - 1, endRowIndex: rNum, startColumnIndex: 0, endColumnIndex: 2 }, mergeType: 'MERGE_ALL' } },
      { mergeCells: { range: { sheetId: numericSheetId, startRowIndex: rNum - 1, endRowIndex: rNum, startColumnIndex: 2, endColumnIndex: 4 }, mergeType: 'MERGE_ALL' } },
      { repeatCell: { range: { sheetId: numericSheetId, startRowIndex: rNum - 1, endRowIndex: rNum, startColumnIndex: 2, endColumnIndex: 4 }, cell: { userEnteredFormat: { horizontalAlignment: 'CENTER', numberFormat: { type: 'NUMBER', pattern: '0' } } }, fields: 'userEnteredFormat(horizontalAlignment,numberFormat)' } }
    );
  };

  for (const rNum of subtotalRows) addSummaryRowRequests(rNum, '#f1f5f9');
  if (grandTotalRow) addSummaryRowRequests(grandTotalRow, '#ccfbf1');

  requests.push(
    { autoResizeDimensions: { dimensions: { sheetId: numericSheetId, dimension: 'COLUMNS', startIndex: 0, endIndex: 9 } } },
    { updateDimensionProperties: { range: { sheetId: numericSheetId, dimension: 'COLUMNS', startIndex: 4, endIndex: 5 }, properties: { pixelSize: 175 }, fields: 'pixelSize' } }
  );

  await sheetsApiFetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
    token,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ requests }) },
    clientEmail
  );
}

export async function handleSheetsAction({ action, sheetUrl, rows }) {
  const clientEmail = String(process.env.GOOGLE_CLIENT_EMAIL || '').trim();
  const privateKey = String(process.env.GOOGLE_PRIVATE_KEY || '').trim();
  const bridgeUrl = String(process.env.APPS_SCRIPT_BRIDGE_URL || '').trim();

  if (action === 'config') {
    return {
      status: 200,
      body: {
        ok: true,
        mode: clientEmail && privateKey ? 'service_account' : (bridgeUrl ? 'bridge' : 'unconfigured'),
        botEmail: clientEmail,
      },
    };
  }

  const sheetId = extractSheetId(sheetUrl);
  if (!sheetId) {
    return {
      status: 400,
      body: {
        ok: false,
        error: 'Link Google Sheet tidak valid. Gunakan link https://docs.google.com/spreadsheets/d/...',
      },
    };
  }

  if (clientEmail && privateKey) {
    const token = await getGoogleAccessToken(clientEmail, privateKey);
    const meta = await getSpreadsheetMeta(sheetId, token, clientEmail);
    const relevant = getRelevantSheets(meta.sheets);

    if (action === 'ping' || action === 'validate' || action === 'import') {
      const allRows = [];
      for (const sh of relevant) {
        const title = sh?.properties?.title;
        if (!title) continue;
        const values = await readSheetValues(sheetId, title, token, clientEmail);
        if (values.length === 0) continue;
        if (!isHeaderValid(values[0])) {
          return {
            status: 400,
            body: {
              ok: false,
              invalidFormat: true,
              error: `Format Google Sheet "${title}" tidak sesuai. Gunakan Google Sheet kosong atau Sheet dengan header: ${HEADERS.join(', ')}`,
            },
          };
        }
        if (action === 'import') allRows.push(...parseSheetValues(values));
      }
      if (action === 'import') {
        return { status: 200, body: { ok: true, empty: allRows.length === 0, rows: allRows } };
      }
      return { status: 200, body: { ok: true, message: 'Google Sheet terhubung!' } };
    }

    const incomingRows = Array.isArray(rows) ? rows : [];
    if (incomingRows.length === 0) return { status: 200, body: { ok: true, count: 0 } };

    const incomingReceipts = groupRowsToReceipts(incomingRows);
    const incomingByYear = {};
    for (const rec of incomingReceipts) {
      const year = extractYear(rec.date);
      if (!incomingByYear[year]) incomingByYear[year] = [];
      incomingByYear[year].push(rec);
    }

    for (const year of Object.keys(incomingByYear).sort()) {
      const sheetProps = await getOrCreateYearSheet(sheetId, meta, year, token, clientEmail);
      const existingValues = await readSheetValues(sheetId, sheetProps.title, token, clientEmail);
      const existingReceipts = groupRowsToReceipts(parseSheetValues(existingValues));

      const mergedMap = new Map();
      const mergedList = [];
      for (const rec of existingReceipts) {
        mergedMap.set(rec.id, rec);
        mergedList.push(rec);
      }
      for (const rec of incomingByYear[year]) {
        if (mergedMap.has(rec.id)) {
          const idx = mergedList.indexOf(mergedMap.get(rec.id));
          if (idx !== -1) mergedList[idx] = rec;
          mergedMap.set(rec.id, rec);
        } else {
          mergedMap.set(rec.id, rec);
          mergedList.push(rec);
        }
      }

      await renderYearSheetApi(sheetId, sheetProps, year, mergedList, token, clientEmail);
    }

    return { status: 200, body: { ok: true, count: incomingRows.length } };
  }

  if (bridgeUrl) {
    if (action === 'import') {
      const r = await fetch(`${bridgeUrl}?sheetUrl=${encodeURIComponent(sheetUrl)}`);
      const data = await r.json().catch(() => ({ ok: false, error: 'Respon Apps Script tidak valid' }));
      return { status: r.ok ? 200 : 400, body: data };
    }
    const r = await fetch(bridgeUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action, sheetUrl, rows }),
    });
    const data = await r.json().catch(() => ({ ok: r.ok }));
    return { status: r.ok && data.ok !== false ? 200 : 400, body: data };
  }

  return {
    status: 503,
    body: {
      ok: false,
      error: 'Server belum dikonfigurasi. Set GOOGLE_CLIENT_EMAIL & GOOGLE_PRIVATE_KEY (atau APPS_SCRIPT_BRIDGE_URL) di .env.',
    },
  };
}
