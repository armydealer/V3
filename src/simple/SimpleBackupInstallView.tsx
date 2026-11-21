import React, { useRef, useState } from 'react';
import {
  Check,
  Copy,
  Download,
  HardDrive,
  Laptop,
  RotateCcw,
  ShieldCheck,
  Trash2,
  Upload,
} from 'lucide-react';
import { useWorkshop } from '../store/WorkshopContext';
import { WorkshopData } from '../types';
import { PWAInstallButton } from '../components/PWAInstallButton';

const LOCAL_INSTALL_COMMANDS = `npm install
npm run build
npm start`;

export const SimpleBackupInstallView: React.FC = () => {
  const {
    data,
    updateSettings,
    replaceAllData,
    resetToDemo,
    startBlankWorkshop,
    notify,
  } = useWorkshop();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [copiedCmd, setCopiedCmd] = useState(false);

  const handleExportJson = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const dateStamp = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `shirintaraz-backup-${dateStamp}.json`;
    a.click();
    URL.revokeObjectURL(url);
    notify('فایل پشتیبان روی سیستم شما دانلود شد.');
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as WorkshopData;
        if (parsed && parsed.settings && Array.isArray(parsed.ingredients) && Array.isArray(parsed.recipes)) {
          replaceAllData(parsed, 'اطلاعات کارگاه از فایل پشتیبان بازیابی شد.');
        } else {
          notify('فایل انتخاب‌شده معتبر نیست.', 'error');
        }
      } catch {
        notify('خطا در خواندن فایل پشتیبان.', 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleCopyCommands = async () => {
    try {
      await navigator.clipboard.writeText(LOCAL_INSTALL_COMMANDS);
      setCopiedCmd(true);
      notify('دستورات نصب محلی کپی شد.');
      setTimeout(() => setCopiedCmd(false), 2000);
    } catch {
      notify('امکان کپی خودکار نبود؛ متن را دستی کپی کنید.', 'info');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-extrabold text-[#2B1E1A]">
          نصب روی سیستم شخصی و پشتیبان‌گیری آفلاین
        </h1>
        <p className="text-xs text-[#7D6C63] mt-0.5">
          این برنامه کاملاً مستقل و بدون نیاز به جمینای یا اینترنت کار می‌کند و همه داده‌ها روی همین دستگاه ذخیره می‌شود.
        </p>
      </div>

      {/* Zero-Gemini / 100% Offline Guarantee Banner */}
      <section className="rounded-2xl bg-[#ECFDF5] border border-[#A7F3D0] p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-start gap-3 max-w-2xl">
          <div className="w-10 h-10 rounded-xl bg-[#2D6A4F] text-white flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-extrabold text-[#065F46]">
              ۱۰۰٪ آفلاین روی دستگاه شما — بدون اتصال به جمینای یا سرور خارجی
            </h2>
            <p className="text-xs text-[#047857] mt-1 leading-relaxed">
              هیچ کلید API، فیلترشکن یا اشتراکی لازم نیست. با کلیک روی دکمه نصب، آیکون شیرین‌تراز مثل یک نرم‌افزار عادی روی دسکتاپ ویندوز، مک یا موبایل شما نصب می‌شود.
            </p>
          </div>
        </div>

        <PWAInstallButton variant="prominent" />
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Card 1: Local Backup & Restore + Workshop Name */}
        <section className="bg-white border border-[#EAE2D8] rounded-2xl p-5 space-y-5">
          <div className="flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-[#2D6A4F]" />
            <h2 className="text-base font-extrabold text-[#2B1E1A]">
              تنظیمات کارگاه و پشتیبان‌گیری فایل
            </h2>
          </div>

          <div className="space-y-3">
            <div>
              <label
                htmlFor="workshop-name-input"
                className="block text-xs font-bold text-[#4B3B34] mb-1"
              >
                نام قنادی / کارگاه شما
              </label>
              <input
                id="workshop-name-input"
                type="text"
                value={data.settings.workshopName}
                onChange={(e) => updateSettings({ workshopName: e.target.value })}
                className="w-full rounded-xl border border-[#EAE2D8] px-3.5 py-2.5 text-sm font-semibold"
              />
            </div>

            <label className="flex items-center gap-2 text-xs font-bold text-[#4B3B34] cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={data.settings.usePersianDigits}
                onChange={(e) => updateSettings({ usePersianDigits: e.target.checked })}
                className="accent-[#2D6A4F] cursor-pointer"
              />
              <span>نمایش اعداد با ارقام فارسی (۱۲۳)</span>
            </label>
          </div>

          <div className="pt-4 border-t border-[#F3ECE4] space-y-2.5">
            <div className="text-xs font-bold text-[#4B3B34]">ذخیره و انتقال اطلاعات (JSON)</div>
            <div className="flex flex-wrap gap-2.5">
              <button
                type="button"
                onClick={handleExportJson}
                className="inline-flex items-center gap-2 rounded-xl bg-[#2B1E1A] hover:bg-[#3E2D27] text-white px-4 py-2.5 text-xs font-bold cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>دانلود فایل پشتیبان</span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-2 rounded-xl border border-[#EAE2D8] bg-[#FAF8F5] hover:bg-[#F2EAE0] text-[#2B1E1A] px-4 py-2.5 text-xs font-bold cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                <span>بازیابی از فایل</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/json"
                onChange={handleImportJson}
                className="hidden"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-[#F3ECE4] flex flex-wrap gap-2.5">
            <button
              type="button"
              onClick={resetToDemo}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#EAE2D8] px-3 py-2 text-xs font-bold text-[#5A4A42] hover:bg-[#FAF8F5] cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>بازگردانی داده‌های نمونه</span>
            </button>
            <button
              type="button"
              onClick={startBlankWorkshop}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#F5C2B8] bg-[#FEF2F2] px-3 py-2 text-xs font-bold text-[#C84B31] hover:bg-[#FEE2E2] cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>شروع کارگاه خالی از صفر</span>
            </button>
          </div>
        </section>

        {/* Card 2: Personal Computer Standalone Installation Instructions */}
        <section className="bg-white border border-[#EAE2D8] rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Laptop className="w-5 h-5 text-[#4338CA]" />
            <h2 className="text-base font-extrabold text-[#2B1E1A]">
              روش نصب روی کامپیوتر شخصی کاربر
            </h2>
          </div>

          <div className="space-y-3 text-xs text-[#4B3B34] leading-relaxed">
            <div className="rounded-xl bg-[#FAF8F5] border border-[#EAE2D8] p-3.5 space-y-1.5">
              <div className="font-extrabold text-[#2B1E1A]">روش اول (ساده‌ترین — بدون کدنویسی):</div>
              <p>
                برنامه را در مرورگر کروم (Chrome) یا اج (Edge) باز کنید و دکمه سبز{' '}
                <strong>«نصب روی سیستم»</strong> در بالای صفحه را بزنید. آیکون برنامه روی دسکتاپ ساخته می‌شود و بعد از آن حتی بدون اینترنت اجرا می‌شود.
              </p>
            </div>

            <div className="rounded-xl bg-[#FAF8F5] border border-[#EAE2D8] p-3.5 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="font-extrabold text-[#2B1E1A]">
                  روش دوم (اجرای مستقل روی کامپیوتر بدون اینترنت):
                </span>
                <button
                  type="button"
                  onClick={handleCopyCommands}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-[#4338CA] hover:underline cursor-pointer"
                >
                  {copiedCmd ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCmd ? 'کپی شد' : 'کپی دستورات'}</span>
                </button>
              </div>
              <p>
                فقط کافی است <strong>Node.js</strong> روی سیستم نصب باشد. پوشه پروژه را روی سیستم کپی کرده و این ۳ خط را اجرا کنید (هیچ نیازی به جمینای یا تنظیمات دیگر نیست):
              </p>
              <pre
                dir="ltr"
                className="rounded-lg bg-[#2B1E1A] text-[#FAF8F5] p-3 text-xs font-mono overflow-x-auto text-left"
              >
                {LOCAL_INSTALL_COMMANDS}
              </pre>
              <p className="text-[11px] text-[#7D6C63]">
                سپس آدرس <code dir="ltr" className="font-mono font-bold text-[#2B1E1A]">http://localhost:3000</code> را در مرورگر باز کنید.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
