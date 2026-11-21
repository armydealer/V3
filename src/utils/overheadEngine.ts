import {
  ComputedWorkshopSummary,
  OverheadAllocationMethod,
  OverheadItem,
  WorkshopData,
} from '../types';
import { safeDiv } from './formatters';

export interface OverheadMethodMeta {
  id: OverheadAllocationMethod;
  title: string;
  shortLabel: string;
  badge: string;
  formulaText: string;
  howItWorks: string;
  pros: string;
  cons: string;
  bestFor: string;
}

export const OVERHEAD_METHOD_LIST: OverheadMethodMeta[] = [
  {
    id: 'hybrid',
    title: 'روش ترکیبی ۵۰/۵۰ (وزنی + زمانی ABC)',
    shortLabel: 'ترکیبی ۵۰/۵۰',
    badge: 'پیشنهادی برای قنادی‌های چندمحصولی',
    formulaText: 'سهم محصول = (۰.۵ × سهم وزن فروش) + (۰.۵ × سهم زمان فر و استادکار)',
    howItWorks:
      'نیمی از سربار بر اساس وزن فروش (فضای ویترین و جابه‌جایی) و نیمی دیگر بر اساس زمان اشغال فر و کار استادکار تقسیم می‌شود.',
    pros: 'متعادل‌ترین روش؛ نه به محصولات حجیم و ساده ظلم می‌کند و نه محصولات پرزحمت را ارزان نشان می‌دهد.',
    cons: 'نیاز دارد زمان فر و زمان استادکار در فرمول هر شیرینی نسبتاً دقیق ثبت شود.',
    bestFor: 'قنادی‌هایی که هم شیرینی خشک پرتیراژ دارند و هم شیرینی تر، باقلوا یا کیک کافه‌ای تولید می‌کنند.',
  },
  {
    id: 'weight',
    title: 'روش وزنی (سرشکن ساده بر حسب کیلوگرم)',
    shortLabel: 'وزنی (کیلوگرم)',
    badge: 'ساده‌ترین روش',
    formulaText: 'سهم سربار هر کیلو = کل سربار ماهانه ÷ کل کیلوگرم فروش ماهانه',
    howItWorks:
      'تمام هزینه‌های سربار و حقوق به طور یکسان روی هر کیلوگرم شیرینی فروخته‌شده سرشکن می‌شود.',
    pros: 'محاسبه فوری، بسیار شفاف و بدون نیاز به زمان‌سنجی دقیق فر و پرسنل.',
    cons: 'شیرینی‌های پرزحمت (مثل باقلوا یا ناپلئونی) را ارزان‌تر از واقعیت و شیرینی‌های ساده را گران‌تر نشان می‌دهد.',
    bestFor: 'کارگاه‌های تک‌محصولی یا کارگاه‌هایی که تمام محصولات زمان پخت و زحمت تقریباً مشابهی دارند.',
  },
  {
    id: 'time_abc',
    title: 'روش فعالیت‌محور زمانی (ABC: ۵۵٪ فر + ۴۵٪ استادکار)',
    shortLabel: 'زمانی ABC',
    badge: 'دقیق‌ترین روش مهندسی',
    formulaText: 'واحد فعالیت = (۰.۵۵ × ساعت فر ماهانه) + (۰.۴۵ × ساعت استادکار ماهانه)',
    howItWorks:
      'هر محصول دقیقاً به اندازه ظرفیتی که از فرهای کارگاه و وقت قنادها اشغال می‌کند، سهم سربار می‌گیرد.',
    pros: 'دقت حسابداری صنعتی بسیار بالا؛ دقیقاً مشخص می‌کند کدام شیرینی پرزحمت واقعاً سودآور است.',
    cons: 'اگر زمان پخت یا تعداد سینی در فرمول اشتباه وارد شود، سهم سربار منحرف می‌شود.',
    bestFor: 'کارگاه‌های شلوغ با تنوع بالای شیرینی‌های دست‌ساز، فوندانت و کیک‌های کافه‌ای.',
  },
  {
    id: 'oven_hours',
    title: 'روش گلوگاه فر (۱۰۰٪ بر اساس ساعت اشغال فر)',
    shortLabel: 'گلوگاه فر',
    badge: 'ویژه نظریه محدودیت‌ها (TOC)',
    formulaText: 'سهم محصول = ساعت فر ماهانه محصول ÷ کل ساعت فر مصرفی کارگاه',
    howItWorks:
      'کل سربار کارگاه بر مبنای ساعاتی که سینی‌های هر محصول داخل فر هستند تقسیم می‌شود.',
    pros: 'در ایام پیک (اسفند و یلدا) که فر گلوگاه اصلی است، ارزش واقعی هر ساعت فر را افشا می‌کند.',
    cons: 'برای محصولاتی که کار سرد و دکوراسیون زیاد ولی زمان فر کم دارند (مثل رولت یا دسر سرد) سربار کمتری می‌اندازد.',
    bestFor: 'کارگاه‌هایی که محدودیت اصلی تولیدشان ظرفیت فر است و شیفت فر ۲۴ ساعته پر می‌شود.',
  },
  {
    id: 'direct_cost',
    title: 'روش درصدی از بهای مواد اولیه (سنتی بازار)',
    shortLabel: 'درصدی از مواد',
    badge: 'رایج در حسابداری سنتی',
    formulaText: 'سهم محصول = هزینه مواد ماهانه محصول ÷ کل هزینه مواد ماهانه کارگاه',
    howItWorks:
      'نسبت کل سربار به کل خرید مواد اولیه محاسبه شده و همان درصد روی مواد هر کیلو شیرینی اعمال می‌شود.',
    pros: 'نیازی به ثبت زمان فر یا کار ندارد و با فاکتورهای خرید مواد اولیه هماهنگ است.',
    cons: 'روی شیرینی‌های گران‌مواد مثل باقلوا پسته‌ای بار سربار بیش‌ازحد سنگین می‌اندازد و زبان/خشک را سبک می‌کند.',
    bestFor: 'برآورد سریع اولیه قبل از زمان‌سنجی کارگاه یا مقایسه با عرف سنتی بازار.',
  },
];

export const OVERHEAD_METHOD_MAP: Record<OverheadAllocationMethod, OverheadMethodMeta> =
  OVERHEAD_METHOD_LIST.reduce((acc, item) => {
    acc[item.id] = item;
    return acc;
  }, {} as Record<OverheadAllocationMethod, OverheadMethodMeta>);

export interface OverheadIdentificationTemplate {
  id: string;
  name: string;
  category: OverheadItem['category'];
  behavior: 'fixed' | 'semi_variable';
  suggestedMonthlyAmount: number;
  keywords: string[];
  identificationTip: string;
  howToMeasure: string;
}

export const OVERHEAD_IDENTIFICATION_CATALOG: OverheadIdentificationTemplate[] = [
  {
    id: 'tpl-rent',
    name: 'اجاره کارگاه و مغازه ویترین (یا اجاره ضمنی ملک شخصی)',
    category: 'اجاره و ملک',
    behavior: 'fixed',
    suggestedMonthlyAmount: 55_000_000,
    keywords: ['اجاره', 'ملک', 'رهن'],
    identificationTip:
      'حتی اگر مغازه ملک شخصی خودتان است، نرخ اجاره عرف محل را اینجا وارد کنید تا سود واقعی کار از سود مالکیت جدا شود.',
    howToMeasure: 'مبلغ اجاره ماهانه + (مبلغ رهن × ۲.۵٪ تا ۳٪ ماهانه).',
  },
  {
    id: 'tpl-energy',
    name: 'گاز فرهای گردان، برق یخچال/فریزر و آب کارگاه',
    category: 'انرژی و فر',
    behavior: 'semi_variable',
    suggestedMonthlyAmount: 13_500_000,
    keywords: ['گاز', 'برق', 'آب', 'انرژی', 'فر'],
    identificationTip:
      'قبوض معمولاً دوماهه یا دوره‌ای می‌آیند و در تابستان (کولر و یخچال) و اسفند (پخت سنگین) اوج می‌گیرند.',
    howToMeasure: 'میانگین ۶ قبض اخیر برق، گاز و آب را جمع کرده و به تعداد ماه‌های دوره تقسیم کنید.',
  },
  {
    id: 'tpl-depreciation',
    name: 'استهلاک فر گردان، میکسر قنادی، یخچال ویترینی و فریزر',
    category: 'استهلاک تجهیزات',
    behavior: 'fixed',
    suggestedMonthlyAmount: 9_500_000,
    keywords: ['استهلاک', 'تعمیر', 'تجهیزات', 'همزن', 'میکسر'],
    identificationTip:
      'پرتکرارترین هزینه فراموش‌شده در قنادی‌ها! اگر استهلاک نگیرید، ۵ سال بعد پولی برای جایگزینی فر ندارید.',
    howToMeasure: 'ارزش روز کل تجهیزات ÷ (عمر مفید به سال × ۱۲ ماه) — از ماشین‌حساب استهلاک تب ۲ استفاده کنید.',
  },
  {
    id: 'tpl-insurance',
    name: 'بیمه آتش‌سوزی کارگاه، مسئولیت مدنی و مجوزهای بهداشت/اتحادیه',
    category: 'سایر',
    behavior: 'fixed',
    suggestedMonthlyAmount: 2_800_000,
    keywords: ['بیمه', 'آتش', 'بهداشت', 'اتحادیه', 'سم'],
    identificationTip:
      'هزینه‌های سالانه مثل بیمه آتش‌سوزی، شارژ کپسول، سم‌پاشی دوره‌ای و حق عضویت اتحادیه اغلب در بهای تمام‌شده گم می‌شوند.',
    howToMeasure: 'جمع پرداختی‌های سالانه این بخش را بر ۱۲ تقسیم کنید.',
  },
  {
    id: 'tpl-hygiene',
    name: 'مواد شوینده صنعتی، دستکش، کلاه، پیش‌بند و تمیزکاری',
    category: 'سایر',
    behavior: 'semi_variable',
    suggestedMonthlyAmount: 3_500_000,
    keywords: ['شوینده', 'دستکش', 'نظافت', 'بهداشتی'],
    identificationTip:
      'چون روی هیچ رسپی نوشته نمی‌شوند ولی هر ماه میلیون‌ها تومان خریداری می‌شوند، باید در سربار ثبت شوند.',
    howToMeasure: 'مجموع فاکتورهای ماهانه خرید مواد شوینده و اقلام مصرفی بهداشتی کارگاه.',
  },
  {
    id: 'tpl-marketing',
    name: 'تبلیغات اینستاگرام، عکاسی، اینترنت، نرم‌افزار و اداری',
    category: 'بازاریابی و اداری',
    behavior: 'fixed',
    suggestedMonthlyAmount: 7_500_000,
    keywords: ['تبلیغات', 'اینستاگرام', 'اداری', 'بازاریابی', 'پیک'],
    identificationTip:
      'هزینه ادمین، عکاسی محصول، اشتراک اینترنت، حسابدار و پیک ثابت داخل شهر بخشی از سربار عملیاتی است.',
    howToMeasure: 'جمع بودجه ماهانه بازاریابی، حسابداری و هزینه ثابت ارسال.',
  },
  {
    id: 'tpl-maintenance',
    name: 'سرویس دوره‌ای و تعمیرات اضطراری (موتور یخچال، مشعل فر)',
    category: 'استهلاک تجهیزات',
    behavior: 'semi_variable',
    suggestedMonthlyAmount: 4_200_000,
    keywords: ['سرویس', 'نگهداری', 'مشعل', 'تعمیر'],
    identificationTip:
      'خرابی ناگهانی کمپرسور یخچال یا برد فر هزینه یک‌باره سنگینی دارد؛ ذخیره ماهانه مانع شوک نقدینگی می‌شود.',
    howToMeasure: 'مجموع هزینه‌های تعمیرات سال گذشته ÷ ۱۲ (یا ۱.۵٪ ارزش تجهیزات در سال ÷ ۱۲).',
  },
];

export function computeEquipmentMonthlyDepreciation(
  purchasePriceToman: number,
  salvageValueToman: number,
  usefulLifeYears: number
): {
  depreciableBase: number;
  monthlyDepreciation: number;
  annualDepreciation: number;
} {
  const price = Math.max(0, purchasePriceToman);
  const salvage = Math.min(price, Math.max(0, salvageValueToman));
  const years = Math.max(0.5, usefulLifeYears);
  const depreciableBase = Math.max(0, price - salvage);
  const annualDepreciation = depreciableBase / years;
  const monthlyDepreciation = annualDepreciation / 12;
  return {
    depreciableBase,
    monthlyDepreciation: Math.round(monthlyDepreciation),
    annualDepreciation: Math.round(annualDepreciation),
  };
}

export function computePeriodicBillToMonthly(
  billAmountToman: number,
  periodMonths: number
): number {
  const amt = Math.max(0, billAmountToman);
  const months = Math.max(0.5, periodMonths);
  return Math.round(amt / months);
}

export interface OverheadCategorySlice {
  category: string;
  amount: number;
  sharePct: number;
  color: string;
}

export interface OverheadComparisonRow {
  recipeId: string;
  name: string;
  category: string;
  monthlySalesKg: number;
  ovenHoursPerKg: number;
  laborHoursPerKg: number;
  activeMethodPerKg: number;
  byMethodPerKg: Record<OverheadAllocationMethod, number>;
  minPerKg: number;
  maxPerKg: number;
  spreadPerKg: number;
  byMethodMarginPct: Record<OverheadAllocationMethod, number>;
}

const CATEGORY_COLORS: Record<string, string> = {
  'حقوق و قانون کار پرسنل': '#2B1E1A',
  'اجاره و ملک': '#2D6A4F',
  'انرژی و فر': '#D97706',
  'استهلاک تجهیزات': '#4338CA',
  'بازاریابی و اداری': '#0891B2',
  'سایر': '#8C7B72',
};

export function computeOverheadStudioAnalysis(
  data: WorkshopData,
  summary: ComputedWorkshopSummary
) {
  const totalPool = summary.totalMonthlyOverheadAndPayroll;

  // Category composition including Staff Payroll
  const catTotals: Record<string, number> = {
    'حقوق و قانون کار پرسنل': summary.totalMonthlyStaffCost,
  };
  for (const oh of data.overheads) {
    if (!oh.active) continue;
    catTotals[oh.category] = (catTotals[oh.category] ?? 0) + Math.max(0, oh.monthlyAmount);
  }

  const categoryBreakdown: OverheadCategorySlice[] = Object.entries(catTotals)
    .filter(([, amt]) => amt > 0)
    .map(([category, amount]) => ({
      category,
      amount: Math.round(amount),
      sharePct: safeDiv(amount, Math.max(1, totalPool), 0) * 100,
      color: CATEGORY_COLORS[category] ?? '#7D6C63',
    }))
    .sort((a, b) => b.amount - a.amount);

  // Identification checklist coverage
  const checklist = OVERHEAD_IDENTIFICATION_CATALOG.map((tpl) => {
    const matchedItems = data.overheads.filter(
      (o) =>
        o.active &&
        (o.category === tpl.category ||
          tpl.keywords.some((kw) => o.name.includes(kw)))
    );
    const exactKeywordMatch = data.overheads.some(
      (o) => o.active && tpl.keywords.some((kw) => o.name.includes(kw))
    );
    return {
      ...tpl,
      isCovered: exactKeywordMatch,
      matchedTotal: matchedItems.reduce((s, o) => s + o.monthlyAmount, 0),
    };
  });

  const coveredCount = checklist.filter((c) => c.isCovered).length;
  const coveragePct = safeDiv(coveredCount, checklist.length, 0) * 100;

  // Cross-method comparison rows
  const methods: OverheadAllocationMethod[] = [
    'weight',
    'time_abc',
    'hybrid',
    'oven_hours',
    'direct_cost',
  ];

  const comparisonRows: OverheadComparisonRow[] = summary.recipeMetrics.map((rm) => {
    const byMethodPerKg = rm.overheadBreakdown.byMethodPerKg;
    const vals = methods.map((m) => byMethodPerKg[m]);
    const minPerKg = Math.min(...vals);
    const maxPerKg = Math.max(...vals);
    const byMethodMarginPct = {} as Record<OverheadAllocationMethod, number>;
    for (const m of methods) {
      const altTotalCost = rm.totalCostPerKg - rm.allocatedOverheadPerKg + byMethodPerKg[m];
      const altProfit = rm.blendedNetPricePerKg - altTotalCost;
      const grossPrice = rm.blendedNetPricePerKg + rm.blendedChannelCostPerKg;
      byMethodMarginPct[m] = safeDiv(altProfit, Math.max(1, grossPrice), 0) * 100;
    }

    return {
      recipeId: rm.recipeId,
      name: rm.name,
      category: rm.category,
      monthlySalesKg: rm.monthlySalesKg,
      ovenHoursPerKg: rm.ovenHoursPerKg,
      laborHoursPerKg: rm.laborHoursPerKg,
      activeMethodPerKg: rm.allocatedOverheadPerKg,
      byMethodPerKg,
      minPerKg,
      maxPerKg,
      spreadPerKg: Math.max(0, maxPerKg - minPerKg),
      byMethodMarginPct,
    };
  });

  const avgOverheadPerKg = safeDiv(totalPool, Math.max(1, summary.totalMonthlySalesKg), 0);
  const overheadToRevenuePct = safeDiv(totalPool, Math.max(1, summary.totalMonthlyRevenue), 0) * 100;
  const overheadPerOvenHour = safeDiv(totalPool, Math.max(1, summary.usedOvenHours), 0);

  return {
    totalPool,
    avgOverheadPerKg,
    overheadToRevenuePct,
    overheadPerOvenHour,
    categoryBreakdown,
    checklist,
    coveredCount,
    coveragePct,
    comparisonRows,
  };
}
