import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  BookOpen,
  Calculator,
  CheckCircle2,
  GraduationCap,
  Layers,
  Scale,
  Search,
  Sparkles,
} from 'lucide-react';
import { useWorkshop } from '../store/WorkshopContext';
import {
  ACADEMY_GLOSSARY,
  COMMON_COSTING_TRAPS,
  GLOSSARY_CATEGORIES,
  GlossaryCategoryId,
} from '../data/academyContent';
import { computeWorkshopSummary } from '../utils/costEngine';
import { formatCurrency, formatDigits, formatNumber, formatPercent } from '../utils/formatters';
import { PrivacyValue } from '../components/PrivacyValue';

type AcademyTab = 'glossary' | 'costing_walkthrough' | 'overhead_masterclass';

export const AcademyModule: React.FC = () => {
  const { data, summary } = useWorkshop();
  const { currencyUnit, usePersianDigits } = data.settings;
  const fmt = (v: number, compact = false) => formatCurrency(v, currencyUnit, usePersianDigits, compact);
  const fmtCompact = (v: number) => formatCurrency(v, currencyUnit, usePersianDigits, true);
  const pct = (v: number, dec = 1) => formatPercent(v, usePersianDigits, dec);
  const num = (v: number, dec = 0) => formatNumber(v, { decimals: dec, usePersian: usePersianDigits });
  const dig = (v: string | number) => formatDigits(v, usePersianDigits);

  const [activeTab, setActiveTab] = useState<AcademyTab>('glossary');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<GlossaryCategoryId>('all');
  const [selectedRecipeId, setSelectedRecipeId] = useState<string>(
    data.recipes[0]?.id ?? ''
  );

  // Filtered glossary
  const filteredTerms = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return ACADEMY_GLOSSARY.filter((term) => {
      if (selectedCategory !== 'all' && term.category !== selectedCategory) return false;
      if (!q) return true;
      return (
        term.title.toLowerCase().includes(q) ||
        (term.enTerm?.toLowerCase().includes(q) ?? false) ||
        term.simple.toLowerCase().includes(q) ||
        term.example.toLowerCase().includes(q) ||
        term.moduleTag.toLowerCase().includes(q)
      );
    });
  }, [searchQuery, selectedCategory]);

  // Selected live recipe for Step-by-Step Costing Walkthrough
  const activeRecipe = useMemo(
    () => data.recipes.find((r) => r.id === selectedRecipeId) ?? data.recipes[0],
    [data.recipes, selectedRecipeId]
  );

  const activeMetric = useMemo(
    () =>
      summary.recipeMetrics.find((m) => m.recipeId === activeRecipe?.id) ??
      summary.recipeMetrics[0],
    [summary.recipeMetrics, activeRecipe]
  );

  // Live 3-Method Overhead Allocation Comparison (Weight vs Time ABC vs Hybrid 50/50)
  const overheadComparison = useMemo(() => {
    const byWeight = computeWorkshopSummary({
      ...data,
      settings: { ...data.settings, overheadAllocationMethod: 'weight' },
    });
    const byTime = computeWorkshopSummary({
      ...data,
      settings: { ...data.settings, overheadAllocationMethod: 'time_abc' },
    });
    const byHybrid = computeWorkshopSummary({
      ...data,
      settings: { ...data.settings, overheadAllocationMethod: 'hybrid' },
    });

    return summary.recipeMetrics.map((m) => {
      const w = byWeight.recipeMetrics.find((x) => x.recipeId === m.recipeId);
      const t = byTime.recipeMetrics.find((x) => x.recipeId === m.recipeId);
      const h = byHybrid.recipeMetrics.find((x) => x.recipeId === m.recipeId);
      return {
        recipeId: m.recipeId,
        name: m.name,
        category: m.category,
        weightOverhead: w?.allocatedOverheadPerKg ?? 0,
        timeOverhead: t?.allocatedOverheadPerKg ?? 0,
        hybridOverhead: h?.allocatedOverheadPerKg ?? 0,
        weightMarginPct: w?.netMarginPct ?? 0,
        timeMarginPct: t?.netMarginPct ?? 0,
      };
    });
  }, [data, summary.recipeMetrics]);

  const activeOverheadMethodLabel =
    data.settings.overheadAllocationMethod === 'weight'
      ? 'روش وزنی (ساده)'
      : data.settings.overheadAllocationMethod === 'time_abc'
      ? 'روش زمانی / فعالیت‌محور (ABC)'
      : 'روش ترکیبی ۵۰/۵۰ (پیشنهادی)';

  const exampleTargetMargin = data.settings.targetNetMarginPct;
  const exampleTargetPriceExact =
    activeMetric && exampleTargetMargin < 95
      ? activeMetric.totalCostPerKg / (1 - exampleTargetMargin / 100)
      : 0;
  const exampleWrongMarkupPrice = activeMetric
    ? activeMetric.totalCostPerKg * (1 + exampleTargetMargin / 100)
    : 0;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-[#2B1E1A] flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-[#D97706]" />
            <span>فرهنگستان مفاهیم و آموزش کامل بهای تمام‌شده و سربار</span>
          </h1>
          <p className="text-xs text-[#7D6C63] mt-1">
            یادگیری روان و بی‌ابهام تمام اصطلاحات کاربری در کل نرم‌افزار + آموزش عددی و زنده فرمول‌های بهایابی و سرشکن سربار روی محصولات واقعی همین کارگاه
          </p>
        </div>

        <div className="rounded-xl bg-[#ECFDF5] border border-[#A7F3D0] px-3.5 py-2 text-xs font-bold text-[#065F46] tabular-nums">
          {dig(ACADEMY_GLOSSARY.length)} مفهوم تخصصی · ۷ گام زنده بهایابی · ۳ روش سربار
        </div>
      </div>

      {/* Main 3 Tabs */}
      <div
        role="tablist"
        aria-label="بخش‌های فرهنگستان و آموزش بهایابی"
        className="flex flex-wrap gap-1.5 bg-white border border-[#EAE2D8] rounded-xl p-1.5"
      >
        {[
          {
            id: 'glossary' as const,
            label: '۱. فرهنگ مفاهیم و کلمات همه ماژول‌ها',
            icon: BookOpen,
          },
          {
            id: 'costing_walkthrough' as const,
            label: '۲. آموزش گام‌به‌گام بهای تمام‌شده (زنده)',
            icon: Calculator,
          },
          {
            id: 'overhead_masterclass' as const,
            label: '۳. آموزش کامل سربار، روش‌های سرشکن و قانون کار',
            icon: Layers,
          },
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

      {/* ==================== TAB 1: SEARCHABLE GLOSSARY ==================== */}
      {activeTab === 'glossary' && (
        <div className="space-y-4">
          {/* Search + Category Filter Bar */}
          <div className="bg-white border border-[#EAE2D8] rounded-xl p-4 space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 text-[#8C7B72] absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="جستجو در مفاهیم و اصطلاحات (مثلاً: سربار، VaR، مونت‌کارلو، پرت نامرئی، افت پخت، اسنپ‌فود، عیدی)..."
                className="w-full rounded-xl border border-[#EAE2D8] bg-[#FAF8F5] pr-10 pl-4 py-2.5 text-xs text-[#2B1E1A] placeholder:text-[#9A8980] focus:bg-white focus:border-[#2B1E1A] focus:outline-none"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap gap-1.5">
                {GLOSSARY_CATEGORIES.map((cat) => {
                  const active = selectedCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                        active
                          ? 'bg-[#2D6A4F] text-white'
                          : 'bg-[#FAF8F5] border border-[#EAE2D8] text-[#5A4A42] hover:border-[#2D6A4F]'
                      }`}
                    >
                      {cat.label}
                    </button>
                  );
                })}
              </div>
              <span className="text-[11px] font-bold text-[#7D6C63] tabular-nums">
                نمایش {dig(filteredTerms.length)} از {dig(ACADEMY_GLOSSARY.length)} مفهوم
              </span>
            </div>
          </div>

          {/* Glossary Cards Grid */}
          {filteredTerms.length === 0 ? (
            <div className="bg-white border border-[#EAE2D8] rounded-xl p-8 text-center text-xs text-[#7D6C63]">
              مفهومی با عبارت «{searchQuery}» یافت نشد. کلمه ساده‌تری مثل «سربار»، «سود واقعی» یا «چک» را امتحان کنید.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {filteredTerms.map((term) => (
                <article
                  key={term.id}
                  className="bg-white border border-[#EAE2D8] rounded-xl p-4 flex flex-col justify-between gap-3 hover:border-[#C7B7A7] transition-colors"
                >
                  <div className="space-y-2.5">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <h2 className="text-sm font-extrabold text-[#2B1E1A]">{term.title}</h2>
                        {term.enTerm && (
                          <div className="text-[10px] font-semibold text-[#8C7B72] mt-0.5" dir="ltr">
                            {term.enTerm}
                          </div>
                        )}
                      </div>
                      <span className="px-2 py-0.5 rounded bg-[#FAF8F5] border border-[#EAE2D8] text-[10px] font-bold text-[#6E5C54] shrink-0">
                        {term.moduleTag}
                      </span>
                    </div>

                    <div className="text-xs text-[#3A2D27] leading-6">
                      <span className="font-extrabold text-[#2D6A4F]">به زبان ساده: </span>
                      {term.simple}
                    </div>

                    <div className="rounded-lg bg-[#FAF8F5] border border-[#F0E9E0] p-2.5 text-[11px] text-[#4A3C35] leading-6">
                      <span className="font-extrabold text-[#D97706]">مثال در کارگاه: </span>
                      {term.example}
                    </div>

                    {term.formula && (
                      <div className="rounded-lg bg-[#EEF2FF]/70 border border-[#C7D2FE] px-3 py-2 text-[11px] font-bold text-[#312E81]">
                        فرمول: {term.formula}
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-[#F2EBE2] text-[11px] text-[#5A4A42]">
                    <span className="font-extrabold text-[#2B1E1A]">چرا مهم است؟ </span>
                    {term.why}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ==================== TAB 2: LIVE 7-STEP COSTING WALKTHROUGH ==================== */}
      {activeTab === 'costing_walkthrough' && (
        <div className="space-y-5">
          {/* Interactive Recipe Selector */}
          <div className="bg-white border border-[#EAE2D8] rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-sm font-extrabold text-[#2B1E1A] flex items-center gap-1.5">
                <Calculator className="w-4 h-4 text-[#2D6A4F]" />
                <span>آزمایشگاه زنده: ببینید بهای تمام‌شده ۱ کیلو شیرینی شما چطور ساخته می‌شود</span>
              </h2>
              <p className="text-xs text-[#7D6C63] mt-0.5">
                هر شیرینی را انتخاب کنید تا ۷ گام ریاضی موتور بهایابی را با اعداد واقعی کارگاه خودتان ببینید.
              </p>
            </div>

            <select
              aria-label="انتخاب شیرینی برای آموزش گام‌به‌گام بهای تمام‌شده"
              value={activeRecipe?.id ?? ''}
              onChange={(e) => setSelectedRecipeId(e.target.value)}
              className="rounded-xl border border-[#EAE2D8] bg-[#FAF8F5] px-3.5 py-2 text-xs font-extrabold text-[#2B1E1A] focus:border-[#2B1E1A] focus:outline-none cursor-pointer"
            >
              {data.recipes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.category})
                </option>
              ))}
            </select>
          </div>

          {activeRecipe && activeMetric ? (
            <>
              {/* Visual Cost Stack Summary Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                <div className="rounded-xl bg-white border border-[#EAE2D8] p-3">
                  <div className="text-[10px] font-bold text-[#7D6C63]">۱. مواد خام (با افت و ضایعات)</div>
                  <div className="text-sm font-extrabold text-[#2B1E1A] tabular-nums mt-1">
                    <PrivacyValue>{fmt(activeMetric.spoilageAdjustedMaterialCostPerKg)}</PrivacyValue>
                  </div>
                </div>
                <div className="rounded-xl bg-white border border-[#EAE2D8] p-3">
                  <div className="text-[10px] font-bold text-[#7D6C63]">۲. جعبه و بسته‌بندی (قانون کسر)</div>
                  <div className="text-sm font-extrabold text-[#D97706] tabular-nums mt-1">
                    <PrivacyValue>{fmt(activeMetric.boxAndPackagingPerKg)}</PrivacyValue>
                  </div>
                </div>
                <div className="rounded-xl bg-white border border-[#EAE2D8] p-3">
                  <div className="text-[10px] font-bold text-[#7D6C63]">۳. سهم سربار و حقوق</div>
                  <div className="text-sm font-extrabold text-[#4338CA] tabular-nums mt-1">
                    <PrivacyValue>{fmt(activeMetric.allocatedOverheadPerKg)}</PrivacyValue>
                  </div>
                </div>
                <div className="rounded-xl bg-[#2B1E1A] text-white p-3">
                  <div className="text-[10px] font-bold text-[#E6D9CE]">= بهای تمام‌شده ۱ کیلو</div>
                  <div className="text-sm font-extrabold tabular-nums mt-1">
                    <PrivacyValue>{fmt(activeMetric.totalCostPerKg)}</PrivacyValue>
                  </div>
                </div>
                <div className="rounded-xl bg-[#ECFDF5] border border-[#A7F3D0] p-3 col-span-2 sm:col-span-1">
                  <div className="text-[10px] font-bold text-[#047857]">سود خالص ۱ کیلو ({pct(activeMetric.netMarginPct)})</div>
                  <div className="text-sm font-extrabold text-[#065F46] tabular-nums mt-1">
                    <PrivacyValue>{fmt(activeMetric.netProfitPerKg)}</PrivacyValue>
                  </div>
                </div>
              </div>

              {/* 7 Detailed Steps */}
              <div className="space-y-3">
                {/* Step 1 */}
                <div className="bg-white border border-[#EAE2D8] rounded-xl p-4 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-sm font-extrabold text-[#2B1E1A]">
                      گام ۱: محاسبه بهای کل مواد اولیه و زیررسپی‌های یک پخت (یک بچ)
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-lg bg-[#FAF8F5] border border-[#EAE2D8] text-xs font-extrabold text-[#2B1E1A] tabular-nums">
                      <PrivacyValue>{fmt(activeMetric.batchMaterialCost)}</PrivacyValue>
                    </span>
                  </div>
                  <p className="text-xs text-[#4A3C35] leading-6">
                    ابتدا قیمت هر گرم از تمام مواد اولیه (مثلاً آرد، کره، پسته) و زیررسپی‌ها (مثل کرم پاتیسیر یا شربت بار) را از انبار می‌خوانیم و در وزن مصرفی داخل دستور پخت «{activeRecipe.name}» ضرب می‌کنیم.
                  </p>
                  <div className="rounded-lg bg-[#FAF8F5] border border-[#EAE2D8] px-3 py-2 text-[11px] font-bold text-[#3A2D27] flex flex-wrap justify-between gap-2 tabular-nums">
                    <span>فرمول: جمع (مقدار هر ماده × بهای هر گرم)</span>
                    <span>
                      در این رسپی: {dig(activeRecipe.items.length)} قلم ماده با وزن خام{' '}
                      {num(activeMetric.rawBatchWeightGrams)} گرم ← هزینه کل پخت:{' '}
                      <PrivacyValue>{fmt(activeMetric.batchMaterialCost)}</PrivacyValue>
                    </span>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="bg-white border border-[#EAE2D8] rounded-xl p-4 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-sm font-extrabold text-[#2B1E1A]">
                      گام ۲: تبدیل وزن خام به «وزن خالص قابل فروش» (افت پخت / جذب شربت + پرت دورچین)
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-lg bg-[#FAF8F5] border border-[#EAE2D8] text-xs font-extrabold text-[#2B1E1A] tabular-nums">
                      <PrivacyValue>{fmt(activeMetric.materialCostPerKg)}</PrivacyValue> / کیلو
                    </span>
                  </div>
                  <p className="text-xs text-[#4A3C35] leading-6">
                    یک اشتباه بزرگ در قنادی‌ها این است که هزینه مواد را به وزن خام خمیر تقسیم می‌کنند! وقتی شیرینی در فر می‌پزد، رطوبت آن تبخیر می‌شود (افت پخت منفی) یا در باقلوا شربت جذب می‌کند (مثبت). همچنین هنگام برش سینی مقداری دورچین داریم. بنابراین بهای ۱ کیلو مواد فقط از تقسیم هزینه پخت بر «وزن خالص نهایی» به دست می‌آید.
                  </p>
                  <div className="rounded-lg bg-[#EEF2FF]/70 border border-[#C7D2FE] px-3 py-2 text-[11px] font-bold text-[#312E81] space-y-1 tabular-nums">
                    <div>فرمول: وزن خالص = وزن خام × (۱ + تغییر پخت٪) × (۱ − پرت دورچین٪)</div>
                    <div>
                      محاسبه زنده: {num(activeMetric.rawBatchWeightGrams)} گرم خام با تغییر پخت{' '}
                      {dig(activeRecipe.bakingChangePct > 0 ? `+${activeRecipe.bakingChangePct}%` : `${activeRecipe.bakingChangePct}%`)}{' '}
                      و پرت دورچین {pct(activeRecipe.trimWastePct, 0)} ← می‌شود{' '}
                      <strong>{num(activeMetric.netYieldGrams)} گرم</strong> ({num(activeMetric.netYieldKg, 2)} کیلوگرم خالص) ← بهای هر کیلو مواد:{' '}
                      <strong><PrivacyValue>{fmt(activeMetric.materialCostPerKg)}</PrivacyValue></strong>
                    </div>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="bg-white border border-[#EAE2D8] rounded-xl p-4 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-sm font-extrabold text-[#2B1E1A]">
                      گام ۳: اضافه کردن هزینه «ضایعات ماندگاری ویترین»
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-lg bg-[#FFFBEB] border border-[#F5D08A] text-xs font-extrabold text-[#92400E] tabular-nums">
                      +<PrivacyValue>{fmt(activeMetric.spoilageCostPerKg)}</PrivacyValue> / کیلو
                    </span>
                  </div>
                  <p className="text-xs text-[#4A3C35] leading-6">
                    در قنادی، به‌ویژه در شیرینی‌های تر و خامه‌ای، همیشه درصدی از تولید روزانه تا پایان عمر ماندگاری فروخته نمی‌شود و بیات یا تخفیف‌دار می‌گردد. هزینه آن بخش فروش‌نرفته باید روی بهای کیلوهای سالم فروخته‌شده سرشکن شود.
                  </p>
                  <div className="rounded-lg bg-[#FAF8F5] border border-[#EAE2D8] px-3 py-2 text-[11px] font-bold text-[#3A2D27] tabular-nums">
                    فرمول: بهای مواد با ضایعات = {fmt(activeMetric.materialCostPerKg)} ÷ (۱ − {pct(activeRecipe.shelfLifeSpoilagePct, 0)}) ={' '}
                    <strong><PrivacyValue>{fmt(activeMetric.spoilageAdjustedMaterialCostPerKg)}</PrivacyValue></strong>
                  </div>
                </div>

                {/* Step 4 */}
                <div className="bg-white border border-[#EAE2D8] rounded-xl p-4 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-sm font-extrabold text-[#2B1E1A]">
                      گام ۴: افزودن هزینه جعبه و بسته‌بندی (اجرای قانون کسر وزن جعبه ایران)
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-lg bg-[#FFFBEB] border border-[#F5D08A] text-xs font-extrabold text-[#92400E] tabular-nums">
                      +<PrivacyValue>{fmt(activeMetric.boxAndPackagingPerKg)}</PrivacyValue> / کیلو
                    </span>
                  </div>
                  <p className="text-xs text-[#4A3C35] leading-6">
                    طبق قانون صنفی کسر وزن جعبه، فروشنده مجاز نیست وزن جعبه را روی ترازو به جای شیرینی حساب کند. بنابراین قیمت جعبه یک‌کیلویی + کاغذ روغنی و روبان به‌طور مستقیم و شفاف به هزینه متغیر هر کیلو اضافه می‌شود.
                  </p>
                </div>

                {/* Step 5 */}
                <div className="bg-white border border-[#EAE2D8] rounded-xl p-4 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-sm font-extrabold text-[#2B1E1A]">
                      گام ۵: سرشکن کردن سربار ثابت و حقوق قانون کار به هر کیلو
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-lg bg-[#EEF2FF] border border-[#C7D2FE] text-xs font-extrabold text-[#312E81] tabular-nums">
                      +<PrivacyValue>{fmt(activeMetric.allocatedOverheadPerKg)}</PrivacyValue> / کیلو
                    </span>
                  </div>
                  <p className="text-xs text-[#4A3C35] leading-6">
                    اجاره مغازه و کارگاه، گاز فر، برق یخچال، استهلاک دستگاه‌ها و کل حقوق واقعی پرسنل (با بیمه ۲۳٪، عیدی و سنوات) مجموعاً{' '}
                    <strong className="tabular-nums"><PrivacyValue>{fmtCompact(summary.totalMonthlyOverheadAndPayroll)}</PrivacyValue></strong> در ماه است. بر اساس روش فعال شما ({activeOverheadMethodLabel}) سهم هر کیلو «{activeRecipe.name}» دقیقاً{' '}
                    <strong className="tabular-nums"><PrivacyValue>{fmt(activeMetric.allocatedOverheadPerKg)}</PrivacyValue></strong> محاسبه شده است.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('overhead_masterclass')}
                    className="text-xs font-extrabold text-[#4338CA] hover:underline cursor-pointer"
                  >
                    مشاهده آموزش کامل نحوه محاسبه و مقایسه ۳ روش سربار در تب ۳ ←
                  </button>
                </div>

                {/* Step 6 */}
                <div className="bg-white border border-[#EAE2D8] rounded-xl p-4 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-sm font-extrabold text-[#2B1E1A]">
                      گام ۶: جمع بهای تمام‌شده کارگاهی، کسر کارمزد کانال‌ها و محاسبه سود خالص
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-lg bg-[#ECFDF5] border border-[#A7F3D0] text-xs font-extrabold text-[#065F46] tabular-nums">
                      سود خالص: <PrivacyValue>{fmt(activeMetric.netProfitPerKg)}</PrivacyValue> ({pct(activeMetric.netMarginPct)})
                    </span>
                  </div>
                  <p className="text-xs text-[#4A3C35] leading-6">
                    بهای تمام‌شده نهایی هر کیلو برابر جمع گام‌های ۳، ۴ و ۵ یعنی{' '}
                    <strong className="tabular-nums"><PrivacyValue>{fmt(activeMetric.totalCostPerKg)}</PrivacyValue></strong> است. از طرفی، میانگین قیمت خالص دریافتی شما پس از کسر کارمزد کارت‌خوان، کمیسیون اسنپ‌فود و تخفیف کافه‌ها برابر{' '}
                    <strong className="tabular-nums"><PrivacyValue>{fmt(activeMetric.blendedNetPricePerKg)}</PrivacyValue></strong> است (نرخ ویترین:{' '}
                    <span className="tabular-nums"><PrivacyValue>{fmt(activeMetric.storefrontPricePerKg)}</PrivacyValue></span>). تفاضل این دو، سود خالص واقعی هر کیلو است.
                  </p>
                </div>

                {/* Step 7: Crucial Margin Formula Comparison */}
                <div className="bg-[#FFFBEB] border border-[#F5D08A] rounded-xl p-4 space-y-2.5">
                  <h3 className="text-sm font-extrabold text-[#92400E] flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-[#D97706]" />
                    <span>گام ۷ (نکته طلایی قیمت‌گذاری): چطور برای حاشیه سود {pct(exampleTargetMargin, 0)} قیمت بگذاریم؟</span>
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div className="rounded-lg bg-[#FEF2F2] border border-[#F5C2B8] p-3 space-y-1">
                      <div className="font-extrabold text-[#991B1B]">روش اشتباه رایج در بازار (ضرب در ۱ + درصد):</div>
                      <div className="text-[#7F1D1D] tabular-nums">
                        {fmt(activeMetric.totalCostPerKg)} × (۱ + {pct(exampleTargetMargin, 0)}) ={' '}
                        <strong><PrivacyValue>{fmt(exampleWrongMarkupPrice)}</PrivacyValue></strong>
                      </div>
                      <div className="text-[11px] text-[#991B1B]">
                        این عدد در ظاهر {pct(exampleTargetMargin, 0)} است اما در واقع فقط{' '}
                        {pct(((exampleWrongMarkupPrice - activeMetric.totalCostPerKg) / Math.max(1, exampleWrongMarkupPrice)) * 100)} حاشیه سود واقعی از فروش می‌دهد!
                      </div>
                    </div>

                    <div className="rounded-lg bg-[#ECFDF5] border border-[#A7F3D0] p-3 space-y-1">
                      <div className="font-extrabold text-[#065F46]">فرمول علمی و درست (تقسیم بر ۱ − درصد):</div>
                      <div className="text-[#065F46] tabular-nums">
                        {fmt(activeMetric.totalCostPerKg)} ÷ (۱ − {pct(exampleTargetMargin, 0)}) ={' '}
                        <strong><PrivacyValue>{fmt(exampleTargetPriceExact)}</PrivacyValue></strong>
                      </div>
                      <div className="text-[11px] text-[#047857]">
                        با این فرمول (پس از رندکردن به پله {fmt(data.settings.priceRoundingStep)}) دقیقاً {pct(exampleTargetMargin, 0)} از قیمت فروش سود خالص شما می‌ماند.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white border border-[#EAE2D8] rounded-xl p-6 text-xs text-[#7D6C63]">
              ابتدا حداقل یک محصول در بخش «فرمولاسیون و تولید» تعریف کنید تا آموزش زنده روی آن نمایش داده شود.
            </div>
          )}
        </div>
      )}

      {/* ==================== TAB 3: OVERHEAD & IRANIAN LABOR LAW MASTERCLASS ==================== */}
      {activeTab === 'overhead_masterclass' && (
        <div className="space-y-5">
          {/* Part 1: What makes up Workshop Overhead (Live Breakdown) */}
          <section className="bg-white border border-[#EAE2D8] rounded-xl p-5 space-y-4">
            <div>
              <h2 className="text-base font-extrabold text-[#2B1E1A] flex items-center gap-1.5">
                <Layers className="w-4.5 h-4.5 text-[#4338CA]" />
                <span>بخش ۱: سربار کارگاه قنادی دقیقاً چیست و از چه اجزایی ساخته می‌شود؟</span>
              </h2>
              <p className="text-xs text-[#7D6C63] mt-1 leading-6">
                به زبان ساده، <strong>سربار</strong> یعنی تمام هزینه‌هایی که حتی اگر امروز فقط یک کیلو شیرینی بفروشید باز هم باید آخر ماه پرداخت کنید (اجاره، گاز فر، برق یخچال، استهلاک دستگاه‌ها و حقوق کامل پرسنل). اگر سربار روی قیمت هر کیلو شیرینی سرشکن نشود، فکر می‌کنید سود کرده‌اید اما آخر ماه پول اجاره و عیدی پرسنل کم می‌آید!
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="rounded-xl bg-[#FAF8F5] border border-[#EAE2D8] p-3.5">
                <div className="text-[11px] font-bold text-[#7D6C63]">۱. سربار ثابت کارگاه</div>
                <div className="text-lg font-extrabold text-[#2B1E1A] tabular-nums mt-1">
                  <PrivacyValue>{fmtCompact(summary.totalMonthlyFixedOverhead)}</PrivacyValue>
                </div>
                <div className="text-[10px] text-[#7D6C63] mt-0.5">اجاره، گاز فر، برق، استهلاک، تبلیغات</div>
              </div>

              <div className="rounded-xl bg-[#FAF8F5] border border-[#EAE2D8] p-3.5">
                <div className="text-[11px] font-bold text-[#7D6C63]">۲. حقوق و مزایای فیشی پرسنل</div>
                <div className="text-lg font-extrabold text-[#2B1E1A] tabular-nums mt-1">
                  <PrivacyValue>{fmtCompact(summary.totalMonthlyBasePayroll)}</PrivacyValue>
                </div>
                <div className="text-[10px] text-[#7D6C63] mt-0.5">پرداختی نقدی ماهانه به کارکنان</div>
              </div>

              <div className="rounded-xl bg-[#FFFBEB] border border-[#F5D08A] p-3.5">
                <div className="text-[11px] font-bold text-[#92400E]">۳. سربار پنهان قانون کار ایران</div>
                <div className="text-lg font-extrabold text-[#92400E] tabular-nums mt-1">
                  <PrivacyValue>{fmtCompact(summary.totalMonthlyLaborLawAccruals)}</PrivacyValue>
                </div>
                <div className="text-[10px] text-[#92400E] mt-0.5">۲۳٪ بیمه کارفرما + ۲/۱۲ عیدی + ۱/۱۲ سنوات</div>
              </div>

              <div className="rounded-xl bg-[#2B1E1A] text-white p-3.5">
                <div className="text-[11px] font-bold text-[#E6D9CE]">= کل سربار قابل سرشکن ماهانه</div>
                <div className="text-lg font-extrabold tabular-nums mt-1">
                  <PrivacyValue>{fmtCompact(summary.totalMonthlyOverheadAndPayroll)}</PrivacyValue>
                </div>
                <div className="text-[10px] text-[#D7C6B9] mt-0.5">تقسیم بر کل محصولات تولیدی ماه</div>
              </div>
            </div>

            {/* Worked Iranian Labor Law Example Box */}
            <div className="rounded-xl bg-[#EEF2FF]/60 border border-[#C7D2FE] p-4 space-y-2">
              <div className="text-xs font-extrabold text-[#312E81]">
                مثال عددی شفاف از قانون کار ایران (چرا هزینه واقعی کارفرما حدود ۴۸٪ بیشتر از حقوق پایه است؟):
              </div>
              <p className="text-xs text-[#312E81] leading-6 tabular-nums">
                فرض کنید حقوق پایه یک قناد <strong>۲۰ میلیون تومان</strong> است:
                سهم ۲۳٪ بیمه کارفرما = <strong>۴.۶ میلیون</strong> + ذخیره ماهانه عیدی (معادل ۲ ماه حقوق در سال ÷ ۱۲) = <strong>۳.۳۳ میلیون</strong> + ذخیره ماهانه سنوات (۱ ماه حقوق ÷ ۱۲) = <strong>۱.۶۷ میلیون</strong>.
                پس هزینه واقعی این نیرو برای کارگاه <strong>۲۹.۶ میلیون تومان در ماه</strong> است، نه ۲۰ میلیون!
              </p>
            </div>
          </section>

          {/* Part 2: Explaining the 3 Overhead Allocation Methods */}
          <section className="bg-white border border-[#EAE2D8] rounded-xl p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-extrabold text-[#2B1E1A] flex items-center gap-1.5">
                  <Scale className="w-4.5 h-4.5 text-[#2D6A4F]" />
                  <span>بخش ۲: آموزش ۳ روش سرشکن سربار و مقایسه زنده روی شیرینی‌های کارگاه شما</span>
                </h2>
                <p className="text-xs text-[#7D6C63] mt-0.5">
                  روش فعلی فعال در تنظیمات شما: <strong className="text-[#2B1E1A]">{activeOverheadMethodLabel}</strong>
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
              <div className="rounded-xl bg-[#FAF8F5] border border-[#EAE2D8] p-4 space-y-2">
                <div className="text-xs font-extrabold text-[#2B1E1A]">۱. روش وزنی (ساده)</div>
                <div className="rounded bg-white border border-[#EAE2D8] px-2.5 py-1.5 text-[11px] font-bold text-[#3A2D27]">
                  سربار هر کیلو = کل سربار ماهانه ÷ کل کیلو فروش ماه
                </div>
                <p className="text-[11px] text-[#5A4A42] leading-6">
                  به تمام شیرینی‌ها صرف‌نظر از سختی پخت، یک مبلغ سربار ثابت می‌دهد. ساده است اما یک دام دارد: شیرینی‌های پرزحمت (مثل ناپلئونی و رولت) ارزان‌تر از واقعیت و شیرینی‌های سریع، گران‌تر از واقعیت نشان داده می‌شوند.
                </p>
              </div>

              <div className="rounded-xl bg-[#FAF8F5] border border-[#EAE2D8] p-4 space-y-2">
                <div className="text-xs font-extrabold text-[#4338CA]">۲. روش زمانی / فعالیت‌محور (ABC)</div>
                <div className="rounded bg-white border border-[#C7D2FE] px-2.5 py-1.5 text-[11px] font-bold text-[#312E81]">
                  سربار هر کیلو = کل سربار × (ساعات کار و فر محصول ÷ کل ساعات کارگاه)
                </div>
                <p className="text-[11px] text-[#5A4A42] leading-6">
                  علمی‌ترین روش حسابداری صنعتی: هر شیرینی دقیقاً به اندازه زمانی که دست استادکار و فضای فر را اشغال می‌کند سهم اجاره، گاز و حقوق می‌پردازد. عالی برای کارگاه‌های تخصصی و کیک‌سازی.
                </p>
              </div>

              <div className="rounded-xl bg-[#ECFDF5]/70 border border-[#A7F3D0] p-4 space-y-2">
                <div className="text-xs font-extrabold text-[#065F46]">۳. روش ترکیبی ۵۰/۵۰ (پیشنهادی ایران)</div>
                <div className="rounded bg-white border border-[#A7F3D0] px-2.5 py-1.5 text-[11px] font-bold text-[#065F46]">
                  سربار هر کیلو = ۵۰٪ سهم وزنی + ۵۰٪ سهم زمانی (ABC)
                </div>
                <p className="text-[11px] text-[#065F46] leading-6">
                  نیمی از سربار (مثل اجاره ویترین و بسته‌بندی) را بر اساس وزن و نیمی دیگر (مثل گاز فر و وقت قناد) را بر اساس زمان تقسیم می‌کند. متعادل‌ترین و کاربردی‌ترین روش برای قنادی‌های بازار ایران.
                </p>
              </div>
            </div>

            {/* Live Comparison Table across workshop recipes */}
            {overheadComparison.length > 0 && (
              <div className="overflow-x-auto rounded-xl border border-[#EAE2D8]">
                <table className="w-full text-xs text-right">
                  <thead className="bg-[#FAF8F5] border-b border-[#EAE2D8] text-[#5A4A42]">
                    <tr>
                      <th className="py-2.5 px-3 font-extrabold">نام شیرینی</th>
                      <th className="py-2.5 px-3 font-extrabold">سربار در روش وزنی</th>
                      <th className="py-2.5 px-3 font-extrabold text-[#4338CA]">سربار در روش زمانی (ABC)</th>
                      <th className="py-2.5 px-3 font-extrabold text-[#065F46]">سربار در روش ترکیبی ۵۰/۵۰</th>
                      <th className="py-2.5 px-3 font-extrabold">اثر روی حاشیه سود (وزنی ← زمانی)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F2EBE2] tabular-nums">
                    {overheadComparison.map((row) => (
                      <tr key={row.recipeId} className="hover:bg-[#FAF8F5]/60">
                        <td className="py-2.5 px-3 font-bold text-[#2B1E1A]">{row.name}</td>
                        <td className="py-2.5 px-3 text-[#4A3C35]">
                          <PrivacyValue>{fmt(row.weightOverhead)}</PrivacyValue>
                        </td>
                        <td className="py-2.5 px-3 font-bold text-[#4338CA]">
                          <PrivacyValue>{fmt(row.timeOverhead)}</PrivacyValue>
                        </td>
                        <td className="py-2.5 px-3 font-bold text-[#065F46]">
                          <PrivacyValue>{fmt(row.hybridOverhead)}</PrivacyValue>
                        </td>
                        <td className="py-2.5 px-3 text-[11px] font-bold text-[#5A4A42]">
                          {pct(row.weightMarginPct)} ←{' '}
                          <span
                            className={
                              row.timeMarginPct >= row.weightMarginPct
                                ? 'text-[#2D6A4F]'
                                : 'text-[#C84B31]'
                            }
                          >
                            {pct(row.timeMarginPct)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Part 3: 5 Fatal Costing Traps in Iranian Confectioneries */}
          <section className="bg-white border border-[#EAE2D8] rounded-xl p-5 space-y-4">
            <h2 className="text-base font-extrabold text-[#2B1E1A] flex items-center gap-1.5">
              <AlertTriangle className="w-4.5 h-4.5 text-[#C84B31]" />
              <span>بخش ۳: ۵ اشتباه مرگبار در محاسبه بهای تمام‌شده و سربار قنادی‌ها (و راه‌حل درست)</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {COMMON_COSTING_TRAPS.map((trap) => (
                <div
                  key={trap.id}
                  className="rounded-xl border border-[#EAE2D8] bg-[#FAF8F5] p-4 space-y-2.5"
                >
                  <h3 className="text-xs sm:text-sm font-extrabold text-[#2B1E1A]">{trap.title}</h3>
                  <div className="rounded-lg bg-[#FEF2F2] border border-[#F5C2B8] p-2.5 text-[11px] text-[#991B1B] leading-6">
                    <strong>اشتباه رایج: </strong>
                    {trap.wrongWay}
                  </div>
                  <div className="rounded-lg bg-[#ECFDF5] border border-[#A7F3D0] p-2.5 text-[11px] text-[#065F46] leading-6">
                    <strong>روش صحیح در شیرین‌تراز: </strong>
                    {trap.rightWay}
                  </div>
                  <div className="text-[11px] font-bold text-[#2D6A4F] flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>{trap.impact}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
};
