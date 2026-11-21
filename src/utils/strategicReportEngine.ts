import {
  ComputedWorkshopSummary,
  ForecastMonthPoint,
  MonteCarloResult,
  TornadoDriver,
  WorkshopData,
} from '../types';
import { computeCashflowStressTimeline } from './costEngine';
import { formatCurrency, formatDigits, formatNumber, formatPercent } from './formatters';

export type StrategicReportTemplateId =
  | 'executive_full'
  | 'risk_liquidity'
  | 'pricing_menu'
  | 'operations_waste'
  | 'whatsapp_board';

export type StrategicReportTone = 'executive' | 'practical';

export interface StrategicReportOptions {
  templateId: StrategicReportTemplateId;
  tone: StrategicReportTone;
}

export interface StrategicReportSection {
  id: string;
  heading: string;
  severity: 'healthy' | 'warning' | 'critical' | 'info';
  paragraphs: string[];
  bullets: string[];
  firedRules: string[];
}

export interface StrategicActionItem {
  weekLabel: string;
  priority: 'فوری' | 'اولویت بالا' | 'بهینه‌سازی';
  title: string;
  detail: string;
  expectedImpact: string;
}

export interface GeneratedStrategicReport {
  templateId: StrategicReportTemplateId;
  tone: StrategicReportTone;
  title: string;
  subtitle: string;
  workshopName: string;
  managerName: string;
  overallStatus: 'healthy' | 'warning' | 'critical';
  overallVerdictLabel: string;
  executiveSummaryLine: string;
  headlineMetrics: Array<{
    label: string;
    value: string;
    subtext: string;
    tone: 'neutral' | 'positive' | 'warning' | 'danger' | 'indigo';
  }>;
  sections: StrategicReportSection[];
  actionPlan: StrategicActionItem[];
  firedRuleCount: number;
  plainText: string;
}

export interface StrategicTemplateMeta {
  id: StrategicReportTemplateId;
  title: string;
  shortDesc: string;
  audience: string;
}

export const STRATEGIC_REPORT_TEMPLATES: StrategicTemplateMeta[] = [
  {
    id: 'executive_full',
    title: 'گزارش جامع استراتژیک مدیرعامل',
    shortDesc: 'تحلیل کامل سود واقعی، مونت‌کارلو، منو، گلوگاه فر، ضایعات و برنامه ۳۰ روزه',
    audience: 'مدیر کارگاه، شرکا و تصمیم‌گیری ماهانه',
  },
  {
    id: 'risk_liquidity',
    title: 'گزارش ریسک مونت‌کارلو و سپر نقدینگی',
    shortDesc: 'تفسیر ۱,۰۰۰ سناریوی ریسک، VaR 95%، چک‌های صیادی و نوسان فصلی شمسی',
    audience: 'کنترل نقدینگی و پیشگیری از برگشت چک',
  },
  {
    id: 'pricing_menu',
    title: 'گزارش مهندسی منو، قیمت‌گذاری و اتحادیه',
    shortDesc: 'تحلیل ستاره‌ها و اسب‌های کاری، سقف نرخ اتحادیه و دفاع سود اسنپ‌فود',
    audience: 'بازنگری قیمت‌ها و چیدمان ویترین',
  },
  {
    id: 'operations_waste',
    title: 'گزارش تولید، گلوگاه فر و مهار پرت نامرئی',
    shortDesc: 'سود به ازای ساعت فر، پارتو ۸۰/۲۰ انبار، نشتی کره/پسته و بار قانون کار',
    audience: 'استادکار، انباردار و کنترل تولید روزانه',
  },
  {
    id: 'whatsapp_board',
    title: 'خلاصه اجرایی کوتاه (آماده ارسال واتساپ)',
    shortDesc: 'متن فشرده، شفاف و عدددار برای گزارش هفتگی به شرکا یا حسابدار',
    audience: 'ارسال سریع در واتساپ، تلگرام یا پیام‌رسان',
  },
];

/**
 * 100% Local, Deterministic, Rule-Based Persian Strategic Report Engine.
 * Consumes pre-computed outputs of costEngine, monteCarloEngine, sensitivityEngine & forecastEngine.
 */
export function generateStrategicTextReport(
  data: WorkshopData,
  summary: ComputedWorkshopSummary,
  monteCarlo: MonteCarloResult,
  tornado: TornadoDriver[],
  forecast: ForecastMonthPoint[],
  options: StrategicReportOptions
): GeneratedStrategicReport {
  const { currencyUnit, usePersianDigits } = data.settings;
  const fmt = (v: number, compact = true) => formatCurrency(v, currencyUnit, usePersianDigits, compact);
  const pct = (v: number, dec = 1) => formatPercent(v, usePersianDigits, dec);
  const num = (v: number, dec = 0) => formatNumber(v, { decimals: dec, usePersian: usePersianDigits });
  const dig = (v: string | number) => formatDigits(v, usePersianDigits);

  const isPractical = options.tone === 'practical';
  const stress = computeCashflowStressTimeline(data, summary);

  // Derived quantitative signals from costEngine + monteCarloEngine
  const realToNominalPct =
    summary.nominalMonthlyProfit > 0
      ? (summary.realSafeOwnerDraw / summary.nominalMonthlyProfit) * 100
      : 0;
  const inflationErosionPct =
    summary.nominalMonthlyProfit > 0
      ? (summary.inventoryReplacementReserve / summary.nominalMonthlyProfit) * 100
      : 100;

  const sortedByOven = [...summary.recipeMetrics].sort((a, b) => b.profitPerOvenHour - a.profitPerOvenHour);
  const topOven = sortedByOven[0];
  const bottomOven = sortedByOven[sortedByOven.length - 1];

  const stars = summary.recipeMetrics.filter((r) => r.quadrant === 'star');
  const plowhorses = summary.recipeMetrics.filter((r) => r.quadrant === 'plowhorse');
  const puzzles = summary.recipeMetrics.filter((r) => r.quadrant === 'puzzle');
  const dogs = summary.recipeMetrics.filter((r) => r.quadrant === 'dog');

  const unionIssues = summary.recipeMetrics.filter(
    (r) => r.unionCeilingStatus === 'exceeded' || r.unionCeilingStatus === 'squeezed'
  );
  const snappChannel = summary.channelSummary.find((c) => c.channel === 'snappfood');
  const storeChannel = summary.channelSummary.find((c) => c.channel === 'storefront');
  const b2bChannel = summary.channelSummary.find((c) => c.channel === 'cafeB2B');

  const topPareto = summary.paretoIngredients.slice(0, 3);
  const topParetoShare = topPareto.reduce((acc, p) => acc + p.sharePct, 0);
  const topDriver = tornado[0];
  const secondDriver = tornado[1];

  const peakMonth = [...forecast].sort((a, b) => b.profitBase - a.profitBase)[0];
  const slumpMonth = [...forecast].sort((a, b) => a.profitBase - b.profitBase)[0];

  const openIssuedChecks = data.checks.filter((c) => c.type === 'issued' && c.status !== 'پاس‌شده');
  const payableChecksCount = openIssuedChecks.length;
  const payableChecksTotal = openIssuedChecks.reduce((acc, c) => acc + c.amount, 0);

  // Overall Verdict Rule Tree
  let overallStatus: 'healthy' | 'warning' | 'critical' = 'healthy';
  let overallVerdictLabel = 'وضعیت پایدار و سودآور';
  if (
    summary.realSafeOwnerDraw <= 0 ||
    monteCarlo.probabilityOfProfitPct < 75 ||
    stress.dangerDays.length > 0 ||
    monteCarlo.checkDefaultRiskPct >= 15
  ) {
    overallStatus = 'critical';
    overallVerdictLabel = 'هشدار فوری: ریسک سرمایه یا نقدینگی';
  } else if (
    summary.healthScore < 72 ||
    inflationErosionPct > 28 ||
    monteCarlo.probabilityOfProfitPct < 90 ||
    summary.wasteBreakdown.invisibleVarianceCost > 3_000_000
  ) {
    overallStatus = 'warning';
    overallVerdictLabel = 'سودآور اما نیازمند اصلاح هدفمند';
  }

  // Executive one-liner
  const executiveSummaryLine =
    overallStatus === 'critical'
      ? isPractical
        ? `کارگاه «${data.settings.workshopName}» در فروش ماهانه ${fmt(summary.totalMonthlyRevenue)}، درگیر فشار نقدینگی یا فرسایش تورمی است و قبل از هر برداشت باید نشتی‌ها و چک‌های پیش‌رو کنترل شوند.`
        : `بر پایه محاسبات قطعی موتور بهایابی و شبیه‌ساز مونت‌کارلو، مجموعه «${data.settings.workshopName}» با وجود فروش ${fmt(summary.totalMonthlyRevenue)} در آستانه ریسک نقدینگی یا فرسایش سرمایه در گردش قرار دارد و نیازمند مداخله فوری مدیریتی است.`
      : overallStatus === 'warning'
      ? isPractical
        ? `کارگاه «${data.settings.workshopName}» با احتمال سوددهی ${pct(monteCarlo.probabilityOfProfitPct)} در مسیر سود است، اما با مهار پرت انبار و اصلاح نرخ چند قلم کلیدی می‌تواند برداشت واقعی ماهانه را از ${fmt(summary.realSafeOwnerDraw)} جهش دهد.`
        : `عملکرد مالی «${data.settings.workshopName}» با امتیاز سلامت ${dig(summary.healthScore)} از ۱۰۰ و احتمال سوددهی ${pct(monteCarlo.probabilityOfProfitPct)} مثبت ارزیابی می‌شود؛ با این حال شکاف حاشیه سود و نشتی‌های عملیاتی بخشی از سود واقعی را تضعیف کرده‌اند.`
      : isPractical
      ? `تراز مالی کارگاه «${data.settings.workshopName}» محکم است: از ${fmt(summary.totalMonthlyRevenue)} فروش ماهانه، ${fmt(summary.realSafeOwnerDraw)} سود واقعی و بی‌خطر برای برداشت دارید و احتمال سوددهی ماه بعد ${pct(monteCarlo.probabilityOfProfitPct)} است.`
      : `ساختار مالی «${data.settings.workshopName}» در وضعیت تراز و باثبات قرار دارد؛ سود واقعی قابل برداشت معادل ${fmt(summary.realSafeOwnerDraw)} (${pct(realToNominalPct, 0)} از سود اسمی) و احتمال تداوم سوددهی در آزمون مونت‌کارلو ${pct(monteCarlo.probabilityOfProfitPct)} برآورد شده است.`;

  // ---------------------------------------------------------------------------
  // Modular Rule-Based Sections
  // ---------------------------------------------------------------------------

  const buildProfitabilitySection = (): StrategicReportSection => {
    const firedRules: string[] = [];
    const paragraphs: string[] = [];
    const bullets: string[] = [];

    const severity: StrategicReportSection['severity'] =
      summary.realSafeOwnerDraw <= 0
        ? 'critical'
        : inflationErosionPct > 28 || summary.blendedNetMarginPct < data.settings.targetNetMarginPct - 8
        ? 'warning'
        : 'healthy';

    firedRules.push(`نسبت سود واقعی به اسمی: ${pct(realToNominalPct, 0)}`);
    firedRules.push(`ذخیره جایگزینی تورم انبار: ${fmt(summary.inventoryReplacementReserve)}`);
    firedRules.push(`نقطه سربه‌سر: روز ${dig(summary.breakEvenDayOfMonth)} ماه`);

    if (summary.realSafeOwnerDraw <= 0) {
      paragraphs.push(
        isPractical
          ? `هشدار جدی سرمایه: روی کاغذ ممکن است ${fmt(summary.nominalMonthlyProfit)} سود ببینید، اما چون تورم ماهانه مواد اولیه (${pct(summary.weightedMaterialInflationPct)}) برای خرید مجدد کره، خامه و پسته ماه بعد به ${fmt(summary.inventoryReplacementReserve)} نیاز دارد و ${fmt(summary.monthlySlumpReserve)} هم باید برای ماه‌های رکود کنار گذاشته شود، عملاً سود واقعی قابل برداشت شما صفر یا منفی است.`
          : `بر اساس مدل تفکیک سود اسمی از سود واقعی (تورم‌زدایی‌شده)، سود حسابداری ${fmt(summary.nominalMonthlyProfit)} پاسخگوی ذخیره جایگزینی انبار (${fmt(summary.inventoryReplacementReserve)} با تورم وزنی ${pct(summary.weightedMaterialInflationPct)} ماهانه) و ذخیره سپر رکود فصلی (${fmt(summary.monthlySlumpReserve)}) نیست؛ بنابراین برداشت نقدی مدیر در این مقطع موجب کوچک‌شدن ظرفیت تولید ماه آینده خواهد شد.`
      );
    } else if (inflationErosionPct > 25) {
      paragraphs.push(
        isPractical
          ? `مراقب توهم سود روی کاغذ باشید: از ${fmt(summary.nominalMonthlyProfit)} سود اسمی ماهانه، حدود ${pct(inflationErosionPct, 0)} آن یعنی ${fmt(summary.inventoryReplacementReserve)} صرفاً باید در حساب کارگاه بماند تا ماه بعد بتوانید همین مقدار کره و پسته را دوباره بخرید. پس سقف برداشت امن شما دقیقاً ${fmt(summary.realSafeOwnerDraw)} است.`
          : `از مجموع ${fmt(summary.totalMonthlyRevenue)} درآمد ماهانه، سود اسمی معادل ${fmt(summary.nominalMonthlyProfit)} (حاشیه خالص ${pct(summary.blendedNetMarginPct)}) محقق شده است. با لحاظ تورم وزنی مواد اولیه (${pct(summary.weightedMaterialInflationPct)} در ماه)، مبلغ ${fmt(summary.inventoryReplacementReserve)} به‌عنوان ذخیره جایگزینی انبار و ${fmt(summary.monthlySlumpReserve)} برای سپر رکود کسر گردیده و سود واقعی قابل برداشت مدیر ${fmt(summary.realSafeOwnerDraw)} تعیین می‌شود.`
      );
    } else {
      paragraphs.push(
        isPractical
          ? `تراز سود واقعی کارگاه در وضعیت خوبی است. از فروش ماهانه ${fmt(summary.totalMonthlyRevenue)} (معادل ${num(summary.totalMonthlySalesKg)} کیلوگرم)، پس از کنار گذاشتن ${fmt(summary.inventoryReplacementReserve)} برای گرانی ماه بعد و ${fmt(summary.monthlySlumpReserve)} برای صندوق رکود، مبلغ ${fmt(summary.realSafeOwnerDraw)} سود واقعی و سالم قابل برداشت دارید.`
          : `عملکرد سودآوری مجموعه با فروش ماهانه ${fmt(summary.totalMonthlyRevenue)} و حاشیه سود خالص ترکیبی ${pct(summary.blendedNetMarginPct)} نشان‌دهنده پوشش مؤثر تورم مواد اولیه است. پس از تخصیص ${fmt(summary.inventoryReplacementReserve)} ذخیره جایگزینی موجودی و ${fmt(summary.monthlySlumpReserve)} سپر رکود، سود واقعی قابل برداشت معادل ${fmt(summary.realSafeOwnerDraw)} (${pct(realToNominalPct, 0)} سود اسمی) است.`
      );
    }

    const breakEvenTone =
      summary.breakEvenDayOfMonth <= 15
        ? 'حاشیه ایمنی فروش بسیار مناسبی دارید و نیمه دوم ماه کاملاً سودساز است.'
        : summary.breakEvenDayOfMonth <= 21
        ? 'نقطه سربه‌سر در محدوده متعادل قرار دارد، اما افت فروش بیش از ۱۵٪ می‌تواند حاشیه سود را فشرده کند.'
        : 'نقطه سربه‌سر به پایان ماه نزدیک است و کارگاه در برابر چند روز تعطیلی یا رکود آسیب‌پذیر خواهد بود.';

    paragraphs.push(
      `نقطه سربه‌سر ماهانه شما ${fmt(summary.breakEvenRevenue)} (معادل ${num(summary.breakEvenKg)} کیلوگرم فروش یا روز ${dig(summary.breakEvenDayOfMonth)} ماه) است؛ یعنی برای پوشش کامل هزینه‌های ثابت و حقوق، هر روز کاری باید دست‌کم ${fmt(summary.dailyBreakEvenRevenue)} فروش ثبت شود. ${breakEvenTone}`
    );

    bullets.push(`کل هزینه‌های ثابت و حقوق قانون کار: ${fmt(summary.totalMonthlyOverheadAndPayroll)} (شامل ${fmt(summary.totalMonthlyLaborLawAccruals)} ذخیره ۲۳٪ بیمه کارفرما، عیدی و سنوات).`);
    bullets.push(`شکاف حاشیه سود خالص فعلی (${pct(summary.blendedNetMarginPct)}) با هدف تنظیم‌شده کارگاه (${pct(data.settings.targetNetMarginPct, 0)}): ${summary.blendedNetMarginPct >= data.settings.targetNetMarginPct ? 'هدف محقق شده است.' : `${pct(data.settings.targetNetMarginPct - summary.blendedNetMarginPct)} فاصله تا هدف.`}`);

    return {
      id: 'profitability',
      heading: '۱. تحلیل سود واقعی، فرسایش تورمی و نقطه سربه‌سر (خروجی costEngine)',
      severity,
      paragraphs,
      bullets,
      firedRules,
    };
  };

  const buildMonteCarloRiskSection = (): StrategicReportSection => {
    const firedRules: string[] = [];
    const paragraphs: string[] = [];
    const bullets: string[] = [];

    const severity: StrategicReportSection['severity'] =
      monteCarlo.probabilityOfProfitPct < 75 || monteCarlo.checkDefaultRiskPct >= 15 || stress.dangerDays.length > 0
        ? 'critical'
        : monteCarlo.probabilityOfProfitPct < 90 || monteCarlo.profitAtRisk95 <= 0 || monteCarlo.checkDefaultRiskPct >= 5
        ? 'warning'
        : 'healthy';

    firedRules.push(`احتمال سوددهی مونت‌کارلو (${dig(monteCarlo.iterations)} سناریو): ${pct(monteCarlo.probabilityOfProfitPct)}`);
    firedRules.push(`حد ریسک VaR 95% (بدترین ۵٪): ${fmt(monteCarlo.profitAtRisk95)}`);
    firedRules.push(`ریسک کسری چک: ${pct(monteCarlo.checkDefaultRiskPct)}`);
    if (topDriver) {
      firedRules.push(`حساس‌ترین اهرم تورنادو: ${topDriver.label}`);
    }

    const mcVerdict =
      monteCarlo.probabilityOfProfitPct >= 95
        ? isPractical
          ? `خیال‌تان از بابت تداوم سوددهی ماه آینده تا حد زیادی راحت است: در ${pct(monteCarlo.probabilityOfProfitPct)} از ${dig(monteCarlo.iterations)} حالت شبیه‌سازی‌شده بازار، کارگاه شما سودده باقی می‌ماند.`
          : `نتایج شبیه‌سازی مونت‌کارلو (${dig(monteCarlo.iterations)} سناریوی تصادفی همبسته) نشان‌دهنده استحکام بالای مدل درآمدی با احتمال سوددهی ${pct(monteCarlo.probabilityOfProfitPct)} در ماه آینده است.`
        : monteCarlo.probabilityOfProfitPct >= 80
        ? isPractical
          ? `احتمال سوددهی ماه بعد ${pct(monteCarlo.probabilityOfProfitPct)} است؛ یعنی مدل کارگاه سودآور است اما در حدود ${pct(100 - monteCarlo.probabilityOfProfitPct)} مواقع اگر فروش کم شود و هم‌زمان مواد گران شود، وارد زیان می‌شوید.`
          : `آزمون استرس مونت‌کارلو احتمال سوددهی ${pct(monteCarlo.probabilityOfProfitPct)} را نشان می‌دهد که در سطح متوسط-مطلوب قرار دارد، اما نوسان هم‌زمان تقاضا و بهای مواد اولیه می‌تواند در ${pct(100 - monteCarlo.probabilityOfProfitPct)} سناریوها منجر به زیان عملیاتی شود.`
        : isPractical
        ? `زنگ خطر ریسک: احتمال سوددهی ماه بعد تنها ${pct(monteCarlo.probabilityOfProfitPct)} است. کوچک‌ترین جهش در قیمت کره و پسته یا چند روز خلوت بازار می‌تواند کل سود ماه را از بین ببرد.`
        : `شبیه‌سازی مونت‌کارلو وضعیت شکننده را گزارش می‌کند؛ با احتمال سوددهی ${pct(monteCarlo.probabilityOfProfitPct)}، حاشیه اطمینان کارگاه در برابر نوسانات بازار ایران ناکافی است.`;

    paragraphs.push(mcVerdict);

    const varSentence =
      monteCarlo.profitAtRisk95 > 0
        ? `حتی در بدترین ۵٪ سناریوهای بازار (شاخص VaR 95%)، سود ماهانه شما مثبت و در سطح ${fmt(monteCarlo.profitAtRisk95)} باقی می‌ماند؛ در حالی که میانه سود محتمل (P50) برابر ${fmt(monteCarlo.medianProfit)} و حالت خوش‌بینانه (P95) تا ${fmt(monteCarlo.bestCase95)} برآورد می‌شود.`
        : `نکته حساس در بدترین ۵٪ سناریوها (VaR 95%): در صورت بروز هم‌زمان رکود فروش و جهش قیمت مواد، کارگاه می‌تواند تا ${fmt(monteCarlo.profitAtRisk95)} زیان ماهانه تجربه کند؛ در حالی که میانه محتمل (P50) برابر ${fmt(monteCarlo.medianProfit)} است. بنابراین نگهداری صندوق نقدینگی اضطراری حیاتی است.`;

    paragraphs.push(varSentence);

    const checkSentence =
      stress.dangerDays.length > 0
        ? `هشدار چک صیادی: در تست استرس ۳۵ روزه، ${dig(stress.dangerDays.length)} روز با کسری نقدینگی شناسایی شده و حداقل موجودی نقد به ${fmt(stress.minBalance)} می‌رسد (جمع چک‌های پرداختی باز: ${fmt(payableChecksTotal)} در ${dig(payableChecksCount)} فقره). ریسک کسری چک در مونت‌کارلو ${pct(monteCarlo.checkDefaultRiskPct)} است.`
        : `وضعیت چک‌های صیادی در افق ۳۵ روزه تحت کنترل است: حداقل موجودی نقد پس از پاس‌شدن ${dig(payableChecksCount)} فقره چک پرداختی (به جمع ${fmt(payableChecksTotal)}) برابر ${fmt(stress.minBalance)} بوده و ریسک کسری چک در مونت‌کارلو فقط ${pct(monteCarlo.checkDefaultRiskPct)} است.`;

    paragraphs.push(checkSentence);

    if (topDriver) {
      bullets.push(`حساس‌ترین متغیر کارگاه در تحلیل تورنادو (±۱۰٪): «${topDriver.label}» با دامنه اثر ${fmt(topDriver.totalSpread)} در ماه.${secondDriver ? ` متغیر دوم: «${secondDriver.label}» (${fmt(secondDriver.totalSpread)}).` : ''}`);
    }
    if (peakMonth && slumpMonth) {
      bullets.push(`تقویم فصلی ۱۲ ماهه شمسی: اوج سودآوری در ماه «${peakMonth.shamsiName}» (${fmt(peakMonth.profitBase)}) و کمترین سود در «${slumpMonth.shamsiName}» (${fmt(slumpMonth.profitBase)}) پیش‌بینی می‌شود.`);
    }

    return {
      id: 'monte_carlo_risk',
      heading: '۲. تحلیل ریسک مونت‌کارلو، چک‌های صیادی و حساسیت بازار (خروجی monteCarloEngine)',
      severity,
      paragraphs,
      bullets,
      firedRules,
    };
  };

  const buildMenuAndPricingSection = (): StrategicReportSection => {
    const firedRules: string[] = [];
    const paragraphs: string[] = [];
    const bullets: string[] = [];

    const snappGap =
      snappChannel && storeChannel && snappChannel.kg > 0
        ? storeChannel.marginPct - snappChannel.marginPct
        : 0;

    const severity: StrategicReportSection['severity'] =
      unionIssues.length >= 2 || snappGap > 10 || dogs.length >= 2
        ? 'warning'
        : 'healthy';

    firedRules.push(`ترکیب ماتریس منو: ${dig(stars.length)} ستاره، ${dig(plowhorses.length)} اسب کاری، ${dig(puzzles.length)} معما، ${dig(dogs.length)} سگ`);
    if (unionIssues.length > 0) {
      firedRules.push(`فشار سقف نرخ اتحادیه: ${dig(unionIssues.length)} محصول`);
    }
    if (snappGap > 0) {
      firedRules.push(`شکاف حاشیه اسنپ‌فود و ویترین: ${pct(snappGap)}`);
    }

    const starNames = stars.map((s) => `«${s.name}»`).join('، ') || 'موردی ثبت نشده';
    const plowNames = plowhorses.map((p) => `«${p.name}»`).join('، ');
    const puzzleNames = puzzles.map((p) => `«${p.name}»`).join('، ');
    const dogNames = dogs.map((d) => `«${d.name}»`).join('، ');

    paragraphs.push(
      isPractical
        ? `موتور سودسازی ویترین شما روی محصولات ستاره (${starNames}) می‌چرخد که هم مشتری‌پسند هستند و هم سود بالایی می‌سازند.${plowNames ? ` در مقابل، آیتم‌های پرفروش اما کم‌حاشیه (اسب‌های کاری: ${plowNames}) حجم زیادی از کار کارگاه را می‌گیرند و نیاز به بازنگری قیمت یا کنترل وزن جعبه دارند.` : ''}${puzzleNames ? ` محصولات «معما» (${puzzleNames}) سود عالی دارند اما کم فروخته می‌شوند؛ جایگاه آن‌ها را در ردیف اول ویترین و استوری اینستاگرام پررنگ‌تر کنید.` : ''}`
        : `در ماتریس مهندسی منو، اقلام «ستاره» (${starNames}) ستون اصلی سودآوری و نقدینگی هستند.${plowNames ? ` اقلام «اسب کاری» (${plowNames}) با تقاضای بالا ولی حاشیه سود پایین‌تر از میانگین، نیازمند مهندسی قیمت یا عرضه در قالب بسته‌های ترکیبی‌اند.` : ''}${dogNames ? ` همچنین اقلام «سگ» (${dogNames}) با سهم فروش و سود پایین باید از نظر حذف یا بازطراحی فرمولاسیون بازبینی شوند.` : ''}`
    );

    if (unionIssues.length > 0) {
      const unionList = unionIssues.map((u) => `«${u.name}»`).join('، ');
      paragraphs.push(
        `رادار نرخ مصوب اتحادیه قنادان نشان می‌دهد ${dig(unionIssues.length)} محصول (${unionList}) در ناحیه فشار سود یا عبور از سقف مصوب قرار دارند. راهکار قانونی و مطمئن در بازار ایران، رعایت کامل نرخ مصوب در فروش فله و جبران سود از طریق هدایت تقاضا به «پک‌های میکس کادویی» و شیرینی‌های تخصصی بدون سقف قیمتی است.`
      );
    } else {
      paragraphs.push(
        'تمامی محصولات مشمول نرخ مصوب در محدوده منطبق با سقف اتحادیه قنادان قرار دارند و ریسک جریمه تعزیراتی مشاهده نمی‌شود.'
      );
    }

    if (snappChannel && storeChannel && snappChannel.kg > 0) {
      bullets.push(
        `کانال اسنپ‌فود/تپسی‌فود: حاشیه سود خالص ${pct(snappChannel.marginPct)} در مقایسه با ویترین (${pct(storeChannel.marginPct)}) — ${snappGap > 8 ? `افت ${pct(snappGap)} ناشی از کمیسیون ${pct(data.settings.defaultSnappfoodCommissionPct, 0)} و بسته‌بندی پیک؛ اعمال «قیمت محافظت‌شده اسنپ‌فود» ضروری است.` : 'اختلاف حاشیه سود تحت کنترل است.'}`
      );
    }
    if (b2bChannel && b2bChannel.kg > 0) {
      bullets.push(
        `کانال پخش کافه و هتل (B2B): فروش ماهانه ${fmt(b2bChannel.revenue)} با حاشیه سود خالص ${pct(b2bChannel.marginPct)} (${num(b2bChannel.kg)} کیلوگرم).`
      );
    }

    return {
      id: 'pricing_menu',
      heading: '۳. راهبرد مهندسی منو، کانال‌های فروش و سقف نرخ اتحادیه',
      severity,
      paragraphs,
      bullets,
      firedRules,
    };
  };

  const buildOperationsAndWasteSection = (): StrategicReportSection => {
    const firedRules: string[] = [];
    const paragraphs: string[] = [];
    const bullets: string[] = [];

    const totalWastePctOfRev =
      summary.totalMonthlyRevenue > 0
        ? (summary.wasteBreakdown.totalWasteCost / summary.totalMonthlyRevenue) * 100
        : 0;

    const severity: StrategicReportSection['severity'] =
      summary.wasteBreakdown.invisibleVarianceCost > 5_000_000 || summary.ovenUtilizationPct > 92
        ? 'critical'
        : summary.wasteBreakdown.invisibleVarianceCost > 2_000_000 || totalWastePctOfRev > 6
        ? 'warning'
        : 'healthy';

    firedRules.push(`نرخ اشغال فرها: ${pct(summary.ovenUtilizationPct, 0)}`);
    firedRules.push(`کل زیان ضایعات و پرت ۴بخشی: ${fmt(summary.wasteBreakdown.totalWasteCost)}`);
    firedRules.push(`سهم ۳ قلم اول پارتو از خرید مواد: ${pct(topParetoShare, 0)}`);

    if (topOven && bottomOven && topOven.recipeId !== bottomOven.recipeId) {
      const comparison =
        bottomOven.profitPerOvenHour > 0
          ? `حدود ${dig((topOven.profitPerOvenHour / bottomOven.profitPerOvenHour).toFixed(1))} برابر «${bottomOven.name}»`
          : `در حالی که «${bottomOven.name}» در هر ساعت فر سوددهی منفی یا نزدیک به صفر (${fmt(bottomOven.profitPerOvenHour)}) ثبت کرده است`;

      paragraphs.push(
        isPractical
          ? `در نظریه گلوگاه فر، ظرفیت فرهای شما الان ${pct(summary.ovenUtilizationPct, 0)} پر است (${num(summary.usedOvenHours)} از ${num(summary.monthlyOvenCapacityHours)} ساعت ماهانه). بیشترین پول را به ازای هر ساعت روشن‌بودن فر، «${topOven.name}» با ${fmt(topOven.profitPerOvenHour)} در ساعت می‌سازد (${comparison}). در روزهای شلوغ مثل پنجشنبه، یلدا و اسفند، سینی فر را نباید با آیتم‌های کم‌بازده پر کرد.`
          : `بررسی ظرفیت گلوگاه پخت نشان‌دهنده بهره‌برداری ${pct(summary.ovenUtilizationPct, 0)} از ظرفیت اسمی فر (${num(summary.usedOvenHours)} ساعت از ${num(summary.monthlyOvenCapacityHours)} ساعت) است. محصول «${topOven.name}» با سود خالص ${fmt(topOven.profitPerOvenHour)} به ازای هر ساعت فر در صدر جدول بهره‌وری قرار دارد (${comparison}).`
      );
    }

    if (summary.wasteBreakdown.invisibleVarianceCost > 2_000_000) {
      paragraphs.push(
        `هشدار نشتی انبار (پرت نامرئی): از کل ${fmt(summary.wasteBreakdown.totalWasteCost)} هزینه ضایعات ماهانه (${pct(totalWastePctOfRev)} از فروش کل)، مبلغ ${fmt(summary.wasteBreakdown.invisibleVarianceCost)} ناشی از اختلاف مصرف واقعی انبار با دستور پخت تئوری است. این رقم مستقیماً از سود واقعی قابل برداشت شما کم می‌شود و اغلب در وزن‌کشی چشمی کره، خامه و پسته رخ می‌دهد.`
      );
    } else {
      paragraphs.push(
        `کنترل ضایعات و پرت نامرئی در وضعیت قابل قبول است: مجموع ضایعات ۴بخشی برابر ${fmt(summary.wasteBreakdown.totalWasteCost)} (${pct(totalWastePctOfRev)} از فروش) و پرت نامرئی معادل ${fmt(summary.wasteBreakdown.invisibleVarianceCost)} است.`
      );
    }

    if (topPareto.length > 0) {
      const paretoNames = topPareto.map((p) => `${p.name} (${pct(p.sharePct, 0)})`).join('، ');
      bullets.push(`قاعده پارتو ۸۰/۲۰ انبار: تنها ۳ قلم ${paretoNames} در مجموع ${pct(topParetoShare, 0)} بودجه خرید مواد کارگاه را تشکیل می‌دهند؛ هر ۵٪ تخفیف نقدی روی این ۳ قلم سود ماهانه را به‌شکل ملموس بالا می‌برد.`);
    }
    bullets.push(`بار واقعی قانون کار ایران: از کل ${fmt(summary.totalMonthlyStaffCost)} هزینه پرسنل، مبلغ ${fmt(summary.totalMonthlyLaborLawAccruals)} مربوط به ۲۳٪ بیمه کارفرما و ذخیره ماهانه عیدی و سنوات است تا در اسفندماه شوک نقدینگی ایجاد نشود.`);

    return {
      id: 'operations_waste',
      heading: '۴. کارایی تولید، گلوگاه فر، پارتو انبار و مهار پرت نامرئی',
      severity,
      paragraphs,
      bullets,
      firedRules,
    };
  };

  // ---------------------------------------------------------------------------
  // 30-Day Prioritized Rule-Based Action Plan
  // ---------------------------------------------------------------------------
  const actionPlan: StrategicActionItem[] = [];

  if (summary.wasteBreakdown.invisibleVarianceCost > 2_000_000) {
    const recoverable = summary.wasteBreakdown.invisibleVarianceCost * 0.6;
    actionPlan.push({
      weekLabel: 'هفته ۱ (فوری)',
      priority: 'فوری',
      title: 'توقف نشتی پرت نامرئی انبار با کارت پخت و توزین روزانه',
      detail: 'پیمانه‌گذاری استاندارد برای مغز پسته، زعفران و توزین خروج روزانه کره از یخچال را با کارت پخت بدون قیمت (ستون ۳) در کارگاه اجرا کنید.',
      expectedImpact: `بازگشت حدود ${fmt(recoverable)} به سود واقعی ماهانه`,
    });
  }

  if (stress.dangerDays.length > 0 || monteCarlo.checkDefaultRiskPct >= 8) {
    actionPlan.push({
      weekLabel: 'هفته ۱ (فوری)',
      priority: 'فوری',
      title: 'تأمین نقدینگی سررسید چک‌های صیادی پیش‌رو',
      detail: 'پیگیری وصول چک‌های دریافتی کافه‌ها ۴۸ ساعت پیش از سررسید، توقف دپوی غیرضروری مواد و تبدیل فروش‌های اعتباری به نقدی تا عبور از روزهای فشار نقدینگی.',
      expectedImpact: `کاهش ریسک کسری چک از ${pct(monteCarlo.checkDefaultRiskPct)} به زیر ۵٪`,
    });
  }

  if (snappChannel && storeChannel && snappChannel.kg > 0 && storeChannel.marginPct - snappChannel.marginPct > 6) {
    const monthlyGain = snappChannel.revenue * 0.08;
    actionPlan.push({
      weekLabel: 'هفته ۲',
      priority: 'اولویت بالا',
      title: 'اعمال نرخ محافظت‌شده در پنل اسنپ‌فود و تپسی‌فود',
      detail: 'نرخ فروش آنلاین هر شیرینی را مطابق جدول «دفاع از سود در اسنپ‌فود» (ستون ۴) به‌روزرسانی کنید تا کمیسیون و جعبه پیک از سود شما کسر نشود.',
      expectedImpact: `ترمیم حدود ${fmt(monthlyGain)} سود ماهانه کانال آنلاین`,
    });
  }

  if (unionIssues.length > 0) {
    actionPlan.push({
      weekLabel: 'هفته ۲ تا ۳',
      priority: 'اولویت بالا',
      title: 'حفظ حاشیه سود قانونی با «پک میکس کادویی» در برابر سقف اتحادیه',
      detail: `فروش تکی ${unionIssues.map((u) => u.name).slice(0, 2).join(' و ')} را کاملاً در سقف اتحادیه نگه دارید و هم‌زمان پک‌های کادویی میکس با ترکیب شیرینی‌های تخصصی را در ویترین پررنگ کنید.`,
      expectedImpact: 'حذف ریسک تعزیراتی + حفظ ۳ تا ۵ درصد حاشیه سود منو',
    });
  }

  if (topPareto.length > 0) {
    const paretoSavings = topPareto.reduce((s, p) => s + p.monthlySpend, 0) * 0.04;
    actionPlan.push({
      weekLabel: 'هفته ۳ تا ۴',
      priority: 'بهینه‌سازی',
      title: `چانه‌زنی خرید نقدی یا دپوی هوشمند روی ۳ قلم اول پارتو (${topPareto.map((p) => p.name).join('، ')})`,
      detail: 'با استفاده از محاسبه‌گر «نقد بخرم یا چکی ۶۰ روزه؟» (ستون ۲)، روی ۳ ماده اولیه اصلی که بخش عمده هزینه انبار را می‌سازند تخفیف نقدی بگیرید.',
      expectedImpact: `صرفه‌جویی برآوردی ${fmt(paretoSavings)} در ماه`,
    });
  }

  if (topOven) {
    actionPlan.push({
      weekLabel: 'هفته ۴ (مستمر)',
      priority: 'بهینه‌سازی',
      title: `اولویت‌دهی ظرفیت فر و ویترین به «${topOven.name}» در پیک فروش`,
      detail: `در روزهای پنجشنبه، جمعه و مناسبت‌ها (به‌ویژه پیش از «${peakMonth?.shamsiName ?? 'اسفند'}»)، سهم تولید آیتم‌های صدر جدول ساعت فر را ۱۵ تا ۲۰ درصد افزایش دهید.`,
      expectedImpact: `رشد بهره‌وری هر ساعت فر تا ${fmt(topOven.profitPerOvenHour)}`,
    });
  }

  // Select sections by template
  const allSections = [
    buildProfitabilitySection(),
    buildMonteCarloRiskSection(),
    buildMenuAndPricingSection(),
    buildOperationsAndWasteSection(),
  ];

  let sections: StrategicReportSection[] = allSections;
  const meta = STRATEGIC_REPORT_TEMPLATES.find((t) => t.id === options.templateId) ?? STRATEGIC_REPORT_TEMPLATES[0];

  if (options.templateId === 'risk_liquidity') {
    sections = [allSections[1], allSections[0]];
  } else if (options.templateId === 'pricing_menu') {
    sections = [allSections[2], allSections[0]];
  } else if (options.templateId === 'operations_waste') {
    sections = [allSections[3], allSections[0]];
  } else if (options.templateId === 'whatsapp_board') {
    sections = [
      {
        id: 'whatsapp_digest',
        heading: 'خلاصه مدیریتی آماده ارسال به شرکا / واتساپ',
        severity: overallStatus,
        paragraphs: [
          `گزارش وضعیت مالی و ریسک «${data.settings.workshopName}» (مدیریت: ${data.settings.managerName}) — تولیدشده ۱۰۰٪ قطعی توسط شیرین‌تراز OS:`,
        ],
        bullets: [
          `فروش ماهانه: ${fmt(summary.totalMonthlyRevenue)} (${num(summary.totalMonthlySalesKg)} کیلو) | حاشیه سود خالص: ${pct(summary.blendedNetMarginPct)}`,
          `سود اسمی: ${fmt(summary.nominalMonthlyProfit)} | ذخیره تورم انبار: ${fmt(summary.inventoryReplacementReserve)} | سپر رکود: ${fmt(summary.monthlySlumpReserve)}`,
          `سود واقعی قابل برداشت مدیر: ${fmt(summary.realSafeOwnerDraw)} (امتیاز سلامت: ${dig(summary.healthScore)} از ۱۰۰)`,
          `آزمون مونت‌کارلو (${dig(monteCarlo.iterations)} سناریو): احتمال سوددهی ${pct(monteCarlo.probabilityOfProfitPct)} | میانه P50: ${fmt(monteCarlo.medianProfit)} | بدترین ۵٪ (VaR 95%): ${fmt(monteCarlo.profitAtRisk95)}`,
          `نقطه سربه‌سر: ${fmt(summary.breakEvenRevenue)} (روز ${dig(summary.breakEvenDayOfMonth)} ماه) | ریسک کسری چک: ${pct(monteCarlo.checkDefaultRiskPct)}`,
          topOven ? `پول‌سازترین آیتم فر: «${topOven.name}» (${fmt(topOven.profitPerOvenHour)} در ساعت فر)` : 'آیتم‌های منو بررسی شدند.',
          summary.wasteBreakdown.invisibleVarianceCost > 0
            ? `زیان پرت نامرئی انبار: ${fmt(summary.wasteBreakdown.invisibleVarianceCost)} در ماه`
            : 'پرت نامرئی انبار صفر ثبت شده است.',
          topDriver ? `حساس‌ترین اهرم سود: ${topDriver.label} (دامنه اثر ±۱۰٪: ${fmt(topDriver.totalSpread)})` : '',
        ].filter(Boolean),
        firedRules: [
          `امتیاز سلامت: ${dig(summary.healthScore)}/۱۰۰`,
          `احتمال سوددهی مونت‌کارلو: ${pct(monteCarlo.probabilityOfProfitPct)}`,
          `سود واقعی قابل برداشت: ${fmt(summary.realSafeOwnerDraw)}`,
        ],
      },
    ];
  }

  const firedRuleCount = sections.reduce((sum, s) => sum + s.firedRules.length, 0);

  const headlineMetrics: GeneratedStrategicReport['headlineMetrics'] = [
    {
      label: 'سود واقعی قابل برداشت',
      value: fmt(summary.realSafeOwnerDraw),
      subtext: `از ${fmt(summary.nominalMonthlyProfit)} سود اسمی`,
      tone: summary.realSafeOwnerDraw > 0 ? 'positive' : 'danger',
    },
    {
      label: 'احتمال سوددهی (مونت‌کارلو)',
      value: pct(monteCarlo.probabilityOfProfitPct),
      subtext: `بر پایه ${dig(monteCarlo.iterations)} سناریوی بازار`,
      tone: monteCarlo.probabilityOfProfitPct >= 90 ? 'indigo' : monteCarlo.probabilityOfProfitPct >= 75 ? 'warning' : 'danger',
    },
    {
      label: 'بدترین ۵٪ بازار (VaR 95%)',
      value: fmt(monteCarlo.profitAtRisk95),
      subtext: `میانه محتمل P50: ${fmt(monteCarlo.medianProfit)}`,
      tone: monteCarlo.profitAtRisk95 > 0 ? 'neutral' : 'warning',
    },
    {
      label: 'ریسک کسری چک صیادی',
      value: pct(monteCarlo.checkDefaultRiskPct),
      subtext: `کف نقدینگی ۳۵ روزه: ${fmt(stress.minBalance)}`,
      tone: monteCarlo.checkDefaultRiskPct < 5 && stress.dangerDays.length === 0 ? 'positive' : monteCarlo.checkDefaultRiskPct < 15 ? 'warning' : 'danger',
    },
  ];

  // Build crisp plain-text version for 1-click Copy / .txt Download
  const textLines: string[] = [
    `==================================================`,
    `${meta.title} — ${data.settings.workshopName} (مدیریت: ${data.settings.managerName})`,
    `وضعیت کلی: ${overallVerdictLabel} | امتیاز سلامت: ${dig(summary.healthScore)} از ۱۰۰`,
    `موتور تولید گزارش: ۱۰۰٪ محلی و مبتنی بر قواعد (costEngine + monteCarloEngine)`,
    `==================================================`,
    ``,
    `چکیده مدیریتی:`,
    executiveSummaryLine,
    ``,
  ];

  for (const sec of sections) {
    textLines.push(`■ ${sec.heading}`);
    for (const p of sec.paragraphs) {
      textLines.push(p);
    }
    for (const b of sec.bullets) {
      textLines.push(`  • ${b}`);
    }
    textLines.push('');
  }

  if (options.templateId !== 'whatsapp_board' && actionPlan.length > 0) {
    textLines.push(`■ نقشه اقدام ۳۰ روزه (اولویت‌بندی‌شده بر اساس اثر مالی)`);
    actionPlan.forEach((item, idx) => {
      textLines.push(`${dig(idx + 1)}. [${item.weekLabel} - ${item.priority}] ${item.title}`);
      textLines.push(`   شرح اقدام: ${item.detail}`);
      textLines.push(`   اثر مالی برآوردی: ${item.expectedImpact}`);
    });
    textLines.push('');
  } else if (options.templateId === 'whatsapp_board' && actionPlan.length > 0) {
    textLines.push(`■ ۳ اقدام اولویت‌دار این هفته:`);
    actionPlan.slice(0, 3).forEach((item, idx) => {
      textLines.push(`${dig(idx + 1)}) ${item.title} ← ${item.expectedImpact}`);
    });
    textLines.push('');
  }

  return {
    templateId: options.templateId,
    tone: options.tone,
    title: meta.title,
    subtitle: meta.shortDesc,
    workshopName: data.settings.workshopName,
    managerName: data.settings.managerName,
    overallStatus,
    overallVerdictLabel,
    executiveSummaryLine,
    headlineMetrics,
    sections,
    actionPlan,
    firedRuleCount,
    plainText: textLines.join('\n').trim(),
  };
}
