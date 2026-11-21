export const APPS_SCRIPT_CODE_GS = `/**
 * شیرین‌تراز OS — اسکریپت همگام‌سازی دوطرفه با گوگل شیت (نسخه ۲ مقاوم)
 * سازگار با هر دو حالت: اسکریپت داخل شیت (Container-bound) و اسکریپت مستقل (Standalone)
 * ۶ تب رابطه‌ای استاندارد:
 * Ingredients | Recipes_Costing | Overhead_Payroll | Checks_Cashflow | Forecast_Snapshot | App_State_Backup
 */

const TAB_NAMES = [
  'Ingredients',
  'Recipes_Costing',
  'Overhead_Payroll',
  'Checks_Cashflow',
  'Forecast_Snapshot',
  'App_State_Backup'
];

const CHUNK_SIZE = 45000;

/**
 * اجرای یک‌باره برای تایید مجوزهای گوگل و ساخت خودکار تب‌ها (اختیاری ولی پیشنهادی)
 */
function setupAndAuthorize() {
  const ss = getTargetSpreadsheet_();
  TAB_NAMES.forEach(function(name) { getOrCreateSheet_(ss, name); });
  Logger.log('آماده است! نشانی فایل گوگل شیت: ' + ss.getUrl());
}

/**
 * اگر اسکریپت داخل یک فایل شیت باشد همان فایل را باز می‌کند؛
 * و اگر مستقل در script.google.com ساخته شده باشد، به‌صورت خودکار فایل شیت می‌سازد و ذخیره می‌کند.
 */
function getTargetSpreadsheet_() {
  let ss = SpreadsheetApp.getActiveSpreadsheet();
  if (ss) return ss;

  const props = PropertiesService.getScriptProperties();
  const savedId = props.getProperty('SHIRINTARAZ_SHEET_ID');
  if (savedId) {
    try {
      return SpreadsheetApp.openById(savedId);
    } catch (e) {
      // فایل قبلی حذف شده، فایل جدید ساخته می‌شود
    }
  }

  ss = SpreadsheetApp.create('شیرین‌تراز OS - پایگاه داده کارگاه');
  props.setProperty('SHIRINTARAZ_SHEET_ID', ss.getId());
  return ss;
}

function getOrCreateSheet_(ss, name) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }
  return sheet;
}

function writeTable_(sheet, headers, rows) {
  sheet.clearContents();
  const colCount = headers.length;
  const safeRows = (rows || []).map(function(row) {
    const arr = Array.isArray(row) ? row.slice(0, colCount) : [];
    while (arr.length < colCount) arr.push('');
    return arr.map(function(cell) {
      return cell === null || cell === undefined ? '' : cell;
    });
  });

  const data = [headers].concat(safeRows);
  if (data.length > 0 && colCount > 0) {
    sheet.getRange(1, 1, data.length, colCount).setValues(data);
    sheet.getRange(1, 1, 1, colCount).setFontWeight('bold');
  }
}

function jsonOut_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    const raw = e && e.postData && e.postData.contents ? e.postData.contents : '{}';
    const payload = JSON.parse(raw);
    const ss = getTargetSpreadsheet_();

    TAB_NAMES.forEach(function(name) { getOrCreateSheet_(ss, name); });

    if (payload.action === 'ping') {
      const backup = ss.getSheetByName('App_State_Backup');
      return jsonOut_({
        ok: true,
        ping: true,
        spreadsheetName: ss.getName(),
        spreadsheetUrl: ss.getUrl(),
        hasBackup: Boolean(backup && backup.getLastRow() >= 2),
      });
    }

    if (payload.action === 'pull') {
      return doGet({});
    }

    // 1. Ingredients
    writeTable_(
      getOrCreateSheet_(ss, 'Ingredients'),
      ['شناسه', 'نام ماده', 'دسته', 'بسته‌بندی', 'مقدار در بسته', 'واحد پایه', 'قیمت بسته (تومان)', 'تورم ماهانه (%)', 'موجودی فعلی', 'حداقل اطمینان'],
      (payload.tables && payload.tables.ingredients) || []
    );

    // 2. Recipes_Costing
    writeTable_(
      getOrCreateSheet_(ss, 'Recipes_Costing'),
      ['شناسه', 'نام شیرینی', 'دسته', 'بهای تمام‌شده/کیلو', 'قیمت ویترین/کیلو', 'سود خالص/کیلو', 'حاشیه سود (%)', 'فروش ماهانه (کیلو)', 'سود در ساعت فر', 'سقف اتحادیه'],
      (payload.tables && payload.tables.recipes) || []
    );

    // 3. Overhead_Payroll
    writeTable_(
      getOrCreateSheet_(ss, 'Overhead_Payroll'),
      ['نوع', 'عنوان / نام', 'دسته / سمت', 'مبلغ پایه ماهانه', 'سربار قانونی / بیمه و عیدی', 'هزینه واقعی کل ماهانه'],
      (payload.tables && payload.tables.overheadPayroll) || []
    );

    // 4. Checks_Cashflow
    writeTable_(
      getOrCreateSheet_(ss, 'Checks_Cashflow'),
      ['نوع چک', 'طرف حساب', 'مبلغ (تومان)', 'سررسید شمسی', 'شناسه صیادی', 'وضعیت'],
      (payload.tables && payload.tables.checks) || []
    );

    // 5. Forecast_Snapshot
    writeTable_(
      getOrCreateSheet_(ss, 'Forecast_Snapshot'),
      ['ماه شمسی', 'مناسبت', 'ضریب فصلی', 'درآمد پایه', 'هزینه کل', 'سود اسمی پایه', 'سود بدبینانه P10', 'سود خوش‌بینانه P90', 'سود واقعی'],
      (payload.tables && payload.tables.forecast) || []
    );

    // 6. App_State_Backup (چندبخشی برای عبور امن از سقف ۵۰ هزار کاراکتر سلول گوگل شیت)
    const backupSheet = getOrCreateSheet_(ss, 'App_State_Backup');
    backupSheet.clearContents();
    const nowIso = new Date().toISOString();
    const serialized = JSON.stringify(payload.state || {});
    const rows = [['UpdatedAt', 'WorkshopName', 'StateJSON']];
    for (let i = 0; i < serialized.length; i += CHUNK_SIZE) {
      rows.push([
        i === 0 ? nowIso : 'CHUNK_' + (Math.floor(i / CHUNK_SIZE) + 1),
        i === 0 ? (payload.workshopName || 'ShirinTaraz OS') : '',
        serialized.slice(i, i + CHUNK_SIZE)
      ]);
    }
    if (rows.length === 1) {
      rows.push([nowIso, (payload.workshopName || 'ShirinTaraz OS'), '{}']);
    }
    backupSheet.getRange(1, 1, rows.length, 3).setValues(rows);
    backupSheet.getRange(1, 1, 1, 3).setFontWeight('bold');

    return jsonOut_({
      ok: true,
      syncedAt: nowIso,
      spreadsheetName: ss.getName(),
      spreadsheetUrl: ss.getUrl(),
    });
  } catch (err) {
    return jsonOut_({ ok: false, error: String(err) });
  }
}

function doGet(e) {
  try {
    const ss = getTargetSpreadsheet_();
    const backupSheet = ss.getSheetByName('App_State_Backup');

    if (e && e.parameter && e.parameter.action === 'ping') {
      return jsonOut_({
        ok: true,
        ping: true,
        spreadsheetName: ss.getName(),
        spreadsheetUrl: ss.getUrl(),
        hasBackup: Boolean(backupSheet && backupSheet.getLastRow() >= 2),
      });
    }

    if (!backupSheet || backupSheet.getLastRow() < 2) {
      return jsonOut_({ ok: false, error: 'نسخه پشتیبانی در تب App_State_Backup یافت نشد.' });
    }

    const lastRow = backupSheet.getLastRow();
    const updatedAt = backupSheet.getRange(2, 1).getValue();
    const chunks = backupSheet.getRange(2, 3, lastRow - 1, 1).getValues();
    const rawState = chunks.map(function(r) { return String(r[0] || ''); }).join('');

    return jsonOut_({
      ok: true,
      updatedAt: updatedAt,
      spreadsheetName: ss.getName(),
      spreadsheetUrl: ss.getUrl(),
      state: JSON.parse(rawState),
    });
  } catch (err) {
    return jsonOut_({ ok: false, error: String(err) });
  }
}
`;
