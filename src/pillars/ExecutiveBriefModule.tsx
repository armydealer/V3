import React, { useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  CalendarClock,
  Check,
  CheckCircle2,
  ClipboardCopy,
  FileText,
  Flame,
  ShieldCheck,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { useWorkshop } from '../store/WorkshopContext';
import { computeCashflowStressTimeline } from '../utils/costEngine';
import { generateStrategicTextReport } from '../utils/strategicReportEngine';
import { formatCurrency, formatDigits, formatNumber, formatPercent } from '../utils/formatters';
import { PrivacyValue } from '../components/PrivacyValue';
import { HelpTip } from '../components/HelpTip';

interface ExecutiveBriefModuleProps {
  onOpenStrategicReport: () => void;
  onOpenFullCockpit: () => void;
}

/**
 * Ultra-Concise Results-Only Module («خلاصه فوری نتایج»).
 * Zero forms, zero tables, zero clutter — strictly the critical decision numbers in one screen.
 */
export const ExecutiveBriefModule: React.FC<ExecutiveBriefModuleProps> = ({
  onOpenStrategicReport,
  onOpenFullCockpit,
}) => {
  const { data, summary, monteCarlo, tornado, forecast, notify } = useWorkshop();
  const { currencyUnit, usePersianDigits } = data.settings;
  const fmt = (v: number) => formatCurrency(v, currencyUnit, usePersianDigits, true);
  const pct = (v: number, d = 1) => formatPercent(v, usePersianDigits, d);
  const dig = (v: string | number) => formatDigits(v, usePersianDigits);

  const [copied, setCopied] = useState(false);

  const stress = useMemo(() => computeCashflowStressTimeline(data, summary), [data, summary]);

  const briefReport = useMemo(
    () =>
      generateStrategicTextReport(data, summary, monteCarlo, tornado, forecast, {
        templateId: 'whatsapp_board',
        tone: 'practical',
      }),
    [data, summary, monteCarlo, tornado, forecast]
  );

  const sortedByOven = useMemo(
    () => [...summary.recipeMetrics].sort((a, b) => b.profitPerOvenHour - a.profitPerOvenHour),
    [summary.recipeMetrics]
  );
  const bestOven = sortedByOven[0];
  const worstOven = sortedByOven[sortedByOven.length - 1];
  const topDriver = tornado[0];
  const peakMonth = useMemo(
    () => [...forecast].sort((a, b) => b.profitBase - a.profitBase)[0],
    [forecast]
  );

  const nextPayableCheck = useMemo(() => {
    return [...data.checks]
      .filter((c) => c.type === 'issued' && c.status !== 'پاس‌شده')
      .sort((a, b) => a.daysFromToday - b.daysFromToday)[0];
  }, [data.checks]);

  const handleCopyBrief = async () => {
    try {
      await navigator.clipboard.writeText(briefReport.plainText);
      setCopied(true);
      notify('خلاصه نتایج فوری برای ارسال در واتساپ کپی شد.', 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      notify('کپی خودکار مجاز نبود؛ از بخش گزارش‌ساز متنی استفاده کنید.', 'warning');
    }
  };

  const statusTone =
    briefReport.overallStatus === 'critical'
      ? {
          wrap: 'bg-[#FEF2F2] border-[#F5C2B8]',
          badge: 'bg-[#C84B31] text-white',
          text: 'text-[#991B1B]',
        }
      : briefReport.overallStatus === 'warning'
      ? {
          wrap: 'bg-[#FFFBEB] border-[#F5D08A]',
          badge: 'bg-[#D97706] text-white',
          text: 'text-[#92400E]',
        }
      : {
          wrap: 'bg-[#ECFDF5] border-[#A7F3D0]',
          badge: 'bg-[#2D6A4F] text-white',
          text: 'text-[#065F46]',
        };

  return (
    <div className="space-y-4">
      {/* Compact Header & Overall Verdict Strip */}
      <div className={`rounded-2xl border p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 ${statusTone.wrap}`}>
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-lg font-extrabold text-[#2B1E1A]">خلاصه فوری نتایج کارگاه</h1>
            <span className={`px-2.5 py-0.5 rounded-md text-[11px] font-extrabold ${statusTone.badge}`}>
              {briefReport.overallVerdictLabel}
            </span>
            <span className="text-xs font-extrabold text-[#5A4A42] tabular-nums">
              امتیاز سلامت: {dig(summary.healthScore)} از ۱۰۰
            </span>
          </div>
          <p className={`text-xs sm:text-[13px] font-medium leading-6 ${statusTone.text}`}>
            {briefReport.executiveSummaryLine}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleCopyBrief}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#2B1E1A] text-white text-xs font-bold hover:bg-[#3F2E28] cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <ClipboardCopy className="w-3.5 h-3.5" />}
            <span>{copied ? 'کپی شد' : 'کپی خلاصه واتساپ'}</span>
          </button>
          <button
            type="button"
            onClick={onOpenStrategicReport}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-[#EAE2D8] text-[#2B1E1A] text-xs font-bold hover:bg-[#FAF8F5] cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5 text-[#2D6A4F]" />
            <span>گزارش متنی کامل</span>
          </button>
        </div>
      </div>

      {/* 6 Essential Results Only (3x2 Grid) */}
      <section
        aria-label="شش نتیجه کلیدی کارگاه"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5"
      >
        {/* 1. Real Safe Owner Draw */}
        <div className="rounded-xl bg-[#ECFDF5]/70 border border-[#A7F3D0] p-4 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-[#065F46] flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#2D6A4F]" />
              <span>سود واقعی قابل برداشت</span>
            </span>
            <HelpTip id="realSafeDraw" />
          </div>
          <div className="text-2xl font-extrabold text-[#065F46] tabular-nums">
            <PrivacyValue>{fmt(summary.realSafeOwnerDraw)}</PrivacyValue>
          </div>
          <div className="text-[11px] text-[#047857] tabular-nums">
            سود اسمی: <PrivacyValue>{fmt(summary.nominalMonthlyProfit)}</PrivacyValue> · ذخیره تورم انبار:{' '}
            <PrivacyValue>{fmt(summary.inventoryReplacementReserve)}</PrivacyValue>
          </div>
        </div>

        {/* 2. Monthly Revenue & Net Margin */}
        <div className="rounded-xl bg-white border border-[#EAE2D8] p-4 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-[#5A4A42] flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-[#2B1E1A]" />
              <span>فروش و حاشیه سود خالص</span>
            </span>
            <HelpTip id="blendedMargin" />
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-2xl font-extrabold text-[#2B1E1A] tabular-nums">
              <PrivacyValue>{fmt(summary.totalMonthlyRevenue)}</PrivacyValue>
            </span>
            <span className="text-sm font-extrabold text-[#D97706] tabular-nums">
              {pct(summary.blendedNetMarginPct)}
            </span>
          </div>
          <div className="text-[11px] text-[#7D6C63] tabular-nums">
            حجم فروش ماهانه: {formatNumber(summary.totalMonthlySalesKg, { usePersian: usePersianDigits })} کیلو · هدف حاشیه:{' '}
            {pct(data.settings.targetNetMarginPct, 0)}
          </div>
        </div>

        {/* 3. Break-Even & Today's Target */}
        <div className="rounded-xl bg-white border border-[#EAE2D8] p-4 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-[#5A4A42] flex items-center gap-1.5">
              <CalendarClock className="w-4 h-4 text-[#2D6A4F]" />
              <span>نقطه سربه‌سر و هدف امروز</span>
            </span>
            <HelpTip id="breakEven" />
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-2xl font-extrabold text-[#2B1E1A] tabular-nums">
              <PrivacyValue>{fmt(summary.dailyBreakEvenRevenue)}</PrivacyValue>
            </span>
            <span className="text-xs font-extrabold text-[#2D6A4F] tabular-nums">
              روز {dig(summary.breakEvenDayOfMonth)} ماه
            </span>
          </div>
          <div className="text-[11px] text-[#7D6C63] tabular-nums">
            سربه‌سر کل ماه: <PrivacyValue>{fmt(summary.breakEvenRevenue)}</PrivacyValue> (
            {formatNumber(summary.breakEvenKg, { usePersian: usePersianDigits })} کیلو)
          </div>
        </div>

        {/* 4. Monte Carlo Probability & VaR 95% */}
        <div className="rounded-xl bg-[#EEF2FF]/70 border border-[#C7D2FE] p-4 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-[#312E81] flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-[#4338CA]" />
              <span>احتمال سوددهی (مونت‌کارلو)</span>
            </span>
            <HelpTip id="mcProfitProb" />
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-2xl font-extrabold text-[#312E81] tabular-nums">
              {pct(monteCarlo.probabilityOfProfitPct)}
            </span>
            <span className="text-xs font-bold text-[#4338CA] tabular-nums">
              بدترین ۵٪: <PrivacyValue>{fmt(monteCarlo.profitAtRisk95)}</PrivacyValue>
            </span>
          </div>
          <div className="text-[11px] text-[#4338CA] tabular-nums">
            میانه سود محتمل (P50): <PrivacyValue>{fmt(monteCarlo.medianProfit)}</PrivacyValue> (
            {dig(monteCarlo.iterations)} سناریو)
          </div>
        </div>

        {/* 5. Sayadi Check & 35-Day Liquidity Floor */}
        <div
          className={`rounded-xl border p-4 space-y-1.5 ${
            stress.dangerDays.length > 0 || monteCarlo.checkDefaultRiskPct >= 10
              ? 'bg-[#FEF2F2] border-[#F5C2B8]'
              : 'bg-white border-[#EAE2D8]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-[#5A4A42] flex items-center gap-1.5">
              <Wallet className="w-4 h-4 text-[#D97706]" />
              <span>سپر چک صیادی و نقدینگی</span>
            </span>
            <HelpTip id="sayadiGuard" />
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-2xl font-extrabold text-[#2B1E1A] tabular-nums">
              <PrivacyValue>{fmt(stress.minBalance)}</PrivacyValue>
            </span>
            <span
              className={`text-xs font-extrabold tabular-nums ${
                monteCarlo.checkDefaultRiskPct < 5 ? 'text-[#2D6A4F]' : 'text-[#C84B31]'
              }`}
            >
              ریسک چک: {pct(monteCarlo.checkDefaultRiskPct)}
            </span>
          </div>
          <div className="text-[11px] text-[#7D6C63] truncate tabular-nums">
            {nextPayableCheck
              ? `چک بعدی: ${fmt(nextPayableCheck.amount)} (${dig(nextPayableCheck.daysFromToday)} روز مانده)`
              : 'چک پرداختی باز ثبت نشده است'}
          </div>
        </div>

        {/* 6. Invisible Variance & Total Waste */}
        <div
          className={`rounded-xl border p-4 space-y-1.5 ${
            summary.wasteBreakdown.invisibleVarianceCost > 3_000_000
              ? 'bg-[#FEF2F2]/70 border-[#F5C2B8]'
              : 'bg-white border-[#EAE2D8]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-[#5A4A42] flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-[#C84B31]" />
              <span>پرت نامرئی و کل ضایعات</span>
            </span>
            <HelpTip id="invisibleVariance" />
          </div>
          <div className="text-2xl font-extrabold text-[#C84B31] tabular-nums">
            <PrivacyValue>{fmt(summary.wasteBreakdown.invisibleVarianceCost)}</PrivacyValue>
          </div>
          <div className="text-[11px] text-[#7D6C63] tabular-nums">
            کل هزینه ضایعات ۴بخشی ماهانه:{' '}
            <PrivacyValue>{fmt(summary.wasteBreakdown.totalWasteCost)}</PrivacyValue>
          </div>
        </div>
      </section>

      {/* Bottom 3 High-Signal Decision Cards */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-3.5">
        {/* Best & Worst Oven-Hour */}
        <div className="rounded-xl bg-white border border-[#EAE2D8] p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-extrabold text-[#2B1E1A] flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-[#D97706]" />
              <span>پول‌سازترین و ضعیف‌ترین در ساعت فر</span>
            </h2>
            <span className="text-[11px] font-bold text-[#7D6C63] tabular-nums">
              اشغال فر: {pct(summary.ovenUtilizationPct, 0)}
            </span>
          </div>

          <div className="space-y-2">
            {bestOven && (
              <div className="rounded-lg bg-[#ECFDF5] border border-[#A7F3D0] p-2.5 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-[10px] font-bold text-[#047857]">رتبه ۱ فر (اولویت تولید)</div>
                  <div className="text-xs font-extrabold text-[#065F46] truncate">{bestOven.name}</div>
                </div>
                <div className="text-xs font-extrabold text-[#065F46] tabular-nums shrink-0">
                  <PrivacyValue>{fmt(bestOven.profitPerOvenHour)}</PrivacyValue>/ساعت
                </div>
              </div>
            )}
            {worstOven && worstOven.recipeId !== bestOven?.recipeId && (
              <div className="rounded-lg bg-[#FEF2F2] border border-[#F5C2B8] p-2.5 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-[10px] font-bold text-[#991B1B]">کم‌ترین بازده فر (نیازمند اصلاح)</div>
                  <div className="text-xs font-extrabold text-[#991B1B] truncate">{worstOven.name}</div>
                </div>
                <div className="text-xs font-extrabold text-[#991B1B] tabular-nums shrink-0">
                  <PrivacyValue>{fmt(worstOven.profitPerOvenHour)}</PrivacyValue>/ساعت
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Top Sensitivity Lever & Peak Month */}
        <div className="rounded-xl bg-white border border-[#EAE2D8] p-4 space-y-3">
          <h2 className="text-xs font-extrabold text-[#2B1E1A]">حساس‌ترین اهرم سود و اوج فصلی</h2>

          <div className="space-y-2 text-xs">
            {topDriver && (
              <div className="rounded-lg bg-[#FAF8F5] border border-[#EAE2D8] p-2.5">
                <div className="text-[10px] font-bold text-[#7D6C63]">اهرم شماره ۱ تورنادو (±۱۰٪)</div>
                <div className="font-extrabold text-[#2B1E1A] mt-0.5">{topDriver.label}</div>
                <div className="text-[11px] font-bold text-[#4338CA] tabular-nums mt-0.5">
                  دامنه اثر ماهانه: <PrivacyValue>{fmt(topDriver.totalSpread)}</PrivacyValue>
                </div>
              </div>
            )}
            {peakMonth && (
              <div className="rounded-lg bg-[#FAF8F5] border border-[#EAE2D8] p-2.5 flex items-center justify-between gap-2">
                <div>
                  <div className="text-[10px] font-bold text-[#7D6C63]">اوج سودآوری ۱۲ ماهه</div>
                  <div className="font-extrabold text-[#2B1E1A]">
                    ماه {peakMonth.shamsiName} ({peakMonth.occasion})
                  </div>
                </div>
                <div className="text-xs font-extrabold text-[#2D6A4F] tabular-nums shrink-0">
                  <PrivacyValue>{fmt(peakMonth.profitBase)}</PrivacyValue>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Top 3 Immediate Rule-Based Actions */}
        <div className="rounded-xl bg-white border border-[#EAE2D8] p-4 flex flex-col justify-between gap-3">
          <div className="space-y-2.5">
            <h2 className="text-xs font-extrabold text-[#2B1E1A] flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-[#2D6A4F]" />
              <span>۳ اقدام اولویت‌دار این هفته</span>
            </h2>
            <ol className="space-y-2">
              {briefReport.actionPlan.slice(0, 3).map((act, i) => (
                <li
                  key={i}
                  className="rounded-lg bg-[#FAF8F5] border border-[#EAE2D8] px-3 py-2 text-xs"
                >
                  <div className="font-extrabold text-[#2B1E1A]">
                    {dig(i + 1)}. {act.title}
                  </div>
                  <div className="text-[11px] font-bold text-[#2D6A4F] mt-0.5">
                    <PrivacyValue>{act.expectedImpact}</PrivacyValue>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <button
            type="button"
            onClick={onOpenFullCockpit}
            className="inline-flex items-center justify-center gap-1.5 text-xs font-bold text-[#5A4A42] hover:text-[#2B1E1A] pt-2 border-t border-[#F2EBE2] cursor-pointer"
          >
            <span>ورود به داشبورد تحلیلی کامل و نمودارها</span>
            <ArrowLeft className="w-3.5 h-3.5" />
          </button>
        </div>
      </section>
    </div>
  );
};
