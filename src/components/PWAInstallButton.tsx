import React, { useState } from 'react';
import { Download, MonitorSmartphone, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  variant?: 'compact' | 'prominent';
  onOpenInstallGuide?: () => void;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  variant = 'compact',
  onOpenInstallGuide,
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuideModal, setShowGuideModal] = useState(false);

  // Suppress button when already running as an installed standalone app
  if (isInstalled) {
    return null;
  }

  const handleClick = async () => {
    if (isInstallable) {
      await install();
      return;
    }
    if (onOpenInstallGuide && !isIOS) {
      onOpenInstallGuide();
      return;
    }
    setShowGuideModal(true);
  };

  const buttonClasses =
    variant === 'prominent'
      ? 'inline-flex items-center justify-center gap-2 rounded-xl bg-[#2D6A4F] hover:bg-[#23553F] text-white px-4 py-2.5 text-sm font-bold transition-colors cursor-pointer'
      : 'inline-flex items-center gap-1.5 rounded-lg bg-[#2D6A4F] hover:bg-[#23553F] text-white px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer whitespace-nowrap';

  return (
    <>
      <button type="button" onClick={handleClick} className={buttonClasses}>
        {isInstallable ? (
          <Download className="w-3.5 h-3.5 shrink-0" />
        ) : (
          <MonitorSmartphone className="w-3.5 h-3.5 shrink-0" />
        )}
        <span>{isInstallable ? 'نصب روی سیستم' : 'نصب آفلاین'}</span>
      </button>

      {showGuideModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="راهنمای نصب شیرین‌تراز روی دستگاه شما"
        >
          <div className="w-full max-w-md rounded-2xl bg-white border border-[#EAE2D8] p-5 shadow-xl space-y-4 text-right">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-base font-extrabold text-[#2B1E1A]">
                نصب شیرین‌تراز روی دستگاه شما
              </h3>
              <button
                type="button"
                aria-label="بستن راهنمای نصب"
                onClick={() => setShowGuideModal(false)}
                className="p-1.5 rounded-lg text-[#7D6C63] hover:bg-[#FAF8F5] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {isIOS ? (
              <ol className="space-y-2 text-sm text-[#4B3B34] list-decimal pr-5 leading-relaxed">
                <li>
                  در نوار پایین مرورگر سافاری (Safari) دکمه <strong>Share</strong> را بزنید.
                </li>
                <li>
                  به پایین اسکرول کنید و گزینه <strong>Add to Home Screen</strong> را انتخاب کنید.
                </li>
                <li>
                  روی <strong>Add</strong> بزنید تا آیکون برنامه کنار بقیه برنامه‌هایتان اضافه شود.
                </li>
              </ol>
            ) : (
              <div className="space-y-3 text-xs text-[#4B3B34] leading-relaxed">
                <p>
                  <strong>روی ویندوز، مک یا اندروید (مرورگر کروم / اج):</strong> روی آیکون نصب در گوشه نوار آدرس (یا منوی سه‌نقطه مرورگر ← <em>Install app / نصب برنامه</em>) کلیک کنید.
                </p>
                <p>
                  پس از نصب، برنامه مانند یک نرم‌افزار مستقل بدون نیاز به اینترنت و بدون نیاز به جمینای روی سیستم شما اجرا می‌شود و تمام داده‌ها روی همین دستگاه ذخیره می‌ماند.
                </p>
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowGuideModal(false)}
              className="w-full rounded-xl bg-[#2B1E1A] text-white py-2.5 text-xs font-bold hover:bg-[#3E2D27] cursor-pointer"
            >
              متوجه شدم
            </button>
          </div>
        </div>
      )}
    </>
  );
};
