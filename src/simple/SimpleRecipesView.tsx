import React, { useMemo, useState } from 'react';
import {
  Calculator,
  ChevronDown,
  ChevronUp,
  Pencil,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { useWorkshop } from '../store/WorkshopContext';
import { Recipe, RecipeLineItem } from '../types';
import { computeWorkshopSummary } from '../utils/costEngine';
import {
  formatCurrency,
  formatNumber,
  formatPercent,
} from '../utils/formatters';
import { LocaleNumberInput } from '../components/LocaleNumberInput';
import { PrivacyValue } from '../components/PrivacyValue';
import { SimpleSectionId } from '../components/SimpleLayoutShell';

interface SimpleRecipesViewProps {
  onNavigate: (section: SimpleSectionId) => void;
}

export const SimpleRecipesView: React.FC<SimpleRecipesViewProps> = ({ onNavigate }) => {
  const { data, summary, upsertRecipe, deleteRecipe } = useWorkshop();
  const { usePersianDigits, currencyUnit } = data.settings;

  const fmt = (val: number, compact = false) =>
    formatCurrency(val, currencyUnit, usePersianDigits, compact);

  // First recipe explainer open by default so user immediately sees how overhead/kg is built
  const [expandedId, setExpandedId] = useState<string | null>(data.recipes[0]?.id ?? null);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);

  const openNewRecipe = () => {
    const firstIng = data.ingredients.find((i) => i.category !== 'packaging') ?? data.ingredients[0];
    const boxIng = data.ingredients.find((i) => i.category === 'packaging') ?? data.ingredients[0];
    setEditingRecipe({
      id: `rec-${Date.now()}`,
      name: '',
      category: 'تر و خامه‌ای',
      items: firstIng
        ? [{ id: `line-${Date.now()}`, kind: 'ingredient', refId: firstIng.id, amount: 1000 }]
        : [],
      boxIngredientId: boxIng?.id ?? '',
      extraPackagingCostPerKg: 5_000,
      bakingChangePct: -8,
      trimWastePct: 2,
      shelfLifeSpoilagePct: 2,
      ovenMinutesPerBatch: 30,
      ovenTraysPerBatch: 2,
      ovenTempCelsius: 180,
      directLaborMinutesPerBatch: 45,
      sellingPricePerKg: 450_000,
      cafeDiscountPct: 10,
      snappfoodMarkupPct: 15,
      monthlySalesKg: 100,
      channelMix: {
        storefrontPct: 100,
        cafeB2BPct: 0,
        snappfoodPct: 0,
        customEventPct: 0,
      },
    });
  };

  // Live preview of cost and overhead/kg inside modal
  const liveDraftMetrics = useMemo(() => {
    if (!editingRecipe || editingRecipe.items.length === 0) return null;
    const exists = data.recipes.some((r) => r.id === editingRecipe.id);
    const simulatedRecipes = exists
      ? data.recipes.map((r) => (r.id === editingRecipe.id ? editingRecipe : r))
      : [...data.recipes, editingRecipe];
    const simulatedSummary = computeWorkshopSummary({ ...data, recipes: simulatedRecipes });
    return simulatedSummary.recipeMetrics.find((m) => m.recipeId === editingRecipe.id) ?? null;
  }, [data, editingRecipe]);

  const handleSaveRecipe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecipe || !editingRecipe.name.trim() || editingRecipe.items.length === 0) {
      return;
    }
    upsertRecipe({ ...editingRecipe, name: editingRecipe.name.trim() });
    setExpandedId(editingRecipe.id);
    setEditingRecipe(null);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-[#2B1E1A]">
            فرمول شیرینی‌ها و قیمت تمام‌شده
          </h1>
          <p className="text-xs text-[#7D6C63] mt-0.5">
            برای هر شیرینی دقیقاً ببینید چقدر هزینه مواد، چقدر سربار هر کیلو و چقدر سود خالص دارد.
          </p>
        </div>

        <button
          type="button"
          onClick={openNewRecipe}
          className="inline-flex items-center gap-1.5 rounded-xl bg-[#2D6A4F] hover:bg-[#23553F] text-white px-4 py-2 text-xs font-bold cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>افزودن شیرینی جدید</span>
        </button>
      </div>

      {/* Simple Recipe Cards */}
      <div className="space-y-4">
        {summary.recipeMetrics.map((rm) => {
          const recipe = data.recipes.find((r) => r.id === rm.recipeId);
          if (!recipe) return null;
          const isOpen = expandedId === recipe.id;
          const ob = rm.overheadBreakdown;

          // Per-material contribution rows for simple overhead explanation
          const materialRows = recipe.items.map((line: RecipeLineItem) => {
            if (line.kind === 'subRecipe') {
              const sr = data.subRecipes.find((s) => s.id === line.refId);
              const srCostPerG = summary.subRecipeUnitCosts[line.refId] ?? 0;
              return {
                id: line.id,
                name: sr ? `${sr.name} (نیمه‌ساخته)` : 'ماده نیمه‌ساخته',
                qtyLabel: `${formatNumber(line.amount, { usePersian: usePersianDigits })} گرم`,
                grams: line.amount,
                batchCost: line.amount * srCostPerG,
              };
            }
            const ing = data.ingredients.find((i) => i.id === line.refId);
            const grams = ing?.baseUnit === 'piece' ? line.amount * 55 : line.amount;
            const unitCost = ing ? ing.packPrice / Math.max(1, ing.packQuantityInBase) : 0;
            return {
              id: line.id,
              name: ing?.name ?? 'ماده اولیه',
              qtyLabel:
                ing?.baseUnit === 'piece'
                  ? `${formatNumber(line.amount, { usePersian: usePersianDigits })} عدد`
                  : `${formatNumber(line.amount, { usePersian: usePersianDigits })} گرم`,
              grams,
              batchCost: line.amount * unitCost,
            };
          });

          const totalBatchGrams = Math.max(
            1,
            materialRows.reduce((acc, r) => acc + r.grams, 0)
          );
          const totalBatchCost = Math.max(
            1,
            materialRows.reduce((acc, r) => acc + r.batchCost, 0)
          );

          return (
            <article
              key={recipe.id}
              className="bg-white border border-[#EAE2D8] rounded-2xl p-4 sm:p-5 space-y-4"
            >
              {/* Top Row: Name + Quick Actions */}
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#F3ECE4]">
                <div>
                  <h2 className="text-base font-extrabold text-[#2B1E1A]">{recipe.name}</h2>
                  <div className="text-xs text-[#7D6C63] mt-0.5 tabular-nums">
                    خروجی هر پخت: {formatNumber(rm.netYieldKg, { decimals: 2, usePersian: usePersianDigits })} کیلو ·
                    فروش ماهانه: {formatNumber(recipe.monthlySalesKg, { usePersian: usePersianDigits })} کیلو
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingRecipe(recipe)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[#EAE2D8] bg-[#FAF8F5] hover:bg-[#F2EAE0] px-3 py-1.5 text-xs font-bold text-[#2B1E1A] cursor-pointer"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    <span>ویرایش فرمول</span>
                  </button>
                  <button
                    type="button"
                    aria-label={`حذف ${recipe.name}`}
                    onClick={() => deleteRecipe(recipe.id)}
                    className="p-1.5 rounded-lg text-[#C84B31] hover:bg-[#FEF2F2] cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* 5 Essential Numbers Only */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 tabular-nums">
                <div className="rounded-xl bg-[#FAF8F5] border border-[#EAE2D8] p-3">
                  <div className="text-[11px] text-[#6E5C54]">مواد اولیه هر کیلو</div>
                  <div className="text-sm font-extrabold text-[#2B1E1A] mt-1">
                    <PrivacyValue>{fmt(rm.spoilageAdjustedMaterialCostPerKg)}</PrivacyValue>
                  </div>
                </div>

                <div className="rounded-xl bg-[#FAF8F5] border border-[#EAE2D8] p-3">
                  <div className="text-[11px] text-[#6E5C54]">جعبه و بسته‌بندی</div>
                  <div className="text-sm font-extrabold text-[#2B1E1A] mt-1">
                    <PrivacyValue>{fmt(rm.boxAndPackagingPerKg)}</PrivacyValue>
                  </div>
                </div>

                <div className="rounded-xl bg-[#EEF2FF]/70 border border-[#C7D2FE] p-3">
                  <div className="text-[11px] font-bold text-[#3730A3]">سهم سربار هر کیلو</div>
                  <div className="text-sm font-extrabold text-[#4338CA] mt-1">
                    <PrivacyValue>{fmt(rm.allocatedOverheadPerKg)}</PrivacyValue>
                  </div>
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => setExpandedId(isOpen ? null : recipe.id)}
                    className="mt-1 inline-flex items-center gap-1 text-[11px] font-bold text-[#4338CA] hover:underline cursor-pointer"
                  >
                    <span>{isOpen ? 'بستن توضیح' : 'چطور حساب شد؟'}</span>
                    {isOpen ? (
                      <ChevronUp className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>

                <div className="rounded-xl bg-[#FAF8F5] border border-[#EAE2D8] p-3">
                  <div className="text-[11px] text-[#6E5C54]">قیمت تمام‌شده کل</div>
                  <div className="text-sm font-extrabold text-[#C84B31] mt-1">
                    <PrivacyValue>{fmt(rm.totalCostPerKg)}</PrivacyValue>
                  </div>
                </div>

                <div
                  className={`rounded-xl border p-3 col-span-2 sm:col-span-1 ${
                    rm.netProfitPerKg >= 0
                      ? 'bg-[#ECFDF5] border-[#A7F3D0]'
                      : 'bg-[#FEF2F2] border-[#F5C2B8]'
                  }`}
                >
                  <div className="text-[11px] text-[#4B3B34]">قیمت فروش و سود هر کیلو</div>
                  <div className="text-sm font-extrabold text-[#2B1E1A] mt-1">
                    <PrivacyValue>{fmt(rm.storefrontPricePerKg)}</PrivacyValue>
                  </div>
                  <div
                    className={`text-[11px] font-bold mt-0.5 ${
                      rm.netProfitPerKg >= 0 ? 'text-[#065F46]' : 'text-[#C84B31]'
                    }`}
                  >
                    سود: <PrivacyValue>{fmt(rm.netProfitPerKg)}</PrivacyValue> (
                    {formatPercent(rm.netMarginPct, usePersianDigits)})
                  </div>
                </div>
              </div>

              {/* Plain-Language Step-by-Step Overhead/Kg & Per-Material Explainer */}
              {isOpen && (
                <div
                  data-testid={`simple-overhead-explainer-${recipe.id}`}
                  className="rounded-xl bg-[#FAF8F5] border border-[#E2D6C8] p-4 space-y-4 text-xs"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#EAE2D8]">
                    <div className="flex items-center gap-2 font-extrabold text-[#2B1E1A]">
                      <Calculator className="w-4 h-4 text-[#4338CA]" />
                      <span>
                        عدد سهم سربار هر کیلو ({fmt(ob.allocatedOverheadPerKg)}) چطور به دست آمد؟
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => onNavigate('overhead')}
                      className="text-[11px] font-bold text-[#4338CA] hover:underline cursor-pointer"
                    >
                      تغییر روش تقسیم سربار ←
                    </button>
                  </div>

                  {/* 3 Plain Steps */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 tabular-nums">
                    <div className="bg-white rounded-xl border border-[#EAE2D8] p-3">
                      <div className="text-[11px] font-bold text-[#6E5C54]">
                        ۱. کل سربار و حقوق ماهانه
                      </div>
                      <div className="text-sm font-extrabold text-[#2B1E1A] mt-1">
                        <PrivacyValue>{fmt(ob.totalWorkshopOverheadPool, true)}</PrivacyValue>
                      </div>
                      <div className="text-[11px] text-[#7D6C63] mt-1">
                        جمع هزینه‌های ثابت + حقوق پرسنل کارگاه
                      </div>
                    </div>

                    <div className="bg-white rounded-xl border border-[#EAE2D8] p-3">
                      <div className="text-[11px] font-bold text-[#6E5C54]">
                        ۲. سهم این شیرینی ({ob.methodLabel})
                      </div>
                      <div className="text-sm font-extrabold text-[#4338CA] mt-1">
                        {formatPercent(ob.appliedSharePct, usePersianDigits)} از کل سربار
                      </div>
                      <div className="text-[11px] text-[#7D6C63] mt-1">
                        معادل <PrivacyValue>{fmt(ob.monthlyAllocatedOverhead, true)}</PrivacyValue> در ماه
                      </div>
                    </div>

                    <div className="bg-[#ECFDF5] rounded-xl border border-[#A7F3D0] p-3">
                      <div className="text-[11px] font-bold text-[#065F46]">
                        ۳. تقسیم بر فروش ماهانه ({formatNumber(rm.monthlySalesKg, { usePersian: usePersianDigits })} کیلو)
                      </div>
                      <div className="text-sm font-extrabold text-[#065F46] mt-1">
                        <PrivacyValue>{fmt(ob.allocatedOverheadPerKg)}</PrivacyValue> / کیلو
                      </div>
                      <div className="text-[11px] text-[#047857] mt-1">
                        این عدد روی قیمت تمام‌شده هر کیلو می‌آید
                      </div>
                    </div>
                  </div>

                  {/* Simple Per-Material Breakdown Table */}
                  <div className="bg-white rounded-xl border border-[#EAE2D8] overflow-hidden">
                    <div className="px-3.5 py-2.5 bg-[#F8F5F0] border-b border-[#EAE2D8] text-[11px] font-bold text-[#4B3B34]">
                      سهم هر ماده اولیه در این فرمول و سهم متناظر آن از سربار یک کیلو شیرینی:
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-right text-xs border-collapse tabular-nums">
                        <thead>
                          <tr className="border-b border-[#F3ECE4] text-[#6E5C54] text-[11px]">
                            <th className="py-2 px-3 font-bold">ماده اولیه</th>
                            <th className="py-2 px-3 font-bold">مقدار در پخت</th>
                            <th className="py-2 px-3 font-bold">درصد وزن در پخت</th>
                            <th className="py-2 px-3 font-bold">سهم متناظر از سربار/کیلو</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#F6F1EA]">
                          {materialRows.map((row) => {
                            const weightPct = (row.grams / totalBatchGrams) * 100;
                            const costPct = (row.batchCost / totalBatchCost) * 100;
                            const sharePct = ob.method === 'direct_cost' ? costPct : weightPct;
                            const matOverhead = ob.allocatedOverheadPerKg * (sharePct / 100);
                            return (
                              <tr key={row.id}>
                                <td className="py-2 px-3 font-bold text-[#2B1E1A]">{row.name}</td>
                                <td className="py-2 px-3 text-[#5A4A42]">{row.qtyLabel}</td>
                                <td className="py-2 px-3 text-[#5A4A42]">
                                  {formatPercent(weightPct, usePersianDigits)}
                                </td>
                                <td className="py-2 px-3 font-bold text-[#4338CA]">
                                  <PrivacyValue>{fmt(Math.round(matOverhead))}</PrivacyValue>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </div>

      {/* Simple Add/Edit Recipe Modal */}
      {editingRecipe && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-label="فرم ویرایش فرمول شیرینی"
        >
          <form
            onSubmit={handleSaveRecipe}
            className="w-full max-w-2xl bg-white border border-[#EAE2D8] rounded-2xl p-5 shadow-2xl space-y-4 my-auto max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-[#EAE2D8]">
              <h2 className="text-base font-extrabold text-[#2B1E1A]">
                {editingRecipe.name ? `ویرایش فرمول «${editingRecipe.name}»` : 'افزودن شیرینی جدید'}
              </h2>
              <button
                type="button"
                aria-label="بستن پنجره"
                onClick={() => setEditingRecipe(null)}
                className="p-1.5 rounded-lg text-[#7D6C63] hover:bg-[#FAF8F5] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-[#4B3B34] mb-1">نام شیرینی</label>
                <input
                  required
                  type="text"
                  value={editingRecipe.name}
                  onChange={(e) => setEditingRecipe({ ...editingRecipe, name: e.target.value })}
                  placeholder="مثلاً شیرینی دانمارکی"
                  className="w-full rounded-lg border border-[#EAE2D8] px-3 py-2 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#4B3B34] mb-1">
                  قیمت فروش هر کیلو (تومان)
                </label>
                <LocaleNumberInput
                  value={editingRecipe.sellingPricePerKg}
                  onChange={(v) => setEditingRecipe({ ...editingRecipe, sellingPricePerKg: v })}
                  min={1}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#4B3B34] mb-1">
                  میانگین فروش ماهانه (کیلو)
                </label>
                <LocaleNumberInput
                  value={editingRecipe.monthlySalesKg}
                  onChange={(v) => setEditingRecipe({ ...editingRecipe, monthlySalesKg: v })}
                  min={1}
                  suffix="کیلو"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#4B3B34] mb-1">
                  زمان پخت در فر (دقیقه برای هر پخت)
                </label>
                <LocaleNumberInput
                  value={editingRecipe.ovenMinutesPerBatch}
                  onChange={(v) => setEditingRecipe({ ...editingRecipe, ovenMinutesPerBatch: v })}
                  min={0}
                  suffix="دقیقه"
                />
              </div>
            </div>

            {/* Ingredients List */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-[#2B1E1A]">مواد اولیه هر پخت</span>
                <button
                  type="button"
                  onClick={() => {
                    const firstIng = data.ingredients[0];
                    if (!firstIng) return;
                    const nextLine: RecipeLineItem = {
                      id: `line-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
                      kind: 'ingredient',
                      refId: firstIng.id,
                      amount: 500,
                    };
                    setEditingRecipe({
                      ...editingRecipe,
                      items: [...editingRecipe.items, nextLine],
                    });
                  }}
                  className="inline-flex items-center gap-1 text-xs font-bold text-[#2D6A4F] hover:underline cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>افزودن ماده</span>
                </button>
              </div>

              <div className="space-y-2">
                {editingRecipe.items.map((line) => {
                  const matchedIng =
                    line.kind === 'ingredient'
                      ? data.ingredients.find((i) => i.id === line.refId)
                      : null;
                  return (
                    <div key={line.id} className="grid grid-cols-12 gap-2 items-center">
                      <select
                        value={`${line.kind}:${line.refId}`}
                        onChange={(e) => {
                          const [kind, refId] = e.target.value.split(':') as [
                            'ingredient' | 'subRecipe',
                            string,
                          ];
                          setEditingRecipe({
                            ...editingRecipe,
                            items: editingRecipe.items.map((l) =>
                              l.id === line.id ? { ...l, kind, refId } : l
                            ),
                          });
                        }}
                        className="col-span-7 rounded-lg border border-[#EAE2D8] bg-white px-2.5 py-2 text-xs"
                      >
                        <optgroup label="مواد اولیه انبار">
                          {data.ingredients.map((ing) => (
                            <option key={ing.id} value={`ingredient:${ing.id}`}>
                              {ing.name}
                            </option>
                          ))}
                        </optgroup>
                        {data.subRecipes.length > 0 && (
                          <optgroup label="مواد نیمه‌ساخته">
                            {data.subRecipes.map((sr) => (
                              <option key={sr.id} value={`subRecipe:${sr.id}`}>
                                {sr.name} (نیمه‌ساخته)
                              </option>
                            ))}
                          </optgroup>
                        )}
                      </select>
                      <div className="col-span-4">
                        <LocaleNumberInput
                          value={line.amount}
                          onChange={(val) =>
                            setEditingRecipe({
                              ...editingRecipe,
                              items: editingRecipe.items.map((l) =>
                                l.id === line.id ? { ...l, amount: Math.max(0, val) } : l
                              ),
                            })
                          }
                          suffix={matchedIng?.baseUnit === 'piece' ? 'عدد' : 'گرم'}
                        />
                      </div>
                      <button
                        type="button"
                        aria-label="حذف ردیف ماده"
                        onClick={() =>
                          setEditingRecipe({
                            ...editingRecipe,
                            items: editingRecipe.items.filter((l) => l.id !== line.id),
                          })
                        }
                        className="col-span-1 p-1.5 text-[#C84B31] hover:bg-[#FEF2F2] rounded-lg flex justify-center cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Live Cost & Overhead/Kg Preview */}
            {liveDraftMetrics && (
              <div className="rounded-xl bg-[#EEF2FF]/70 border border-[#C7D2FE] p-3.5 text-xs tabular-nums flex flex-wrap items-center justify-between gap-2">
                <div className="font-bold text-[#312E81]">
                  پیش‌نمایش زنده: خروجی هر پخت{' '}
                  {formatNumber(liveDraftMetrics.netYieldKg, { decimals: 2, usePersian: usePersianDigits })}{' '}
                  کیلو · سهم سربار/کیلو:{' '}
                  <span className="text-[#4338CA]">{fmt(liveDraftMetrics.allocatedOverheadPerKg)}</span>
                </div>
                <div className="font-extrabold text-[#2B1E1A]">
                  قیمت تمام‌شده کل: {fmt(liveDraftMetrics.totalCostPerKg)}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-[#EAE2D8]">
              <button
                type="button"
                onClick={() => setEditingRecipe(null)}
                className="px-4 py-2 rounded-xl border border-[#EAE2D8] text-xs font-bold text-[#5A4A42] cursor-pointer"
              >
                انصراف
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-[#2D6A4F] hover:bg-[#23553F] text-white text-xs font-bold cursor-pointer"
              >
                ذخیره فرمول
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
