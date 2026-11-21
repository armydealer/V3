import React, { useEffect, useState } from 'react';
import { FileSpreadsheet, FileText, Settings } from 'lucide-react';
import { GuidedBanner } from '../components/GuidedBanner';
import { ReportsView } from './pillar6/ReportsView';
import { AnalystView } from './pillar6/AnalystView';
import { WorkshopDnaSettings } from './pillar6/WorkshopDnaSettings';

export type Pillar6Tab = 'reports' | 'analyst' | 'settings';

interface Pillar6Props {
  initialTab?: Pillar6Tab;
}

export const Pillar6ReportsSettings: React.FC<Pillar6Props> = ({ initialTab = 'reports' }) => {
  const [activeTab, setActiveTab] = useState<Pillar6Tab>(initialTab);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  return (
    <div>
      <div className="no-print mb-4">
        <h1 className="text-xl font-extrabold text-[#2B1E1A]">
          گزارش‌های چاپی، گزارش‌ساز متنی استراتژیک و تنظیمات DNA کارگاه
        </h1>
        <p className="text-xs text-[#7D6C63] mt-0.5">
          خروجی چاپی A4 و اکسل فارسی، تولید خودکار گزارش استراتژیک فارسی بر پایه قواعد محلی و کنترل قوانین کارگاه
        </p>
      </div>

      <div
        role="tablist"
        aria-label="تب‌های گزارش، مشاور و تنظیمات"
        className="no-print mb-5 flex flex-wrap gap-1.5 bg-white border border-[#EAE2D8] rounded-xl p-1.5"
      >
        {[
          { id: 'reports' as const, label: '۶A. مرکز گزارش‌های چاپی PDF و اکسل', icon: FileSpreadsheet },
          { id: 'analyst' as const, label: '۶B. گزارش‌ساز متنی استراتژیک (قواعد محلی)', icon: FileText },
          { id: 'settings' as const, label: '۶C. مرکز تنظیمات DNA کارگاه و گوگل شیت', icon: Settings },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={active}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                active
                  ? 'bg-[#2B1E1A] text-white'
                  : 'text-[#5A4A42] hover:bg-[#FAF8F5] hover:text-[#2B1E1A]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      <GuidedBanner
        text={
          activeTab === 'reports'
            ? 'بین گزارش ۱ صفحه‌ای و گزارش جامع ممیزی جابه‌جا شوید و نسخه PDF برندشده با لوگوی کارگاه خود را چاپ بگیرید.'
            : activeTab === 'analyst'
            ? 'یکی از ۵ قالب گزارش استراتژیک را انتخاب کنید تا موتور قواعد محلی، خروجی‌های بهایابی و مونت‌کارلو را به متن فارسی قابل کپی و چاپ تبدیل کند.'
            : 'در ۶ زیربخش زیر تمام قوانین مالی ایران، ظرفیت فرها، حریم خصوصی و اتصال دوطرفه گوگل شیت را شخصی‌سازی کنید.'
        }
      />

      {activeTab === 'reports' && <ReportsView />}
      {activeTab === 'analyst' && <AnalystView />}
      {activeTab === 'settings' && <WorkshopDnaSettings />}
    </div>
  );
};
