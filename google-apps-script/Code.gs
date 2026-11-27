/**
 * CatatStruk - Google Apps Script Webhook (2-Way: Export & Import)
 * Fitur:
 * - Pisah tab/sheet otomatis per Tahun (contoh: "2025", "2026")
 * - Grouping per Bulan di dalam setiap sheet Tahun (Header Bulan + Subtotal per Bulan + TOTAL Tahun)
 * - Merge cell otomatis untuk baris dengan ID yang sama (Tanggal, Toko, Kategori, Metode, Catatan, Synced At)
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

var MONTH_NAMES_ID = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember'
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

function isMonthBannerCell(val) {
  var s = String(val || '').trim();
  if (!s) return false;
  if (s.indexOf('📅') === 0) return true;
  return /^(Januari|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember)(\s+\d{4})?$/i.test(s);
}

function formatSheetDate(val, tz) {
  if (val instanceof Date) {
    return Utilities.formatDate(val, tz || Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }
  return String(val || '').trim().slice(0, 10);
}

function formatSyncedAt(val, tz) {
  if (!val) return '';
  if (val instanceof Date) {
    return Utilities.formatDate(val, tz || Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
  }
  return String(val || '').replace(/^'/, '').trim();
}

function extractYear(dateStr, tz) {
  var m = String(dateStr || '').trim().match(/^(\d{4})/);
  if (m) return m[1];
  return Utilities.formatDate(new Date(), tz || Session.getScriptTimeZone(), 'yyyy');
}

function extractMonth(dateStr) {
  var m = String(dateStr || '').trim().match(/^\d{4}-(\d{2})/);
  if (m) {
    var num = parseInt(m[1], 10);
    if (num >= 1 && num <= 12) {
      return (num < 10 ? '0' : '') + num;
    }
  }
  return '01';
}

function parseSheetRows(sheet, tz) {
  if (!sheet || sheet.getLastRow() <= 1) return [];
  var values = sheet.getDataRange().getValues();
  var rows = [];
  var currentMeta = null;

  for (var i = 1; i < values.length; i++) {
    var r = values[i];
    var colA = String(r[0] || '').trim();
    var itemCell = String(r[4] || '').trim();
    var itemUpper = itemCell.toUpperCase();

    if (isMonthBannerCell(colA)) {
      currentMeta = null;
      continue;
    }
    if (itemUpper === 'TOTAL' || itemUpper.indexOf('TOTAL ') === 0 || itemUpper.indexOf('SUBTOTAL') === 0) {
      currentMeta = null;
      continue;
    }
    if (!colA && !itemCell && !r[2]) continue;

    if (colA) {
      currentMeta = {
        id: colA,
        date: formatSheetDate(r[1], tz),
        merchant: String(r[2] || 'Struk'),
        category: String(r[3] || 'Lainnya'),
        paymentMethod: String(r[6] || 'QRIS'),
        notes: String(r[7] || ''),
        syncedAt: formatSyncedAt(r[8], tz)
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
      notes: currentMeta.notes,
      syncedAt: currentMeta.syncedAt
    });
  }
  return rows;
}

function getRelevantSheetsForRead(ss) {
  var allSheets = ss.getSheets();
  var result = [];
  allSheets.forEach(function (sh) {
    var name = sh.getName();
    if (/^\d{4}$/.test(name) || name === 'CatatStruk' || name === 'Sheet1') {
      result.push(sh);
    }
  });
  if (result.length === 0 && allSheets.length > 0) {
    result.push(allSheets[0]);
  }
  return result;
}

function doGet(e) {
  try {
    var sheetUrl = e && e.parameter && e.parameter.sheetUrl ? String(e.parameter.sheetUrl) : '';
    var ss = sheetUrl ? SpreadsheetApp.openByUrl(sheetUrl) : SpreadsheetApp.getActiveSpreadsheet();
    var tz = ss.getSpreadsheetTimeZone();
    var sheets = getRelevantSheetsForRead(ss);

    var nonEmptySheets = sheets.filter(function (sh) {
      return sh.getLastRow() > 0;
    });
    if (nonEmptySheets.length === 0) {
      return jsonOut({ ok: true, empty: true, rows: [] });
    }

    var allRows = [];
    for (var s = 0; s < nonEmptySheets.length; s++) {
      var sh = nonEmptySheets[s];
      if (!isSheetHeaderValid(sh)) {
        return jsonOut({
          ok: false,
          invalidFormat: true,
          error: 'Format Google Sheet "' + sh.getName() + '" tidak sesuai. Gunakan Google Sheet kosong, atau Sheet dengan header: ' + EXPECTED_HEADERS.join(', ')
        });
      }
      var parsed = parseSheetRows(sh, tz);
      for (var j = 0; j < parsed.length; j++) {
        allRows.push(parsed[j]);
      }
    }

    if (allRows.length === 0) {
      return jsonOut({ ok: true, empty: true, rows: [] });
    }
    return jsonOut({ ok: true, rows: allRows });
  } catch (err) {
    return jsonOut({ ok: false, error: String(err) });
  }
}

function getOrCreateYearSheet(ss, year) {
  var existing = ss.getSheetByName(year);
  if (existing) return existing;

  var defaultSheet = ss.getSheetByName('Sheet1');
  if (defaultSheet && defaultSheet.getLastRow() === 0) {
    defaultSheet.setName(year);
    return defaultSheet;
  }
  return ss.insertSheet(year);
}

function groupRowsToReceipts(rows, tz) {
  var receipts = [];
  var receiptMap = {};
  var fallbackNow = Utilities.formatDate(new Date(), tz || Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');

  rows.forEach(function (r) {
    var key = String(r.id || ('row_' + receipts.length));
    if (!receiptMap[key]) {
      var rec = {
        id: key,
        date: formatSheetDate(r.date, tz) || Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd'),
        merchant: String(r.merchant || 'Struk'),
        category: String(r.category || 'Lainnya'),
        paymentMethod: String(r.paymentMethod || 'QRIS'),
        notes: String(r.notes || ''),
        syncedAt: formatSyncedAt(r.syncedAt, tz) || fallbackNow,
        items: []
      };
      receiptMap[key] = rec;
      receipts.push(rec);
    }
    receiptMap[key].items.push({
      itemsText: String(r.itemsText || ''),
      total: Math.max(0, Number(r.total) || 0)
    });
  });

  return receipts;
}

function renderYearSheet(sheet, year, receipts) {
  // Urutkan struk berdasarkan tanggal naik, lalu ID
  receipts.sort(function (a, b) {
    if (a.date < b.date) return -1;
    if (a.date > b.date) return 1;
    if (a.id < b.id) return -1;
    if (a.id > b.id) return 1;
    return 0;
  });

  // Kelompokkan berdasarkan bulan ('01'..'12')
  var byMonth = {};
  receipts.forEach(function (rec) {
    var m = extractMonth(rec.date);
    if (!byMonth[m]) byMonth[m] = [];
    byMonth[m].push(rec);
  });

  var monthKeys = Object.keys(byMonth).sort();
  var allValues = [EXPECTED_HEADERS.slice()];
  var monthBannerRows = [];
  var subtotalRows = [];
  var mergeReceiptOps = [];
  var mergeCols = [1, 2, 3, 4, 7, 8, 9];

  monthKeys.forEach(function (mKey) {
    var mIdx = parseInt(mKey, 10) - 1;
    var monthLabel = MONTH_NAMES_ID[mIdx] || mKey;

    // Baris header bulan
    var bannerRowNum = allValues.length + 1;
    allValues.push(['📅 ' + monthLabel, '', '', '', '', '', '', '', '']);
    monthBannerRows.push(bannerRowNum);

    var monthStartRow = allValues.length + 1;
    byMonth[mKey].forEach(function (rec) {
      var recStartRow = allValues.length + 1;
      rec.items.forEach(function (item, idx) {
        allValues.push([
          idx === 0 ? rec.id : '',
          idx === 0 ? rec.date : '',
          idx === 0 ? rec.merchant : '',
          idx === 0 ? rec.category : '',
          item.itemsText,
          item.total,
          idx === 0 ? rec.paymentMethod : '',
          idx === 0 ? rec.notes : '',
          idx === 0 ? rec.syncedAt : ''
        ]);
      });
      if (rec.items.length > 1) {
        mergeReceiptOps.push({ startRow: recStartRow, numRows: rec.items.length });
      }
    });
    var monthEndRow = allValues.length;

    // Baris subtotal bulan (A:B = label "Total Transaksi", C:D = jumlah ID transaksi bulan ini)
    var subtotalRowNum = allValues.length + 1;
    allValues.push([
      'Total Transaksi',
      '',
      '=COUNTA(A' + monthStartRow + ':A' + monthEndRow + ')',
      '',
      'Subtotal ' + monthLabel,
      '=SUM(F' + monthStartRow + ':F' + monthEndRow + ')',
      '',
      '',
      ''
    ]);
    subtotalRows.push(subtotalRowNum);
  });

  var lastDataRow = allValues.length;
  var grandTotalRow = null;
  if (lastDataRow >= 2 && subtotalRows.length > 0) {
    // Beri 1 baris spasi kosong sebelum TOTAL tahunan
    allValues.push(['', '', '', '', '', '', '', '', '']);
    grandTotalRow = allValues.length + 1;
    var grandTxFormula = '=' + subtotalRows.map(function (rNum) {
      return 'C' + rNum;
    }).join('+');
    var grandTotalFormula = '=' + subtotalRows.map(function (rNum) {
      return 'F' + rNum;
    }).join('+');
    allValues.push([
      'Total Transaksi',
      '',
      grandTxFormula,
      '',
      'TOTAL',
      grandTotalFormula,
      '',
      '',
      ''
    ]);
  }

  sheet.clear();
  var numRows = allValues.length;
  // Pastikan kolom Tanggal (B) dan Synced At (I) tetap teks rapi
  if (numRows > 1) {
    sheet.getRange(2, 2, numRows - 1, 1).setNumberFormat('@');
    sheet.getRange(2, 9, numRows - 1, 1).setNumberFormat('@');
  }
  sheet.getRange(1, 1, numRows, 9).setValues(allValues);

  // Header styling, auto-wrap semua sel, & freeze row 1
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, numRows, 9).setWrap(true);
  sheet.getRange(1, 1, 1, 9).setFontWeight('bold').setBackground('#f8fafc');

  // Format angka Rupiah di kolom F
  if (numRows > 1) {
    sheet.getRange(2, 6, numRows - 1, 1).setNumberFormat('"Rp "#,##0');
  }

  // Styling & merge header bulan
  monthBannerRows.forEach(function (rNum) {
    var rng = sheet.getRange(rNum, 1, 1, 9);
    rng.merge().setFontWeight('bold').setBackground('#d1fae5').setFontColor('#065f46');
  });

  // Merge vertikal per ID struk
  mergeReceiptOps.forEach(function (op) {
    mergeCols.forEach(function (col) {
      sheet.getRange(op.startRow, col, op.numRows, 1).merge().setVerticalAlignment('middle');
    });
  });

  // Styling subtotal per bulan (merge A:B untuk label, merge C:D untuk angka total transaksi)
  subtotalRows.forEach(function (rNum) {
    sheet.getRange(rNum, 1, 1, 9).setFontWeight('bold').setBackground('#f1f5f9');
    sheet.getRange(rNum, 1, 1, 2).merge();
    sheet.getRange(rNum, 3, 1, 2).merge().setHorizontalAlignment('center').setNumberFormat('0');
  });

  // Styling grand total tahunan (merge A:B untuk label, merge C:D untuk angka total transaksi)
  if (grandTotalRow) {
    sheet.getRange(grandTotalRow, 1, 1, 9).setFontWeight('bold').setBackground('#ccfbf1');
    sheet.getRange(grandTotalRow, 1, 1, 2).merge();
    sheet.getRange(grandTotalRow, 3, 1, 2).merge().setHorizontalAlignment('center').setNumberFormat('0');
  }

  // Sesuaikan lebar kolom & tinggi baris otomatis; kolom E minimal 175px agar "Subtotal <Bulan>" 1 baris
  sheet.autoResizeColumns(1, 9);
  for (var c = 1; c <= 9; c++) {
    var w = sheet.getColumnWidth(c);
    var minW = c === 5 ? 175 : 95;
    if (w > 260) {
      sheet.setColumnWidth(c, 260);
    } else if (w < minW) {
      sheet.setColumnWidth(c, minW);
    }
  }
  sheet.autoResizeRows(1, numRows);
}

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    if (data.action === 'ping') {
      return jsonOut({ ok: true, message: 'Connected to CatatStruk!' });
    }
    if (data.action === 'send_email') {
      MailApp.sendEmail({
        to: String(data.to || ''),
        name: 'CatatStruk',
        subject: String(data.subject || 'Notifikasi CatatStruk'),
        htmlBody: String(data.htmlBody || '')
      });
      return jsonOut({ ok: true });
    }

    var ss = data.sheetUrl ? SpreadsheetApp.openByUrl(String(data.sheetUrl)) : SpreadsheetApp.getActiveSpreadsheet();
    var tz = ss.getSpreadsheetTimeZone();
    var incomingRows = Array.isArray(data.rows) ? data.rows : [data];
    var incomingReceipts = groupRowsToReceipts(incomingRows, tz);

    // Kelompokkan struk masuk berdasarkan tahun
    var incomingByYear = {};
    incomingReceipts.forEach(function (rec) {
      var year = extractYear(rec.date, tz);
      if (!incomingByYear[year]) incomingByYear[year] = [];
      incomingByYear[year].push(rec);
    });

    Object.keys(incomingByYear).sort().forEach(function (year) {
      var sheet = getOrCreateYearSheet(ss, year);
      var existingRows = parseSheetRows(sheet, tz);
      var existingReceipts = groupRowsToReceipts(existingRows, tz);

      // Gabungkan berdasarkan ID (jika ID sudah ada, replace dengan data terbaru)
      var mergedMap = {};
      var mergedList = [];
      existingReceipts.forEach(function (rec) {
        mergedMap[rec.id] = rec;
        mergedList.push(rec);
      });
      incomingByYear[year].forEach(function (rec) {
        if (mergedMap[rec.id]) {
          var idx = mergedList.indexOf(mergedMap[rec.id]);
          if (idx !== -1) mergedList[idx] = rec;
          mergedMap[rec.id] = rec;
        } else {
          mergedMap[rec.id] = rec;
          mergedList.push(rec);
        }
      });

      renderYearSheet(sheet, year, mergedList);
    });

    return jsonOut({ ok: true, count: incomingRows.length });
  } catch (err) {
    return jsonOut({ ok: false, error: String(err) });
  }
}

function jsonOut(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
