import test from 'node:test';
import assert from 'node:assert/strict';
import { createDemoWorkshopData } from '../data/demoData';
import {
  computeCashVsCheckArbitrage,
  computeDiscountRequiredVolumeIncreasePct,
  computeSnappfoodShieldPrice,
  computeStockpileArbitrage,
  computeTrueMonthlyStaffCost,
  computeWorkshopSummary,
  solveGoalSeekPaths,
} from './costEngine';
import { runSeasonalForecast } from './forecastEngine';
import { runMonteCarloSimulation } from './monteCarloEngine';
import { runTornadoSensitivity } from './sensitivityEngine';
import { parseLocaleNumber, roundToStep } from './formatters';
import {
  STRATEGIC_REPORT_TEMPLATES,
  generateStrategicTextReport,
} from './strategicReportEngine';
import {
  classifyAppsScriptResponse,
  validateAppsScriptUrl,
} from './sheetsUrlValidator';
import { computePantryMonitorMetrics } from './pantryMonitorEngine';
import {
  computeEquipmentMonthlyDepreciation,
  computeOverheadStudioAnalysis,
  computePeriodicBillToMonthly,
} from './overheadEngine';
import { OverheadAllocationMethod } from '../types';

test('parseLocaleNumber converts Persian and Arabic numerals accurately', () => {
  assert.equal(parseLocaleNumber('۴,۶۵۰,۰۰۰'), 4650000);
  assert.equal(parseLocaleNumber('١٢٥٠٫٥'), 1250.5);
  assert.equal(parseLocaleNumber('12,500'), 12500);
  assert.equal(parseLocaleNumber('invalid'), 0);
});

test('Iranian Labor Law true staff cost includes 23% insurance + Eidi (2/12) + Sanavat (1/12)', () => {
  const res = computeTrueMonthlyStaffCost({
    id: 's1',
    name: 'Test',
    role: 'Chef',
    baseMonthlySalary: 24_000_000,
    monthlyBenefits: 2_000_000,
    includeInsurance23: true,
    includeEidi: true,
    includeSanavat: true,
    active: true,
  });
  assert.equal(res.insurance23, 5_520_000);
  assert.equal(res.eidiAccrual, 4_000_000);
  assert.equal(res.sanavatAccrual, 2_000_000);
  assert.equal(res.totalTrueCost, 37_520_000);
});

test('Workshop summary calculates coherent Real Safe Owner Draw and cascades ingredient price changes', () => {
  const demo = createDemoWorkshopData();
  const baseSummary = computeWorkshopSummary(demo);

  assert.ok(baseSummary.totalMonthlyRevenue > 0);
  assert.ok(baseSummary.nominalMonthlyProfit > 0);
  assert.ok(baseSummary.inventoryReplacementReserve > 0);
  assert.ok(baseSummary.realSafeOwnerDraw < baseSummary.nominalMonthlyProfit);
  assert.equal(baseSummary.recipeMetrics.length, 6);

  // Cascade test: increase butter price by +40%
  const shocked = {
    ...demo,
    ingredients: demo.ingredients.map((i) =>
      i.id === 'ing-butter' ? { ...i, packPrice: Math.round(i.packPrice * 1.4) } : i
    ),
  };
  const shockedSummary = computeWorkshopSummary(shocked);
  assert.ok(shockedSummary.nominalMonthlyProfit < baseSummary.nominalMonthlyProfit);
  assert.ok(shockedSummary.totalMonthlyMaterialCost > baseSummary.totalMonthlyMaterialCost);
});

test('SnappFood Shield Price and Discount Trap math are mathematically exact', () => {
  const shield = computeSnappfoodShieldPrice(460000, 18, 14000, 0.6, 10000);
  assert.equal(shield, roundToStep((460000 * 0.994 + 14000) / 0.82, 10000));
  assert.ok(shield >= 570000);

  const trap = computeDiscountRequiredVolumeIncreasePct(30, 15);
  assert.equal(trap.impossible, false);
  assert.equal(Math.round(trap.requiredVolumeIncreasePct), 100);

  const impossibleTrap = computeDiscountRequiredVolumeIncreasePct(20, 25);
  assert.equal(impossibleTrap.impossible, true);
});

test('Iranian Bazaar Arbitrage calculators produce accurate verdicts', () => {
  const stockpile = computeStockpileArbitrage({
    purchaseAmountToman: 100_000_000,
    expectedPriceJumpPct: 22,
    holdingMonths: 2,
    monthlyCapitalCostPct: 4,
    spoilageRiskPct: 2,
  });
  assert.equal(stockpile.verdict, 'stockpile');
  assert.equal(Math.round(stockpile.netBenefit), 12_000_000);

  const cashVsCheck = computeCashVsCheckArbitrage({
    invoiceAmountToman: 100_000_000,
    cashDiscountPct: 5,
    checkDays: 60,
    monthlyCapitalCostPct: 4.5,
  });
  // 5M discount vs 95M * 9% = 8.55M value of money -> buying by check wins
  assert.equal(cashVsCheck.verdict, 'buy_check');
});

test('12-Month Seasonal Forecast widens P10/P90 confidence bands with horizon', () => {
  const demo = createDemoWorkshopData();
  const summary = computeWorkshopSummary(demo);
  const fc = runSeasonalForecast(demo, summary, {
    horizonMonths: 12,
    monthlyDemandGrowthPct: 1,
    annualMaterialInflationPct: 38,
    pricePassThroughPct: 85,
  });
  assert.equal(fc.length, 12);
  const m1RelSpread = (fc[0].revenueP90 - fc[0].revenueP10) / fc[0].revenueBase;
  const m12RelSpread = (fc[11].revenueP90 - fc[11].revenueP10) / fc[11].revenueBase;
  assert.ok(m12RelSpread > m1RelSpread * 2.5);
});

test('Monte Carlo 1,000-iteration engine is deterministic, fast, and properly ordered', () => {
  const demo = createDemoWorkshopData();
  const summary = computeWorkshopSummary(demo);
  const cfg = {
    demandVolatilityPct: 14,
    costVolatilityPct: 11,
    spoilageVolatilityPct: 2.5,
    iterations: 1000,
    seed: 140409,
  };
  const run1 = runMonteCarloSimulation(demo, summary, cfg);
  const run2 = runMonteCarloSimulation(demo, summary, cfg);

  assert.equal(run1.medianProfit, run2.medianProfit);
  assert.equal(run1.profitAtRisk95, run2.profitAtRisk95);
  assert.ok(run1.profitAtRisk95 <= run1.medianProfit);
  assert.ok(run1.medianProfit <= run1.bestCase95);
  assert.equal(run1.histogram.length, 15);
  assert.equal(
    run1.histogram.reduce((s, b) => s + b.count, 0),
    1000
  );
  assert.ok(run1.durationMs < 200);
});

test('Tornado Sensitivity sorts 7 drivers descending by total Toman impact spread', () => {
  const demo = createDemoWorkshopData();
  const summary = computeWorkshopSummary(demo);
  const tornado = runTornadoSensitivity(demo, summary);
  assert.equal(tornado.length, 7);
  for (let i = 1; i < tornado.length; i++) {
    assert.ok(tornado[i - 1].totalSpread >= tornado[i].totalSpread);
  }
  const paths = solveGoalSeekPaths(summary, summary.realSafeOwnerDraw + 80_000_000, demo.settings);
  assert.equal(paths.length, 3);
});

test('Rule-based strategic report engine generates grounded Persian reports across all templates and reacts to shocks', () => {
  const demo = createDemoWorkshopData();
  const summary = computeWorkshopSummary(demo);
  const forecast = runSeasonalForecast(demo, summary, {
    horizonMonths: 12,
    monthlyDemandGrowthPct: 1.2,
    annualMaterialInflationPct: 38,
    pricePassThroughPct: 85,
  });
  const monteCarlo = runMonteCarloSimulation(demo, summary, {
    demandVolatilityPct: 14,
    costVolatilityPct: 11,
    spoilageVolatilityPct: 2.5,
    iterations: 1000,
    seed: 140409,
  });
  const tornado = runTornadoSensitivity(demo, summary);

  assert.equal(STRATEGIC_REPORT_TEMPLATES.length, 5);
  for (const tpl of STRATEGIC_REPORT_TEMPLATES) {
    const execReport = generateStrategicTextReport(demo, summary, monteCarlo, tornado, forecast, {
      templateId: tpl.id,
      tone: 'executive',
    });
    const practicalReport = generateStrategicTextReport(demo, summary, monteCarlo, tornado, forecast, {
      templateId: tpl.id,
      tone: 'practical',
    });
    assert.ok(execReport.sections.length >= 1);
    assert.equal(execReport.headlineMetrics.length, 4);
    assert.ok(execReport.firedRuleCount >= 3);
    assert.ok(execReport.plainText.includes(demo.settings.workshopName));
    assert.ok(execReport.actionPlan.length >= 3);
    assert.notEqual(execReport.executiveSummaryLine, practicalReport.executiveSummaryLine);
  }

  // Shock test: triple ingredient costs -> realSafeOwnerDraw <= 0 -> critical verdict
  const distressed = {
    ...demo,
    ingredients: demo.ingredients.map((i) => ({ ...i, packPrice: i.packPrice * 3 })),
  };
  const distressedSummary = computeWorkshopSummary(distressed);
  const distressedMc = runMonteCarloSimulation(distressed, distressedSummary, {
    demandVolatilityPct: 14,
    costVolatilityPct: 11,
    spoilageVolatilityPct: 2.5,
    iterations: 1000,
    seed: 140409,
  });
  const distressedReport = generateStrategicTextReport(
    distressed,
    distressedSummary,
    distressedMc,
    tornado,
    forecast,
    { templateId: 'executive_full', tone: 'executive' }
  );
  assert.equal(distressedReport.overallStatus, 'critical');
});

test('validateAppsScriptUrl accepts canonical, multi-account /u/N/, Workspace, BiDi-polluted, and bare Deployment IDs while rejecting bad hosts', () => {
  const validStandard = validateAppsScriptUrl(
    '  \u200Ehttps://script.google.com/macros/s/AKfycbx12345_test-id/exec/\u200F  '
  );
  assert.equal(validStandard.valid, true);
  assert.equal(
    validStandard.normalizedUrl,
    'https://script.google.com/macros/s/AKfycbx12345_test-id/exec'
  );

  const multiAccount = validateAppsScriptUrl(
    'https://script.google.com/macros/u/1/s/AKfycbxMultiAcc99/exec'
  );
  assert.equal(multiAccount.valid, true);
  assert.equal(
    multiAccount.normalizedUrl,
    'https://script.google.com/macros/s/AKfycbxMultiAcc99/exec'
  );
  assert.ok(multiAccount.autoCorrectedNote?.includes('/u/1/'));

  const bareDeployId = validateAppsScriptUrl('AKfycbxBareDeploymentId1234567890');
  assert.equal(bareDeployId.valid, true);
  assert.equal(
    bareDeployId.normalizedUrl,
    'https://script.google.com/macros/s/AKfycbxBareDeploymentId1234567890/exec'
  );

  const validWorkspace = validateAppsScriptUrl(
    'https://script.google.com/a/macros/mybakery.ir/u/0/s/AKfycbx999/exec'
  );
  assert.equal(validWorkspace.valid, true);
  assert.equal(
    validWorkspace.normalizedUrl,
    'https://script.google.com/a/macros/mybakery.ir/s/AKfycbx999/exec'
  );

  const spreadsheetUrl = validateAppsScriptUrl(
    'https://docs.google.com/spreadsheets/d/1abcDEF/edit#gid=0'
  );
  assert.equal(spreadsheetUrl.valid, false);
  assert.ok(spreadsheetUrl.error?.includes('گوگل شیت'));

  const devUrl = validateAppsScriptUrl(
    'https://script.google.com/macros/s/AKfycbx123/dev'
  );
  assert.equal(devUrl.valid, false);
  assert.ok(devUrl.error?.includes('/dev'));

  const editorUrl = validateAppsScriptUrl(
    'https://script.google.com/home/projects/1abcDEF/edit'
  );
  assert.equal(editorUrl.valid, false);

  const ssrfHttp = validateAppsScriptUrl('http://127.0.0.1:3000/api/health');
  assert.equal(ssrfHttp.valid, false);

  const ssrfHost = validateAppsScriptUrl('https://evil.example.com/macros/s/abc/exec');
  assert.equal(ssrfHost.valid, false);
});

test('classifyAppsScriptResponse distinguishes login redirects, standalone null errors, HTML runtime errors, German 404s, legacy pings, and JSON success', () => {
  const loginRedirect = classifyAppsScriptResponse(
    302,
    'https://accounts.google.com/v3/signin/identifier',
    'text/html; charset=utf-8',
    'ServiceLogin',
    'push',
    1
  );
  assert.equal(loginRedirect.ok, false);
  assert.equal(loginRedirect.code, 'AUTH_REQUIRED');
  assert.ok(loginRedirect.message.includes('Anyone'));
  assert.equal(loginRedirect.debug?.redirectCount, 1);

  const standaloneNullErr = classifyAppsScriptResponse(
    200,
    'https://script.googleusercontent.com/macros/echo',
    'application/json',
    JSON.stringify({
      ok: false,
      error: "TypeError: Cannot read properties of null (reading 'getSheetByName')",
    }),
    'push'
  );
  assert.equal(standaloneNullErr.ok, false);
  assert.equal(standaloneNullErr.code, 'NO_ACTIVE_SPREADSHEET');

  const htmlRuntimeErrWithFooter = classifyAppsScriptResponse(
    200,
    'https://script.google.com/macros/s/AKfycbx/exec',
    'text/html',
    '<html><body><div>TypeError: foo is not a function</div><a href="https://accounts.google.com">help</a></body></html>',
    'push'
  );
  assert.equal(htmlRuntimeErrWithFooter.ok, false);
  assert.equal(htmlRuntimeErrWithFooter.code, 'SCRIPT_RUNTIME_ERROR');
  assert.ok(htmlRuntimeErrWithFooter.debug?.snippet?.includes('TypeError: foo is not a function'));

  const german404 = classifyAppsScriptResponse(
    404,
    'https://script.google.com/macros/s/AKfycbx/exec',
    'text/html',
    '<html lang="de"><body>Datei konnte nicht geöffnet werden</body></html>',
    'ping'
  );
  assert.equal(german404.ok, false);
  assert.equal(german404.code, 'NOT_FOUND');

  const legacyEmptyPing = classifyAppsScriptResponse(
    200,
    'https://script.googleusercontent.com/macros/echo',
    'application/json',
    JSON.stringify({ ok: false, error: 'نسخه پشتیبانی در تب App_State_Backup یافت نشد.' }),
    'ping'
  );
  assert.equal(legacyEmptyPing.ok, true);

  const pushSuccess = classifyAppsScriptResponse(
    200,
    'https://script.googleusercontent.com/macros/echo',
    'application/json',
    JSON.stringify({ ok: true, syncedAt: '2026-01-01T00:00:00Z', spreadsheetName: 'قنادی زعفرانیه' }),
    'push'
  );
  assert.equal(pushSuccess.ok, true);
  assert.ok(pushSuccess.message.includes('قنادی زعفرانیه'));

  const cellLimitErr = classifyAppsScriptResponse(
    200,
    'https://script.googleusercontent.com/macros/echo',
    'application/json',
    JSON.stringify({ ok: false, error: 'Exception: Your input contains more than the maximum of 50000 characters in a single cell.' }),
    'push'
  );
  assert.equal(cellLimitErr.ok, false);
  assert.equal(cellLimitErr.code, 'CELL_LIMIT');
});

test('Pantry Daily Monitor computes Reorder Point (ROP = daily * leadTime + safetyStock), status, and 7-day depletion accurately', () => {
  const demo = createDemoWorkshopData();
  const summary = computeWorkshopSummary(demo);
  const monitor = computePantryMonitorMetrics(demo, summary);

  assert.equal(monitor.items.length, demo.ingredients.length);
  assert.ok(monitor.criticalCount >= 1);
  assert.ok(monitor.totalDailyBurnCostToman > 0);
  assert.ok(monitor.totalStockValueToman > 0);

  const cream = monitor.items.find((i) => i.ingredientId === 'ing-cream');
  assert.ok(cream);
  // Cream has 28kg current stock, 35kg safety stock, plus 3 days daily usage -> must be critical
  assert.equal(cream.status, 'critical');
  assert.ok(cream.dailyConsumptionBase > 0);
  assert.equal(
    Math.round(cream.reorderPointInBase),
    Math.round(cream.dailyConsumptionBase * cream.leadTimeDays + cream.safetyStockInBase)
  );
  assert.equal(cream.last7Days.length, 7);
  assert.equal(cream.next7DaysDepletion.length, 8);
  assert.ok(cream.next7DaysDepletion[7].projectedStockBase <= cream.next7DaysDepletion[0].projectedStockBase);
  assert.ok(cream.suggestedOrderPacks >= 1);

  // Lead time override increases Reorder Point proportionally
  const monitor6Days = computePantryMonitorMetrics(demo, summary, { leadTimeOverrideDays: 6 });
  const cream6 = monitor6Days.items.find((i) => i.ingredientId === 'ing-cream')!;
  assert.ok(cream6.reorderPointInBase > cream.reorderPointInBase);
});

test('All 5 overhead allocation methods conserve total monthly overhead pool and match overheadBreakdown.byMethodPerKg', () => {
  const demo = createDemoWorkshopData();
  const baseSummary = computeWorkshopSummary(demo);
  const methods: OverheadAllocationMethod[] = [
    'weight',
    'time_abc',
    'hybrid',
    'oven_hours',
    'direct_cost',
  ];

  for (const method of methods) {
    const methodSummary = computeWorkshopSummary({
      ...demo,
      settings: { ...demo.settings, overheadAllocationMethod: method },
    });

    const allocatedSum = methodSummary.recipeMetrics.reduce(
      (sum, r) => sum + r.monthlyOverheadCost,
      0
    );
    // Total allocated overhead across all recipes must conserve the workshop overhead pool within 1 Toman
    assert.ok(
      Math.abs(allocatedSum - methodSummary.totalMonthlyOverheadAndPayroll) < 1,
      `Conservation failed for method ${method}`
    );

    // Every recipe's allocatedOverheadPerKg under this method must match baseSummary's byMethodPerKg
    for (const rm of methodSummary.recipeMetrics) {
      const baseRm = baseSummary.recipeMetrics.find((x) => x.recipeId === rm.recipeId)!;
      assert.ok(
        Math.abs(rm.allocatedOverheadPerKg - baseRm.overheadBreakdown.byMethodPerKg[method]) < 0.01,
        `Mismatch on ${rm.recipeId} for ${method}`
      );
      assert.equal(rm.overheadBreakdown.method, method);
    }
  }

  // Weight method must give identical per-kg overhead across all active recipes
  const weightSummary = computeWorkshopSummary({
    ...demo,
    settings: { ...demo.settings, overheadAllocationMethod: 'weight' },
  });
  const firstPerKg = weightSummary.recipeMetrics[0].allocatedOverheadPerKg;
  for (const rm of weightSummary.recipeMetrics) {
    assert.ok(Math.abs(rm.allocatedOverheadPerKg - firstPerKg) < 0.01);
  }
});

test('Overhead Studio converters and studio analysis compute exact depreciation, periodic bills, and checklist coverage', () => {
  const dep = computeEquipmentMonthlyDepreciation(720_000_000, 120_000_000, 5);
  assert.equal(dep.depreciableBase, 600_000_000);
  assert.equal(dep.annualDepreciation, 120_000_000);
  assert.equal(dep.monthlyDepreciation, 10_000_000);

  assert.equal(computePeriodicBillToMonthly(36_000_000, 12), 3_000_000);
  assert.equal(computePeriodicBillToMonthly(18_000_000, 2), 9_000_000);

  const demo = createDemoWorkshopData();
  const summary = computeWorkshopSummary(demo);
  const studio = computeOverheadStudioAnalysis(demo, summary);
  assert.equal(studio.totalPool, summary.totalMonthlyOverheadAndPayroll);
  assert.equal(studio.comparisonRows.length, demo.recipes.length);
  assert.ok(studio.categoryBreakdown.length >= 4);
  assert.ok(studio.checklist.length >= 7);
});


