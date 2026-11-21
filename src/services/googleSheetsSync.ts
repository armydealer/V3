import {
  ComputedWorkshopSummary,
  ForecastMonthPoint,
  WorkshopData,
} from '../types';
import { computeTrueMonthlyStaffCost } from '../utils/costEngine';
import {
  SheetsSyncDebugInfo,
  validateAppsScriptUrl,
} from '../utils/sheetsUrlValidator';

export interface SyncResult {
  ok: boolean;
  message: string;
  syncedAt?: string;
  state?: WorkshopData;
  spreadsheetName?: string;
  spreadsheetUrl?: string;
  hasBackup?: boolean;
  autoCorrectedNote?: string;
  code?: string;
  debug?: SheetsSyncDebugInfo;
}

interface ProxyResponse {
  ok?: boolean;
  code?: string;
  message?: string;
  error?: string;
  syncedAt?: string;
  updatedAt?: string;
  state?: WorkshopData;
  spreadsheetName?: string;
  spreadsheetUrl?: string;
  hasBackup?: boolean;
  autoCorrectedNote?: string;
  debug?: SheetsSyncDebugInfo;
}

/**
 * Strips oversized base64 logo (> 8KB) from the Google Sheets JSON backup
 * so older single-cell Apps Script deployments never hit the 50,000-char limit.
 */
function buildSheetsSafeState(data: WorkshopData): WorkshopData {
  if (!data.settings.logoBase64 || data.settings.logoBase64.length <= 8_000) {
    return data;
  }
  return {
    ...data,
    settings: {
      ...data.settings,
      logoBase64: '',
    },
  };
}

async function callSheetsProxy(
  webhookUrl: string,
  action: 'push' | 'pull' | 'ping',
  payload?: Record<string, unknown>
): Promise<ProxyResponse> {
  const res = await fetch('/api/sheets-sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      webhookUrl,
      action,
      ...(payload ? { payload } : {}),
    }),
  });

  const text = await res.text();
  try {
    return JSON.parse(text) as ProxyResponse;
  } catch {
    return {
      ok: false,
      code: 'PROXY_UNAVAILABLE',
      message: `پاسخ نامعتبر از سرور همگام‌سازی داخلی دریافت شد (کد ${res.status}).`,
      debug: {
        httpStatus: res.status,
        finalUrl: '/api/sheets-sync',
        redirectCount: 0,
        contentType: res.headers.get('content-type') ?? '',
        snippet: text.slice(0, 160),
      },
    };
  }
}

/**
 * Verifies that the Google Apps Script Web App URL is reachable and deployed properly.
 */
export async function testGoogleSheetsConnection(webhookUrl: string): Promise<SyncResult> {
  const validation = validateAppsScriptUrl(webhookUrl);
  if (!validation.valid || !validation.normalizedUrl) {
    return {
      ok: false,
      code: 'INVALID_URL',
      message: validation.hint
        ? `${validation.error} ${validation.hint}`
        : validation.error || 'نشانی Web App معتبر نیست.',
    };
  }

  try {
    const parsed = await callSheetsProxy(validation.normalizedUrl, 'ping');
    if (parsed.ok) {
      const sheetLabel = parsed.spreadsheetName ? ` («${parsed.spreadsheetName}»)` : '';
      return {
        ok: true,
        message:
          parsed.message ||
          `اتصال به گوگل شیت${sheetLabel} برقرار و آماده همگام‌سازی است.`,
        spreadsheetName: parsed.spreadsheetName,
        spreadsheetUrl: parsed.spreadsheetUrl,
        hasBackup: parsed.hasBackup,
        autoCorrectedNote: validation.autoCorrectedNote || parsed.autoCorrectedNote,
      };
    }

    return {
      ok: false,
      code: parsed.code,
      message: parsed.message || parsed.error || 'تست اتصال به گوگل شیت ناموفق بود.',
      autoCorrectedNote: validation.autoCorrectedNote,
      debug: parsed.debug,
    };
  } catch (err) {
    return {
      ok: false,
      message:
        err instanceof Error
          ? `خطا در ارتباط با سرور داخلی برنامه: ${err.message}`
          : 'ارتباط با سرور داخلی برنامه برقرار نشد.',
    };
  }
}

/**
 * Push relational tables + full JSON backup to Google Apps Script Webhook
 * via same-origin server proxy (/api/sheets-sync) to eliminate browser CORS & 302 NetworkError.
 */
export async function pushToGoogleSheets(
  webhookUrl: string,
  data: WorkshopData,
  summary: ComputedWorkshopSummary,
  forecast: ForecastMonthPoint[]
): Promise<SyncResult> {
  const validation = validateAppsScriptUrl(webhookUrl);
  if (!validation.valid || !validation.normalizedUrl) {
    return {
      ok: false,
      code: 'INVALID_URL',
      message: validation.hint
        ? `${validation.error} ${validation.hint}`
        : validation.error || 'نشانی Web App معتبر نیست.',
    };
  }

  const safeState = buildSheetsSafeState(data);
  const payload = {
    action: 'push',
    workshopName: data.settings.workshopName,
    state: safeState,
    tables: {
      ingredients: data.ingredients.map((i) => [
        i.id,
        i.name,
        i.category,
        i.packLabel,
        i.packQuantityInBase,
        i.baseUnit,
        i.packPrice,
        i.monthlyInflationPct,
        i.currentStockInBase,
        i.safetyStockInBase,
      ]),
      recipes: summary.recipeMetrics.map((r) => [
        r.recipeId,
        r.name,
        r.category,
        Math.round(r.totalCostPerKg),
        Math.round(r.storefrontPricePerKg),
        Math.round(r.netProfitPerKg),
        Number(r.netMarginPct.toFixed(1)),
        r.monthlySalesKg,
        Math.round(r.profitPerOvenHour),
        data.recipes.find((x) => x.id === r.recipeId)?.unionPriceCeiling ?? '-',
      ]),
      overheadPayroll: [
        ...data.staff.map((s) => {
          const c = computeTrueMonthlyStaffCost(s);
          return [
            'پرسنل',
            s.name,
            s.role,
            Math.round(c.baseAndBenefits),
            Math.round(c.insurance23 + c.eidiAccrual + c.sanavatAccrual),
            Math.round(c.totalTrueCost),
          ];
        }),
        ...data.overheads.map((o) => [
          'سربار ثابت',
          o.name,
          o.category,
          Math.round(o.monthlyAmount),
          0,
          Math.round(o.monthlyAmount),
        ]),
      ],
      checks: data.checks.map((c) => [
        c.type === 'issued' ? 'پرداختی' : 'دریافتی',
        c.counterparty,
        c.amount,
        c.dueDateShamsi,
        c.sayadiId,
        c.status,
      ]),
      forecast: forecast.map((f) => [
        f.shamsiName,
        f.occasion,
        f.seasonalMultiplier,
        f.revenueBase,
        f.totalCostBase,
        f.profitBase,
        f.profitP10,
        f.profitP90,
        f.realProfitBase,
      ]),
    },
  };

  try {
    const parsed = await callSheetsProxy(validation.normalizedUrl, 'push', payload);

    if (parsed.ok) {
      return {
        ok: true,
        message: parsed.message || 'همگام‌سازی دوطرفه با ۶ تب گوگل شیت با موفقیت انجام شد.',
        syncedAt: parsed.syncedAt ?? new Date().toISOString(),
        spreadsheetName: parsed.spreadsheetName,
        spreadsheetUrl: parsed.spreadsheetUrl,
        autoCorrectedNote: validation.autoCorrectedNote || parsed.autoCorrectedNote,
      };
    }

    return {
      ok: false,
      code: parsed.code,
      message: parsed.message || parsed.error || 'ارسال اطلاعات به گوگل شیت ناموفق بود.',
      autoCorrectedNote: validation.autoCorrectedNote,
      debug: parsed.debug,
    };
  } catch (err) {
    return {
      ok: false,
      message:
        err instanceof Error
          ? `خطای اتصال به سرور همگام‌سازی: ${err.message}`
          : 'اتصال به وب‌هوک گوگل شیت برقرار نشد.',
    };
  }
}

/**
 * Pull full workshop JSON backup from Google Apps Script via same-origin server proxy.
 */
export async function pullFromGoogleSheets(webhookUrl: string): Promise<SyncResult> {
  const validation = validateAppsScriptUrl(webhookUrl);
  if (!validation.valid || !validation.normalizedUrl) {
    return {
      ok: false,
      code: 'INVALID_URL',
      message: validation.hint
        ? `${validation.error} ${validation.hint}`
        : validation.error || 'نشانی Web App معتبر نیست.',
    };
  }

  try {
    const parsed = await callSheetsProxy(validation.normalizedUrl, 'pull');
    if (
      parsed.ok &&
      parsed.state &&
      parsed.state.settings &&
      Array.isArray(parsed.state.ingredients)
    ) {
      return {
        ok: true,
        message: 'آخرین نسخه پشتیبان از گوگل شیت بازیابی شد.',
        syncedAt: parsed.updatedAt ?? new Date().toISOString(),
        spreadsheetName: parsed.spreadsheetName,
        spreadsheetUrl: parsed.spreadsheetUrl,
        state: parsed.state,
        autoCorrectedNote: validation.autoCorrectedNote || parsed.autoCorrectedNote,
      };
    }
    return {
      ok: false,
      code: parsed.code,
      message:
        parsed.message || parsed.error || 'داده معتبری در تب App_State_Backup یافت نشد.',
      autoCorrectedNote: validation.autoCorrectedNote,
      debug: parsed.debug,
    };
  } catch (err) {
    return {
      ok: false,
      message:
        err instanceof Error
          ? `خطا در دریافت از گوگل شیت: ${err.message}`
          : 'دریافت اطلاعات از گوگل شیت ناموفق بود.',
    };
  }
}
