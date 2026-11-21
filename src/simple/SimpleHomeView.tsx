import React, { useMemo } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ChefHat,
  Package,
  Scale,
  TrendingUp,
} from 'lucide-react';
import { useWorkshop } from '../store/WorkshopContext';
import { computePantryMonitorMetrics } from '../utils/pantryMonitorEngine';
import {
  formatCurrency,
  formatDigits,
  formatNumber,
  formatPercent,
} from '../utils/formatters';
import { PrivacyValue } from '../components/PrivacyValue';
import { SimpleSectionId } from '../components/SimpleLayoutShell';

interface SimpleHomeViewProps {
  onNavigate: (section: SimpleSectionId) => void;
}

export const SimpleHomeView: React.FC<SimpleHomeViewProps> = ({ onNavigate }) => {
  const { data, summary } = useWorkshop();
  const { usePersianDigits, currencyUnit } = data.settings;

  const monitor = useMemo(() => computePantryMonitorMetrics(data, summary), [data, summary]);

  const fmt = (val: number, compact = false) =>
    formatCurrency(val, currencyUnit, usePersianDigits, compact);

  const totalVariableCosts =
    summary.totalMonthlyMaterialCost +
    summary.totalMonthlyPackagingCost +
    summary.totalMonthlyChannelFees;
  const totalMonthlyCosts = totalVariableCosts + summary.totalMonthlyOverheadAndPayroll;

  return (
    <div className="space-y-6">
      {/* Calm Welcome Heading */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#2B1E1A]">
            خلاصه وضعیت کارگاه
          </h1>
          <p className="text-xs sm:text-sm text-[#7D6C63] mt-1">
            مهم‌ترین اعداد فروش، هزینه، سود شیرینی‌ها و وضعیت انبار در یک نگاه ساده
          </p>
        </div>

        <button
          type="button"
          onClick={() => onNavigate('recipes')}
          className="inline-flex items-center gap-2 rounded-xl bg-[#2B1E1A] hover:bg-[#3E2D27] text-white px-4 py-2.5 text-xs font-bold transition-colors cursor-pointer"
        >
          <ChefHat className="w-4 h-4 text-[#FBBF24]" />
          <span>مشاهده قیمت تمام‌شده شیرینی‌ها</span>
        </button>
      </div>

      {/* 4 Essential KPI Cards Only */}
      <section aria-label="چهار عدد اصلی کارگاه" className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white border border-[#EAE2D8] rounded-2xl p-5">
          <div className="text-xs font-bold text-[#6E5C54]">فروش ماهانه کارگاه</div>
          <div className="text-2xl font-extrabold text-[#2B1E1A] tabular-nums mt-2">
            <PrivacyValue>{fmt(summary.totalMonthlyRevenue, true)}</PrivacyValue>
          </div>
          <div className="text-xs text-[#7D6C63] mt-1.5 tabular-nums">
            مجموع فروش: {formatNumber(summary.totalMonthlySalesKg, { usePersian: usePersianDigits })} کیلو در ماه
          </div>
        </div>

        <div className="bg-white border border-[#EAE2D8] rounded-2xl p-5">
          <div className="text-xs font-bold text-[#6E5C54]">کل هزینه‌های ماهانه</div>
          <div className="text-2xl font-extrabold text-[#2B1E1A] tabular-nums mt-2">
            <PrivacyValue>{fmt(totalMonthlyCosts, true)}</PrivacyValue>
          </div>
          <div className="text-xs text-[#7D6C63] mt-1.5 tabular-nums">
            مواد و جعبه: <PrivacyValue>{fmt(totalVariableCosts, true)}</PrivacyValue> · سربار و حقوق:{' '}
            <PrivacyValue>{fmt(summary.totalMonthlyOverheadAndPayroll, true)}</PrivacyValue>
          </div>
        </div>

        <div
          className={`rounded-2xl border p-5 ${
            summary.nominalMonthlyProfit >= 0
              ? 'bg-[#ECFDF5] border-[#A7F3D0]'
              : 'bg-[#FEF2F2] border-[#F5C2B8]'
          }`}
        >
          <div className="text-xs font-bold text-[#4B3B34] flex items-center justify-between">
            <span>سود خالص ماهانه</span>
            <TrendingUp
              className={`w-4 h-4 ${
                summary.nominalMonthlyProfit >= 0 ? 'text-[#2D6A4F]' : 'text-[#C84B31]'
              }`}
            />
          </div>
          <div
            className={`text-2xl font-extrabold tabular-nums mt-2 ${
              summary.nominalMonthlyProfit >= 0 ? 'text-[#065F46]' : 'text-[#C84B31]'
            }`}
          >
            <PrivacyValue>{fmt(summary.nominalMonthlyProfit, true)}</PrivacyValue>
          </div>
          <div className="text-xs text-[#5A4A42] mt-1.5 tabular-nums">
            درصد سود از فروش: {formatPercent(summary.blendedNetMarginPct, usePersianDigits)}
          </div>
        </div>

        <button
          type="button"
          onClick={() => onNavigate('pantry')}
          className={`text-right rounded-2xl border p-5 transition-colors cursor-pointer ${
            monitor.criticalCount > 0
              ? 'bg-[#FEF2F2] border-[#F5C2B8] hover:bg-[#FEE2E2]'
              : 'bg-white border-[#EAE2D8] hover:bg-[#FAF8F5]'
          }`}
        >
          <div className="text-xs font-bold text-[#5A4A42] flex items-center justify-between">
            <span>مواد زیر نقطه سفارش انبار</span>
            <AlertTriangle
              className={`w-4 h-4 ${
                monitor.criticalCount > 0 ? 'text-[#C84B31]' : 'text-[#2D6A4F]'
              }`}
            />
          </div>
          <div
            className={`text-2xl font-extrabold tabular-nums mt-2 ${
              monitor.criticalCount > 0 ? 'text-[#C84B31]' : 'text-[#2D6A4F]'
            }`}
          >
            {formatDigits(monitor.criticalCount, usePersianDigits)} قلم
          </div>
          <div className="text-xs text-[#6E5C54] mt-1.5 flex items-center justify-between">
            <span>
              {monitor.criticalCount > 0 ? 'نیازمند خرید فوری' : 'موجودی انبار کافی است'}
            </span>
            <ArrowLeft className="w-3.5 h-3.5" />
          </div>
        </button>
      </section>

      {/* Simple Recipe Profitability Table */}
      <section className="bg-white border border-[#EAE2D8] rounded-2xl overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-[#EAE2D8] flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-extrabold text-[#2B1E1A]">
              قیمت تمام‌شده و سود هر کیلو شیرینی
            </h2>
            <p className="text-xs text-[#7D6C63] mt-0.5">
              اگر سطری قرمز است، یعنی با قیمت فروش فعلی سود آن کم یا منفی شده است.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('recipes')}
            className="text-xs font-bold text-[#2D6A4F] hover:underline inline-flex items-center gap-1 cursor-pointer"
          >
            <span>ویرایش فرمول‌ها و جزئیات سربار</span>
            <ArrowLeft className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs sm:text-sm border-collapse tabular-nums">
            <thead>
              <tr className="bg-[#FAF8F5] border-b border-[#EAE2D8] text-[#6E5C54] text-xs">
                <th className="py-3 px-4 font-bold">نام شیرینی</th>
                <th className="py-3 px-3 font-bold">مواد + جعبه/کیلو</th>
                <th className="py-3 px-3 font-bold">سهم سربار/کیلو</th>
                <th className="py-3 px-3 font-bold">قیمت تمام‌شده کل</th>
                <th className="py-3 px-3 font-bold">قیمت فروش</th>
                <th className="py-3 px-4 font-bold">سود هر کیلو</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F3ECE4]">
              {summary.recipeMetrics.map((rm) => {
                const isLoss = rm.netProfitPerKg < 0;
                const isLow = rm.netMarginPct < 15;
                return (
                  <tr key={rm.recipeId} className="hover:bg-[#FAF8F5]">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-[#2B1E1A]">{rm.name}</div>
                      <div className="text-[11px] text-[#7D6C63]">
                        فروش ماهانه: {formatNumber(rm.monthlySalesKg, { usePersian: usePersianDigits })} کیلو
                      </div>
                    </td>
                    <td className="py-3.5 px-3 text-[#4B3B34]">
                      <PrivacyValue>
                        {fmt(rm.spoilageAdjustedMaterialCostPerKg + rm.boxAndPackagingPerKg)}
                      </PrivacyValue>
                    </td>
                    <td className="py-3.5 px-3 text-[#4338CA] font-semibold">
                      <PrivacyValue>{fmt(rm.allocatedOverheadPerKg)}</PrivacyValue>
                    </td>
                    <td className="py-3.5 px-3 font-bold text-[#2B1E1A]">
                      <PrivacyValue>{fmt(rm.totalCostPerKg)}</PrivacyValue>
                    </td>
                    <td className="py-3.5 px-3 text-[#4B3B34]">
                      <PrivacyValue>{fmt(rm.storefrontPricePerKg)}</PrivacyValue>
                    </td>
                    <td className="py-3.5 px-4">
                      <div
                        className={`font-extrabold ${
                          isLoss
                            ? 'text-[#C84B31]'
                            : isLow
                            ? 'text-[#D97706]'
                            : 'text-[#2D6A4F]'
                        }`}
                      >
                        <PrivacyValue>{fmt(rm.netProfitPerKg)}</PrivacyValue>
                      </div>
                      <div className="text-[11px] text-[#7D6C63]">
                        {formatPercent(rm.netMarginPct, usePersianDigits)}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* 3 Simple Quick-Action Shortcuts */}
      <section aria-label="کارهای روزمره کارگاه" className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          type="button"
          onClick={() => onNavigate('pantry')}
          className="text-right bg-white border border-[#EAE2D8] hover:border-[#2D6A4F] rounded-2xl p-4 flex items-center justify-between gap-3 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#ECFDF5] text-[#2D6A4F] flex items-center justify-center shrink-0">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-extrabold text-[#2B1E1A]">تغییر قیمت مواد و انبار</div>
              <div className="text-xs text-[#7D6C63] mt-0.5">به‌روزرسانی قیمت بازار و چک نقطه سفارش</div>
            </div>
          </div>
          <ArrowLeft className="w-4 h-4 text-[#7D6C63] shrink-0" />
        </button>

        <button
          type="button"
          onClick={() => onNavigate('recipes')}
          className="text-right bg-white border border-[#EAE2D8] hover:border-[#2D6A4F] rounded-2xl p-4 flex items-center justify-between gap-3 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FFFBEB] text-[#D97706] flex items-center justify-center shrink-0">
              <ChefHat className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-extrabold text-[#2B1E1A]">فرمول و سهم سربار شیرینی</div>
              <div className="text-xs text-[#7D6C63] mt-0.5">مشاهده دقیق سهم هر ماده و سربار هر کیلو</div>
            </div>
          </div>
          <ArrowLeft className="w-4 h-4 text-[#7D6C63] shrink-0" />
        </button>

        <button
          type="button"
          onClick={() => onNavigate('overhead')}
          className="text-right bg-white border border-[#EAE2D8] hover:border-[#2D6A4F] rounded-2xl p-4 flex items-center justify-between gap-3 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#EEF2FF] text-[#4338CA] flex items-center justify-center shrink-0">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-extrabold text-[#2B1E1A]">سربار، حقوق و روش تقسیم</div>
              <div className="text-xs text-[#7D6C63] mt-0.5">ثبت اجاره، قبوض، استهلاک و انتخاب روش پخش</div>
            </div>
          </div>
          <ArrowLeft className="w-4 h-4 text-[#7D6C63] shrink-0" />
        </button>
      </section>
    </div>
  );
};
