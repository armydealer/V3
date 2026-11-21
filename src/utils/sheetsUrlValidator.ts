export interface SheetsUrlValidationResult {
  valid: boolean;
  normalizedUrl?: string;
  autoCorrectedNote?: string;
  error?: string;
  hint?: string;
}

export interface SheetsSyncDebugInfo {
  httpStatus: number;
  finalUrl: string;
  redirectCount: number;
  contentType: string;
  snippet?: string;
}

export interface ClassifiedAppsScriptResponse {
  ok: boolean;
  code?: string;
  message: string;
  data?: Record<string, unknown>;
  debug?: SheetsSyncDebugInfo;
}

const ALLOWED_HOSTS = new Set(['script.google.com', 'script.googleusercontent.com']);

/**
 * Strips invisible BiDi / zero-width characters often copied from Persian editors or messengers.
 */
function sanitizeInputUrl(raw: string): string {
  return (raw || '')
    .replace(/[\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g, '')
    .trim();
}

/**
 * Pure validator & normalizer for Google Apps Script Web App URLs.
 * - Accepts canonical /macros/s/<ID>/exec
 * - Auto-normalizes multi-account /macros/u/<N>/s/<ID>/exec -> /macros/s/<ID>/exec (avoids Google login redirect!)
 * - Auto-normalizes Google Workspace /a/macros/<domain>/[u/<N>/]s/<ID>/exec
 * - Auto-converts bare Deployment IDs (AKfycb...) into full Web App URLs
 * - Rejects non-Google hosts / HTTP (SSRF protection)
 */
export function validateAppsScriptUrl(rawUrl: string): SheetsUrlValidationResult {
  const cleaned = sanitizeInputUrl(rawUrl);
  if (!cleaned) {
    return {
      valid: false,
      error: 'لطفاً ابتدا نشانی Web App گوگل شیت را وارد کنید.',
    };
  }

  // Common mistake: User copied the "Deployment ID" (AKfycb...) instead of the full Web app URL
  if (/^AKfycb[a-zA-Z0-9_-]{18,}$/.test(cleaned)) {
    return {
      valid: true,
      normalizedUrl: `https://script.google.com/macros/s/${cleaned}/exec`,
      autoCorrectedNote: 'شناسه Deployment ID به‌صورت خودکار به نشانی کامل Web App تبدیل شد.',
    };
  }

  let parsed: URL;
  try {
    parsed = new URL(cleaned);
  } catch {
    return {
      valid: false,
      error: 'قالب نشانی واردشده معتبر نیست. نشانی باید با https://script.google.com/macros/s/ شروع شود.',
    };
  }

  if (parsed.protocol !== 'https:') {
    return {
      valid: false,
      error: 'نشانی وب‌هوک گوگل شیت باید حتماً با پروتکل امن https:// باشد.',
    };
  }

  const host = parsed.hostname.toLowerCase();

  // Common mistake #1: Pasting the spreadsheet URL instead of the deployed Web App URL
  if (host === 'docs.google.com' && parsed.pathname.includes('/spreadsheets')) {
    return {
      valid: false,
      error: 'این نشانی خود فایل گوگل شیت است، نه نشانی Web App اسکریپت!',
      hint: 'در گوگل شیت از منوی Extensions → Apps Script → Deploy → New deployment → Web app بروید و نشانی منتهی به /exec را کپی کنید.',
    };
  }

  if (!ALLOWED_HOSTS.has(host)) {
    return {
      valid: false,
      error: 'نشانی باید مربوط به دامنه رسمی script.google.com باشد.',
      hint: 'مثال صحیح: https://script.google.com/macros/s/AKfycb.../exec',
    };
  }

  // Common mistake #2: Pasting the Apps Script editor URL
  if (parsed.pathname.includes('/home/projects/') || /\/edit\/?$/i.test(parsed.pathname)) {
    return {
      valid: false,
      error: 'این نشانی ویرایشگر Apps Script است، نه نشانی منتشرشده (Web App)!',
      hint: 'دکمه آبی Deploy → New deployment → نوع Web app را بزنید و لینک نهایی منتهی به /exec را کپی کنید.',
    };
  }

  // Common mistake #3: Pasting the /dev test deployment URL
  if (/\/dev\/?$/i.test(parsed.pathname)) {
    return {
      valid: false,
      error: 'نشانی منتهی به /dev فقط برای تست داخلی گوگل است و از بیرون کار نمی‌کند.',
      hint: 'از منوی Deploy → Manage deployments نشانی نسخه اصلی (منتهی به /exec) را کپی کنید.',
    };
  }

  if (host === 'script.google.com') {
    // Match standard /macros/[u/<N>/]s/<ID>/exec OR Workspace /a/macros/<domain>/[u/<N>/]s/<ID>/exec
    const standardMatch = parsed.pathname.match(/^\/macros\/(?:u\/(\d+)\/)?s\/([^/]+)\/exec\/?$/i);
    if (standardMatch) {
      const accountIndex = standardMatch[1];
      const deployId = standardMatch[2];
      return {
        valid: true,
        normalizedUrl: `https://script.google.com/macros/s/${deployId}/exec`,
        autoCorrectedNote: accountIndex
          ? `بخش چندحسابی (/u/${accountIndex}/) به‌صورت خودکار حذف شد تا گوگل صفحه ورود نشان ندهد.`
          : undefined,
      };
    }

    const workspaceMatch = parsed.pathname.match(
      /^\/a\/macros\/([^/]+)\/(?:u\/(\d+)\/)?s\/([^/]+)\/exec\/?$/i
    );
    if (workspaceMatch) {
      const domain = workspaceMatch[1];
      const accountIndex = workspaceMatch[2];
      const deployId = workspaceMatch[3];
      return {
        valid: true,
        normalizedUrl: `https://script.google.com/a/macros/${domain}/s/${deployId}/exec`,
        autoCorrectedNote: accountIndex
          ? `بخش چندحسابی (/u/${accountIndex}/) برای جلوگیری از ریدایرکت ورود حذف شد.`
          : undefined,
      };
    }

    return {
      valid: false,
      error: 'ساختار نشانی Web App ناقص است؛ نشانی صحیح باید شامل /macros/s/.../exec باشد.',
      hint: 'مطمئن شوید لینک کامل Web App URL را از پنجره Deploy بدون حذف ابتدا یا انتهای آن کپی کرده‌اید.',
    };
  }

  const normalizedUrl = `${parsed.origin}${parsed.pathname.replace(/\/+$/, '')}`;
  return {
    valid: true,
    normalizedUrl,
  };
}

/**
 * Extracts a short, readable error snippet from Google Apps Script HTML error pages.
 */
export function extractGoogleErrorSnippet(bodyText: string): string {
  if (!bodyText) return '';
  const withoutScripts = bodyText
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ');

  const knownPattern = withoutScripts.match(
    /(?:TypeError|ReferenceError|SyntaxError|Exception|Authorization is required|Script function not found|Sorry, unable to open the file)[^<\n\r]{0,220}/i
  );
  if (knownPattern) {
    return knownPattern[0].replace(/\s+/g, ' ').trim();
  }

  const plain = withoutScripts
    .replace(/<[^>]+>/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();

  return plain.slice(0, 220);
}

/**
 * Classifies raw HTTP responses from Google Apps Script into clear Persian diagnostics.
 */
export function classifyAppsScriptResponse(
  status: number,
  finalUrl: string,
  contentType: string,
  bodyText: string,
  action: 'push' | 'pull' | 'ping',
  redirectCount = 0
): ClassifiedAppsScriptResponse {
  const lowerUrl = (finalUrl || '').toLowerCase();
  const lowerBody = (bodyText || '').toLowerCase();
  const lowerCt = (contentType || '').toLowerCase();
  const snippet = extractGoogleErrorSnippet(bodyText);

  const debug: SheetsSyncDebugInfo = {
    httpStatus: status,
    finalUrl: finalUrl || '',
    redirectCount,
    contentType: contentType || '',
    snippet: snippet || undefined,
  };

  // 1. Real Google Sign-In redirect or 401/403 (avoid false positives from footer links!)
  const isLoginRedirect =
    lowerUrl.includes('accounts.google.com') ||
    lowerBody.includes('servicelogin') ||
    lowerBody.includes('<title>sign in - google accounts</title>') ||
    lowerBody.includes('<title>google accounts</title>') ||
    status === 401 ||
    status === 403;

  if (isLoginRedirect) {
    return {
      ok: false,
      code: 'AUTH_REQUIRED',
      message:
        'گوگل دسترسی عمومی را نپذیرفت و صفحه ورود (Login) برگرداند. در Apps Script مسیر Deploy → Manage deployments → آیکون مداد (Edit) را باز کنید و هر دو مورد را دقیقاً این‌گونه بگذارید: (۱) Execute as روی «Me» و (۲) Who has access روی «Anyone» (نه Anyone with Google account)، سپس یک New version انتخاب و Deploy کنید.',
      debug,
    };
  }

  // 2. 404 Not Found
  if (
    status === 404 ||
    lowerBody.includes('sorry, unable to open the file') ||
    lowerBody.includes('datei konnte nicht') ||
    lowerBody.includes('page not found')
  ) {
    return {
      ok: false,
      code: 'NOT_FOUND',
      message:
        'نشانی Web App در سرور گوگل پیدا نشد (خطای ۴۰۴). مطمئن شوید لینک کامل .../exec را از پنجره Deploy کپی کرده‌اید و اگر با چند حساب جیمیل وارد شده‌اید، حتماً نشانی را از پنجره Deploy → Manage deployments بردارید.',
      debug,
    };
  }

  // 3. Missing doPost / doGet in deployed script
  if (lowerBody.includes('script function not found')) {
    return {
      ok: false,
      code: 'MISSING_HANDLER',
      message:
        'تابع doPost یا doGet در نسخه منتشرشده اسکریپت پیدا نشد. کد کامل Code.gs را در Apps Script ذخیره (Save) کنید و سپس در Deploy → Manage deployments نسخه را روی «New version» گذاشته و Deploy کنید.',
      debug,
    };
  }

  // 4. Script requires OAuth authorization by owner inside Apps Script editor
  if (lowerBody.includes('authorization is required')) {
    return {
      ok: false,
      code: 'OWNER_AUTH_REQUIRED',
      message:
        'اسکریپت هنوز در حساب گوگل شما مجوز اجرا (Authorize) نگرفته است! در ویرایشگر Apps Script تابع setupAndAuthorize را انتخاب و دکمه Run را بزنید، پنجره Review permissions → Advanced → Go to project → Allow را تایید کنید و دوباره تست بزنید.',
      debug,
    };
  }

  // 5. Try JSON parsing
  let parsed: Record<string, unknown> | null = null;
  try {
    const candidate = JSON.parse(bodyText);
    if (candidate && typeof candidate === 'object') {
      parsed = candidate as Record<string, unknown>;
    }
  } catch {
    parsed = null;
  }

  if (parsed) {
    if (parsed.ok === true) {
      const sheetName =
        typeof parsed.spreadsheetName === 'string' && parsed.spreadsheetName
          ? ` («${parsed.spreadsheetName}»)`
          : '';
      return {
        ok: true,
        message:
          action === 'ping'
            ? `اتصال به گوگل شیت${sheetName} برقرار و کاملاً سالم است.`
            : action === 'pull'
              ? 'آخرین نسخه پشتیبان از گوگل شیت دریافت شد.'
              : `همگام‌سازی دوطرفه با ۶ تب گوگل شیت${sheetName} با موفقیت انجام شد.`,
        data: parsed,
      };
    }

    const errText = typeof parsed.error === 'string' ? parsed.error : '';

    // Backward-compatible ping for older Code.gs without explicit ping handler
    if (action === 'ping' && errText.includes('App_State_Backup')) {
      return {
        ok: true,
        message:
          'اتصال به گوگل شیت برقرار و سالم است! هنوز پشتیبانی ارسال نشده؛ اکنون می‌توانید دکمه «ارسال به ۶ تب گوگل شیت (Push)» را بزنید.',
        data: { ok: true, ping: true, hasBackup: false },
      };
    }

    // Standalone script bug from older Code.gs where getActiveSpreadsheet() returned null
    if (
      errText.includes("reading 'getSheetByName'") ||
      errText.includes('Cannot call method "getSheetByName" of null') ||
      errText.includes('null')
    ) {
      return {
        ok: false,
        code: 'NO_ACTIVE_SPREADSHEET',
        message:
          'اسکریپت به فایل گوگل شیت متصل نیست (احتمالاً مستقیم از script.google.com ساخته شده نه از داخل شیت). کد جدید Code.gs پایین را کپی کنید، در Apps Script جایگزین و Save کنید، سپس Deploy → Manage deployments → Edit → Version: New version → Deploy بزنید (نسخه جدید خودکار فایل شیت می‌سازد).',
        data: parsed,
        debug,
      };
    }

    if (errText.includes('50000 characters')) {
      return {
        ok: false,
        code: 'CELL_LIMIT',
        message:
          'حجم داده پشتیبان از سقف ۵۰ هزار کاراکتر سلول گوگل شیت بیشتر شد. کد جدید Code.gs پایین را کپی کرده و یک New version منتشر کنید تا داده‌ها به‌صورت چندبخشی ذخیره شوند.',
        data: parsed,
        debug,
      };
    }

    return {
      ok: false,
      code: 'SCRIPT_ERROR',
      message: errText
        ? `خطای اجرای اسکریپت گوگل: ${errText}`
        : `اسکریپت گوگل خطا برگرداند (کد HTTP ${status}).`,
      data: parsed,
      debug,
    };
  }

  // 6. Uncaught Apps Script runtime exception rendered as HTML
  if (
    lowerBody.includes('typeerror:') ||
    lowerBody.includes('referenceerror:') ||
    lowerBody.includes('syntaxerror:') ||
    lowerBody.includes('exception:')
  ) {
    return {
      ok: false,
      code: 'SCRIPT_RUNTIME_ERROR',
      message: `اسکریپت گوگل هنگام اجرا دچار خطای کدنویسی شد: ${snippet || 'لطفاً کد جدید Code.gs را دوباره کپی و به عنوان New version منتشر کنید.'}`,
      debug,
    };
  }

  // 7. Generic HTML response
  if (lowerCt.includes('text/html') || lowerBody.includes('<!doctype html') || lowerBody.includes('<html')) {
    return {
      ok: false,
      code: 'HTML_RESPONSE',
      message:
        'گوگل به جای پاسخ JSON یک صفحه وب برگرداند. مطمئن شوید: (۱) کد کامل Code.gs را Save کرده‌اید، (۲) Execute as روی «Me» و Who has access روی «Anyone» است، و (۳) پس از آخرین تغییر، در Manage deployments گزینه «New version» را Deploy کرده‌اید.',
      debug,
    };
  }

  return {
    ok: false,
    code: 'UNEXPECTED_RESPONSE',
    message: `پاسخ نامعتبر از گوگل شیت دریافت شد (کد وضعیت ${status}).`,
    debug,
  };
}
