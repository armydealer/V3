import React from 'react';
import { ArrowUpLeft, Calculator, Layers } from 'lucide-react';
import { ComputedRecipeMetrics, OverheadAllocationMethod, Recipe } from '../../types';
import { useWorkshop } from '../../store/WorkshopContext';
import { estimateItemWeightGrams } from '../../utils/costEngine';
import { OVERHEAD_METHOD_MAP } from '../../utils/overheadEngine';
import {
  formatCurrency,
  formatDigits,
  formatNumber,
  formatPercent,
  safeDiv,
} from '../../utils/formatters';
import { PrivacyValue } from '../../components/PrivacyValue';

interface RecipeOverheadExplainerProps {
  recipe: Recipe;
  metrics: ComputedRecipeMetrics;
  onOpenOverheadStudio?: () => void;
}

const METHOD_SHORT_ORDER: OverheadAllocationMethod[] = [
  'weight',
  'hybrid',
  'time_abc',
  'oven_hours',
  'direct_cost',
];

export const RecipeOverheadExplainer: React.FC<RecipeOverheadExplainerProps> = ({
  recipe,
  metrics,
  onOpenOverheadStudio,
}) => {
  const { data, summary } = useWorkshop();
  const { currencyUnit, usePersianDigits } = data.settings;
  const fmt = (v: number, compact = false) =>
    formatCurrency(v, currencyUnit, usePersianDigits, compact);

  const ob = metrics.overheadBreakdown;
  const ingMap = new Map(data.ingredients.map((i) => [i.id, i]));
  const subMap = new Map(data.subRecipes.map((s) => [s.id, s]));

  // Build per-material breakdown showing how each material in this recipe shapes batch weight, yield, cost, and overhead per kg
  const materialRows = recipe.items.map((item) => {
    const isIng = item.kind === 'ingredient';
    const ing = isIng ? ingMap.get(item.refId) : undefined;
    const sub = !isIng ? subMap.get(item.refId) : undefined;
    const label = isIng ? ing?.name ?? 'ماده حذف‌شده' : `${sub?.name ?? 'نیمه‌ساخته'} (نیمه‌ساخته)`;
    const unitLabel = isIng
      ? ing?.baseUnit === 'piece'
        ? 'عدد'
        : ing?.baseUnit === 'ml'
        ? 'میلی‌لیتر'
        : 'گرم'
      : 'گرم';
    const weightGrams = estimateItemWeightGrams(item, ingMap);
    const unitCost = isIng
      ? summary.ingredientUnitCosts[item.refId] ?? 0
      : summary.subRecipeUnitCosts[item.refId] ?? 0;
    const batchCost = unitCost * Math.max(0, item.amount);
    const weightSharePct = safeDiv(weightGrams, Math.max(1, metrics.rawBatchWeightGrams), 0) * 100;
    const costSharePct = safeDiv(batchCost, Math.max(1, metrics.batchMaterialCost), 0) * 100;
    // Material's proportional attribution of overhead/kg (weight-based for physical methods, cost-based for direct_cost)
    const driverSharePct = ob.method === 'direct_cost' ? costSharePct : weightSharePct;
    const proportionalOverheadPerKg = ob.allocatedOverheadPerKg * (driverSharePct / 100);

    return {
      id: item.id,
      label,
      amount: item.amount,
      unitLabel,
      weightGrams,
      weightSharePct,
      batchCost,
      costSharePct,
      driverSharePct,
      proportionalOverheadPerKg,
    };
  });

  // Render exact step-2 explanation text depending on active allocation method
  const renderStep2Formula = () => {
    switch (ob.method) {
      case 'weight':
        return (
          <div className="space-y-1">
            <div>
              <strong>روش وزنی:</strong> فروش ماهانه این محصول (
              {formatNumber(metrics.monthlySalesKg, { usePersian: usePersianDigits })} کیلو) ÷ کل فروش کارگاه (
              {formatNumber(ob.totalWorkshopSalesKg, { usePersian: usePersianDigits })} کیلو) ={' '}
              <strong className="text-[#2D6A4F]">{formatPercent(ob.weightSharePct, usePersianDigits)}</strong>
            </div>
            <div className="text-[11px] text-[#6E5C54]">
              در این روش سهم سربار هر کیلو برای همه محصولات یکسان و برابر کل سربار ÷ کل کیلوگرم فروش است.
            </div>
          </div>
        );
      case 'time_abc':
        return (
          <div className="space-y-1">
            <div>
              <strong>روش زمانی ABC:</strong> واحد فعالیت این محصول (۵۵٪ ×{' '}
              {formatNumber(ob.recipeMonthlyOvenHours, { decimals: 1, usePersian: usePersianDigits })} ساعت فر + ۴۵٪ ×{' '}
              {formatNumber(metrics.laborHoursPerKg * metrics.monthlySalesKg, { decimals: 1, usePersian: usePersianDigits })} ساعت کار ={' '}
              {formatNumber(ob.recipeMonthlyActivityUnits, { decimals: 1, usePersian: usePersianDigits })}) ÷ کل فعالیت کارگاه (
              {formatNumber(ob.totalWorkshopActivityUnits, { decimals: 1, usePersian: usePersianDigits })}) ={' '}
              <strong className="text-[#4338CA]">{formatPercent(ob.timeAbcSharePct, usePersianDigits)}</strong>
            </div>
          </div>
        );
      case 'oven_hours':
        return (
          <div className="space-y-1">
            <div>
              <strong>روش گلوگاه فر:</strong> ساعت فر ماهانه این محصول (
              {formatNumber(ob.recipeMonthlyOvenHours, { decimals: 1, usePersian: usePersianDigits })} ساعت) ÷ کل ساعت فر کارگاه (
              {formatNumber(ob.totalWorkshopOvenHours, { decimals: 1, usePersian: usePersianDigits })} ساعت) ={' '}
              <strong className="text-[#D97706]">{formatPercent(ob.ovenHoursSharePct, usePersianDigits)}</strong>
            </div>
          </div>
        );
      case 'direct_cost':
        return (
          <div className="space-y-1">
            <div>
              <strong>روش درصدی از بهای مواد:</strong> هزینه مواد ماهانه این محصول (
              <PrivacyValue>{fmt(ob.recipeMonthlyMaterialCost, true)}</PrivacyValue>) ÷ کل هزینه مواد کارگاه (
              <PrivacyValue>{fmt(ob.totalWorkshopMaterialCost, true)}</PrivacyValue>) ={' '}
              <strong className="text-[#C84B31]">{formatPercent(ob.directCostSharePct, usePersianDigits)}</strong>
            </div>
          </div>
        );
      case 'hybrid':
      default:
        return (
          <div className="space-y-1">
            <div>
              <strong>روش ترکیبی ۵۰/۵۰:</strong> ۵۰٪ × سهم وزنی (
              {formatPercent(ob.weightSharePct, usePersianDigits)}) + ۵۰٪ × سهم زمانی ABC (
              {formatPercent(ob.timeAbcSharePct, usePersianDigits)}) ={' '}
              <strong className="text-[#2D6A4F]">{formatPercent(ob.appliedSharePct, usePersianDigits)}</strong>
            </div>
            <div className="text-[11px] text-[#6E5C54]">
              سهم وزنی از نسبت فروش ({formatNumber(metrics.monthlySalesKg, { usePersian: usePersianDigits })} از{' '}
              {formatNumber(ob.totalWorkshopSalesKg, { usePersian: usePersianDigits })} کیلو) و سهم زمانی از ۵۵٪ ساعت فر + ۴۵٪ ساعت کار استادکار محاسبه شده است.
            </div>
          </div>
        );
    }
  };

  return (
    <div
      data-testid={`overhead-explainer-${recipe.id}`}
      className="mt-3 rounded-xl bg-[#FAF8F5] border border-[#E2D6C8] p-4 space-y-4 text-xs"
    >
      {/* Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-[#EAE2D8]">
        <div className="flex items-center gap-2">
          <Calculator className="w-4 h-4 text-[#4338CA]" />
          <h3 className="text-xs font-extrabold text-[#2B1E1A]">
            تشریح گام‌به‌گام ایجاد عدد سهم سربار/کیلو برای «{recipe.name}»
          </h3>
          <span className="text-[11px] text-[#6E5C54]">· روش فعال: {ob.methodLabel}</span>
        </div>
        {onOpenOverheadStudio && (
          <button
            type="button"
            onClick={onOpenOverheadStudio}
            className="inline-flex items-center gap-1 text-[11px] font-bold text-[#2D6A4F] hover:underline cursor-pointer"
          >
            <span>مدیریت و تغییر روش در ماژول سربار</span>
            <ArrowUpLeft className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* 3-Step Calculation Formula Chain */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 tabular-nums">
        <div className="bg-white border border-[#EAE2D8] rounded-lg p-3 space-y-1">
          <div className="text-[11px] font-bold text-[#6E5C54]">گام ۱: استخر کل سربار ماهانه کارگاه</div>
          <div className="text-sm font-extrabold text-[#2B1E1A]">
            <PrivacyValue>{fmt(ob.totalWorkshopOverheadPool, true)}</PrivacyValue>
          </div>
          <div className="text-[11px] text-[#6E5C54] leading-relaxed">
            حقوق واقعی و قانون کار (<PrivacyValue>{fmt(ob.totalMonthlyStaffCost, true)}</PrivacyValue>) + سربار ثابت ماهانه (
            <PrivacyValue>{fmt(ob.totalMonthlyFixedOverhead, true)}</PrivacyValue>)
          </div>
        </div>

        <div className="bg-white border border-[#EAE2D8] rounded-lg p-3 space-y-1">
          <div className="text-[11px] font-bold text-[#6E5C54]">
            گام ۲: ضریب سهم این محصول ({formatPercent(ob.appliedSharePct, usePersianDigits)})
          </div>
          <div className="text-[11.5px] text-[#2B1E1A] leading-relaxed">{renderStep2Formula()}</div>
        </div>

        <div className="bg-[#ECFDF5]/60 border border-[#A7F3D0] rounded-lg p-3 space-y-1">
          <div className="text-[11px] font-bold text-[#065F46]">گام ۳: تبدیل به سهم سربار هر کیلوگرم</div>
          <div className="text-sm font-extrabold text-[#2D6A4F]">
            <PrivacyValue>{fmt(ob.allocatedOverheadPerKg)}</PrivacyValue> / کیلو
          </div>
          <div className="text-[11px] text-[#065F46] leading-relaxed">
            سهم ماهانه این محصول (<PrivacyValue>{fmt(ob.monthlyAllocatedOverhead, true)}</PrivacyValue>) ÷{' '}
            {formatNumber(metrics.monthlySalesKg, { usePersian: usePersianDigits })} کیلو فروش ماهانه
          </div>
        </div>
      </div>

      {/* How Each Material in the Formulation Shapes Batch Yield & Overhead/kg */}
      <div className="bg-white border border-[#EAE2D8] rounded-lg p-3.5 space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 font-extrabold text-[#2B1E1A]">
            <Layers className="w-3.5 h-3.5 text-[#2D6A4F]" />
            <span>نقش هر ماده اولیه در فرمولاسیون روی بازده پخت و سهم سربار هر کیلو</span>
          </div>
          <div className="text-[11px] text-[#6E5C54] tabular-nums">
            وزن خام پخت: {formatNumber(metrics.rawBatchWeightGrams / 1000, { decimals: 2, usePersian: usePersianDigits })} کیلو ← بازده خالص پس از افت/برش:{' '}
            <strong>{formatNumber(metrics.netYieldKg, { decimals: 2, usePersian: usePersianDigits })} کیلو</strong> · فر:{' '}
            <strong>{formatNumber(metrics.ovenHoursPerKg * 60, { decimals: 1, usePersian: usePersianDigits })} دقیقه/کیلو</strong>
          </div>
        </div>

        <p className="text-[11px] text-[#5A4A42] leading-relaxed">
          مجموع وزن مواد زیر، وزن خام یک پخت را می‌سازد و پس از اعمال افت پخت ({formatDigits(recipe.bakingChangePct, usePersianDigits)}٪) و پرت برش ({formatDigits(recipe.trimWastePct, usePersianDigits)}٪)،{' '}
          <strong>بازده خالص هر پخت</strong> به دست می‌آید. هرچه بازده خالص بالاتر باشد زمان فر و استادکار روی کیلوی بیشتری سرشکن شده و سهم سربار هر کیلو کاهش می‌یابد. جدول زیر سهم وزنی، سهم بهایی و سهم متناظر هر ماده از سربار یک کیلو را نشان می‌دهد:
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-[11px] border-collapse tabular-nums">
            <thead>
              <tr className="bg-[#FAF8F5] border-b border-[#EAE2D8] text-[#6E5C54]">
                <th className="py-2 px-2.5 font-bold">ماده اولیه / نیمه‌ساخته</th>
                <th className="py-2 px-2.5 font-bold">مقدار در پخت</th>
                <th className="py-2 px-2.5 font-bold">سهم وزنی در پخت</th>
                <th className="py-2 px-2.5 font-bold">سهم بهای مواد</th>
                <th className="py-2 px-2.5 font-bold">
                  سهم متناظر از سربار/کیلو ({ob.method === 'direct_cost' ? 'بر مبنای بها' : 'بر مبنای وزن'})
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F3ECE4]">
              {materialRows.map((row) => (
                <tr key={row.id}>
                  <td className="py-2 px-2.5 font-bold text-[#2B1E1A]">{row.label}</td>
                  <td className="py-2 px-2.5 text-[#4B3B34]">
                    {formatNumber(row.amount, { decimals: row.amount < 10 ? 1 : 0, usePersian: usePersianDigits })}{' '}
                    {row.unitLabel}
                  </td>
                  <td className="py-2 px-2.5 text-[#4B3B34]">
                    {formatPercent(row.weightSharePct, usePersianDigits)}
                  </td>
                  <td className="py-2 px-2.5 text-[#4B3B34]">
                    {formatPercent(row.costSharePct, usePersianDigits)}
                  </td>
                  <td className="py-2 px-2.5 font-bold text-[#4338CA]">
                    <PrivacyValue>{fmt(row.proportionalOverheadPerKg)}</PrivacyValue>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick 5-Method Comparison Strip for This Specific Recipe */}
      <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] tabular-nums">
        <span className="font-bold text-[#6E5C54]">مقایسه سهم سربار/کیلو در ۵ روش:</span>
        {METHOD_SHORT_ORDER.map((m) => {
          const isCurrent = m === ob.method;
          return (
            <span
              key={m}
              className={`px-2.5 py-1 rounded-lg border ${
                isCurrent
                  ? 'bg-[#2B1E1A] text-white border-[#2B1E1A] font-extrabold'
                  : 'bg-white text-[#4B3B34] border-[#EAE2D8]'
              }`}
            >
              {OVERHEAD_METHOD_MAP[m].shortLabel}:{' '}
              <PrivacyValue>{fmt(ob.byMethodPerKg[m])}</PrivacyValue>
            </span>
          );
        })}
      </div>
    </div>
  );
};
