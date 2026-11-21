import React, { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Calculator,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Layers,
  Plus,
  Receipt,
  Scale,
  SlidersHorizontal,
  Trash2,
  Users,
} from 'lucide-react';
import { useWorkshop } from '../store/WorkshopContext';
import {
  computeEquipmentMonthlyDepreciation,
  computeOverheadStudioAnalysis,
  computePeriodicBillToMonthly,
  OVERHEAD_METHOD_LIST,
  OVERHEAD_METHOD_MAP,
} from '../utils/overheadEngine';
import { computeTrueMonthlyStaffCost } from '../utils/costEngine';
import {
  formatCurrency,
  formatDigits,
  formatNumber,
  formatPercent,
  formatShortToman,
} from '../utils/formatters';
import { OverheadAllocationMethod, OverheadItem } from '../types';
import { GuidedBanner } from '../components/GuidedBanner';
import { HelpTip } from '../components/HelpTip';
import { LocaleNumberInput } from '../components/LocaleNumberInput';
import { PrivacyValue } from '../components/PrivacyValue';

type OverheadTab = 'identify' | 'data_entry' | 'allocation_lab';

const OVERHEAD_CATEGORIES: OverheadItem['category'][] = [
  'اجاره و ملک',
  'انرژی و فر',
  'استهلاک تجهیزات',
  'بازاریابی و اداری',
  'سایر',
];

export const OverheadStudioModule: React.FC<{
  onOpenRecipes?: () => void;
}> = ({ onOpenRecipes }) => {
  const {
    data,
    summary,
    updateSettings,
    upsertOverhead,
    deleteOverhead,
    upsertStaff,
    notify,
  } = useWorkshop();

  const { currencyUnit, usePersianDigits, overheadAllocationMethod } = data.settings;
  const fmt = (v: number, compact = false) =>
    formatCurrency(v, currencyUnit, usePersianDigits, compact);

  const [activeTab, setActiveTab] = useState<OverheadTab>('identify');

  // New Overhead Form state
  const [ohName, setOhName] = useState('');
  const [ohCategory, setOhCategory] = useState<OverheadItem['category']>('انرژی و فر');
  const [ohBehavior, setOhBehavior] = useState<'fixed' | 'semi_variable'>('fixed');
  const [ohAmount, setOhAmount] = useState<number>(5_000_000);
  const [ohDriverNote, setOhDriverNote] = useState('');

  // Depreciation Converter state
  const [eqName, setEqName] = useState('فر گردان ۱۶ سینی و میکسر قنادی');
  const [eqPrice, setEqPrice] = useState<number>(680_000_000);
  const [eqSalvage, setEqSalvage] = useState<number>(120_000_000);
  const [eqYears, setEqYears] = useState<number>(6);

  // Periodic Bill Converter state
  const [billName, setBillName] = useState('بیمه آتش‌سوزی کارگاه و مسئولیت');
  const [billCategory, setBillCategory] = useState<OverheadItem['category']>('سایر');
  const [billTotal, setBillTotal] = useState<number>(36_000_000);
  const [billMonths, setBillMonths] = useState<number>(12);

  const studio = useMemo(
    () => computeOverheadStudioAnalysis(data, summary),
    [data, summary]
  );

  const depCalc = useMemo(
    () => computeEquipmentMonthlyDepreciation(eqPrice, eqSalvage, eqYears),
    [eqPrice, eqSalvage, eqYears]
  );

  const monthlyBillAmount = useMemo(
    () => computePeriodicBillToMonthly(billTotal, billMonths),
    [billTotal, billMonths]
  );

  // Recharts comparison chart data across 5 allocation methods
  const methodComparisonChartData = useMemo(() => {
    return studio.comparisonRows.map((row) => ({
      name: row.name.split(' ').slice(0, 2).join(' '),
      fullName: row.name,
      weight: Math.round(row.byMethodPerKg.weight),
      time_abc: Math.round(row.byMethodPerKg.time_abc),
      hybrid: Math.round(row.byMethodPerKg.hybrid),
      oven_hours: Math.round(row.byMethodPerKg.oven_hours),
      direct_cost: Math.round(row.byMethodPerKg.direct_cost),
    }));
  }, [studio.comparisonRows]);

  const handleAddOverhead = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ohName.trim() || ohAmount <= 0) return;
    upsertOverhead({
      id: `oh-${Date.now()}`,
      name: ohName.trim(),
      category: ohCategory,
      monthlyAmount: Math.round(ohAmount),
      active: true,
      behavior: ohBehavior,
      driverNote: ohDriverNote.trim() || undefined,
    });
    setOhName('');
    setOhDriverNote('');
  };

  const handleAddDepreciationAsOverhead = () => {
    if (!eqName.trim() || depCalc.monthlyDepreciation <= 0) return;
    upsertOverhead({
      id: `oh-dep-${Date.now()}`,
      name: `استهلاک ماهانه ${eqName.trim()}`,
      category: 'استهلاک تجهیزات',
      monthlyAmount: depCalc.monthlyDepreciation,
      active: true,
      behavior: 'fixed',
      driverNote: `ارزش ${fmt(eqPrice, true)} با عمر مفید ${formatDigits(eqYears, usePersianDigits)} سال`,
    });
  };

  const handleAddPeriodicBillAsOverhead = () => {
    if (!billName.trim() || monthlyBillAmount <= 0) return;
    upsertOverhead({
      id: `oh-bill-${Date.now()}`,
      name: billName.trim(),
      category: billCategory,
      monthlyAmount: monthlyBillAmount,
      active: true,
      behavior: 'fixed',
      driverNote: `معادل ماهانه قبض ${formatDigits(billMonths, usePersianDigits)} ماهه`,
    });
  };

  const activeMethodMeta =
    OVERHEAD_METHOD_MAP[overheadAllocationMethod] ?? OVERHEAD_METHOD_MAP.hybrid;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-[#2B1E1A]">
            ماژول تخصصی مدیریت سربار: شناسایی، ورود داده و روش‌های سرشکن
          </h1>
          <p className="text-xs text-[#7D6C63] mt-0.5">
            کشف هزینه‌های پنهان کارگاه، تبدیل استهلاک و قبوض دوره‌ای به ماهانه، و مقایسه ۵ روش علمی پخش سربار روی محصولات
          </p>
        </div>
        {onOpenRecipes && (
          <button
            type="button"
            onClick={onOpenRecipes}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[#EAE2D8] bg-white hover:bg-[#FAF8F5] text-xs font-bold text-[#2B1E1A] cursor-pointer whitespace-nowrap"
          >
            <Layers className="w-3.5 h-3.5 text-[#2D6A4F]" />
            <span>مشاهده اثر سربار در فرمولاسیون</span>
          </button>
        )}
      </div>

      {/* KPI Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5">
        <div className="bg-white border border-[#EAE2D8] rounded-xl p-4">
          <div className="text-xs text-[#6E5C54] flex items-center justify-between">
            <span>استخر کل سربار ماهانه کارگاه</span>
            <HelpTip id="overheadStudioPool" />
          </div>
          <div className="text-2xl font-extrabold text-[#2B1E1A] tabular-nums mt-1.5">
            <PrivacyValue>{fmt(studio.totalPool, true)}</PrivacyValue>
          </div>
          <div className="text-[11px] text-[#7D6C63] mt-1 tabular-nums">
            سربار ثابت: <PrivacyValue>{fmt(summary.totalMonthlyFixedOverhead, true)}</PrivacyValue> · پرسنل:{' '}
            <PrivacyValue>{fmt(summary.totalMonthlyStaffCost, true)}</PrivacyValue>
          </div>
        </div>

        <div className="bg-white border border-[#EAE2D8] rounded-xl p-4">
          <div className="text-xs text-[#6E5C54]">میانگین سربار هر کیلو تولید</div>
          <div className="text-2xl font-extrabold text-[#4338CA] tabular-nums mt-1.5">
            <PrivacyValue>{fmt(studio.avgOverheadPerKg)}</PrivacyValue>
          </div>
          <div className="text-[11px] text-[#7D6C63] mt-1 tabular-nums">
            سهم سربار از کل فروش ماهانه: {formatPercent(studio.overheadToRevenuePct, usePersianDigits)}
          </div>
        </div>

        <div className="bg-white border border-[#EAE2D8] rounded-xl p-4">
          <div className="text-xs text-[#6E5C54]">نرخ سربار هر ساعت اشغال فر</div>
          <div className="text-2xl font-extrabold text-[#D97706] tabular-nums mt-1.5">
            <PrivacyValue>{fmt(studio.overheadPerOvenHour, true)}</PrivacyValue>
          </div>
          <div className="text-[11px] text-[#7D6C63] mt-1 tabular-nums">
            کل ساعت فر مصرفی ماه: {formatNumber(summary.usedOvenHours, { decimals: 1, usePersian: usePersianDigits })} ساعت
          </div>
        </div>

        <div className="bg-[#ECFDF5] border border-[#A7F3D0] rounded-xl p-4">
          <div className="text-xs font-bold text-[#065F46] flex items-center justify-between">
            <span>روش فعال سرشکن سربار</span>
            <HelpTip id="overheadAllocation" />
          </div>
          <div className="text-base font-extrabold text-[#2D6A4F] mt-1.5">
            {activeMethodMeta.shortLabel}
          </div>
          <div className="text-[11px] text-[#065F46] mt-1">
            پوشش چک‌لیست شناسایی: {formatPercent(studio.coveragePct, usePersianDigits, 0)} (
            {formatDigits(studio.coveredCount, usePersianDigits)} از{' '}
            {formatDigits(studio.checklist.length, usePersianDigits)})
          </div>
        </div>
      </div>

      {/* Sub-Tabs */}
      <div
        role="tablist"
        aria-label="بخش‌های ماژول تخصصی سربار"
        className="flex flex-wrap gap-1.5 bg-white border border-[#EAE2D8] rounded-xl p-1.5"
      >
        {(
          [
            {
              id: 'identify',
              label: '۱. شناسایی سربارها و کشف هزینه‌های پنهان',
              icon: ClipboardCheck,
            },
            {
              id: 'data_entry',
              label: '۲. ثبت داده‌های سربار + ماشین‌حساب استهلاک و قبوض',
              icon: Receipt,
            },
            {
              id: 'allocation_lab',
              label: '۳. روش‌های پخش (سرشکن) سربار و مقایسه ۵ روش',
              icon: Scale,
            },
          ] as const
        ).map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={active}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer text-right ${
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

      {/* TAB 1: Overhead Identification & Composition */}
      {activeTab === 'identify' && (
        <div className="space-y-5">
          <GuidedBanner text="سربار یعنی هر هزینه‌ای که در کارگاه پرداخت می‌شود اما مستقیماً روی ترازو داخل خمیر یک شیرینی مشخص وزن نمی‌شود. از چک‌لیست زیر برای کشف هزینه‌های فراموش‌شده و افزودن آنی آن‌ها استفاده کنید." />

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
            {/* Identification Checklist */}
            <section className="xl:col-span-7 bg-white border border-[#EAE2D8] rounded-xl p-5 space-y-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-base font-extrabold text-[#2B1E1A]">
                    چک‌لیست ۷ گانه شناسایی سربار کارگاه قنادی
                  </h2>
                  <p className="text-xs text-[#7D6C63] mt-0.5">
                    هر ردیفی که در لیست کارگاه شما پیدا نشده، با یک کلیک قابل افزودن و سپس ویرایش دقیق است.
                  </p>
                </div>
                <span className="text-xs font-extrabold text-[#2D6A4F] tabular-nums">
                  {formatDigits(studio.coveredCount, usePersianDigits)} /{' '}
                  {formatDigits(studio.checklist.length, usePersianDigits)} شناسایی شده
                </span>
              </div>

              <div className="space-y-2.5">
                {studio.checklist.map((item) => (
                  <div
                    key={item.id}
                    className={`rounded-xl border p-4 transition-colors ${
                      item.isCovered
                        ? 'bg-[#ECFDF5]/45 border-[#A7F3D0]'
                        : 'bg-[#FAF8F5] border-[#EAE2D8]'
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-extrabold text-[#2B1E1A]">
                            {item.name}
                          </span>
                        </div>
                        <div className="text-[11px] text-[#7D6C63] mt-0.5">
                          دسته: {item.category} · ماهیت:{' '}
                          {item.behavior === 'fixed' ? 'ثابت ماهانه' : 'نیمه‌متغیر (وابسته به فصل/تولید)'}
                        </div>
                      </div>

                      {item.isCovered ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-[#2D6A4F] shrink-0">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>ثبت‌شده</span>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            upsertOverhead({
                              id: `oh-${item.id}-${Date.now()}`,
                              name: item.name,
                              category: item.category,
                              monthlyAmount: item.suggestedMonthlyAmount,
                              active: true,
                              behavior: item.behavior,
                              driverNote: item.howToMeasure,
                            });
                          }}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#2D6A4F] text-white text-xs font-bold hover:bg-[#23553F] cursor-pointer shrink-0 whitespace-nowrap"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>افزودن ({fmt(item.suggestedMonthlyAmount, true)})</span>
                        </button>
                      )}
                    </div>

                    <div className="mt-2.5 text-xs text-[#4B3B34] leading-relaxed">
                      {item.identificationTip}
                    </div>
                    <div className="mt-1.5 text-[11px] text-[#6E5C54]">
                      <strong>روش اندازه‌گیری:</strong> {item.howToMeasure}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Right Column: Composition Recharts Bar + Step-by-Step Guide */}
            <div className="xl:col-span-5 space-y-5">
              <section className="bg-white border border-[#EAE2D8] rounded-xl p-5">
                <h2 className="text-sm font-extrabold text-[#2B1E1A] mb-1">
                  ساختار استخر سربار ماهانه شما (به تفکیک سرفصل)
                </h2>
                <p className="text-[11px] text-[#7D6C63] mb-3">
                  مجموع حقوق قانون کار + ردیف‌های فعال سربار ثابت
                </p>

                <div className="h-[250px] w-full" dir="ltr">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={studio.categoryBreakdown}
                      layout="vertical"
                      margin={{ top: 4, right: 18, left: 10, bottom: 4 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#F0E8DE" horizontal={false} />
                      <XAxis
                        type="number"
                        tick={{ fontSize: 10.5, fill: '#5A4A42' }}
                        tickFormatter={(v) => formatShortToman(Number(v), usePersianDigits)}
                      />
                      <YAxis
                        type="category"
                        dataKey="category"
                        width={118}
                        tick={{ fontSize: 11, fill: '#2B1E1A' }}
                      />
                      <Tooltip
                        formatter={(v: unknown) => [
                          data.settings.privacyMode ? '•••••' : fmt(Number(v)),
                          'مبلغ ماهانه',
                        ]}
                        contentStyle={{
                          borderRadius: '10px',
                          border: '1px solid #EAE2D8',
                          fontSize: '12px',
                          direction: 'rtl',
                        }}
                      />
                      <Bar dataKey="amount" radius={[0, 6, 6, 0]} maxBarSize={26}>
                        {studio.categoryBreakdown.map((slice, idx) => (
                          <Cell key={idx} fill={slice.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="mt-3 divide-y divide-[#F3ECE4] text-xs tabular-nums">
                  {studio.categoryBreakdown.map((slice) => (
                    <div key={slice.category} className="py-2 flex items-center justify-between gap-2">
                      <span className="font-semibold text-[#4B3B34]">{slice.category}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-[#7D6C63]">
                          {formatPercent(slice.sharePct, usePersianDigits)}
                        </span>
                        <span className="font-extrabold text-[#2B1E1A]">
                          <PrivacyValue>{fmt(slice.amount, true)}</PrivacyValue>
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="bg-[#FAF8F5] border border-[#EAE2D8] rounded-xl p-5 space-y-2.5 text-xs text-[#4B3B34]">
                <h3 className="text-sm font-extrabold text-[#2B1E1A]">
                  ۳ قانون طلایی در شناسایی و ورود داده‌های سربار
                </h3>
                <p className="leading-relaxed">
                  <strong>۱. تفکیک مستقیم از غیرمستقیم:</strong> آرد، کره، پسته و جعبه ۱ کیلویی چون دقیقاً برای هر محصول مشخص‌اند جزو «مواد مستقیم» هستند؛ اما برق یخچال، اجاره و دستکش جزو «سربار» هستند.
                </p>
                <p className="leading-relaxed">
                  <strong>۲. ماهانه‌سازی هزینه‌های فصلی و سالانه:</strong> قبض دوماهه برق را تقسیم بر ۲ و بیمه آتش‌سوزی یا عیدی سالانه را تقسیم بر ۱۲ کنید تا شوک یک‌باره نداشته باشید.
                </p>
                <p className="leading-relaxed">
                  <strong>۳. لحاظ کردن اجاره و حقوق مالک:</strong> اگر خودتان مغازه دارید یا داخل کارگاه کار می‌کنید، اجاره عرف و حقوق مدیریت را در سربار بیاورید تا سود خالص واقعی باشد.
                </p>
              </section>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Overhead Data Entry + Depreciation & Periodic Bill Converters */}
      {activeTab === 'data_entry' && (
        <div className="space-y-5">
          <GuidedBanner text="در این بخش می‌توانید ردیف‌های سربار را مستقیماً ویرایش یا غیرفعال کنید، و با دو ماشین‌حساب پایین، استهلاک دستگاه‌ها و قبوض سالانه/دوماهه را دقیقاً به عدد ماهانه تبدیل کرده و ثبت کنید." />

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
            {/* Overhead Ledger + Inline Editor */}
            <section className="xl:col-span-7 bg-white border border-[#EAE2D8] rounded-xl p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-base font-extrabold text-[#2B1E1A]">
                  دفتر کل ردیف‌های سربار ماهانه کارگاه
                </h2>
                <span className="text-xs font-extrabold text-[#2D6A4F] tabular-nums">
                  جمع فعال: <PrivacyValue>{fmt(summary.totalMonthlyFixedOverhead, true)}</PrivacyValue>
                </span>
              </div>

              <div className="space-y-2.5">
                {data.overheads.map((oh) => (
                  <div
                    key={oh.id}
                    className={`rounded-xl border p-3.5 transition-colors ${
                      oh.active
                        ? 'bg-[#FAF8F5] border-[#EAE2D8]'
                        : 'bg-[#F8F6F3] border-[#EFE7DC] opacity-65'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-start gap-2.5 min-w-0 flex-1">
                        <input
                          type="checkbox"
                          aria-label={`فعال‌سازی ${oh.name}`}
                          checked={oh.active}
                          onChange={(e) => upsertOverhead({ ...oh, active: e.target.checked })}
                          className="mt-1 accent-[#2D6A4F] cursor-pointer"
                        />
                        <div className="min-w-0">
                          <div className="text-xs font-extrabold text-[#2B1E1A]">{oh.name}</div>
                          <div className="text-[11px] text-[#7D6C63] mt-0.5">
                            {oh.category}
                            {oh.behavior ? ` · ${oh.behavior === 'fixed' ? 'ثابت' : 'نیمه‌متغیر'}` : ''}
                            {oh.driverNote ? ` · ${oh.driverNote}` : ''}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <div className="w-36">
                          <LocaleNumberInput
                            value={oh.monthlyAmount}
                            onChange={(val) =>
                              upsertOverhead({ ...oh, monthlyAmount: Math.max(0, Math.round(val)) })
                            }
                            ariaLabel={`مبلغ ماهانه ${oh.name}`}
                          />
                        </div>
                        <button
                          type="button"
                          aria-label={`حذف ${oh.name}`}
                          onClick={() => deleteOverhead(oh.id)}
                          className="p-1.5 rounded-lg text-[#C84B31] hover:bg-[#FEF2F2] cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add New Overhead Row Form */}
              <form
                onSubmit={handleAddOverhead}
                className="pt-4 border-t border-[#F2EBE2] space-y-3"
              >
                <h3 className="text-xs font-extrabold text-[#2B1E1A]">افزودن ردیف سربار جدید</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <input
                    required
                    type="text"
                    value={ohName}
                    onChange={(e) => setOhName(e.target.value)}
                    placeholder="عنوان هزینه (مثلاً شارژ کپسول و بهداشت)"
                    className="rounded-lg border border-[#EAE2D8] px-3 py-2 text-xs"
                  />
                  <select
                    aria-label="دسته‌بندی سربار جدید"
                    value={ohCategory}
                    onChange={(e) => setOhCategory(e.target.value as OverheadItem['category'])}
                    className="rounded-lg border border-[#EAE2D8] bg-white px-3 py-2 text-xs font-semibold"
                  >
                    {OVERHEAD_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <LocaleNumberInput
                    value={ohAmount}
                    onChange={setOhAmount}
                    ariaLabel="مبلغ ماهانه سربار جدید"
                    suffix="تومان"
                  />
                  <select
                    aria-label="ماهیت هزینه سربار"
                    value={ohBehavior}
                    onChange={(e) => setOhBehavior(e.target.value as 'fixed' | 'semi_variable')}
                    className="rounded-lg border border-[#EAE2D8] bg-white px-3 py-2 text-xs font-semibold"
                  >
                    <option value="fixed">ثابت ماهانه (Fixed)</option>
                    <option value="semi_variable">نیمه‌متغیر (Semi-Variable)</option>
                  </select>
                  <input
                    type="text"
                    value={ohDriverNote}
                    onChange={(e) => setOhDriverNote(e.target.value)}
                    placeholder="توضیح مبنا (اختیاری)"
                    className="rounded-lg border border-[#EAE2D8] px-3 py-2 text-xs"
                  />
                </div>

                <button
                  type="submit"
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-[#2B1E1A] text-white text-xs font-bold hover:bg-[#3E2D27] cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>ثبت در دفتر سربار و محاسبه مجدد منو</span>
                </button>
              </form>
            </section>

            {/* Right Column: Helper Converters + Synced Payroll Overhead */}
            <div className="xl:col-span-5 space-y-5">
              {/* Helper 1: Equipment Monthly Depreciation Calculator */}
              <section className="bg-white border border-[#EAE2D8] rounded-xl p-5 space-y-3">
                <h2 className="text-sm font-extrabold text-[#2B1E1A] flex items-center gap-1.5">
                  <Calculator className="w-4 h-4 text-[#4338CA]" />
                  <span>ماشین‌حساب استهلاک ماهانه تجهیزات قنادی</span>
                </h2>
                <p className="text-[11px] text-[#7D6C63]">
                  قیمت روز دستگاه (فر، میکسر، یخچال) را وارد کنید تا هزینه استهلاک ماهانه محاسبه و به سربار اضافه شود.
                </p>

                <input
                  type="text"
                  value={eqName}
                  onChange={(e) => setEqName(e.target.value)}
                  placeholder="نام دستگاه یا مجموعه تجهیزات"
                  className="w-full rounded-lg border border-[#EAE2D8] px-3 py-2 text-xs"
                />

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-bold text-[#4B3B34] mb-1">قیمت روز (تومان)</label>
                    <LocaleNumberInput value={eqPrice} onChange={setEqPrice} />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-[#4B3B34] mb-1">ارزش اسقاط</label>
                    <LocaleNumberInput value={eqSalvage} onChange={setEqSalvage} />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-[#4B3B34] mb-1">عمر مفید (سال)</label>
                    <LocaleNumberInput value={eqYears} onChange={setEqYears} min={1} max={25} suffix="سال" />
                  </div>
                </div>

                <div className="rounded-xl bg-[#EEF2FF] border border-[#C7D2FE] p-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div>
                    <div className="text-[#312E81] font-bold">استهلاک ماهانه محاسبه‌شده:</div>
                    <div className="text-base font-extrabold text-[#4338CA] tabular-nums">
                      {fmt(depCalc.monthlyDepreciation)} / ماه
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddDepreciationAsOverhead}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#4338CA] text-white text-xs font-bold hover:bg-[#3730A3] cursor-pointer whitespace-nowrap"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>افزودن به سربار</span>
                  </button>
                </div>
              </section>

              {/* Helper 2: Periodic / Annual Bill Converter */}
              <section className="bg-white border border-[#EAE2D8] rounded-xl p-5 space-y-3">
                <h2 className="text-sm font-extrabold text-[#2B1E1A] flex items-center gap-1.5">
                  <SlidersHorizontal className="w-4 h-4 text-[#D97706]" />
                  <span>تبدیل قبوض دوره‌ای یا سالانه به سهم ماهانه</span>
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <input
                    type="text"
                    value={billName}
                    onChange={(e) => setBillName(e.target.value)}
                    placeholder="عنوان هزینه دوره‌ای"
                    className="rounded-lg border border-[#EAE2D8] px-3 py-2 text-xs"
                  />
                  <select
                    aria-label="دسته قبض دوره‌ای"
                    value={billCategory}
                    onChange={(e) => setBillCategory(e.target.value as OverheadItem['category'])}
                    className="rounded-lg border border-[#EAE2D8] bg-white px-3 py-2 text-xs font-semibold"
                  >
                    {OVERHEAD_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-bold text-[#4B3B34] mb-1">مبلغ کل قبض/قرارداد</label>
                    <LocaleNumberInput value={billTotal} onChange={setBillTotal} suffix="تومان" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-[#4B3B34] mb-1">دوره پوشش (ماه)</label>
                    <select
                      aria-label="دوره پوشش قبض"
                      value={billMonths}
                      onChange={(e) => setBillMonths(Number(e.target.value))}
                      className="w-full rounded-lg border border-[#EAE2D8] bg-white px-3 py-2 text-xs font-bold"
                    >
                      <option value={2}>۲ ماهه (قبوض برق/گاز)</option>
                      <option value={3}>۳ ماهه (فصلی)</option>
                      <option value={6}>۶ ماهه</option>
                      <option value={12}>۱۲ ماهه (سالانه: بیمه/اتحادیه)</option>
                    </select>
                  </div>
                </div>
                <div className="rounded-xl bg-[#FFFBEB] border border-[#F5D08A] p-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div>
                    <div className="text-[#92400E] font-bold">معادل ماهانه:</div>
                    <div className="text-base font-extrabold text-[#B45309] tabular-nums">
                      {fmt(monthlyBillAmount)} / ماه
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddPeriodicBillAsOverhead}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#D97706] text-white text-xs font-bold hover:bg-[#B45309] cursor-pointer whitespace-nowrap"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>ثبت در سربار</span>
                  </button>
                </div>
              </section>

              {/* Synced Staff & Payroll Overhead Pool */}
              <section className="bg-white border border-[#EAE2D8] rounded-xl p-5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-extrabold text-[#2B1E1A] flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-[#2D6A4F]" />
                    <span>بخش پرسنل و قانون کار در استخر سربار</span>
                  </h2>
                  <span className="text-xs font-extrabold text-[#2B1E1A] tabular-nums">
                    <PrivacyValue>{fmt(summary.totalMonthlyStaffCost, true)}</PrivacyValue>
                  </span>
                </div>
                <div className="space-y-2">
                  {data.staff.map((st) => {
                    const calc = computeTrueMonthlyStaffCost(st);
                    return (
                      <div
                        key={st.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#EAE2D8] bg-[#FAF8F5] px-3 py-2 text-xs"
                      >
                        <label className="inline-flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={st.active}
                            onChange={(e) => upsertStaff({ ...st, active: e.target.checked })}
                            className="accent-[#2D6A4F]"
                          />
                          <span className="font-bold text-[#2B1E1A]">{st.name}</span>
                          <span className="text-[11px] text-[#7D6C63]">({st.role})</span>
                        </label>
                        <span className="font-bold tabular-nums text-[#2B1E1A]">
                          <PrivacyValue>{fmt(calc.totalTrueCost, true)}</PrivacyValue>
                        </span>
                      </div>
                    );
                  })}
                </div>
              </section>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Overhead Allocation Methods Lab (5 Methods + Recharts Comparison) */}
      {activeTab === 'allocation_lab' && (
        <div className="space-y-5">
          <GuidedBanner text="مجموع کل سربار کارگاه در تمام ۵ روش دقیقاً یکسان است؛ تفاوت در «عدالت تقسیم» بین محصولات است. ابتدا نمودار زیر را ببینید و سپس روی هر روش کلیک کنید تا به عنوان روش فعال کارگاه اعمال شود." />

          {/* Recharts Grouped BarChart Comparing All 5 Allocation Methods per Product */}
          <section className="bg-white border border-[#EAE2D8] rounded-xl p-5">
            <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
              <div>
                <h2 className="text-base font-extrabold text-[#2B1E1A]">
                  مقایسه گرافیکی سهم سربار هر کیلو در ۵ روش مختلف (تومان / کیلو)
                </h2>
                <p className="text-xs text-[#7D6C63] mt-0.5">
                  تغییر روش سرشکن چگونه سهم سربار هر شیرینی (مثل باقلوا پسته‌ای در برابر رولت خامه‌ای) را جابه‌جا می‌کند.
                </p>
              </div>
              <div className="text-xs font-bold text-[#2D6A4F] bg-[#ECFDF5] border border-[#A7F3D0] rounded-lg px-3 py-1.5">
                روش فعال کارگاه: {activeMethodMeta.shortLabel}
              </div>
            </div>

            <div className="h-[300px] w-full" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={methodComparisonChartData}
                  margin={{ top: 12, right: 16, left: 10, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0E8DE" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#4B3B34' }} />
                  <YAxis
                    tick={{ fontSize: 10.5, fill: '#5A4A42' }}
                    tickFormatter={(v) => formatShortToman(Number(v), usePersianDigits)}
                  />
                  <Tooltip
                    formatter={(value: unknown, name: unknown) => [
                      data.settings.privacyMode ? '•••••' : fmt(Number(value)),
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
                  <Legend wrapperStyle={{ fontSize: '11.5px', paddingTop: '6px' }} />
                  <Bar dataKey="weight" name="وزنی (کیلو)" fill="#94A3B8" radius={[4, 4, 0, 0]} maxBarSize={18} />
                  <Bar dataKey="hybrid" name="ترکیبی ۵۰/۵۰" fill="#2D6A4F" radius={[4, 4, 0, 0]} maxBarSize={18} />
                  <Bar dataKey="time_abc" name="زمانی ABC" fill="#4338CA" radius={[4, 4, 0, 0]} maxBarSize={18} />
                  <Bar dataKey="oven_hours" name="گلوگاه فر" fill="#D97706" radius={[4, 4, 0, 0]} maxBarSize={18} />
                  <Bar dataKey="direct_cost" name="درصدی از مواد" fill="#C84B31" radius={[4, 4, 0, 0]} maxBarSize={18} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* 5 Interactive Allocation Method Cards + 6th Active Decision Summary Card */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {OVERHEAD_METHOD_LIST.map((method) => {
              const isActive = overheadAllocationMethod === method.id;
              return (
                <article
                  key={method.id}
                  className={`rounded-xl border p-4 flex flex-col justify-between transition-colors ${
                    isActive
                      ? 'bg-[#ECFDF5]/60 border-[#2D6A4F]'
                      : 'bg-white border-[#EAE2D8]'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-[11px] font-semibold text-[#7D6C63]">
                          {method.badge}
                        </div>
                        <h3 className="text-sm font-extrabold text-[#2B1E1A] mt-0.5">
                          {method.title}
                        </h3>
                      </div>
                      {isActive && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-[#2D6A4F] shrink-0">
                          <Check className="w-3.5 h-3.5" />
                          <span>فعال</span>
                        </span>
                      )}
                    </div>

                    <div className="rounded-lg bg-[#FAF8F5] border border-[#EAE2D8] px-3 py-2 text-[11px] font-bold text-[#2B1E1A]">
                      {method.formulaText}
                    </div>

                    <p className="text-xs text-[#4B3B34] leading-relaxed">{method.howItWorks}</p>

                    <div className="text-[11px] text-[#5A4A42] space-y-1 pt-1">
                      <div>
                        <strong className="text-[#2D6A4F]">مزیت:</strong> {method.pros}
                      </div>
                      <div>
                        <strong className="text-[#C84B31]">محدودیت:</strong> {method.cons}
                      </div>
                      <div>
                        <strong className="text-[#4338CA]">مناسب برای:</strong> {method.bestFor}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      updateSettings({ overheadAllocationMethod: method.id });
                      notify(`روش سرشکن سربار کل کارگاه روی «${method.shortLabel}» تنظیم شد.`);
                    }}
                    className={`mt-4 w-full py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-[#2D6A4F] text-white'
                        : 'bg-[#2B1E1A] text-white hover:bg-[#3E2D27]'
                    }`}
                  >
                    {isActive ? 'روش فعال فعلی کارگاه' : `اعمال روش «${method.shortLabel}»`}
                  </button>
                </article>
              );
            })}

            {/* 6th Card: Active Allocation Impact Summary & Direct Link to Recipes Explainer */}
            {(() => {
              const highestSpreadRow =
                studio.comparisonRows.length > 0
                  ? [...studio.comparisonRows].sort((a, b) => b.spreadPerKg - a.spreadPerKg)[0]
                  : null;
              return (
                <article className="rounded-xl border border-[#DDD6FE] bg-[#F5F3FF]/60 p-4 flex flex-col justify-between">
                  <div className="space-y-2.5">
                    <div>
                      <div className="text-[11px] font-semibold text-[#4338CA]">
                        جمع‌بندی انتخاب فعلی
                      </div>
                      <h3 className="text-sm font-extrabold text-[#2B1E1A] mt-0.5">
                        اثر روش «{activeMethodMeta.shortLabel}» روی منو
                      </h3>
                    </div>

                    <div className="space-y-1.5 text-xs text-[#4B3B34] tabular-nums">
                      <div className="flex items-center justify-between bg-white/80 rounded-lg border border-[#EAE2D8] px-3 py-2">
                        <span className="text-[#6E5C54]">استخر کل سرشکن ماهانه:</span>
                        <span className="font-extrabold text-[#2B1E1A]">
                          <PrivacyValue>{fmt(studio.totalPool, true)}</PrivacyValue>
                        </span>
                      </div>
                      <div className="flex items-center justify-between bg-white/80 rounded-lg border border-[#EAE2D8] px-3 py-2">
                        <span className="text-[#6E5C54]">میانگین وزنی سربار/کیلو:</span>
                        <span className="font-extrabold text-[#4338CA]">
                          <PrivacyValue>{fmt(studio.avgOverheadPerKg)}</PrivacyValue>
                        </span>
                      </div>
                      {highestSpreadRow && (
                        <div className="bg-white/80 rounded-lg border border-[#EAE2D8] px-3 py-2">
                          <div className="text-[11px] text-[#6E5C54]">بیشترین حساسیت به روش سرشکن:</div>
                          <div className="font-extrabold text-[#D97706] mt-0.5">
                            {highestSpreadRow.name} (دامنه{' '}
                            <PrivacyValue>{fmt(highestSpreadRow.spreadPerKg)}</PrivacyValue> / کیلو)
                          </div>
                        </div>
                      )}
                    </div>

                    <p className="text-[11px] text-[#5A4A42] leading-relaxed">
                      در ماژول «فرمولاسیون و تولید» می‌توانید برای هر شیرینی و هر ماده اولیه به‌صورت گام‌به‌گام ببینید عدد سهم سربار/کیلو چگونه تولید شده است.
                    </p>
                  </div>

                  {onOpenRecipes && (
                    <button
                      type="button"
                      onClick={onOpenRecipes}
                      className="mt-4 w-full py-2 rounded-lg bg-[#4338CA] text-white text-xs font-bold hover:bg-[#3730A3] transition-colors cursor-pointer"
                    >
                      مشاهده تشریح فرمول سهم سربار در تولید
                    </button>
                  )}
                </article>
              );
            })()}
          </div>

          {/* Detailed 5-Method Numerical Comparison Matrix Table */}
          <section className="bg-white border border-[#EAE2D8] rounded-xl overflow-hidden">
            <div className="p-4 border-b border-[#EAE2D8]">
              <h2 className="text-sm font-extrabold text-[#2B1E1A]">
                ماتریس عددی سهم سربار هر کیلو و حاشیه سود در هر ۵ روش
              </h2>
              <p className="text-[11px] text-[#7D6C63] mt-0.5">
                ستون هایلایت‌شده نشان‌دهنده روش فعال فعلی کارگاه ({activeMethodMeta.shortLabel}) است.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs border-collapse tabular-nums">
                <thead>
                  <tr className="bg-[#FAF8F5] border-b border-[#EAE2D8] text-[#6E5C54]">
                    <th className="py-3 px-3 font-bold">محصول</th>
                    {(
                      [
                        { id: 'weight', label: 'وزنی' },
                        { id: 'hybrid', label: 'ترکیبی ۵۰/۵۰' },
                        { id: 'time_abc', label: 'زمانی ABC' },
                        { id: 'oven_hours', label: 'گلوگاه فر' },
                        { id: 'direct_cost', label: 'درصدی از مواد' },
                      ] as Array<{ id: OverheadAllocationMethod; label: string }>
                    ).map((col) => (
                      <th
                        key={col.id}
                        className={`py-3 px-3 font-bold ${
                          overheadAllocationMethod === col.id
                            ? 'bg-[#ECFDF5] text-[#065F46]'
                            : ''
                        }`}
                      >
                        {col.label}
                      </th>
                    ))}
                    <th className="py-3 px-3 font-bold">دامنه اختلاف</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F3ECE4]">
                  {studio.comparisonRows.map((row) => (
                    <tr key={row.recipeId} className="hover:bg-[#FAF8F5]">
                      <td className="py-3 px-3">
                        <div className="font-bold text-[#2B1E1A]">{row.name}</div>
                        <div className="text-[11px] text-[#7D6C63]">
                          فروش: {formatNumber(row.monthlySalesKg, { usePersian: usePersianDigits })} کیلو · فر:{' '}
                          {formatNumber(row.ovenHoursPerKg * 60, { decimals: 1, usePersian: usePersianDigits })} دقیقه/کیلو
                        </div>
                      </td>
                      {(['weight', 'hybrid', 'time_abc', 'oven_hours', 'direct_cost'] as OverheadAllocationMethod[]).map(
                        (m) => (
                          <td
                            key={m}
                            className={`py-3 px-3 ${
                              overheadAllocationMethod === m
                                ? 'bg-[#ECFDF5]/60 font-extrabold text-[#065F46]'
                                : 'text-[#4B3B34]'
                            }`}
                          >
                            <div>
                              <PrivacyValue>{fmt(row.byMethodPerKg[m])}</PrivacyValue>
                            </div>
                            <div className="text-[10px] text-[#7D6C63] font-normal">
                              سود: <PrivacyValue>{formatPercent(row.byMethodMarginPct[m], usePersianDigits)}</PrivacyValue>
                            </div>
                          </td>
                        )
                      )}
                      <td className="py-3 px-3 font-bold text-[#D97706]">
                        <PrivacyValue>{fmt(row.spreadPerKg)}</PrivacyValue>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
    </div>
  );
};
