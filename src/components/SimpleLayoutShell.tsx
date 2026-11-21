import React, { useState } from 'react';
import {
  ChefHat,
  Eye,
  EyeOff,
  HardDriveDownload,
  Home,
  Menu,
  Package,
  Scale,
  Sparkles,
  X,
} from 'lucide-react';
import { useWorkshop } from '../store/WorkshopContext';
import { PWAInstallButton } from './PWAInstallButton';
import { OfflineIndicator } from './OfflineIndicator';

export type SimpleSectionId = 'home' | 'pantry' | 'recipes' | 'overhead' | 'backup';

interface SimpleLayoutShellProps {
  activeSection: SimpleSectionId;
  onSelectSection: (section: SimpleSectionId) => void;
  children: React.ReactNode;
}

const SIMPLE_NAV: Array<{
  id: SimpleSectionId;
  label: string;
  hint: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  {
    id: 'home',
    label: 'خلاصه کارگاه',
    hint: 'فروش، سود و هشدارها',
    icon: Home,
  },
  {
    id: 'pantry',
    label: 'انبار و مواد اولیه',
    hint: 'قیمت روز و نقطه سفارش',
    icon: Package,
  },
  {
    id: 'recipes',
    label: 'فرمول شیرینی‌ها',
    hint: 'قیمت تمام‌شده و سربار',
    icon: ChefHat,
  },
  {
    id: 'overhead',
    label: 'سربار و حقوق',
    hint: 'هزینه‌های ثابت و تقسیم آن',
    icon: Scale,
  },
  {
    id: 'backup',
    label: 'نصب و بکاپ',
    hint: 'نصب آفلاین و ذخیره فایل',
    icon: HardDriveDownload,
  },
];

export const SimpleLayoutShell: React.FC<SimpleLayoutShellProps> = ({
  activeSection,
  onSelectSection,
  children,
}) => {
  const { data, updateSettings, toasts, dismissToast } = useWorkshop();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { settings } = data;

  return (
    <div className="min-h-screen flex bg-[#FAF8F5] text-[#2B1E1A]">
      {/* Desktop Sidebar — Clean, Calm, Only 5 Essentials */}
      <aside className="no-print hidden lg:flex lg:flex-col lg:w-64 lg:shrink-0 bg-[#2B1E1A] text-[#F5EFEA] sticky top-0 h-screen border-l border-[#3E2D27]">
        <div className="px-5 py-5 border-b border-[#3E2D27] flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#D97706]/20 border border-[#D97706]/40 flex items-center justify-center text-[#FBBF24] font-extrabold text-lg shrink-0">
            ش
          </div>
          <div className="min-w-0">
            <div className="text-base font-extrabold tracking-tight text-white truncate">
              شیرین‌تراز ساده
            </div>
            <div className="text-[11px] text-[#C8B8AF] truncate">{settings.workshopName}</div>
          </div>
        </div>

        <nav aria-label="منوی اصلی برنامه" className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5">
          {SIMPLE_NAV.map((item) => {
            const Icon = item.icon;
            const active = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectSection(item.id)}
                className={`w-full text-right flex items-center gap-3 px-3.5 py-3 rounded-xl transition-colors cursor-pointer ${
                  active
                    ? 'bg-[#3F2E28] text-white border border-[#59423A]'
                    : 'text-[#D6C7BE] hover:bg-[#362621] hover:text-white border border-transparent'
                }`}
              >
                <Icon
                  className={`w-5 h-5 shrink-0 ${
                    active ? 'text-[#FBBF24]' : 'text-[#A8948A]'
                  }`}
                />
                <div className="min-w-0">
                  <div className="text-sm font-bold truncate">{item.label}</div>
                  <div className="text-[11px] text-[#B3A197] truncate">{item.hint}</div>
                </div>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-[#3E2D27] text-[11px] text-[#C8B8AF] leading-relaxed">
          ذخیره ۱۰۰٪ محلی روی دستگاه شما · بدون نیاز به اینترنت و جمینای
        </div>
      </aside>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="no-print fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative w-72 max-w-[85vw] bg-[#2B1E1A] text-white h-full flex flex-col z-10 shadow-2xl">
            <div className="p-4 border-b border-[#3E2D27] flex items-center justify-between">
              <div className="min-w-0">
                <div className="font-extrabold text-base">شیرین‌تراز ساده</div>
                <div className="text-xs text-[#C8B8AF] truncate">{settings.workshopName}</div>
              </div>
              <button
                type="button"
                aria-label="بستن منو"
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 rounded-lg text-[#D6C7BE] hover:bg-[#3E2D27] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav aria-label="منوی موبایل" className="flex-1 overflow-y-auto p-3 space-y-1.5">
              {SIMPLE_NAV.map((item) => {
                const Icon = item.icon;
                const active = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      onSelectSection(item.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full text-right flex items-center gap-3 px-3.5 py-3 rounded-xl cursor-pointer ${
                      active ? 'bg-[#3F2E28] text-white' : 'text-[#D6C7BE] hover:bg-[#362621]'
                    }`}
                  >
                    <Icon className="w-5 h-5 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-sm font-bold">{item.label}</div>
                      <div className="text-[11px] text-[#B3A197]">{item.hint}</div>
                    </div>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="no-print sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-[#EAE2D8] px-4 lg:px-6 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <button
                type="button"
                aria-label="باز کردن منو"
                onClick={() => setMobileMenuOpen(true)}
                className="lg:hidden p-2 rounded-lg border border-[#EAE2D8] text-[#2B1E1A] hover:bg-[#FAF8F5] cursor-pointer"
              >
                <Menu className="w-4 h-4" />
              </button>
              <div className="min-w-0">
                <div className="font-extrabold text-sm sm:text-base text-[#2B1E1A] truncate">
                  {settings.workshopName}
                </div>
                <div className="text-[11px] text-[#7D6C63] hidden sm:block">
                  نسخه ساده و آفلاین حسابداری و بهایابی قنادی
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <PWAInstallButton
                variant="compact"
                onOpenInstallGuide={() => onSelectSection('backup')}
              />

              <button
                type="button"
                aria-pressed={settings.privacyMode}
                aria-label="مخفی کردن اعداد مالی"
                onClick={() => updateSettings({ privacyMode: !settings.privacyMode })}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                  settings.privacyMode
                    ? 'bg-[#2B1E1A] text-white border-[#2B1E1A]'
                    : 'bg-white text-[#2B1E1A] border-[#EAE2D8] hover:bg-[#FAF8F5]'
                }`}
              >
                {settings.privacyMode ? (
                  <EyeOff className="w-3.5 h-3.5" />
                ) : (
                  <Eye className="w-3.5 h-3.5" />
                )}
                <span className="hidden sm:inline">
                  {settings.privacyMode ? 'اعداد مخفی' : 'مخفی‌سازی اعداد'}
                </span>
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-6 max-w-6xl w-full mx-auto">{children}</main>

        {/* Simple Mobile Bottom Bar for Effortless 1-Tap Navigation */}
        <nav
          aria-label="نوار دسترسی سریع موبایل"
          className="no-print lg:hidden sticky bottom-0 z-30 bg-white border-t border-[#EAE2D8] grid grid-cols-5 px-1 py-1.5"
        >
          {SIMPLE_NAV.map((item) => {
            const Icon = item.icon;
            const active = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectSection(item.id)}
                className={`flex flex-col items-center justify-center gap-0.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer ${
                  active ? 'text-[#2D6A4F] bg-[#ECFDF5]' : 'text-[#6E5C54]'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="truncate max-w-full px-0.5">
                  {item.id === 'home'
                    ? 'خلاصه'
                    : item.id === 'pantry'
                    ? 'انبار'
                    : item.id === 'recipes'
                    ? 'شیرینی‌ها'
                    : item.id === 'overhead'
                    ? 'سربار'
                    : 'نصب'}
                </span>
              </button>
            );
          })}
        </nav>

        <OfflineIndicator />

        {toasts.length > 0 && (
          <div
            aria-live="polite"
            className="no-print fixed bottom-16 lg:bottom-4 left-4 z-50 flex flex-col gap-2 max-w-xs w-[calc(100vw-2rem)]"
          >
            {toasts.map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between gap-2 rounded-xl px-4 py-3 text-xs font-bold shadow-lg border bg-[#ECFDF5] border-[#A7F3D0] text-[#065F46]"
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 shrink-0" />
                  <span>{t.text}</span>
                </div>
                <button
                  type="button"
                  aria-label="بستن پیام"
                  onClick={() => dismissToast(t.id)}
                  className="opacity-70 hover:opacity-100 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
