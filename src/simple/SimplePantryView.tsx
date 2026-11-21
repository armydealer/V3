import React, { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { PackagePlus, Plus, Search, Trash2 } from 'lucide-react';
import { useWorkshop } from '../store/WorkshopContext';
import { Ingredient } from '../types';
import { computePantryMonitorMetrics } from '../utils/pantryMonitorEngine';
import { formatCurrency, formatDigits, formatNumber } from '../utils/formatters';
import { LocaleNumberInput } from '../components/LocaleNumberInput';
import { PrivacyValue } from '../components/PrivacyValue';

type PantryTab = 'prices' | 'reorder_chart';

function shortLabel(name: string): string {
  const words = name.trim().split(/\s+/);
  return words.length <= 2 ? name : `${words[0]} ${words[1]}`;
}

export const SimplePantryView: React.FC = () => {
  const {
    data,
    summary,
    upsertIngredient,
    deleteIngredient,
    logDailyConsumption,
    restockIngredient,
  } = useWorkshop();

  const { usePersianDigits, currencyUnit } = data.settings;
  const fmt = (val: number) =>
    formatCurrency(val, currencyUnit, usePersianDigits, false);

  const [tab, setTab] = useState<PantryTab>('prices');
  const [search, setSearch] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  // Simple 5-field Add Ingredient form
  const [newName, setNewName] = useState('');
  const [newUnit, setNewUnit] = useState<'gram' | 'piece'>('gram');
  const [newPackSize, setNewPackSize] = useState(1000);
  const [newPackPrice, setNewPackPrice] = useState(150_000);
  const [newStockPacks, setNewStockPacks] = useState(10);

  // Simple Daily Usage Log form
  const [logIngId, setLogIngId] = useState(data.ingredients[0]?.id ?? '');
  const [logAmount, setLogAmount] = useState(1000);

  const monitor = useMemo(() => computePantryMonitorMetrics(data, summary), [data, summary]);

  const filteredIngredients = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return data.ingredients;
    return data.ingredients.filter((i) => i.name.toLowerCase().includes(q));
  }, [data.ingredients, search]);

  const chartData = useMemo(
    () =>
      monitor.items.map((item) => ({
        ingredientId: item.ingredientId,
        name: shortLabel(item.name),
        fullName: item.name,
        ratioPct: Math.min(220, Math.round(item.stockToReorderPct)),
        rawRatioPct: Math.round(item.stockToReorderPct),
        status: item.status,
        daysOfSupply: item.daysOfSupply,
      })),
    [monitor.items]
  );

  const handleAddIngredient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || newPackSize <= 0 || newPackPrice <= 0) return;
    const ing: Ingredient = {
      id: `ing-${Date.now()}`,
      name: newName.trim(),
      category: newUnit === 'piece' ? 'packaging' : 'flour_sugar',
      packLabel: newUnit === 'gram' ? 'بسته / کیسه' : 'بسته عددی',
      packQuantityInBase: Math.max(1, newPackSize),
      baseUnit: newUnit,
      packPrice: Math.max(1, Math.round(newPackPrice)),
      previousPackPrice: Math.max(1, Math.round(newPackPrice)),
      monthlyInflationPct: 3,
      currentStockInBase: Math.max(0, newStockPacks * newPackSize),
      safetyStockInBase: Math.max(newPackSize, newPackSize * 2),
      leadTimeDays: 3,
      supplierName: 'تامین‌کننده اصلی',
      history: [{ dateShamsi: 'امروز', packPrice: Math.max(1, Math.round(newPackPrice)) }],
    };
    upsertIngredient(ing);
    setNewName('');
    setShowAddForm(false);
  };

  const handleLogUsage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!logIngId || logAmount <= 0) return;
    logDailyConsumption(
      {
        ingredientId: logIngId,
        dateLabel: 'امروز',
        daysAgo: 0,
        actualUsedInBase: logAmount,
      },
      true
    );
  };

  const selectedLogIng = data.ingredients.find((i) => i.id === logIngId);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-[#2B1E1A]">انبار و مواد اولیه</h1>
          <p className="text-xs text-[#7D6C63] mt-0.5">
            تغییر قیمت هر ماده بلافاصله روی قیمت تمام‌شده همه شیرینی‌ها اعمال می‌شود.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setTab('prices');
            setShowAddForm((prev) => !prev);
          }}
          className="inline-flex items-center gap-1.5 rounded-xl bg-[#2D6A4F] hover:bg-[#23553F] text-white px-4 py-2 text-xs font-bold cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>{showAddForm ? 'بستن فرم' : 'افزودن ماده جدید'}</span>
        </button>
      </div>

      {/* 2 Simple Tabs */}
      <div
        role="tablist"
        aria-label="بخش‌های انبار"
        className="flex flex-wrap gap-1.5 bg-white border border-[#EAE2D8] rounded-xl p-1.5 w-fit max-w-full"
      >
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'prices'}
          onClick={() => setTab('prices')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
            tab === 'prices'
              ? 'bg-[#2B1E1A] text-white'
              : 'text-[#5A4A42] hover:bg-[#FAF8F5]'
          }`}
        >
          ۱. لیست مواد و قیمت روز ({formatDigits(data.ingredients.length, usePersianDigits)})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'reorder_chart'}
          onClick={() => setTab('reorder_chart')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
            tab === 'reorder_chart'
              ? 'bg-[#2B1E1A] text-white'
              : 'text-[#5A4A42] hover:bg-[#FAF8F5]'
          }`}
        >
          ۲. نمودار موجودی و نقطه سفارش
          {monitor.criticalCount > 0 && (
            <span className="mr-1.5 text-[#FCA5A5]">
              ({formatDigits(monitor.criticalCount, usePersianDigits)} فوری)
            </span>
          )}
        </button>
      </div>

      {/* Quick Add Ingredient Form */}
      {showAddForm && (
        <form
          onSubmit={handleAddIngredient}
          className="bg-white border border-[#A7F3D0] rounded-2xl p-4 sm:p-5 space-y-3"
        >
          <h2 className="text-sm font-extrabold text-[#2B1E1A]">افزودن ماده اولیه جدید</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-[#4B3B34] mb-1">نام ماده</label>
              <input
                required
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="مثلاً پودر کاکائو"
                className="w-full rounded-lg border border-[#EAE2D8] px-3 py-2 text-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[#4B3B34] mb-1">واحد</label>
              <select
                value={newUnit}
                onChange={(e) => {
                  const u = e.target.value as 'gram' | 'piece';
                  setNewUnit(u);
                  setNewPackSize(u === 'gram' ? 1000 : 100);
                }}
                className="w-full rounded-lg border border-[#EAE2D8] bg-white px-3 py-2 text-xs font-semibold"
              >
                <option value="gram">وزنی (گرم / کیلوگرم)</option>
                <option value="piece">عددی (تخم‌مرغ / جعبه)</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[#4B3B34] mb-1">
                مقدار هر بسته ({newUnit === 'gram' ? 'گرم' : 'عدد'})
              </label>
              <LocaleNumberInput value={newPackSize} onChange={setNewPackSize} min={1} />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[#4B3B34] mb-1">
                قیمت هر بسته (تومان)
              </label>
              <LocaleNumberInput value={newPackPrice} onChange={setNewPackPrice} min={1} />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[#4B3B34] mb-1">
                تعداد بسته در انبار
              </label>
              <LocaleNumberInput value={newStockPacks} onChange={setNewStockPacks} min={0} />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-3.5 py-2 rounded-lg border border-[#EAE2D8] text-xs font-bold text-[#5A4A42] cursor-pointer"
            >
              انصراف
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-[#2D6A4F] text-white text-xs font-bold hover:bg-[#23553F] cursor-pointer"
            >
              ثبت در انبار
            </button>
          </div>
        </form>
      )}

      {/* TAB 1: Simple Prices & Stock Table */}
      {tab === 'prices' && (
        <section className="bg-white border border-[#EAE2D8] rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-[#EAE2D8] flex flex-wrap items-center justify-between gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="w-4 h-4 text-[#9A8980] absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="جستجوی نام ماده اولیه..."
                className="w-full rounded-xl border border-[#EAE2D8] pr-9 pl-3 py-2 text-xs bg-[#FAF8F5]"
              />
            </div>
            <div className="text-xs text-[#7D6C63]">
              برای ویرایش، مستقیم داخل کادر قیمت یا موجودی عدد جدید را تایپ کنید.
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs border-collapse tabular-nums">
              <thead>
                <tr className="bg-[#FAF8F5] border-b border-[#EAE2D8] text-[#6E5C54]">
                  <th className="py-3 px-4 font-bold">نام ماده اولیه</th>
                  <th className="py-3 px-3 font-bold">قیمت بسته (تومان)</th>
                  <th className="py-3 px-3 font-bold">نرخ هر کیلو / عدد</th>
                  <th className="py-3 px-3 font-bold">موجودی فعلی</th>
                  <th className="py-3 px-3 font-bold">حذف</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F3ECE4]">
                {filteredIngredients.map((ing) => {
                  const unitPrice =
                    ing.baseUnit === 'gram'
                      ? (ing.packPrice / Math.max(1, ing.packQuantityInBase)) * 1000
                      : ing.packPrice / Math.max(1, ing.packQuantityInBase);
                  const currentStockDisplay =
                    ing.baseUnit === 'gram'
                      ? Number((ing.currentStockInBase / 1000).toFixed(2))
                      : Math.round(ing.currentStockInBase);
                  return (
                    <tr key={ing.id} className="hover:bg-[#FAF8F5]">
                      <td className="py-3 px-4">
                        <div className="font-bold text-[#2B1E1A]">{ing.name}</div>
                        <div className="text-[11px] text-[#7D6C63]">
                          بسته:{' '}
                          {ing.baseUnit === 'gram'
                            ? `${formatNumber(ing.packQuantityInBase / 1000, { decimals: 2, usePersian: usePersianDigits })} کیلو`
                            : `${formatNumber(ing.packQuantityInBase, { usePersian: usePersianDigits })} عدد`}
                        </div>
                      </td>
                      <td className="py-3 px-3 w-44">
                        <LocaleNumberInput
                          value={ing.packPrice}
                          onChange={(val) =>
                            upsertIngredient({ ...ing, packPrice: Math.max(1, Math.round(val)) })
                          }
                          ariaLabel={`قیمت بسته ${ing.name}`}
                        />
                      </td>
                      <td className="py-3 px-3 font-bold text-[#2D6A4F]">
                        <PrivacyValue>{fmt(Math.round(unitPrice))}</PrivacyValue>
                        <span className="text-[10px] text-[#7D6C63] font-normal mr-1">
                          / {ing.baseUnit === 'gram' ? 'کیلو' : 'عدد'}
                        </span>
                      </td>
                      <td className="py-3 px-3 w-40">
                        <LocaleNumberInput
                          value={currentStockDisplay}
                          onChange={(val) =>
                            upsertIngredient({
                              ...ing,
                              currentStockInBase: Math.max(
                                0,
                                ing.baseUnit === 'gram' ? Math.round(val * 1000) : Math.round(val)
                              ),
                            })
                          }
                          suffix={ing.baseUnit === 'gram' ? 'کیلو' : 'عدد'}
                          ariaLabel={`موجودی ${ing.name}`}
                        />
                      </td>
                      <td className="py-3 px-3">
                        <button
                          type="button"
                          aria-label={`حذف ${ing.name}`}
                          onClick={() => deleteIngredient(ing.id)}
                          className="p-1.5 rounded-lg text-[#C84B31] hover:bg-[#FEF2F2] cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* TAB 2: Recharts Stock vs Reorder Point Chart + Quick Daily Usage & Restock */}
      {tab === 'reorder_chart' && (
        <div className="space-y-5">
          {/* Primary Recharts Bar Chart */}
          <section className="bg-white border border-[#EAE2D8] rounded-2xl p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-2 mb-4">
              <div>
                <h2 className="text-base font-extrabold text-[#2B1E1A]">
                  مقایسه موجودی انبار با نقطه سفارش
                </h2>
                <p className="text-xs text-[#7D6C63] mt-0.5">
                  هر ماده‌ای که میله آن زیر خط قرمز (۱۰۰٪) باشد، یعنی وقت خرید مجدد رسیده است.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-[11px] font-bold text-[#5A4A42]">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#C84B31] inline-block" />
                  زیر نقطه سفارش
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#D97706] inline-block" />
                  نزدیک هشدار
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#2D6A4F] inline-block" />
                  موجودی کافی
                </span>
              </div>
            </div>

            <div className="h-[300px] w-full" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 20, right: 16, left: 8, bottom: 52 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0E8DE" vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: '#4B3B34' }}
                    interval={0}
                    angle={-25}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#5A4A42' }}
                    tickFormatter={(v) => `${formatDigits(v, usePersianDigits)}٪`}
                    domain={[0, (max: number) => Math.max(150, Math.ceil(max / 20) * 20)]}
                  />
                  <Tooltip
                    formatter={(
                      value: unknown,
                      _name: unknown,
                      props: { payload?: { rawRatioPct?: number; daysOfSupply?: number } }
                    ) => {
                      const raw = props?.payload?.rawRatioPct ?? Number(value);
                      const days = props?.payload?.daysOfSupply;
                      return [
                        `${formatDigits(raw, usePersianDigits)}٪ از نقطه سفارش${
                          days != null && days < 900
                            ? ` (${formatNumber(days, { decimals: 1, usePersian: usePersianDigits })} روز موجودی)`
                            : ''
                        }`,
                        'وضعیت انبار',
                      ];
                    }}
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
                  <Bar dataKey="ratioPct" radius={[6, 6, 0, 0]} maxBarSize={38}>
                    {chartData.map((entry, idx) => (
                      <Cell
                        key={idx}
                        fill={
                          entry.status === 'critical'
                            ? '#C84B31'
                            : entry.status === 'warning'
                            ? '#D97706'
                            : '#2D6A4F'
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* Simple Daily Usage Logger + Actionable Reorder List */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <form
              onSubmit={handleLogUsage}
              className="lg:col-span-4 bg-white border border-[#EAE2D8] rounded-2xl p-4 sm:p-5 space-y-3 h-fit"
            >
              <h2 className="text-sm font-extrabold text-[#2B1E1A]">ثبت مصرف امروز انبار</h2>
              <p className="text-xs text-[#7D6C63]">
                مصرف روزانه هر ماده را ثبت کنید تا به صورت خودکار از موجودی کم شود.
              </p>

              <div>
                <label className="block text-[11px] font-bold text-[#4B3B34] mb-1">
                  ماده اولیه
                </label>
                <select
                  aria-label="انتخاب ماده برای ثبت مصرف"
                  value={logIngId}
                  onChange={(e) => setLogIngId(e.target.value)}
                  className="w-full rounded-lg border border-[#EAE2D8] bg-white px-3 py-2 text-xs font-semibold"
                >
                  {data.ingredients.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#4B3B34] mb-1">
                  مقدار مصرف ({selectedLogIng?.baseUnit === 'piece' ? 'عدد' : 'گرم'})
                </label>
                <LocaleNumberInput
                  value={logAmount}
                  onChange={setLogAmount}
                  min={1}
                  suffix={selectedLogIng?.baseUnit === 'piece' ? 'عدد' : 'گرم'}
                />
              </div>

              <button
                type="submit"
                className="w-full rounded-xl bg-[#2B1E1A] hover:bg-[#3E2D27] text-white py-2.5 text-xs font-bold cursor-pointer"
              >
                ثبت مصرف و کسر از موجودی
              </button>
            </form>

            <section className="lg:col-span-8 bg-white border border-[#EAE2D8] rounded-2xl overflow-hidden">
              <div className="p-4 border-b border-[#EAE2D8]">
                <h2 className="text-sm font-extrabold text-[#2B1E1A]">
                  لیست وضعیت نقطه سفارش و شارژ سریع
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs border-collapse tabular-nums">
                  <thead>
                    <tr className="bg-[#FAF8F5] border-b border-[#EAE2D8] text-[#6E5C54]">
                      <th className="py-2.5 px-3 font-bold">ماده</th>
                      <th className="py-2.5 px-3 font-bold">موجودی فعلی</th>
                      <th className="py-2.5 px-3 font-bold">نقطه سفارش</th>
                      <th className="py-2.5 px-3 font-bold">پوشش</th>
                      <th className="py-2.5 px-3 font-bold">شارژ انبار</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F3ECE4]">
                    {monitor.items.map((item) => {
                      const isGram = item.baseUnit === 'gram';
                      const fmtQty = (v: number) =>
                        isGram
                          ? `${formatNumber(v / 1000, { decimals: 1, usePersian: usePersianDigits })} کیلو`
                          : `${formatNumber(v, { usePersian: usePersianDigits })} عدد`;
                      return (
                        <tr key={item.ingredientId} className="hover:bg-[#FAF8F5]">
                          <td className="py-2.5 px-3 font-bold text-[#2B1E1A]">{item.name}</td>
                          <td className="py-2.5 px-3">{fmtQty(item.currentStockInBase)}</td>
                          <td className="py-2.5 px-3 text-[#6E5C54]">
                            {fmtQty(item.reorderPointInBase)}
                          </td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`font-extrabold ${
                                item.status === 'critical'
                                  ? 'text-[#C84B31]'
                                  : item.status === 'warning'
                                  ? 'text-[#D97706]'
                                  : 'text-[#2D6A4F]'
                              }`}
                            >
                              {item.daysOfSupply < 900
                                ? `${formatNumber(item.daysOfSupply, { decimals: 1, usePersian: usePersianDigits })} روز`
                                : 'کافی'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            <button
                              type="button"
                              onClick={() =>
                                restockIngredient(
                                  item.ingredientId,
                                  Math.max(1, item.suggestedOrderPacks)
                                )
                              }
                              className="inline-flex items-center gap-1 rounded-lg bg-[#ECFDF5] hover:bg-[#D1FAE5] text-[#065F46] border border-[#A7F3D0] px-2.5 py-1 text-[11px] font-bold cursor-pointer"
                            >
                              <PackagePlus className="w-3.5 h-3.5" />
                              <span>
                                +{formatDigits(Math.max(1, item.suggestedOrderPacks), usePersianDigits)} بسته
                              </span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </div>
      )}
    </div>
  );
};
