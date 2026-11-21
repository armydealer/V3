import React, { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Calculator, Check, Plus, Trash2 } from 'lucide-react';
import { useWorkshop } from '../store/WorkshopContext';
import { OverheadAllocationMethod, OverheadItem, StaffMember } from '../types';
import { computeTrueMonthlyStaffCost } from '../utils/costEngine';
import {
  OVERHEAD_IDENTIFICATION_CATALOG,
  OVERHEAD_METHOD_LIST,
  OVERHEAD_METHOD_MAP,
  computeEquipmentMonthlyDepreciation,
  computeOverheadStudioAnalysis,
  computePeriodicBillToMonthly,
} from '../utils/overheadEngine';
import {
  formatCurrency,
  formatShortToman,
} from '../utils/formatters';
import { LocaleNumberInput } from '../components/LocaleNumberInput';
import { PrivacyValue } from '../components/PrivacyValue';

type SimpleOverheadTab = 'fixed' | 'staff' | 'allocate';

const OVERHEAD_CATEGORIES: OverheadItem['category'][] = [
  'اجاره و ملک',
  'انرژی و فر',
  'استهلاک تجهیزات',
  'بازاریابی و اداری',
  'سایر',
];

function shortName(name: string): string {
  const words = name.trim().split(/\s+/);
  return words.length <= 2 ? name : `${words[0]} ${words[1]}`;
}

export const SimpleOverheadView: React.FC = () => {
  const {
    data,
    summary,
    upsertOverhead,
    deleteOverhead,
    upsertStaff,
    deleteStaff,
    updateSettings,
    notify,
  } = useWorkshop();

  const { usePersianDigits, currencyUnit, overheadAllocationMethod } = data.settings;
  const fmt = (val: number, compact = false) =>
    formatCurrency(val, currencyUnit, usePersianDigits, compact);

  const [tab, setTab] = useState<SimpleOverheadTab>('fixed');

  // Add new overhead form
  const [ohName, setOhName] = useState('');
  const [ohCategory, setOhCategory] = useState<OverheadItem['category']>('اجاره و ملک');
  const [ohAmount, setOhAmount] = useState(5_000_000);

  // Compact helper toggle (depreciation / periodic bill -> monthly)
  const [showHelpers, setShowHelpers] = useState(false);
  const [eqName, setEqName] = useState('فر قنادی یا یخچال ویترینی');
  const [eqPrice, setEqPrice] = useState(240_000_000);
  const [eqYears, setEqYears] = useState(8);
  const [billName, setBillName] = useState('قبض دوماهه برق کارگاه');
  const [billAmount, setBillAmount] = useState(14_000_000);
  const [billMonths, setBillMonths] = useState(2);

  // Add staff form
  const [stName, setStName] = useState('');
  const [stRole, setStRole] = useState('استادکار قنادی');
  const [stSalary, setStSalary] = useState(20_000_000);

  const studio = useMemo(() => computeOverheadStudioAnalysis(data, summary), [data, summary]);
  const activeMethod = OVERHEAD_METHOD_MAP[overheadAllocationMethod];

  const eqMonthly = useMemo(
    () =>
      computeEquipmentMonthlyDepreciation(eqPrice, Math.round(eqPrice * 0.1), eqYears)
        .monthlyDepreciation,
    [eqPrice, eqYears]
  );
  const billMonthly = useMemo(
    () => computePeriodicBillToMonthly(billAmount, billMonths),
    [billAmount, billMonths]
  );

  const chartData = useMemo(
    () =>
      studio.comparisonRows.map((row) => ({
        name: shortName(row.name),
        fullName: row.name,
        weight: Math.round(row.byMethodPerKg.weight),
        hybrid: Math.round(row.byMethodPerKg.hybrid),
        time_abc: Math.round(row.byMethodPerKg.time_abc),
        oven_hours: Math.round(row.byMethodPerKg.oven_hours),
        direct_cost: Math.round(row.byMethodPerKg.direct_cost),
      })),
    [studio.comparisonRows]
  );

  const handleAddOverhead = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ohName.trim() || ohAmount <= 0) return;
    upsertOverhead({
      id: `oh-${Date.now()}`,
      name: ohName.trim(),
      category: ohCategory,
      monthlyAmount: Math.round(ohAmount),
      active: true,
    });
    setOhName('');
  };

  const handleAddStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!stName.trim() || stSalary <= 0) return;
    const member: StaffMember = {
      id: `st-${Date.now()}`,
      name: stName.trim(),
      role: stRole.trim() || 'همکار کارگاه',
      baseMonthlySalary: Math.round(stSalary),
      monthlyBenefits: 0,
      includeInsurance23: true,
      includeEidi: true,
      includeSanavat: true,
      active: true,
    };
    upsertStaff(member);
    setStName('');
  };

  return (
    <div className="space-y-5">
      {/* Header + 2 Plain Summary Numbers */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-[#2B1E1A]">سربار، حقوق و روش تقسیم</h1>
          <p className="text-xs text-[#7D6C63] mt-0.5">
            هزینه‌هایی که مستقیم داخل خمیر نیستند (مثل اجاره، برق، استهلاک و حقوق) اینجا جمع شده و روی شیرینی‌ها تقسیم می‌شوند.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 tabular-nums">
          <div className="bg-white border border-[#EAE2D8] rounded-xl px-4 py-2 text-xs">
            <span className="text-[#7D6C63]">جمع سربار و حقوق ماهانه: </span>
            <strong className="text-[#2B1E1A]">
              <PrivacyValue>{fmt(studio.totalPool, true)}</PrivacyValue>
            </strong>
          </div>
          <div className="bg-[#ECFDF5] border border-[#A7F3D0] rounded-xl px-4 py-2 text-xs">
            <span className="text-[#065F46]">میانگین سربار هر کیلو: </span>
            <strong className="text-[#065F46]">
              <PrivacyValue>{fmt(studio.avgOverheadPerKg)}</PrivacyValue>
            </strong>
          </div>
        </div>
      </div>

      {/* 3 Simple Tabs */}
      <div
        role="tablist"
        aria-label="بخش‌های سربار"
        className="flex flex-wrap gap-1.5 bg-white border border-[#EAE2D8] rounded-xl p-1.5 w-fit max-w-full"
      >
        {(
          [
            { id: 'fixed', label: '۱. هزینه‌های ثابت و شناسایی سربار' },
            { id: 'staff', label: '۲. حقوق پرسنل' },
            { id: 'allocate', label: '۳. روش تقسیم سربار روی شیرینی‌ها' },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer text-right ${
              tab === t.id
                ? 'bg-[#2B1E1A] text-white'
                : 'text-[#5A4A42] hover:bg-[#FAF8F5]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* TAB 1: Fixed Overheads + Simple Identification Suggestions + Monthly Converters */}
      {tab === 'fixed' && (
        <div className="space-y-5">
          {/* Quick Identification Checklist Strip */}
          <section className="bg-white border border-[#EAE2D8] rounded-2xl p-4 sm:p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-extrabold text-[#2B1E1A]">
                  هزینه‌هایی که معمولاً فراموش می‌شوند (افزودن با یک کلیک)
                </h2>
                <p className="text-xs text-[#7D6C63]">
                  اگر هر کدام از این هزینه‌ها را در لیست ندارید، با یک کلیک اضافه کنید و بعد مبلغ دقیق خودتان را بزنید.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowHelpers((p) => !p)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#C7D2FE] bg-[#EEF2FF] text-[#3730A3] px-3 py-1.5 text-xs font-bold cursor-pointer"
              >
                <Calculator className="w-3.5 h-3.5" />
                <span>{showHelpers ? 'بستن ماشین‌حساب تبدیل به ماهانه' : 'تبدیل قبض / استهلاک به ماهانه'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {OVERHEAD_IDENTIFICATION_CATALOG.map((tpl) => {
                const isAdded = studio.checklist.find((c) => c.id === tpl.id)?.isCovered;
                return (
                  <div
                    key={tpl.id}
                    className={`rounded-xl border p-3 flex items-center justify-between gap-2 ${
                      isAdded
                        ? 'bg-[#ECFDF5]/60 border-[#A7F3D0]'
                        : 'bg-[#FAF8F5] border-[#EAE2D8]'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-[#2B1E1A] truncate">{tpl.name}</div>
                      <div className="text-[11px] text-[#7D6C63]">{tpl.category}</div>
                    </div>
                    {isAdded ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#2D6A4F] shrink-0">
                        <Check className="w-3.5 h-3.5" />
                        ثبت شده
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          upsertOverhead({
                            id: `oh-${Date.now()}-${tpl.id}`,
                            name: tpl.name,
                            category: tpl.category,
                            monthlyAmount: tpl.suggestedMonthlyAmount,
                            active: true,
                          });
                        }}
                        className="shrink-0 rounded-lg bg-[#2B1E1A] hover:bg-[#3E2D27] text-white px-2.5 py-1.5 text-[11px] font-bold cursor-pointer"
                      >
                        + افزودن
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Optional Simple Converters for Equipment Depreciation & Periodic Bills */}
            {showHelpers && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-[#EAE2D8]">
                <div className="rounded-xl bg-[#FAF8F5] border border-[#EAE2D8] p-4 space-y-2.5">
                  <div className="text-xs font-extrabold text-[#2B1E1A]">
                    محاسبه استهلاک ماهانه دستگاه (فر، میکسر، یخچال)
                  </div>
                  <input
                    type="text"
                    value={eqName}
                    onChange={(e) => setEqName(e.target.value)}
                    className="w-full rounded-lg border border-[#EAE2D8] bg-white px-3 py-1.5 text-xs"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] text-[#6E5C54] mb-1">قیمت دستگاه (تومان)</label>
                      <LocaleNumberInput value={eqPrice} onChange={setEqPrice} />
                    </div>
                    <div>
                      <label className="block text-[11px] text-[#6E5C54] mb-1">عمر مفید (سال)</label>
                      <LocaleNumberInput value={eqYears} onChange={setEqYears} min={1} suffix="سال" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs font-extrabold text-[#4338CA] tabular-nums">
                      ماهانه: {fmt(eqMonthly)}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        upsertOverhead({
                          id: `oh-eq-${Date.now()}`,
                          name: `استهلاک ${eqName.trim() || 'تجهیزات'}`,
                          category: 'استهلاک تجهیزات',
                          monthlyAmount: eqMonthly,
                          active: true,
                        });
                      }}
                      className="rounded-lg bg-[#4338CA] text-white px-3 py-1.5 text-xs font-bold cursor-pointer"
                    >
                      افزودن به سربار
                    </button>
                  </div>
                </div>

                <div className="rounded-xl bg-[#FAF8F5] border border-[#EAE2D8] p-4 space-y-2.5">
                  <div className="text-xs font-extrabold text-[#2B1E1A]">
                    تبدیل قبض دوماهه یا هزینه سالانه به ماهانه
                  </div>
                  <input
                    type="text"
                    value={billName}
                    onChange={(e) => setBillName(e.target.value)}
                    className="w-full rounded-lg border border-[#EAE2D8] bg-white px-3 py-1.5 text-xs"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] text-[#6E5C54] mb-1">مبلغ کل قبض (تومان)</label>
                      <LocaleNumberInput value={billAmount} onChange={setBillAmount} />
                    </div>
                    <div>
                      <label className="block text-[11px] text-[#6E5C54] mb-1">دوره (تعداد ماه)</label>
                      <LocaleNumberInput value={billMonths} onChange={setBillMonths} min={1} suffix="ماه" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs font-extrabold text-[#2D6A4F] tabular-nums">
                      ماهانه: {fmt(billMonthly)}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        upsertOverhead({
                          id: `oh-bill-${Date.now()}`,
                          name: billName.trim() || 'قبض دوره‌ای',
                          category: 'انرژی و فر',
                          monthlyAmount: billMonthly,
                          active: true,
                        });
                      }}
                      className="rounded-lg bg-[#2D6A4F] text-white px-3 py-1.5 text-xs font-bold cursor-pointer"
                    >
                      افزودن به سربار
                    </button>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* Editable Overhead List + Simple Add Form */}
          <section className="bg-white border border-[#EAE2D8] rounded-2xl p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-extrabold text-[#2B1E1A]">لیست هزینه‌های ثابت ماهانه شما</h2>
              <span className="text-xs font-extrabold text-[#2D6A4F] tabular-nums">
                جمع فعال: <PrivacyValue>{fmt(summary.totalMonthlyFixedOverhead, true)}</PrivacyValue>
              </span>
            </div>

            <div className="space-y-2">
              {data.overheads.map((oh) => (
                <div
                  key={oh.id}
                  className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3 ${
                    oh.active ? 'bg-[#FAF8F5] border-[#EAE2D8]' : 'bg-[#F8F6F3] border-[#EFE7DC] opacity-60'
                  }`}
                >
                  <label className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={oh.active}
                      onChange={(e) => upsertOverhead({ ...oh, active: e.target.checked })}
                      className="accent-[#2D6A4F] cursor-pointer"
                    />
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-[#2B1E1A]">{oh.name}</div>
                      <div className="text-[11px] text-[#7D6C63]">{oh.category}</div>
                    </div>
                  </label>
                  <div className="flex items-center gap-2">
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
              ))}
            </div>

            <form
              onSubmit={handleAddOverhead}
              className="pt-4 border-t border-[#F3ECE4] grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end"
            >
              <div className="sm:col-span-4">
                <label className="block text-[11px] font-bold text-[#4B3B34] mb-1">عنوان هزینه جدید</label>
                <input
                  required
                  type="text"
                  value={ohName}
                  onChange={(e) => setOhName(e.target.value)}
                  placeholder="مثلاً اجاره مغازه"
                  className="w-full rounded-lg border border-[#EAE2D8] px-3 py-2 text-xs"
                />
              </div>
              <div className="sm:col-span-3">
                <label className="block text-[11px] font-bold text-[#4B3B34] mb-1">دسته</label>
                <select
                  value={ohCategory}
                  onChange={(e) => setOhCategory(e.target.value as OverheadItem['category'])}
                  className="w-full rounded-lg border border-[#EAE2D8] bg-white px-3 py-2 text-xs font-semibold"
                >
                  {OVERHEAD_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-3">
                <label className="block text-[11px] font-bold text-[#4B3B34] mb-1">مبلغ ماهانه (تومان)</label>
                <LocaleNumberInput value={ohAmount} onChange={setOhAmount} min={1} />
              </div>
              <div className="sm:col-span-2">
                <button
                  type="submit"
                  className="w-full inline-flex items-center justify-center gap-1 rounded-lg bg-[#2B1E1A] hover:bg-[#3E2D27] text-white py-2 text-xs font-bold cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>ثبت</span>
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {/* TAB 2: Simple Staff Payroll */}
      {tab === 'staff' && (
        <section className="bg-white border border-[#EAE2D8] rounded-2xl p-4 sm:p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-extrabold text-[#2B1E1A]">حقوق و دستمزد پرسنل</h2>
              <p className="text-xs text-[#7D6C63]">
                جمع هزینه پرسنل فعال (با بیمه و عیدی) به صورت خودکار وارد استخر سربار می‌شود.
              </p>
            </div>
            <span className="text-xs font-extrabold text-[#2D6A4F] tabular-nums">
              جمع ماهانه پرسنل: <PrivacyValue>{fmt(summary.totalMonthlyStaffCost, true)}</PrivacyValue>
            </span>
          </div>

          <div className="space-y-2.5">
            {data.staff.map((st) => {
              const trueCost = computeTrueMonthlyStaffCost(st).totalTrueCost;
              return (
                <div
                  key={st.id}
                  className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3 ${
                    st.active ? 'bg-[#FAF8F5] border-[#EAE2D8]' : 'bg-[#F8F6F3] border-[#EFE7DC] opacity-60'
                  }`}
                >
                  <label className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={st.active}
                      onChange={(e) => upsertStaff({ ...st, active: e.target.checked })}
                      className="accent-[#2D6A4F] cursor-pointer"
                    />
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-[#2B1E1A]">
                        {st.name} <span className="font-normal text-[#7D6C63]">({st.role})</span>
                      </div>
                      <div className="text-[11px] text-[#7D6C63] tabular-nums">
                        هزینه کل با بیمه و عیدی: <PrivacyValue>{fmt(trueCost)}</PrivacyValue>
                      </div>
                    </div>
                  </label>

                  <div className="flex items-center gap-2">
                    <div className="w-36">
                      <LocaleNumberInput
                        value={st.baseMonthlySalary}
                        onChange={(val) =>
                          upsertStaff({ ...st, baseMonthlySalary: Math.max(0, Math.round(val)) })
                        }
                        ariaLabel={`حقوق پایه ${st.name}`}
                      />
                    </div>
                    <button
                      type="button"
                      aria-label={`حذف ${st.name}`}
                      onClick={() => deleteStaff(st.id)}
                      className="p-1.5 rounded-lg text-[#C84B31] hover:bg-[#FEF2F2] cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <form
            onSubmit={handleAddStaff}
            className="pt-4 border-t border-[#F3ECE4] grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end"
          >
            <div className="sm:col-span-4">
              <label className="block text-[11px] font-bold text-[#4B3B34] mb-1">نام همکار</label>
              <input
                required
                type="text"
                value={stName}
                onChange={(e) => setStName(e.target.value)}
                placeholder="مثلاً علی رضایی"
                className="w-full rounded-lg border border-[#EAE2D8] px-3 py-2 text-xs"
              />
            </div>
            <div className="sm:col-span-3">
              <label className="block text-[11px] font-bold text-[#4B3B34] mb-1">سمت</label>
              <input
                type="text"
                value={stRole}
                onChange={(e) => setStRole(e.target.value)}
                className="w-full rounded-lg border border-[#EAE2D8] px-3 py-2 text-xs"
              />
            </div>
            <div className="sm:col-span-3">
              <label className="block text-[11px] font-bold text-[#4B3B34] mb-1">حقوق پایه ماهانه (تومان)</label>
              <LocaleNumberInput value={stSalary} onChange={setStSalary} min={1} />
            </div>
            <div className="sm:col-span-2">
              <button
                type="submit"
                className="w-full inline-flex items-center justify-center gap-1 rounded-lg bg-[#2B1E1A] hover:bg-[#3E2D27] text-white py-2 text-xs font-bold cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>ثبت</span>
              </button>
            </div>
          </form>
        </section>
      )}

      {/* TAB 3: Allocation Methods Selector + Recharts Comparison Chart */}
      {tab === 'allocate' && (
        <div className="space-y-5">
          {/* Recharts Comparison Chart First */}
          <section className="bg-white border border-[#EAE2D8] rounded-2xl p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
              <div>
                <h2 className="text-base font-extrabold text-[#2B1E1A]">
                  مقایسه سهم سربار هر کیلو در روش‌های مختلف (تومان / کیلو)
                </h2>
                <p className="text-xs text-[#7D6C63] mt-0.5">
                  جمع کل سربار کارگاه ثابت است؛ با تغییر روش، فقط نحوه تقسیم آن بین شیرینی‌ها عوض می‌شود.
                </p>
              </div>
              <div className="text-xs font-bold text-[#065F46] bg-[#ECFDF5] border border-[#A7F3D0] rounded-lg px-3 py-1.5">
                روش فعال: {activeMethod.shortLabel}
              </div>
            </div>

            <div className="h-[280px] w-full" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 12, left: 8, bottom: 18 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0E8DE" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#4B3B34' }} />
                  <YAxis
                    tick={{ fontSize: 10.5, fill: '#5A4A42' }}
                    tickFormatter={(v) => formatShortToman(Number(v), usePersianDigits)}
                  />
                  <Tooltip
                    formatter={(val: unknown, name: unknown) => [
                      data.settings.privacyMode ? '•••••' : fmt(Number(val)),
                      String(name),
                    ]}
                    labelFormatter={(_l, payload) =>
                      (payload?.[0]?.payload?.fullName as string) || String(_l)
                    }
                    contentStyle={{
                      borderRadius: '10px',
                      border: '1px solid #EAE2D8',
                      fontSize: '12px',
                      direction: 'rtl',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '6px' }} />
                  <Bar dataKey="weight" name="وزنی ساده" fill="#94A3B8" radius={[4, 4, 0, 0]} maxBarSize={16} />
                  <Bar dataKey="hybrid" name="ترکیبی ۵۰/۵۰" fill="#2D6A4F" radius={[4, 4, 0, 0]} maxBarSize={16} />
                  <Bar dataKey="time_abc" name="زمانی (فر+کار)" fill="#4338CA" radius={[4, 4, 0, 0]} maxBarSize={16} />
                  <Bar dataKey="oven_hours" name="ساعت فر" fill="#D97706" radius={[4, 4, 0, 0]} maxBarSize={16} />
                  <Bar dataKey="direct_cost" name="درصدی از مواد" fill="#C84B31" radius={[4, 4, 0, 0]} maxBarSize={16} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* 5 Simple Selectable Method Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {OVERHEAD_METHOD_LIST.map((m) => {
              const isSelected = overheadAllocationMethod === m.id;
              return (
                <article
                  key={m.id}
                  className={`rounded-2xl border p-4 flex flex-col justify-between ${
                    isSelected
                      ? 'bg-[#ECFDF5]/60 border-[#2D6A4F]'
                      : 'bg-white border-[#EAE2D8]'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm font-extrabold text-[#2B1E1A]">{m.shortLabel}</h3>
                      {isSelected && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-[#2D6A4F]">
                          <Check className="w-3.5 h-3.5" />
                          فعال
                        </span>
                      )}
                    </div>
                    <div className="rounded-lg bg-[#FAF8F5] border border-[#EAE2D8] px-2.5 py-1.5 text-[11px] font-bold text-[#2B1E1A]">
                      {m.formulaText}
                    </div>
                    <p className="text-xs text-[#4B3B34] leading-relaxed">{m.howItWorks}</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      updateSettings({ overheadAllocationMethod: m.id as OverheadAllocationMethod });
                      notify(`روش تقسیم سربار روی «${m.shortLabel}» تنظیم شد.`);
                    }}
                    className={`mt-4 w-full py-2 rounded-xl text-xs font-bold cursor-pointer ${
                      isSelected
                        ? 'bg-[#2D6A4F] text-white'
                        : 'bg-[#2B1E1A] hover:bg-[#3E2D27] text-white'
                    }`}
                  >
                    {isSelected ? 'روش فعال فعلی' : `انتخاب «${m.shortLabel}»`}
                  </button>
                </article>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
