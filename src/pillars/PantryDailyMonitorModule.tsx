import React, { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  AlertTriangle,
  ArrowUpDown,
  CheckCircle2,
  Clock,
  PackagePlus,
  Plus,
  ShoppingCart,
  Trash2,
  TrendingDown,
} from 'lucide-react';
import { useWorkshop } from '../store/WorkshopContext';
import {
  computePantryMonitorMetrics,
  PantryItemMonitorMetric,
  StockStatus,
} from '../utils/pantryMonitorEngine';
import {
  formatCurrency,
  formatDigits,
  formatNumber,
  formatPercent,
} from '../utils/formatters';
import { IngredientCategory } from '../types';
import { GuidedBanner } from '../components/GuidedBanner';
import { HelpTip } from '../components/HelpTip';
import { LocaleNumberInput } from '../components/LocaleNumberInput';
import { PrivacyValue } from '../components/PrivacyValue';

const CATEGORY_LABELS: Record<IngredientCategory, string> = {
  flour_sugar: 'آرد و شکر',
  butter_oil: 'کره و روغن',
  nuts_spice: 'مغزیجات و زعفران/هل',
  dairy_egg: 'لبنیات و تخم‌مرغ',
  chocolate_flavor: 'شکلات و طعم‌دهنده',
  packaging: 'جعبه و بسته‌بندی',
};

function formatBaseAmount(
  amount: number,
  baseUnit: 'gram' | 'ml' | 'piece',
  usePersian: boolean
): string {
  if (baseUnit === 'gram') {
    if (Math.abs(amount) >= 1000) {
      return `${formatNumber(amount / 1000, { decimals: 1, usePersian })} کیلو`;
    }
    return `${formatNumber(amount, { decimals: amount < 10 ? 1 : 0, usePersian })} گرم`;
  }
  if (baseUnit === 'ml') {
    if (Math.abs(amount) >= 1000) {
      return `${formatNumber(amount / 1000, { decimals: 1, usePersian })} لیتر`;
    }
    return `${formatNumber(amount, { decimals: 0, usePersian })} میلی‌لیتر`;
  }
  return `${formatNumber(amount, { decimals: 0, usePersian })} عدد`;
}

function toDisplayUnitValue(
  amount: number,
  baseUnit: 'gram' | 'ml' | 'piece',
  useKgForGrams: boolean
): number {
  if (baseUnit === 'gram' && useKgForGrams) return Number((amount / 1000).toFixed(2));
  return Number(amount.toFixed(1));
}

export const PantryDailyMonitorModule: React.FC<{
  onOpenPantry?: () => void;
}> = ({ onOpenPantry }) => {
  const {
    data,
    summary,
    upsertIngredient,
    logDailyConsumption,
    deleteDailyConsumptionLog,
    restockIngredient,
  } = useWorkshop();

  const { currencyUnit, usePersianDigits } = data.settings;
  const fmt = (v: number, compact = false) =>
    formatCurrency(v, currencyUnit, usePersianDigits, compact);

  const [statusFilter, setStatusFilter] = useState<'all' | StockStatus>('all');
  const [catFilter, setCatFilter] = useState<'all' | IngredientCategory>('all');
  const [leadTimeOverride, setLeadTimeOverride] = useState<number>(0); // 0 = per-ingredient default (3d)
  const [chartMode, setChartMode] = useState<'ratio_pct' | 'physical_kg' | 'physical_piece'>(
    'ratio_pct'
  );
  const [selectedIngId, setSelectedIngId] = useState<string>('');

  // Daily consumption logger form state
  const [logIngId, setLogIngId] = useState<string>(
    data.ingredients.find((i) => i.id === 'ing-cream')?.id ?? data.ingredients[0]?.id ?? ''
  );
  const [logAmount, setLogAmount] = useState<number>(11500);
  const [logNote, setLogNote] = useState<string>('');
  const [deductStock, setDeductStock] = useState<boolean>(true);

  const monitor = useMemo(
    () =>
      computePantryMonitorMetrics(data, summary, {
        leadTimeOverrideDays: leadTimeOverride > 0 ? leadTimeOverride : null,
      }),
    [data, summary, leadTimeOverride]
  );

  const filteredItems = useMemo(() => {
    return monitor.items.filter((item) => {
      if (statusFilter !== 'all' && item.status !== statusFilter) return false;
      if (catFilter !== 'all' && item.category !== catFilter) return false;
      return true;
    });
  }, [monitor.items, statusFilter, catFilter]);

  const activeItem: PantryItemMonitorMetric | undefined = useMemo(() => {
    if (selectedIngId) {
      const found = monitor.items.find((i) => i.ingredientId === selectedIngId);
      if (found) return found;
    }
    return filteredItems[0] ?? monitor.items[0];
  }, [selectedIngId, filteredItems, monitor.items]);

  // Chart 1 data: Current Stock vs Reorder Point
  const comparisonChartData = useMemo(() => {
    let source = filteredItems;
    if (chartMode === 'physical_kg') {
      // Weight-based items with >= 1kg scale so kg axis stays crisp
      source = filteredItems.filter(
        (i) => i.baseUnit === 'gram' && Math.max(i.currentStockInBase, i.reorderPointInBase) >= 1000
      );
    } else if (chartMode === 'physical_piece') {
      source = filteredItems.filter((i) => i.baseUnit === 'piece');
    }

    return source.slice(0, 14).map((item) => {
      const isKg = item.baseUnit === 'gram';
      return {
        ingredientId: item.ingredientId,
        name: item.shortName,
        fullName: item.name,
        status: item.status,
        ratioPct: Math.min(240, Math.round(item.stockToReorderPct)),
        rawRatioPct: Math.round(item.stockToReorderPct),
        currentVal:
          chartMode === 'physical_kg'
            ? Number((item.currentStockInBase / 1000).toFixed(1))
            : Math.round(item.currentStockInBase),
        reorderVal:
          chartMode === 'physical_kg'
            ? Number((item.reorderPointInBase / 1000).toFixed(1))
            : Math.round(item.reorderPointInBase),
        safetyVal:
          chartMode === 'physical_kg'
            ? Number((item.safetyStockInBase / 1000).toFixed(1))
            : Math.round(item.safetyStockInBase),
        unitLabel: chartMode === 'physical_kg' ? 'کیلو' : isKg ? 'گرم' : 'عدد',
        daysOfSupply: item.daysOfSupply,
      };
    });
  }, [filteredItems, chartMode]);

  // Selected ingredient deep-dive chart data
  const activeUseKg =
    activeItem != null &&
    activeItem.baseUnit === 'gram' &&
    Math.max(activeItem.currentStockInBase, activeItem.reorderPointInBase, activeItem.dailyConsumptionBase) >= 1000;

  const activeUnitLabel =
    activeItem?.baseUnit === 'piece' ? 'عدد' : activeUseKg ? 'کیلوگرم' : 'گرم';

  const dailySeriesChartData = useMemo(() => {
    if (!activeItem) return [];
    return activeItem.last7Days.map((pt) => ({
      dayLabel: pt.dayLabel,
      actual: toDisplayUnitValue(pt.actualBase, activeItem.baseUnit, activeUseKg),
      theoretical: toDisplayUnitValue(pt.theoreticalBase, activeItem.baseUnit, activeUseKg),
      variancePct: Number(pt.variancePct.toFixed(1)),
      hasLoggedEntry: pt.hasLoggedEntry,
    }));
  }, [activeItem, activeUseKg]);

  const depletionChartData = useMemo(() => {
    if (!activeItem) return [];
    return activeItem.next7DaysDepletion.map((pt) => ({
      dayLabel: pt.dayLabel,
      stock: toDisplayUnitValue(pt.projectedStockBase, activeItem.baseUnit, activeUseKg),
      reorderPoint: toDisplayUnitValue(pt.reorderPointBase, activeItem.baseUnit, activeUseKg),
      safetyStock: toDisplayUnitValue(pt.safetyStockBase, activeItem.baseUnit, activeUseKg),
    }));
  }, [activeItem, activeUseKg]);

  const selectedLogIngredient = data.ingredients.find((i) => i.id === logIngId);
  const selectedLogMonitor = monitor.items.find((i) => i.ingredientId === logIngId);

  const handleSubmitConsumption = (e: React.FormEvent) => {
    e.preventDefault();
    if (!logIngId || logAmount <= 0) return;
    logDailyConsumption(
      {
        ingredientId: logIngId,
        dateLabel: 'امروز',
        daysAgo: 0,
        actualUsedInBase: logAmount,
        note: logNote.trim() || undefined,
      },
      deductStock
    );
    setSelectedIngId(logIngId);
    setLogNote('');
  };

  const handleUpdateLeadTime = (ingredientId: string, nextDays: number) => {
    const ing = data.ingredients.find((i) => i.id === ingredientId);
    if (!ing) return;
    upsertIngredient({ ...ing, leadTimeDays: Math.max(1, Math.min(30, nextDays)) });
  };

  const recentLogs = (data.dailyConsumptionLogs ?? []).slice(0, 6);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-[#2B1E1A]">
            داشبورد پایش روزانه مصرف مواد اولیه و مقایسه با نقطه سفارش
          </h1>
          <p className="text-xs text-[#7D6C63] mt-0.5">
            مقایسه لحظه‌ای موجودی انبار با نقطه سفارش (ROP = مصرف روزانه × زمان تحویل + موجودی اطمینان) و شبیه‌سازی تخلیه ۷ روزه
          </p>
        </div>
        {onOpenPantry && (
          <button
            type="button"
            onClick={onOpenPantry}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[#EAE2D8] bg-white hover:bg-[#FAF8F5] text-xs font-bold text-[#2B1E1A] cursor-pointer whitespace-nowrap"
          >
            <ArrowUpDown className="w-3.5 h-3.5 text-[#2D6A4F]" />
            <span>ویرایش قیمت‌ها در انبار هوشمند</span>
          </button>
        )}
      </div>

      <GuidedBanner text="هر ماده‌ای که میله موجودی آن زیر خط قرمز «نقطه سفارش (۱۰۰٪)» قرار بگیرد، یعنی اگر امروز به بنکدار سفارش ندهید، پیش از تحویل بار جدید موجودی کارگاه به محدوده خطر می‌رسد." />

      {/* KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5">
        <div
          className={`rounded-xl border p-4 ${
            monitor.criticalCount > 0
              ? 'bg-[#FEF2F2] border-[#F5C2B8]'
              : 'bg-[#ECFDF5] border-[#A7F3D0]'
          }`}
        >
          <div className="text-xs font-bold text-[#5A4A42] flex items-center justify-between">
            <span>اقلام زیر نقطه سفارش (سفارش فوری)</span>
            <HelpTip id="reorderPoint" />
          </div>
          <div
            className={`text-2xl font-extrabold tabular-nums mt-1.5 ${
              monitor.criticalCount > 0 ? 'text-[#C84B31]' : 'text-[#2D6A4F]'
            }`}
          >
            {formatDigits(monitor.criticalCount, usePersianDigits)} قلم
          </div>
          <div className="text-[11px] text-[#6E5C54] mt-1">
            {monitor.criticalCount > 0
              ? 'نیازمند ثبت سفارش خرید در همین هفته'
              : 'همه اقلام بالاتر از نقطه سفارش هستند'}
          </div>
        </div>

        <div className="bg-white border border-[#EAE2D8] rounded-xl p-4">
          <div className="text-xs text-[#6E5C54]">اقلام در آستانه هشدار (۱۰۰٪ تا ۱۳۰٪ ROP)</div>
          <div className="text-2xl font-extrabold text-[#D97706] tabular-nums mt-1.5">
            {formatDigits(monitor.warningCount, usePersianDigits)} قلم
          </div>
          <div className="text-[11px] text-[#7D6C63] mt-1 tabular-nums">
            اقلام ایمن: {formatDigits(monitor.healthyCount, usePersianDigits)} قلم · میانگین پوشش:{' '}
            {formatNumber(monitor.averageDaysOfSupply, { decimals: 1, usePersian: usePersianDigits })} روز
          </div>
        </div>

        <div className="bg-white border border-[#EAE2D8] rounded-xl p-4">
          <div className="text-xs text-[#6E5C54] flex items-center justify-between">
            <span>میانگین مصرف روزانه کل انبار</span>
            <HelpTip id="dailyConsumption" />
          </div>
          <div className="text-2xl font-extrabold text-[#2B1E1A] tabular-nums mt-1.5">
            <PrivacyValue>{fmt(monitor.totalDailyBurnCostToman, true)}</PrivacyValue>
          </div>
          <div className="text-[11px] text-[#7D6C63] mt-1 tabular-nums">
            ارزش کل موجودی فعلی انبار:{' '}
            <PrivacyValue>{fmt(monitor.totalStockValueToman, true)}</PrivacyValue>
          </div>
        </div>

        <div className="bg-white border border-[#EAE2D8] rounded-xl p-4">
          <div className="text-xs text-[#6E5C54]">بودجه مورد نیاز برای سفارش‌های فوری</div>
          <div className="text-2xl font-extrabold text-[#4338CA] tabular-nums mt-1.5">
            <PrivacyValue>{fmt(monitor.urgentOrderBudgetToman, true)}</PrivacyValue>
          </div>
          <div className="text-[11px] text-[#7D6C63] mt-1">
            برای بازگرداندن اقلام بحرانی به پوشش امن + ۷ روز
          </div>
        </div>
      </div>

      {/* Filter & Chart Mode Controls Bar */}
      <div className="bg-white border border-[#EAE2D8] rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3 max-w-full">
        <div className="flex flex-wrap items-center gap-2 max-w-full">
          {/* Status Segmented Filter */}
          <div
            role="group"
            aria-label="فیلتر وضعیت موجودی"
            className="flex flex-wrap items-center gap-1 bg-[#FAF8F5] border border-[#EAE2D8] rounded-lg p-1 max-w-full"
          >
            {(
              [
                { id: 'all', label: `همه (${formatDigits(monitor.items.length, usePersianDigits)})` },
                { id: 'critical', label: `زیر نقطه سفارش (${formatDigits(monitor.criticalCount, usePersianDigits)})` },
                { id: 'warning', label: `هشدار (${formatDigits(monitor.warningCount, usePersianDigits)})` },
                { id: 'healthy', label: `ایمن (${formatDigits(monitor.healthyCount, usePersianDigits)})` },
              ] as const
            ).map((btn) => (
              <button
                key={btn.id}
                type="button"
                onClick={() => setStatusFilter(btn.id)}
                className={`px-2.5 py-1.5 rounded-md text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                  statusFilter === btn.id
                    ? 'bg-[#2B1E1A] text-white'
                    : 'text-[#5A4A42] hover:text-[#2B1E1A]'
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>

          <select
            aria-label="فیلتر دسته‌بندی مواد اولیه"
            value={catFilter}
            onChange={(e) => setCatFilter(e.target.value as 'all' | IngredientCategory)}
            className="rounded-lg border border-[#EAE2D8] bg-white px-3 py-1.5 text-xs font-bold text-[#2B1E1A] max-w-full"
          >
            <option value="all">همه دسته‌ها</option>
            {(Object.keys(CATEGORY_LABELS) as IngredientCategory[]).map((k) => (
              <option key={k} value={k}>
                {CATEGORY_LABELS[k]}
              </option>
            ))}
          </select>

          <div className="flex flex-wrap items-center gap-1.5 text-xs max-w-full">
            <Clock className="w-3.5 h-3.5 text-[#7D6C63] shrink-0" />
            <label htmlFor="lead-time-override" className="font-bold text-[#5A4A42] whitespace-nowrap">
              زمان تحویل تامین‌کننده:
            </label>
            <select
              id="lead-time-override"
              value={leadTimeOverride}
              onChange={(e) => setLeadTimeOverride(Number(e.target.value))}
              className="rounded-lg border border-[#EAE2D8] bg-[#FAF8F5] px-2.5 py-1.5 text-xs font-bold text-[#2B1E1A] max-w-full"
            >
              <option value={0}>تنظیم اختصاصی هر ماده (پیش‌فرض ۳ روز)</option>
              <option value={2}>شبیه‌سازی ۲ روزه (تحویل سریع)</option>
              <option value={4}>شبیه‌سازی ۴ روزه</option>
              <option value={6}>شبیه‌سازی ۶ روزه (پیک شب عید)</option>
            </select>
          </div>
        </div>

        {/* Chart Scale Mode Toggle */}
        <div
          role="group"
          aria-label="حالت نمایش نمودار مقایسه نقطه سفارش"
          className="flex flex-wrap items-center gap-1 bg-[#FAF8F5] border border-[#EAE2D8] rounded-lg p-1 max-w-full"
        >
          {(
            [
              { id: 'ratio_pct', label: 'شاخص پوشش نسبت به نقطه سفارش (٪)' },
              { id: 'physical_kg', label: 'مقایسه وزنی (کیلوگرم)' },
              { id: 'physical_piece', label: 'اقلام عددی (تخم‌مرغ و جعبه)' },
            ] as const
          ).map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setChartMode(m.id)}
              className={`px-2.5 py-1.5 rounded-md text-xs font-bold transition-colors cursor-pointer ${
                chartMode === m.id
                  ? 'bg-[#2D6A4F] text-white'
                  : 'text-[#5A4A42] hover:text-[#2B1E1A]'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Primary Focal Recharts Chart: Warehouse Stock vs Reorder Point */}
      <section className="bg-white border border-[#EAE2D8] rounded-xl p-5">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
          <div>
            <h2 className="text-base font-extrabold text-[#2B1E1A]">
              {chartMode === 'ratio_pct'
                ? 'مقایسه موجودی انبار در برابر نقطه سفارش (خط قرمز = ۱۰۰٪ نقطه سفارش)'
                : chartMode === 'physical_kg'
                ? 'مقایسه موجودی فعلی و نقطه سفارش به کیلوگرم (مواد وزنی)'
                : 'مقایسه موجودی فعلی و نقطه سفارش به عدد (تخم‌مرغ و بسته‌بندی)'}
            </h2>
            <p className="text-xs text-[#7D6C63] mt-0.5">
              روی هر ماده در نمودار یا جدول پایین کلیک کنید تا نمودار روند مصرف روزانه و پیش‌بینی تخلیه آن نمایش داده شود.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-[11px] font-semibold text-[#5A4A42]">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#C84B31] inline-block" />
              زیر نقطه سفارش (فوری)
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#D97706] inline-block" />
              آستانه هشدار
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#2D6A4F] inline-block" />
              موجودی ایمن
            </span>
          </div>
        </div>

        {comparisonChartData.length === 0 ? (
          <div className="h-[260px] flex items-center justify-center text-xs text-[#7D6C63] border border-dashed border-[#EAE2D8] rounded-xl">
            هیچ ماده اولیه‌ای با فیلتر انتخاب‌شده مطابقت ندارد. فیلتر را روی «همه» بگذارید.
          </div>
        ) : chartMode === 'ratio_pct' ? (
          <div className="h-[320px] w-full" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={comparisonChartData}
                margin={{ top: 18, right: 20, left: 10, bottom: 52 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#F0E8DE" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: '#4B3B34' }}
                  interval={0}
                  angle={-25}
                  textAnchor="end"
                  height={62}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#5A4A42' }}
                  tickFormatter={(v) => `${formatDigits(v, usePersianDigits)}٪`}
                  domain={[0, (dataMax: number) => Math.max(150, Math.ceil(dataMax / 20) * 20)]}
                />
                <Tooltip
                  formatter={(value: unknown, _name: unknown, props: { payload?: { rawRatioPct?: number; fullName?: string; daysOfSupply?: number } }) => {
                    const raw = props?.payload?.rawRatioPct ?? Number(value);
                    const days = props?.payload?.daysOfSupply;
                    return [
                      `${formatDigits(raw, usePersianDigits)}٪ نقطه سفارش (${
                        days != null && days < 900
                          ? `${formatNumber(days, { decimals: 1, usePersian: usePersianDigits })} روز پوشش`
                          : 'بدون مصرف فعال'
                      })`,
                      'نسبت موجودی به نقطه سفارش',
                    ];
                  }}
                  labelFormatter={(_label, payload) =>
                    (payload?.[0]?.payload?.fullName as string) || String(_label)
                  }
                  contentStyle={{
                    borderRadius: '10px',
                    border: '1px solid #EAE2D8',
                    fontSize: '12px',
                    direction: 'rtl',
                  }}
                />
                <ReferenceLine
                  y={100}
                  stroke="#C84B31"
                  strokeWidth={2}
                  strokeDasharray="5 4"
                  label={{
                    value: 'نقطه سفارش (۱۰۰٪)',
                    position: 'insideTopLeft',
                    dy: -16,
                    dx: 8,
                    fill: '#C84B31',
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                />
                <Bar
                  dataKey="ratioPct"
                  name="نسبت موجودی به نقطه سفارش"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={42}
                  onClick={(entry) => {
                    const id = (entry?.payload as { ingredientId?: string } | undefined)?.ingredientId;
                    if (id) {
                      setSelectedIngId(String(id));
                    }
                  }}
                  className="cursor-pointer"
                >
                  {comparisonChartData.map((entry, idx) => (
                    <Cell
                      key={idx}
                      fill={
                        entry.status === 'critical'
                          ? '#C84B31'
                          : entry.status === 'warning'
                          ? '#D97706'
                          : '#2D6A4F'
                      }
                      stroke={activeItem?.ingredientId === entry.ingredientId ? '#2B1E1A' : 'none'}
                      strokeWidth={activeItem?.ingredientId === entry.ingredientId ? 2 : 0}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-[320px] w-full" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={comparisonChartData}
                margin={{ top: 16, right: 20, left: 10, bottom: 52 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#F0E8DE" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: '#4B3B34' }}
                  interval={0}
                  angle={-25}
                  textAnchor="end"
                  height={62}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#5A4A42' }}
                  tickFormatter={(v) => formatDigits(v, usePersianDigits)}
                />
                <Tooltip
                  formatter={(value: unknown, name: unknown, props: { payload?: { unitLabel?: string } }) => [
                    `${formatNumber(Number(value), { decimals: 1, usePersian: usePersianDigits })} ${
                      props?.payload?.unitLabel ?? ''
                    }`,
                    String(name),
                  ]}
                  labelFormatter={(_label, payload) =>
                    (payload?.[0]?.payload?.fullName as string) || String(_label)
                  }
                  contentStyle={{
                    borderRadius: '10px',
                    border: '1px solid #EAE2D8',
                    fontSize: '12px',
                    direction: 'rtl',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '6px' }} />
                <Bar
                  dataKey="currentVal"
                  name="موجودی فعلی انبار"
                  fill="#2D6A4F"
                  radius={[5, 5, 0, 0]}
                  maxBarSize={26}
                  onClick={(entry) => {
                    const id = (entry?.payload as { ingredientId?: string } | undefined)?.ingredientId;
                    if (id) setSelectedIngId(String(id));
                  }}
                  className="cursor-pointer"
                >
                  {comparisonChartData.map((entry, idx) => (
                    <Cell
                      key={idx}
                      fill={entry.status === 'critical' ? '#C84B31' : '#2D6A4F'}
                    />
                  ))}
                </Bar>
                <Bar
                  dataKey="reorderVal"
                  name="نقطه سفارش (ROP)"
                  fill="#D97706"
                  radius={[5, 5, 0, 0]}
                  maxBarSize={26}
                />
                <Bar
                  dataKey="safetyVal"
                  name="حداقل موجودی اطمینان"
                  fill="#94A3B8"
                  radius={[5, 5, 0, 0]}
                  maxBarSize={22}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      {/* Selected Ingredient Deep-Dive: 2 Recharts Analytics Panels */}
      {activeItem && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
          {/* Chart 2A: 7-Day Daily Consumption vs Theoretical Formula Usage */}
          <section className="xl:col-span-6 bg-white border border-[#EAE2D8] rounded-xl p-5">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div>
                <h2 className="text-sm font-extrabold text-[#2B1E1A]">
                  پایش مصرف روزانه ۷ روز اخیر — {activeItem.name}
                </h2>
                <p className="text-[11px] text-[#7D6C63] mt-0.5 tabular-nums">
                  مصرف تئوری روزانه طبق دستور پخت‌ها:{' '}
                  <strong className="text-[#2B1E1A]">
                    {formatBaseAmount(activeItem.dailyConsumptionBase, activeItem.baseUnit, usePersianDigits)}
                  </strong>{' '}
                  در روز
                </p>
              </div>
              <select
                aria-label="انتخاب ماده برای نمودار پایش روزانه"
                value={activeItem.ingredientId}
                onChange={(e) => setSelectedIngId(e.target.value)}
                className="rounded-lg border border-[#EAE2D8] bg-[#FAF8F5] px-2.5 py-1.5 text-xs font-bold text-[#2B1E1A]"
              >
                {monitor.items.map((item) => (
                  <option key={item.ingredientId} value={item.ingredientId}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="h-[245px] w-full" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={dailySeriesChartData}
                  margin={{ top: 10, right: 14, left: 6, bottom: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0E8DE" vertical={false} />
                  <XAxis dataKey="dayLabel" tick={{ fontSize: 10.5, fill: '#4B3B34' }} />
                  <YAxis
                    tick={{ fontSize: 10.5, fill: '#5A4A42' }}
                    tickFormatter={(v) => formatDigits(v, usePersianDigits)}
                  />
                  <Tooltip
                    formatter={(value: unknown, name: unknown) => [
                      `${formatNumber(Number(value), { decimals: 2, usePersian: usePersianDigits })} ${activeUnitLabel}`,
                      String(name),
                    ]}
                    contentStyle={{
                      borderRadius: '10px',
                      border: '1px solid #EAE2D8',
                      fontSize: '12px',
                      direction: 'rtl',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11.5px' }} />
                  <Bar
                    dataKey="actual"
                    name={`مصرف روزانه (${activeUnitLabel})`}
                    radius={[5, 5, 0, 0]}
                    maxBarSize={32}
                  >
                    {dailySeriesChartData.map((pt, idx) => (
                      <Cell
                        key={idx}
                        fill={
                          pt.actual > pt.theoretical * 1.08
                            ? '#C84B31'
                            : pt.hasLoggedEntry
                            ? '#4338CA'
                            : '#2D6A4F'
                        }
                      />
                    ))}
                  </Bar>
                  <Line
                    type="monotone"
                    dataKey="theoretical"
                    name="مصرف تئوری استاندارد"
                    stroke="#2B1E1A"
                    strokeWidth={2}
                    strokeDasharray="5 4"
                    dot={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* Chart 2B: 7-Day Stock Depletion Forecast vs Reorder Point */}
          <section className="xl:col-span-6 bg-white border border-[#EAE2D8] rounded-xl p-5">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div>
                <h2 className="text-sm font-extrabold text-[#2B1E1A] flex items-center gap-1.5">
                  <TrendingDown className="w-4 h-4 text-[#C84B31]" />
                  <span>پیش‌بینی روند افت موجودی ۷ روز آینده</span>
                </h2>
                <p className="text-[11px] text-[#7D6C63] mt-0.5 tabular-nums">
                  موجودی فعلی:{' '}
                  <strong>
                    {formatBaseAmount(activeItem.currentStockInBase, activeItem.baseUnit, usePersianDigits)}
                  </strong>{' '}
                  · نقطه سفارش:{' '}
                  <strong className="text-[#C84B31]">
                    {formatBaseAmount(activeItem.reorderPointInBase, activeItem.baseUnit, usePersianDigits)}
                  </strong>{' '}
                  · پوشش:{' '}
                  <strong>
                    {activeItem.daysOfSupply < 900
                      ? `${formatNumber(activeItem.daysOfSupply, { decimals: 1, usePersian: usePersianDigits })} روز`
                      : 'نامحدود'}
                  </strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  restockIngredient(
                    activeItem.ingredientId,
                    Math.max(1, activeItem.suggestedOrderPacks)
                  )
                }
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#2D6A4F] text-white text-xs font-bold hover:bg-[#23553F] cursor-pointer whitespace-nowrap"
              >
                <PackagePlus className="w-3.5 h-3.5" />
                <span>
                  شارژ +{formatDigits(Math.max(1, activeItem.suggestedOrderPacks), usePersianDigits)} بسته
                </span>
              </button>
            </div>

            <div className="h-[245px] w-full" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={depletionChartData}
                  margin={{ top: 12, right: 14, left: 6, bottom: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0E8DE" vertical={false} />
                  <XAxis dataKey="dayLabel" tick={{ fontSize: 10.5, fill: '#4B3B34' }} />
                  <YAxis
                    tick={{ fontSize: 10.5, fill: '#5A4A42' }}
                    tickFormatter={(v) => formatDigits(v, usePersianDigits)}
                  />
                  <Tooltip
                    formatter={(value: unknown, name: unknown) => [
                      `${formatNumber(Number(value), { decimals: 1, usePersian: usePersianDigits })} ${activeUnitLabel}`,
                      String(name),
                    ]}
                    contentStyle={{
                      borderRadius: '10px',
                      border: '1px solid #EAE2D8',
                      fontSize: '12px',
                      direction: 'rtl',
                    }}
                  />
                  <ReferenceLine
                    y={toDisplayUnitValue(activeItem.reorderPointInBase, activeItem.baseUnit, activeUseKg)}
                    stroke="#C84B31"
                    strokeWidth={2}
                    strokeDasharray="5 4"
                    label={{
                      value: 'نقطه سفارش',
                      position: 'insideTopRight',
                      fill: '#C84B31',
                      fontSize: 10.5,
                      fontWeight: 700,
                    }}
                  />
                  <ReferenceLine
                    y={toDisplayUnitValue(activeItem.safetyStockInBase, activeItem.baseUnit, activeUseKg)}
                    stroke="#D97706"
                    strokeWidth={1.5}
                    strokeDasharray="3 3"
                    label={{
                      value: 'اطمینان',
                      position: 'insideBottomRight',
                      fill: '#B45309',
                      fontSize: 10,
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="stock"
                    name={`موجودی پیش‌بینی‌شده (${activeUnitLabel})`}
                    stroke={activeItem.status === 'critical' ? '#C84B31' : '#2D6A4F'}
                    fill={activeItem.status === 'critical' ? '#C84B31' : '#2D6A4F'}
                    fillOpacity={0.14}
                    strokeWidth={2.5}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </section>
        </div>
      )}

      {/* Daily Consumption Entry + Recent Logs */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        <form
          onSubmit={handleSubmitConsumption}
          className="xl:col-span-5 bg-white border border-[#EAE2D8] rounded-xl p-5 space-y-3.5"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-extrabold text-[#2B1E1A]">
              ثبت مصرف واقعی امروز انبار
            </h2>
            {selectedLogMonitor && selectedLogMonitor.dailyConsumptionBase > 0 && (
              <button
                type="button"
                onClick={() => setLogAmount(Math.round(selectedLogMonitor.dailyConsumptionBase))}
                className="text-[11px] font-bold text-[#2D6A4F] hover:underline cursor-pointer"
              >
                پرکردن با مصرف تئوری ({formatBaseAmount(selectedLogMonitor.dailyConsumptionBase, selectedLogMonitor.baseUnit, usePersianDigits)})
              </button>
            )}
          </div>

          <div>
            <label htmlFor="daily-log-ingredient" className="block text-xs font-bold text-[#4B3B34] mb-1">
              انتخاب ماده اولیه
            </label>
            <select
              id="daily-log-ingredient"
              value={logIngId}
              onChange={(e) => {
                const nextId = e.target.value;
                setLogIngId(nextId);
                const found = monitor.items.find((i) => i.ingredientId === nextId);
                if (found && found.dailyConsumptionBase > 0) {
                  setLogAmount(Math.round(found.dailyConsumptionBase));
                }
              }}
              className="w-full rounded-lg border border-[#EAE2D8] bg-white px-3 py-2 text-xs font-semibold"
            >
              {data.ingredients.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name} ({i.baseUnit === 'piece' ? 'عدد' : i.baseUnit === 'ml' ? 'میلی‌لیتر' : 'گرم'})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#4B3B34] mb-1">
                مقدار مصرف امروز ({selectedLogIngredient?.baseUnit === 'piece' ? 'عدد' : 'گرم'})
              </label>
              <LocaleNumberInput
                value={logAmount}
                onChange={setLogAmount}
                min={1}
                ariaLabel="مقدار مصرف روزانه"
                suffix={selectedLogIngredient?.baseUnit === 'piece' ? 'عدد' : 'گرم'}
              />
            </div>
            <div>
              <label htmlFor="daily-log-note" className="block text-xs font-bold text-[#4B3B34] mb-1">
                توضیح شیفت (اختیاری)
              </label>
              <input
                id="daily-log-note"
                type="text"
                value={logNote}
                onChange={(e) => setLogNote(e.target.value)}
                placeholder="مثلاً: تولید اضافه سفارش کافه"
                className="w-full rounded-lg border border-[#EAE2D8] px-3 py-2 text-xs"
              />
            </div>
          </div>

          <label className="inline-flex items-center gap-2 text-xs text-[#4B3B34] cursor-pointer">
            <input
              type="checkbox"
              checked={deductStock}
              onChange={(e) => setDeductStock(e.target.checked)}
              className="accent-[#2D6A4F]"
            />
            <span>مقدار مصرف‌شده به‌طور خودکار از موجودی فعلی انبار کسر شود</span>
          </label>

          <button
            type="submit"
            className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-[#2B1E1A] text-white text-xs font-bold hover:bg-[#3E2D27] cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>ثبت مصرف روزانه و به‌روزرسانی نمودار</span>
          </button>
        </form>

        {/* Recent Logged Consumption Entries */}
        <section className="xl:col-span-7 bg-white border border-[#EAE2D8] rounded-xl p-5 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-extrabold text-[#2B1E1A]">
              آخرین رکوردهای ثبت‌شده مصرف روزانه انبار
            </h2>
            <span className="text-[11px] text-[#7D6C63] tabular-nums">
              {formatDigits((data.dailyConsumptionLogs ?? []).length, usePersianDigits)} رکورد ثبت‌شده
            </span>
          </div>

          {recentLogs.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-xs text-[#7D6C63] py-8">
              هنوز مصرف روزانه‌ای به صورت دستی ثبت نشده است؛ از فرم سمت راست مصرف امروز را ثبت کنید.
            </div>
          ) : (
            <div className="space-y-2">
              {recentLogs.map((log) => {
                const ing = data.ingredients.find((i) => i.id === log.ingredientId);
                if (!ing) return null;
                return (
                  <div
                    key={log.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#EAE2D8] bg-[#FAF8F5] px-3.5 py-2.5 text-xs"
                  >
                    <div>
                      <div className="font-bold text-[#2B1E1A]">
                        {ing.name}{' '}
                        <span className="font-normal text-[#7D6C63]">· {log.dateLabel}</span>
                      </div>
                      {log.note && (
                        <div className="text-[11px] text-[#6E5C54] mt-0.5">{log.note}</div>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-extrabold text-[#4338CA] tabular-nums">
                        {formatBaseAmount(log.actualUsedInBase, ing.baseUnit, usePersianDigits)}
                      </span>
                      <button
                        type="button"
                        aria-label={`حذف مصرف روزانه ${ing.name}`}
                        onClick={() => deleteDailyConsumptionLog(log.id)}
                        className="p-1 text-[#8C7B72] hover:text-[#C84B31] cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* Full Reorder Point Comparison Table */}
      <section className="bg-white border border-[#EAE2D8] rounded-xl overflow-hidden">
        <div className="p-4 border-b border-[#EAE2D8] flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-extrabold text-[#2B1E1A] flex items-center gap-1.5">
              <ShoppingCart className="w-4 h-4 text-[#2D6A4F]" />
              <span>جدول عملیاتی کنترل موجودی و پیشنهاد سفارش خرید</span>
            </h2>
            <p className="text-[11px] text-[#7D6C63] mt-0.5">
              مرتب‌شده بر اساس اولویت سفارش؛ می‌توانید زمان تحویل (روز) را ویرایش یا با یک کلیک خرید جدید را ثبت کنید.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs border-collapse">
            <thead>
              <tr className="bg-[#FAF8F5] border-b border-[#EAE2D8] text-[#6E5C54]">
                <th className="py-3 px-3 font-bold">ماده اولیه</th>
                <th className="py-3 px-3 font-bold">مصرف روزانه</th>
                <th className="py-3 px-3 font-bold">موجودی فعلی</th>
                <th className="py-3 px-3 font-bold">نقطه سفارش (ROP)</th>
                <th className="py-3 px-3 font-bold">نسبت به ROP</th>
                <th className="py-3 px-3 font-bold">پوشش (روز)</th>
                <th className="py-3 px-3 font-bold">زمان تحویل</th>
                <th className="py-3 px-3 font-bold">وضعیت و اقدام</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F3ECE4]">
              {filteredItems.map((item) => {
                const isSelected = activeItem?.ingredientId === item.ingredientId;
                return (
                  <tr
                    key={item.ingredientId}
                    onClick={() => setSelectedIngId(item.ingredientId)}
                    className={`cursor-pointer transition-colors ${
                      isSelected ? 'bg-[#EEF2FF]/60' : 'hover:bg-[#FAF8F5]'
                    }`}
                  >
                    <td className="py-3 px-3">
                      <div className="font-bold text-[#2B1E1A]">{item.name}</div>
                      <div className="text-[11px] text-[#7D6C63]">
                        {CATEGORY_LABELS[item.category]}
                        {item.supplierName ? ` · ${item.supplierName}` : ''}
                      </div>
                    </td>
                    <td className="py-3 px-3 tabular-nums text-[#4B3B34] font-semibold">
                      {formatBaseAmount(item.dailyConsumptionBase, item.baseUnit, usePersianDigits)}
                    </td>
                    <td className="py-3 px-3 tabular-nums font-extrabold text-[#2B1E1A]">
                      {formatBaseAmount(item.currentStockInBase, item.baseUnit, usePersianDigits)}
                    </td>
                    <td className="py-3 px-3 tabular-nums font-bold text-[#D97706]">
                      <div>{formatBaseAmount(item.reorderPointInBase, item.baseUnit, usePersianDigits)}</div>
                      <div className="text-[10px] text-[#8C7B72] font-normal">
                        اطمینان: {formatBaseAmount(item.safetyStockInBase, item.baseUnit, usePersianDigits)}
                      </div>
                    </td>
                    <td className="py-3 px-3 tabular-nums">
                      <span
                        className={`font-extrabold ${
                          item.status === 'critical'
                            ? 'text-[#C84B31]'
                            : item.status === 'warning'
                            ? 'text-[#D97706]'
                            : 'text-[#2D6A4F]'
                        }`}
                      >
                        {formatPercent(item.stockToReorderPct, usePersianDigits, 0)}
                      </span>
                    </td>
                    <td className="py-3 px-3 tabular-nums font-bold">
                      {item.daysOfSupply < 900
                        ? `${formatNumber(item.daysOfSupply, { decimals: 1, usePersian: usePersianDigits })} روز`
                        : '—'}
                    </td>
                    <td
                      className="py-3 px-3 tabular-nums"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <select
                        aria-label={`زمان تحویل ${item.name}`}
                        value={item.leadTimeDays}
                        disabled={leadTimeOverride > 0}
                        onChange={(e) =>
                          handleUpdateLeadTime(item.ingredientId, Number(e.target.value))
                        }
                        className="rounded-md border border-[#EAE2D8] bg-white px-2 py-1 text-[11px] font-bold disabled:opacity-60"
                      >
                        {[1, 2, 3, 4, 5, 7, 10].map((d) => (
                          <option key={d} value={d}>
                            {formatDigits(d, usePersianDigits)} روز
                          </option>
                        ))}
                      </select>
                    </td>
                    <td
                      className="py-3 px-3"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-bold ${
                            item.status === 'critical'
                              ? 'text-[#C84B31]'
                              : item.status === 'warning'
                              ? 'text-[#B45309]'
                              : 'text-[#2D6A4F]'
                          }`}
                        >
                          {item.status === 'critical' ? (
                            <AlertTriangle className="w-3.5 h-3.5" />
                          ) : (
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          )}
                          <span>
                            {item.status === 'critical'
                              ? 'سفارش فوری'
                              : item.status === 'warning'
                              ? 'نزدیک نقطه سفارش'
                              : 'ایمن'}
                          </span>
                        </span>

                        {item.suggestedOrderPacks > 0 && (
                          <button
                            type="button"
                            onClick={() =>
                              restockIngredient(item.ingredientId, item.suggestedOrderPacks)
                            }
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#2D6A4F] text-white text-[11px] font-bold hover:bg-[#23553F] cursor-pointer whitespace-nowrap"
                          >
                            <PackagePlus className="w-3 h-3" />
                            <span>
                              خرید +{formatDigits(item.suggestedOrderPacks, usePersianDigits)} بسته
                            </span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
