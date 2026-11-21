import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ClipboardCopy,
  Download,
  FileText,
  Lightbulb,
  Printer,
  RefreshCw,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
} from 'lucide-react';
import { useWorkshop } from '../../store/WorkshopContext';
import {
  STRATEGIC_REPORT_TEMPLATES,
  StrategicReportTemplateId,
  StrategicReportTone,
  generateStrategicTextReport,
} from '../../utils/strategicReportEngine';
import { formatDigits } from '../../utils/formatters';
import { HelpTip } from '../../components/HelpTip';
import { PrivacyValue } from '../../components/PrivacyValue';

export const AnalystView: React.FC = () => {
  const { data, summary, monteCarlo, tornado, forecast, offlineInsights, rerunMonteCarlo, notify } =
    useWorkshop();
  const usePersian = data.settings.usePersianDigits;

  const [templateId, setTemplateId] = useState<StrategicReportTemplateId>('executive_full');
  const [tone, setTone] = useState<StrategicReportTone>('executive');
  const [viewMode, setViewMode] = useState<'formatted' | 'raw'>('formatted');
  const [showRuleTags, setShowRuleTags] = useState(true);
  const [showQuickCards, setShowQuickCards] = useState(false);
  const [copied, setCopied] = useState(false);

  const report = useMemo(
    () =>
      generateStrategicTextReport(data, summary, monteCarlo, tornado, forecast, {
        templateId,
        tone,
      }),
    [data, summary, monteCarlo, tornado, forecast, templateId, tone]
  );

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(report.plainText);
      setCopied(true);
      notify('متن گزارش استراتژیک در حافظه کپی شد.', 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      notify('کپی خودکار مجاز نبود؛ از نمای «متن خام» متن را انتخاب و کپی کنید.', 'warning');
      setViewMode('raw');
    }
  };

  const handleDownloadTxt = () => {
    const bom = '\uFEFF';
    const blob = new Blob([bom + report.plainText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `shirin-taraz-strategic-${templateId}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    notify('فایل متنی گزارش استراتژیک با موفقیت ذخیره شد.', 'success');
  };

  const verdictStyle =
    report.overallStatus === 'critical'
      ? 'bg-[#FEF2F2] border-[#F5C2B8] text-[#991B1B]'
      : report.overallStatus === 'warning'
      ? 'bg-[#FFFBEB] border-[#F5D08A] text-[#92400E]'
      : 'bg-[#ECFDF5] border-[#A7F3D0] text-[#065F46]';

  const criticalCount = offlineInsights.filter((i) => i.severity === 'critical').length;
  const warningCount = offlineInsights.filter((i) => i.severity === 'warning').length;

  return (
    <div className="space-y-5">
      {/* Deterministic Rule-Based Banner */}
      <div className="no-print rounded-xl bg-[#ECFDF5] border border-[#A7F3D0] px-4 py-3 text-xs text-[#065F46] flex flex-wrap items-center justify-between gap-2 font-semibold">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4.5 h-4.5 text-[#2D6A4F] shrink-0" />
          <span>
            موتور گزارش‌ساز متنی ۱۰۰٪ محلی و مبتنی بر قواعد — مستقیماً از خروجی‌های قطعی بهایابی و ۱,۰۰۰ سناریوی مونت‌کارلو تولید می‌شود.
          </span>
          <HelpTip id="strategicReportBuilder" />
        </div>
        <span className="text-[11px] font-bold text-[#2D6A4F] tabular-nums">
          {formatDigits(report.firedRuleCount, usePersian)} قاعده فعال در این گزارش
        </span>
      </div>

      {/* Main Two-Column Rule-Based Report Builder */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Right Control Column (RTL) */}
        <aside className="no-print lg:col-span-4 space-y-4">
          {/* Template Selector */}
          <div className="bg-white border border-[#EAE2D8] rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-extrabold text-[#2B1E1A] flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-[#D97706]" />
                <span>انتخاب قالب گزارش استراتژیک</span>
              </h2>
            </div>

            <div className="space-y-2">
              {STRATEGIC_REPORT_TEMPLATES.map((tpl) => {
                const active = tpl.id === templateId;
                return (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => setTemplateId(tpl.id)}
                    className={`w-full text-right rounded-xl border p-3 transition-colors cursor-pointer ${
                      active
                        ? 'bg-[#2B1E1A] text-white border-[#2B1E1A]'
                        : 'bg-[#FAF8F5] text-[#2B1E1A] border-[#EAE2D8] hover:border-[#C7B7A7]'
                    }`}
                  >
                    <div className="text-xs font-extrabold">{tpl.title}</div>
                    <div
                      className={`text-[11px] mt-0.5 leading-relaxed ${
                        active ? 'text-[#E6D9CE]' : 'text-[#7D6C63]'
                      }`}
                    >
                      {tpl.shortDesc}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tone & Display Controls */}
          <div className="bg-white border border-[#EAE2D8] rounded-xl p-4 space-y-3.5">
            <h3 className="text-xs font-extrabold text-[#2B1E1A] flex items-center gap-1.5">
              <SlidersHorizontal className="w-3.5 h-3.5 text-[#7D6C63]" />
              <span>تنظیمات لحن و خروجی متن</span>
            </h3>

            <div>
              <div className="text-[11px] font-bold text-[#6E5C54] mb-1.5">لحن نگارش گزارش:</div>
              <div className="grid grid-cols-2 gap-1.5 bg-[#FAF8F5] p-1 rounded-lg border border-[#EAE2D8]">
                <button
                  type="button"
                  onClick={() => setTone('executive')}
                  className={`py-1.5 rounded-md text-xs font-bold cursor-pointer transition-colors ${
                    tone === 'executive'
                      ? 'bg-[#2B1E1A] text-white'
                      : 'text-[#5A4A42] hover:text-[#2B1E1A]'
                  }`}
                >
                  رسمی مدیریتی
                </button>
                <button
                  type="button"
                  onClick={() => setTone('practical')}
                  className={`py-1.5 rounded-md text-xs font-bold cursor-pointer transition-colors ${
                    tone === 'practical'
                      ? 'bg-[#2B1E1A] text-white'
                      : 'text-[#5A4A42] hover:text-[#2B1E1A]'
                  }`}
                >
                  کارگاهی و ساده
                </button>
              </div>
            </div>

            <label className="flex items-center justify-between gap-2 text-xs text-[#3E302A] cursor-pointer pt-1">
              <span className="font-semibold">نمایش برچسب قواعد ریاضی هر بخش</span>
              <input
                type="checkbox"
                checked={showRuleTags}
                onChange={(e) => setShowRuleTags(e.target.checked)}
                className="accent-[#2D6A4F] w-4 h-4 cursor-pointer"
              />
            </label>

            <div className="pt-2 border-t border-[#F0E9E0] space-y-2">
              <button
                type="button"
                onClick={handleCopyText}
                className="w-full inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-lg bg-[#2D6A4F] text-white text-xs font-bold hover:bg-[#23543E] cursor-pointer"
              >
                {copied ? <Check className="w-4 h-4" /> : <ClipboardCopy className="w-4 h-4" />}
                <span>{copied ? 'متن گزارش کپی شد' : 'کپی کامل متن گزارش'}</span>
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleDownloadTxt}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-[#FAF8F5] border border-[#EAE2D8] text-[#2B1E1A] text-xs font-bold hover:bg-[#F3ECE4] cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>دانلود فایل TXT</span>
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-[#FAF8F5] border border-[#EAE2D8] text-[#2B1E1A] text-xs font-bold hover:bg-[#F3ECE4] cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>چاپ گزارش</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  rerunMonteCarlo();
                  notify('۱,۰۰۰ سناریوی مونت‌کارلو با دانه جدید بازمحاسبه و گزارش به‌روزرسانی شد.', 'info');
                }}
                className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-[#EEF2FF] border border-[#C7D2FE] text-[#3730A3] text-xs font-bold hover:bg-[#E0E7FF] cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>اجرای مجدد ۱,۰۰۰ سناریوی مونت‌کارلو</span>
              </button>
            </div>
          </div>
        </aside>

        {/* Left Rendered Executive Document */}
        <article className="lg:col-span-8 bg-white border border-[#EAE2D8] rounded-2xl p-5 sm:p-6 space-y-5 shadow-xs">
          {/* Document Header */}
          <div className="flex flex-wrap items-start justify-between gap-3 pb-4 border-b border-[#EAE2D8]">
            <div>
              <div className="text-[11px] font-bold text-[#7D6C63]">
                {report.workshopName} · مدیریت: {report.managerName}
              </div>
              <h2 className="text-lg font-extrabold text-[#2B1E1A] mt-0.5">{report.title}</h2>
              <p className="text-xs text-[#6E5C54] mt-0.5">{report.subtitle}</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className={`px-3 py-1 rounded-lg border text-xs font-extrabold ${verdictStyle}`}>
                {report.overallVerdictLabel}
              </span>
              <div className="no-print inline-flex rounded-lg border border-[#EAE2D8] bg-[#FAF8F5] p-0.5">
                <button
                  type="button"
                  onClick={() => setViewMode('formatted')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold cursor-pointer ${
                    viewMode === 'formatted' ? 'bg-[#2B1E1A] text-white' : 'text-[#5A4A42]'
                  }`}
                >
                  نمای سندی
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('raw')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold cursor-pointer ${
                    viewMode === 'raw' ? 'bg-[#2B1E1A] text-white' : 'text-[#5A4A42]'
                  }`}
                >
                  متن خام
                </button>
              </div>
            </div>
          </div>

          {/* 4 Grounded Metrics Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {report.headlineMetrics.map((m) => {
              const cardClass =
                m.tone === 'positive'
                  ? 'bg-[#ECFDF5]/80 border-[#A7F3D0] text-[#065F46]'
                  : m.tone === 'indigo'
                  ? 'bg-[#EEF2FF]/80 border-[#C7D2FE] text-[#312E81]'
                  : m.tone === 'warning'
                  ? 'bg-[#FFFBEB] border-[#F5D08A] text-[#92400E]'
                  : m.tone === 'danger'
                  ? 'bg-[#FEF2F2] border-[#F5C2B8] text-[#991B1B]'
                  : 'bg-[#FAF8F5] border-[#EAE2D8] text-[#2B1E1A]';
              return (
                <div key={m.label} className={`rounded-xl border p-3 ${cardClass}`}>
                  <div className="text-[11px] font-bold opacity-80">{m.label}</div>
                  <div className="text-sm sm:text-base font-extrabold tabular-nums mt-1">
                    <PrivacyValue>{m.value}</PrivacyValue>
                  </div>
                  <div className="text-[10px] opacity-80 mt-0.5 truncate">{m.subtext}</div>
                </div>
              );
            })}
          </div>

          {/* Executive Summary Lead */}
          <div className="rounded-xl bg-[#FAF8F5] border-r-4 border-[#2B1E1A] px-4 py-3">
            <div className="text-[11px] font-extrabold text-[#6E5C54] mb-1">چکیده مدیریتی</div>
            <p className="text-xs sm:text-[13px] text-[#2B1E1A] leading-7 font-medium">
              {report.executiveSummaryLine}
            </p>
          </div>

          {viewMode === 'raw' ? (
            <div className="space-y-2">
              <div className="text-xs font-bold text-[#6E5C54]">
                متن خالص گزارش (قابل ویرایش مستقیم و کپی برای واتساپ، ورد یا ایمیل):
              </div>
              <textarea
                readOnly
                value={report.plainText}
                rows={18}
                className="w-full rounded-xl border border-[#EAE2D8] bg-[#FAF8F5] p-4 text-xs leading-7 text-[#2B1E1A] font-medium focus:outline-none focus:border-[#2B1E1A]"
              />
            </div>
          ) : (
            <div className="space-y-5">
              {/* Narrative Rule-Based Sections */}
              {report.sections.map((sec) => {
                const badgeClass =
                  sec.severity === 'critical'
                    ? 'bg-[#FEF2F2] text-[#991B1B] border-[#F5C2B8]'
                    : sec.severity === 'warning'
                    ? 'bg-[#FFFBEB] text-[#92400E] border-[#F5D08A]'
                    : sec.severity === 'healthy'
                    ? 'bg-[#ECFDF5] text-[#065F46] border-[#A7F3D0]'
                    : 'bg-[#EEF2FF] text-[#3730A3] border-[#C7D2FE]';
                const badgeText =
                  sec.severity === 'critical'
                    ? 'نیاز به مداخله فوری'
                    : sec.severity === 'warning'
                    ? 'قابل بهبود'
                    : sec.severity === 'healthy'
                    ? 'وضعیت سالم'
                    : 'تحلیل راهبردی';

                return (
                  <section key={sec.id} className="space-y-2.5 pb-4 border-b border-[#F2EBE2] last:border-b-0 last:pb-0">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-sm font-extrabold text-[#2B1E1A]">{sec.heading}</h3>
                      <span className={`px-2 py-0.5 rounded-md border text-[10px] font-extrabold ${badgeClass}`}>
                        {badgeText}
                      </span>
                    </div>

                    <div className="space-y-2">
                      {sec.paragraphs.map((p, idx) => (
                        <p key={idx} className="text-xs sm:text-[13px] text-[#3A2D27] leading-7">
                          {p}
                        </p>
                      ))}
                    </div>

                    {sec.bullets.length > 0 && (
                      <ul className="space-y-1.5 pr-4 list-disc text-xs text-[#4A3C35] leading-6">
                        {sec.bullets.map((b, idx) => (
                          <li key={idx}>{b}</li>
                        ))}
                      </ul>
                    )}

                    {showRuleTags && sec.firedRules.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {sec.firedRules.map((rule, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center px-2 py-0.5 rounded bg-[#FAF8F5] border border-[#EAE2D8] text-[10px] font-semibold text-[#6E5C54] tabular-nums"
                          >
                            قانون: {rule}
                          </span>
                        ))}
                      </div>
                    )}
                  </section>
                );
              })}

              {/* 30-Day Prioritized Action Plan */}
              {report.actionPlan.length > 0 && (
                <section className="rounded-xl bg-[#FAF8F5] border border-[#EAE2D8] p-4 space-y-3">
                  <h3 className="text-sm font-extrabold text-[#2B1E1A] flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-[#2D6A4F]" />
                    <span>نقشه اقدام ۳۰ روزه (اولویت‌بندی‌شده بر پایه اثر مالی)</span>
                  </h3>

                  <div className="space-y-2.5">
                    {report.actionPlan.map((act, idx) => {
                      const prioStyle =
                        act.priority === 'فوری'
                          ? 'bg-[#FEF2F2] text-[#991B1B] border-[#F5C2B8]'
                          : act.priority === 'اولویت بالا'
                          ? 'bg-[#FFFBEB] text-[#92400E] border-[#F5D08A]'
                          : 'bg-[#ECFDF5] text-[#065F46] border-[#A7F3D0]';
                      return (
                        <div
                          key={idx}
                          className="rounded-xl bg-white border border-[#EAE2D8] p-3.5 space-y-1.5"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="text-xs font-extrabold text-[#2B1E1A]">
                              {formatDigits(idx + 1, usePersian)}. {act.title}
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] font-bold text-[#7D6C63]">
                                {act.weekLabel}
                              </span>
                              <span className={`px-2 py-0.5 rounded border text-[10px] font-extrabold ${prioStyle}`}>
                                {act.priority}
                              </span>
                            </div>
                          </div>
                          <p className="text-xs text-[#4A3C35] leading-6">{act.detail}</p>
                          <div className="text-[11px] font-bold text-[#2D6A4F]">
                            اثر مالی برآوردی: <PrivacyValue>{act.expectedImpact}</PrivacyValue>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}
            </div>
          )}
        </article>
      </div>

      {/* Collapsible Quick Rule-Based Diagnostic Cards */}
      <section className="no-print bg-white border border-[#EAE2D8] rounded-xl p-4">
        <button
          type="button"
          onClick={() => setShowQuickCards((v) => !v)}
          className="w-full flex flex-wrap items-center justify-between gap-2 text-right cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-[#D97706]" />
            <span className="text-xs sm:text-sm font-extrabold text-[#2B1E1A]">
              کارت‌های تشخیص سریع قواعد ({formatDigits(offlineInsights.length, usePersian)} مورد)
            </span>
            {criticalCount > 0 && (
              <span className="px-2 py-0.5 rounded bg-[#FEF2F2] text-[#991B1B] text-[10px] font-bold">
                {formatDigits(criticalCount, usePersian)} فوری
              </span>
            )}
            {warningCount > 0 && (
              <span className="px-2 py-0.5 rounded bg-[#FFFBEB] text-[#92400E] text-[10px] font-bold">
                {formatDigits(warningCount, usePersian)} هشدار
              </span>
            )}
          </div>
          <span className="text-xs font-bold text-[#6E5C54]">
            {showQuickCards ? 'بستن کارت‌ها' : 'نمایش جزئیات کارت‌ها'}
          </span>
        </button>

        {showQuickCards && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4 pt-4 border-t border-[#F0E9E0]">
            {offlineInsights.map((ins) => {
              const style =
                ins.severity === 'critical'
                  ? 'bg-[#FEF2F2] border-[#F5C2B8]'
                  : ins.severity === 'warning'
                  ? 'bg-[#FFFBEB] border-[#F5D08A]'
                  : ins.severity === 'healthy'
                  ? 'bg-[#ECFDF5] border-[#A7F3D0]'
                  : 'bg-[#EEF2FF]/70 border-[#C7D2FE]';
              const titleColor =
                ins.severity === 'critical'
                  ? 'text-[#991B1B]'
                  : ins.severity === 'warning'
                  ? 'text-[#92400E]'
                  : ins.severity === 'healthy'
                  ? 'text-[#065F46]'
                  : 'text-[#312E81]';
              return (
                <div key={ins.id} className={`rounded-xl border p-3.5 space-y-1.5 ${style}`}>
                  <div className="flex items-start justify-between gap-2 text-[11px]">
                    <span className="font-bold text-[#6E5C54]">{ins.category}</span>
                    <span className={`font-extrabold tabular-nums ${titleColor}`}>{ins.metric}</span>
                  </div>
                  <div className={`text-xs font-extrabold ${titleColor} flex items-start gap-1.5`}>
                    {ins.severity === 'healthy' ? (
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    )}
                    <span>{ins.title}</span>
                  </div>
                  <p className="text-[11px] text-[#3E302A] leading-relaxed">{ins.diagnosis}</p>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
