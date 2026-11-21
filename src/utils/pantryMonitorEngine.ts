import {
  ComputedWorkshopSummary,
  DailyConsumptionLog,
  Ingredient,
  IngredientCategory,
  WorkshopData,
} from '../types';
import { flattenRecipeIngredientUsage, getIngredientUnitCost } from './costEngine';
import { safeDiv } from './formatters';

export type StockStatus = 'critical' | 'warning' | 'healthy';

export interface DailyConsumptionPoint {
  dayOffset: number; // -6 .. 0 (today)
  dayLabel: string;
  theoreticalBase: number;
  actualBase: number;
  variancePct: number;
  hasLoggedEntry: boolean;
}

export interface DepletionForecastPoint {
  day: number; // 0 .. 7
  dayLabel: string;
  projectedStockBase: number;
  reorderPointBase: number;
  safetyStockBase: number;
  isBelowReorder: boolean;
}

export interface PantryItemMonitorMetric {
  ingredientId: string;
  name: string;
  shortName: string;
  category: IngredientCategory;
  baseUnit: Ingredient['baseUnit'];
  packLabel: string;
  packQuantityInBase: number;
  packPrice: number;
  unitCost: number;
  supplierName: string;
  currentStockInBase: number;
  safetyStockInBase: number;
  leadTimeDays: number;
  monthlyConsumptionBase: number;
  dailyConsumptionBase: number;
  reorderPointInBase: number;
  stockToReorderPct: number; // 100% = exactly at Reorder Point
  gapToReorderBase: number; // positive = surplus above ROP, negative = deficit below ROP
  daysOfSupply: number; // currentStock / dailyConsumption
  daysUntilReorder: number; // (currentStock - ROP) / dailyConsumption
  status: StockStatus;
  suggestedOrderPacks: number;
  suggestedOrderBase: number;
  suggestedOrderCost: number;
  stockValueToman: number;
  last7Days: DailyConsumptionPoint[];
  next7DaysDepletion: DepletionForecastPoint[];
}

export interface PantryMonitorSummary {
  items: PantryItemMonitorMetric[];
  criticalCount: number;
  warningCount: number;
  healthyCount: number;
  totalStockValueToman: number;
  totalDailyBurnCostToman: number;
  urgentOrderBudgetToman: number;
  averageDaysOfSupply: number;
}

const DAY_LABELS_PAST = [
  '۶ روز قبل',
  '۵ روز قبل',
  '۴ روز قبل',
  '۳ روز قبل',
  '۲ روز قبل',
  'دیروز',
  'امروز',
];

const DAY_LABELS_FUTURE = [
  'امروز',
  'فردا',
  '۲ روز بعد',
  '۳ روز بعد',
  '۴ روز بعد',
  '۵ روز بعد',
  '۶ روز بعد',
  '۷ روز بعد',
];

// Deterministic realistic daily fluctuation pattern (weekends/Thursday busy in Iranian confectioneries)
const DETERMINISTIC_DAY_FACTORS = [0.92, 0.96, 1.04, 0.95, 1.12, 1.18, 1.0];

function shortenName(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length <= 2) return name;
  return `${words[0]} ${words[1]}`;
}

/**
 * Pure deterministic Pantry Daily Consumption & Reorder Point Monitor Engine.
 * Reorder Point (ROP) = (Daily Consumption × Supplier Lead Time Days) + Safety Stock
 */
export function computePantryMonitorMetrics(
  data: WorkshopData,
  summary: ComputedWorkshopSummary,
  options?: { leadTimeOverrideDays?: number | null }
): PantryMonitorSummary {
  const activeDays = Math.max(1, data.settings.activeWorkingDaysPerMonth || 28);
  const subMap = new Map(data.subRecipes.map((s) => [s.id, s]));
  const recipeMetricMap = new Map(summary.recipeMetrics.map((m) => [m.recipeId, m]));

  // Calculate theoretical monthly consumption per ingredient from active recipes
  const monthlyUsageByIng: Record<string, number> = {};
  for (const recipe of data.recipes) {
    const rm = recipeMetricMap.get(recipe.id);
    if (!rm || recipe.monthlySalesKg <= 0) continue;
    const spoilageFactor = safeDiv(
      1,
      1 - Math.min(0.6, Math.max(0, recipe.shelfLifeSpoilagePct / 100)),
      1
    );
    const batchesPerMonth = safeDiv(recipe.monthlySalesKg * spoilageFactor, rm.netYieldKg, 0);
    flattenRecipeIngredientUsage(recipe.items, subMap, batchesPerMonth, monthlyUsageByIng);

    if (data.settings.enforceBoxWeightDeduction && recipe.boxIngredientId) {
      monthlyUsageByIng[recipe.boxIngredientId] =
        (monthlyUsageByIng[recipe.boxIngredientId] ?? 0) + recipe.monthlySalesKg;
    }
  }

  const logs: DailyConsumptionLog[] = data.dailyConsumptionLogs ?? [];

  const items: PantryItemMonitorMetric[] = data.ingredients.map((ing, idx) => {
    const unitCost = getIngredientUnitCost(ing);
    const monthlyConsumptionBase = monthlyUsageByIng[ing.id] ?? 0;
    const dailyConsumptionBase = safeDiv(monthlyConsumptionBase, activeDays, 0);
    const leadTimeDays =
      options?.leadTimeOverrideDays != null && options.leadTimeOverrideDays > 0
        ? options.leadTimeOverrideDays
        : Math.max(1, ing.leadTimeDays ?? 3);

    const safetyStockInBase = Math.max(0, ing.safetyStockInBase);
    const currentStockInBase = Math.max(0, ing.currentStockInBase);

    // Classic inventory engineering Reorder Point formula
    const reorderPointInBase = dailyConsumptionBase * leadTimeDays + safetyStockInBase;
    const stockToReorderPct =
      reorderPointInBase > 0
        ? safeDiv(currentStockInBase, reorderPointInBase, 0) * 100
        : currentStockInBase > 0
        ? 200
        : 0;

    const gapToReorderBase = currentStockInBase - reorderPointInBase;
    const daysOfSupply =
      dailyConsumptionBase > 0 ? safeDiv(currentStockInBase, dailyConsumptionBase, 999) : 999;
    const daysUntilReorder =
      dailyConsumptionBase > 0 ? safeDiv(gapToReorderBase, dailyConsumptionBase, 999) : 999;

    let status: StockStatus = 'healthy';
    if (currentStockInBase <= reorderPointInBase) {
      status = 'critical';
    } else if (stockToReorderPct <= 130 || daysOfSupply <= leadTimeDays + 3) {
      status = 'warning';
    }

    // Target restock level = Reorder Point + 7 days of consumption (1 week cycle stock)
    const targetStockBase = reorderPointInBase + dailyConsumptionBase * 7;
    const deficitToTargetBase = Math.max(0, targetStockBase - currentStockInBase);
    const suggestedOrderPacks =
      status === 'critical' || status === 'warning'
        ? Math.max(1, Math.ceil(safeDiv(deficitToTargetBase, Math.max(0.001, ing.packQuantityInBase), 0)))
        : 0;
    const suggestedOrderBase = suggestedOrderPacks * ing.packQuantityInBase;
    const suggestedOrderCost = suggestedOrderPacks * ing.packPrice;
    const stockValueToman = currentStockInBase * unitCost;

    // 7-day daily consumption history (past 6 days + today)
    const ingLogs = logs.filter((l) => l.ingredientId === ing.id);
    const last7Days: DailyConsumptionPoint[] = [];
    for (let i = 0; i < 7; i++) {
      const daysAgo = 6 - i; // 6 .. 0
      const matchingLogs = ingLogs.filter((l) => l.daysAgo === daysAgo);
      const hasLoggedEntry = matchingLogs.length > 0;
      const loggedSum = matchingLogs.reduce((s, l) => s + Math.max(0, l.actualUsedInBase), 0);

      // Slight deterministic ingredient-specific variation when no explicit log exists
      const ingBias = 0.96 + ((idx * 7 + i * 3) % 11) * 0.012;
      const factor = DETERMINISTIC_DAY_FACTORS[i] * ingBias;
      const actualBase = hasLoggedEntry
        ? loggedSum
        : dailyConsumptionBase > 0
        ? dailyConsumptionBase * factor
        : 0;

      const variancePct =
        dailyConsumptionBase > 0
          ? safeDiv(actualBase - dailyConsumptionBase, dailyConsumptionBase, 0) * 100
          : 0;

      last7Days.push({
        dayOffset: -daysAgo,
        dayLabel: DAY_LABELS_PAST[i],
        theoreticalBase: dailyConsumptionBase,
        actualBase,
        variancePct,
        hasLoggedEntry,
      });
    }

    // 7-day projected stock depletion trajectory
    const next7DaysDepletion: DepletionForecastPoint[] = [];
    for (let day = 0; day <= 7; day++) {
      const projected = Math.max(0, currentStockInBase - dailyConsumptionBase * day);
      next7DaysDepletion.push({
        day,
        dayLabel: DAY_LABELS_FUTURE[day],
        projectedStockBase: projected,
        reorderPointBase: reorderPointInBase,
        safetyStockBase: safetyStockInBase,
        isBelowReorder: projected <= reorderPointInBase,
      });
    }

    return {
      ingredientId: ing.id,
      name: ing.name,
      shortName: shortenName(ing.name),
      category: ing.category,
      baseUnit: ing.baseUnit,
      packLabel: ing.packLabel,
      packQuantityInBase: ing.packQuantityInBase,
      packPrice: ing.packPrice,
      unitCost,
      supplierName: ing.supplierName ?? '',
      currentStockInBase,
      safetyStockInBase,
      leadTimeDays,
      monthlyConsumptionBase,
      dailyConsumptionBase,
      reorderPointInBase,
      stockToReorderPct,
      gapToReorderBase,
      daysOfSupply,
      daysUntilReorder,
      status,
      suggestedOrderPacks,
      suggestedOrderBase,
      suggestedOrderCost,
      stockValueToman,
      last7Days,
      next7DaysDepletion,
    };
  });

  // Sort by urgency: lowest stockToReorderPct first
  items.sort((a, b) => a.stockToReorderPct - b.stockToReorderPct);

  const criticalCount = items.filter((i) => i.status === 'critical').length;
  const warningCount = items.filter((i) => i.status === 'warning').length;
  const healthyCount = items.filter((i) => i.status === 'healthy').length;
  const totalStockValueToman = items.reduce((s, i) => s + i.stockValueToman, 0);
  const totalDailyBurnCostToman = items.reduce(
    (s, i) => s + i.dailyConsumptionBase * i.unitCost,
    0
  );
  const urgentOrderBudgetToman = items
    .filter((i) => i.status === 'critical')
    .reduce((s, i) => s + i.suggestedOrderCost, 0);

  const activeConsuming = items.filter((i) => i.dailyConsumptionBase > 0 && i.daysOfSupply < 900);
  const averageDaysOfSupply =
    activeConsuming.length > 0
      ? activeConsuming.reduce((s, i) => s + i.daysOfSupply, 0) / activeConsuming.length
      : 0;

  return {
    items,
    criticalCount,
    warningCount,
    healthyCount,
    totalStockValueToman,
    totalDailyBurnCostToman,
    urgentOrderBudgetToman,
    averageDaysOfSupply,
  };
}
