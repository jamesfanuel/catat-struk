/**
 * CatatStruk - Google Apps Script Webhook (2-Way: Export & Import)
 * Fitur:
 * - Merge cell otomatis untuk baris dengan ID yang sama (Tanggal, Toko, Kategori, Metode, Catatan, Synced At)
 * - Baris TOTAL otomatis di paling bawah dengan rumus =SUM(F2:F...)
 * - Synced At mengikuti jam lokal PC/browser (YYYY-MM-DD HH:mm:ss)
 */
var EXPECTED_HEADERS = [
  'ID',
  'Tanggal',
  'Toko',
  'Kategori',
  'Item',
  'Total (Rp)',
  'Metode Bayar',
  'Catatan',
  'Synced At'
];

function isSheetHeaderValid(sheet) {
  if (!sheet || sheet.getLastRow() === 0) return true;
  var row1 = sheet.getRange(1, 1, 1, EXPECTED_HEADERS.length).getValues()[0];
  for (var i = 0; i < EXPECTED_HEADERS.length; i++) {
    if (String(row1[i] || '').trim() !== EXPECTED_HEADERS[i]) {
      return false;
    }
  }
  return true;
}

function doGet(e) {
  try {
    var sheetUrl = e && e.parameter && e.parameter.sheetUrl ? String(e.parameter.sheetUrl) : '';
    var ss = sheetUrl ? SpreadsheetApp.openByUrl(sheetUrl) : SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('CatatStruk') || ss.getSheets()[0];
    if (!sheet || sheet.getLastRow() === 0) {
      return jsonOut({ ok: true, empty: true, rows: [] });
    }
    if (!isSheetHeaderValid(sheet)) {
      return jsonOut({
        ok: false,
        invalidFormat: true,
        error: 'Format Google Sheet tidak sesuai. Gunakan Google Sheet kosong, atau Sheet dengan header: ' + EXPECTED_HEADERS.join(', ')
      });
    }
    if (sheet.getLastRow() <= 1) {
      return jsonOut({ ok: true, empty: true, rows: [] });
    }

    var values = sheet.getDataRange().getValues();
    var rows = [];
    var currentMeta = null;

    for (var i = 1; i < values.length; i++) {
      var r = values[i];
      var itemCell = String(r[4] || '').trim();
      if (!r[0] && itemCell.toUpperCase() === 'TOTAL') {
        continue; // Abaikan baris TOTAL paling bawah
      }
      if (!r[0] && !itemCell && !r[2]) continue;

      if (r[0]) {
        currentMeta = {
          id: String(r[0]),
          date: formatSheetDate(r[1], ss.getSpreadsheetTimeZone()),
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

function formatSheetDate(val, tz) {
  if (val instanceof Date) {
    return Utilities.formatDate(val, tz || Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }
  return String(val || '').slice(0, 10);
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
        'ID',
        'Tanggal',
        'Toko',
        'Kategori',
        'Item',
        'Total (Rp)',
        'Metode Bayar',
        'Catatan',
        'Synced At'
      ]);
      sheet.getRange(1, 1, 1, 9).setFontWeight('bold');
    } else {
      // Hapus baris TOTAL lama di paling bawah sebelum menambah data baru
      var lastRow = sheet.getLastRow();
      if (lastRow > 1) {
        var lastItemVal = String(sheet.getRange(lastRow, 5).getValue() || '').trim().toUpperCase();
        var lastIdVal = String(sheet.getRange(lastRow, 1).getValue() || '').trim();
        if (!lastIdVal && lastItemVal === 'TOTAL') {
          sheet.deleteRow(lastRow);
        }
      }
    }

    var rows = Array.isArray(data.rows) ? data.rows : [data];
    // Kelompokkan baris berdasarkan ID agar bisa di-merge vertikal
    var groups = [];
    var groupMap = {};
    rows.forEach(function (r) {
      var key = String(r.id || ('row_' + groups.length));
      if (!groupMap[key]) {
        groupMap[key] = [];
        groups.push(groupMap[key]);
      }
      groupMap[key].push(r);
    });

    var mergeCols = [1, 2, 3, 4, 7, 8, 9];
    groups.forEach(function (grp) {
      var startRow = sheet.getLastRow() + 1;
      grp.forEach(function (r, idx) {
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
        mergeCols.forEach(function (col) {
          sheet.getRange(startRow, col, grp.length, 1).merge().setVerticalAlignment('middle');
        });
      }
    });

    // Tambahkan baris TOTAL di paling bawah & format currency Rupiah pada kolom F
    var lastDataRow = sheet.getLastRow();
    if (lastDataRow >= 2) {
      var totalRow = lastDataRow + 1;
      sheet.appendRow(['', '', '', '', 'TOTAL', '=SUM(F2:F' + lastDataRow + ')', '', '', '']);
      var totalRange = sheet.getRange(totalRow, 1, 1, 9);
      totalRange.setFontWeight('bold').setBackground('#e6f4f1');
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
}
