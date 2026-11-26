/**
 * CatatStruk - Google Apps Script Webhook (2-Way: Export & Import)
 * Tempel kode ini ke Extensions > Apps Script di Google Sheet pribadi Anda,
 * lalu Deploy > New deployment > Web app (Who has access: Anyone).
 */
function doGet(e) {
  try {
    var sheetUrl = e && e.parameter && e.parameter.sheetUrl ? String(e.parameter.sheetUrl) : '';
    var ss = sheetUrl ? SpreadsheetApp.openByUrl(sheetUrl) : SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('CatatStruk') || ss.getSheets()[0];
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
        date: formatSheetDate(r[1]),
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

function formatSheetDate(val) {
  if (val instanceof Date) {
    return Utilities.formatDate(val, Session.getScriptTimeZone(), 'yyyy-MM-dd');
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
    }

    var rows = Array.isArray(data.rows) ? data.rows : [data];
    rows.forEach(function (r) {
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
}
