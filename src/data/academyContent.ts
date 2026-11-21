import { HELP_DICTIONARY } from './helpDictionary';

export type GlossaryCategoryId =
  | 'all'
  | 'ceo_profit'
  | 'scientific_risk'
  | 'pantry_arbitrage'
  | 'costing_recipes'
  | 'sales_channels'
  | 'cfo_labor_checks';

export interface GlossaryTerm {
  id: string;
  title: string;
  enTerm?: string;
  category: Exclude<GlossaryCategoryId, 'all'>;
  moduleTag: string;
  simple: string;
  example: string;
  why: string;
  formula?: string;
}

export const GLOSSARY_CATEGORIES: Array<{ id: GlossaryCategoryId; label: string }> = [
  { id: 'all', label: 'همه ماژول‌ها' },
  { id: 'ceo_profit', label: 'داشبورد و سود واقعی' },
  { id: 'costing_recipes', label: 'بهایابی، رسپی و سربار' },
  { id: 'scientific_risk', label: 'پیش‌بینی علمی و ریسک' },
  { id: 'pantry_arbitrage', label: 'انبار، پرت و آربیتراژ' },
  { id: 'sales_channels', label: 'فروش، اسنپ‌فود و اتحادیه' },
  { id: 'cfo_labor_checks', label: 'قانون کار، فصول و چک' },
];

/**
 * Unified, comprehensive glossary covering every concept and technical term across all modules.
 * Combines the live HELP_DICTIONARY with dedicated costing & accounting foundational terms.
 */
export const ACADEMY_GLOSSARY: GlossaryTerm[] = [
  // --- CEO & Real Profit ---
  {
    id: 'realSafeDraw',
    ...HELP_DICTIONARY.realSafeDraw,
    enTerm: 'Real Safe Owner Draw',
    category: 'ceo_profit',
    moduleTag: 'خلاصه نتایج · پایلوت ۱A',
    formula: 'سود واقعی = سود اسمی − ذخیره جایگزینی تورم انبار − ذخیره سپر رکود',
  },
  {
    id: 'nominalProfit',
    ...HELP_DICTIONARY.nominalProfit,
    enTerm: 'Nominal Monthly Profit',
    category: 'ceo_profit',
    moduleTag: 'پایلوت ۱A',
    formula: 'سود اسمی = درآمد کل − مواد و بسته‌بندی − کارمزد کانال − سربار و حقوق',
  },
  {
    id: 'waterfallChart',
    ...HELP_DICTIONARY.waterfallChart,
    enTerm: 'Capital Erosion Waterfall',
    category: 'ceo_profit',
    moduleTag: 'پایلوت ۱A',
  },
  {
    id: 'blendedMargin',
    ...HELP_DICTIONARY.blendedMargin,
    enTerm: 'Blended Net Margin %',
    category: 'ceo_profit',
    moduleTag: 'خلاصه نتایج · پایلوت ۱A',
    formula: 'حاشیه سود خالص = (سود اسمی ماهانه ÷ فروش کل ماهانه) × ۱۰۰',
  },
  {
    id: 'contributionMargin',
    title: 'حاشیه مشارکت (سود ناخالص متغیر)',
    enTerm: 'Contribution Margin Ratio',
    category: 'ceo_profit',
    moduleTag: 'پایلوت ۱A · نقطه سربه‌سر',
    simple: 'بخشی از هر تومان فروش که پس از کسر هزینه مواد اولیه، جعبه و کارمزد باقی می‌ماند تا اول اجاره و حقوق را بدهد و بعد سود شما شود.',
    example: 'اگر شیرینی ۵۰۰ هزار تومانی، ۲۵۰ هزار تومان مواد و جعبه ببرد، حاشیه مشارکت آن ۵۰٪ است.',
    why: 'پایه اصلی محاسبه نقطه سربه‌سر است؛ هرچه حاشیه مشارکت بالاتر باشد، زودتر در ماه به سود می‌رسید.',
    formula: 'نسبت حاشیه مشارکت = (فروش − هزینه‌های متغیر مواد، جعبه و کارمزد) ÷ فروش',
  },
  {
    id: 'breakEven',
    ...HELP_DICTIONARY.breakEven,
    enTerm: 'Break-Even Point',
    category: 'ceo_profit',
    moduleTag: 'خلاصه نتایج · پایلوت ۱A',
    formula: 'نقطه سربه‌سر (تومان) = کل هزینه‌های ثابت و حقوق ÷ نسبت حاشیه مشارکت',
  },
  {
    id: 'goalSeek',
    ...HELP_DICTIONARY.goalSeek,
    enTerm: 'Profit Goal-Seek',
    category: 'ceo_profit',
    moduleTag: 'پایلوت ۱A',
  },
  {
    id: 'healthScore',
    ...HELP_DICTIONARY.healthScore,
    enTerm: 'Workshop Health Score (0–100)',
    category: 'ceo_profit',
    moduleTag: 'نوار بالای برنامه · خلاصه نتایج',
  },
  {
    id: 'whatIfSandbox',
    title: 'آزمایشگاه سناریو (حالت What-If)',
    enTerm: 'Scenario Sandbox',
    category: 'ceo_profit',
    moduleTag: 'منوی کناری',
    simple: 'یک کپی موقت و بی‌خطر از اطلاعات کارگاه می‌سازد تا هر تغییری (مثل گران شدن کره یا افزایش قیمت منو) را امتحان کنید و اگر نخواستید با یک کلیک لغو کنید.',
    example: 'می‌توانید ببینید اگر قیمت پسته ۴۰٪ بالا برود چه بلایی سر سود می‌آید، بدون اینکه اعداد اصلی کارگاه خراب شوند.',
    why: 'اجازه می‌دهد قبل از تصمیم‌های مالی بزرگ، نتیجه دقیق آن‌ها را روی کل کارگاه ببینید.',
  },
  {
    id: 'privacyMode',
    ...HELP_DICTIONARY.privacyMode,
    enTerm: 'Owner Privacy Blur',
    category: 'ceo_profit',
    moduleTag: 'نوار بالای برنامه',
  },

  // --- Costing, Recipes & Overhead ---
  {
    id: 'subRecipe',
    title: 'زیررسپی یا نیمه‌آماده',
    enTerm: 'Sub-Recipe / Intermediate',
    category: 'costing_recipes',
    moduleTag: 'ستون ۳ · فرمولاسیون',
    simple: 'مواد ترکیبی که خودتان در کارگاه می‌پزید و بعد داخل چند شیرینی مختلف استفاده می‌کنید؛ مثل کرم پاتیسیر، شربت بار زعفرانی یا خمیر هزارلا.',
    example: 'وقتی قیمت شکر یا شیر عوض می‌شود، قیمت هر گرم شربت بار به‌طور خودکار تغییر می‌کند و روی تمام باقلواها اثر می‌گذارد.',
    why: 'جلوی دوباره کاری را می‌گیرد و دقت بهای تمام‌شده شیرینی‌های چندلایه را تضمین می‌کند.',
    formula: 'قیمت هر گرم زیررسپی = جمع هزینه مواد زیررسپی ÷ وزن خالص نهایی (گرم)',
  },
  {
    id: 'bakingChange',
    ...HELP_DICTIONARY.bakingChange,
    enTerm: 'Baking Shrinkage / Yield Gain %',
    category: 'costing_recipes',
    moduleTag: 'ستون ۳ · فرمولاسیون',
    formula: 'وزن خالص قابل فروش = وزن خام × (۱ + تغییر پخت٪) × (۱ − پرت دورچین٪)',
  },
  {
    id: 'trimAndSpoilage',
    title: 'پرت دورچین و ضایعات ماندگاری ویترین',
    enTerm: 'Trim Waste & Shelf-Life Spoilage',
    category: 'costing_recipes',
    moduleTag: 'پایلوت ۱C · ستون ۳',
    simple: 'پرت دورچین یعنی لبه‌های کیک و شیرینی که هنگام برش دور ریخته می‌شود؛ ضایعات ماندگاری یعنی شیرینی‌هایی که در ویترین بیات می‌شوند و فروش نمی‌روند.',
    example: 'اگر ۵٪ رولت‌های ویترین در پایان هفته فروخته نشود، هزینه آن ۵٪ عملاً روی دوش ۹۵٪ فروخته‌شده است.',
    why: 'اگر این دو عدد در بهای تمام‌شده نیاید، سود واقعی شما همیشه کمتر از چیزی است که فکر می‌کنید.',
    formula: 'بهای مواد تعدیل‌شده = بهای خام هر کیلو ÷ (۱ − درصد ضایعات ویترین)',
  },
  {
    id: 'boxWeightLaw',
    ...HELP_DICTIONARY.boxWeightLaw,
    enTerm: 'Box Weight Deduction Law',
    category: 'costing_recipes',
    moduleTag: 'ستون ۳ · فرمولاسیون',
    formula: 'هزینه بسته‌بندی هر کیلو = قیمت جعبه یک‌کیلویی + کاغذ، زیرکیکی و روبان',
  },
  {
    id: 'overheadAllocation',
    ...HELP_DICTIONARY.overheadAllocation,
    enTerm: 'Overhead Allocation (Weight / ABC / Hybrid)',
    category: 'costing_recipes',
    moduleTag: 'ستون ۵A · آموزش سربار',
    formula: 'سربار هر کیلو (ترکیبی) = ۵۰٪ سهم وزنی + ۵۰٪ سهم زمانی کار و فر',
  },
  {
    id: 'ovenBottleneck',
    ...HELP_DICTIONARY.ovenBottleneck,
    enTerm: 'Theory of Constraints (Profit / Oven-Hour)',
    category: 'costing_recipes',
    moduleTag: 'خلاصه نتایج · پایلوت ۱C',
    formula: 'سود در ساعت فر = سود خالص هر کیلو ÷ ساعت اشغال فر به ازای هر کیلو',
  },
  {
    id: 'endOfDayFloor',
    ...HELP_DICTIONARY.endOfDayFloor,
    enTerm: 'End-of-Day Recovery Floor',
    category: 'costing_recipes',
    moduleTag: 'ستون ۳ · فرمولاسیون',
    formula: 'کف فروش آخر شب = بهای مواد اولیه با ضایعات + هزینه جعبه و بسته‌بندی',
  },
  {
    id: 'abSwapLab',
    ...HELP_DICTIONARY.abSwapLab,
    enTerm: 'A/B Ingredient Swap Lab',
    category: 'costing_recipes',
    moduleTag: 'ستون ۳ · فرمولاسیون',
  },
  {
    id: 'chefCard',
    ...HELP_DICTIONARY.chefCard,
    enTerm: 'Zero-Price Workshop Chef Card',
    category: 'costing_recipes',
    moduleTag: 'ستون ۳ · فرمولاسیون',
  },
  {
    id: 'productionPlanner',
    ...HELP_DICTIONARY.productionPlanner,
    enTerm: 'Holiday Production & Capacity Planner',
    category: 'costing_recipes',
    moduleTag: 'ستون ۳ · فرمولاسیون',
  },

  // --- Scientific Forecasting & Risk ---
  {
    id: 'seasonalForecast',
    ...HELP_DICTIONARY.seasonalForecast,
    enTerm: 'Shamsi Seasonal Forecast (P10 / P90 Cone)',
    category: 'scientific_risk',
    moduleTag: 'پایلوت ۱D · آزمایشگاه علمی',
  },
  {
    id: 'monteCarlo',
    ...HELP_DICTIONARY.monteCarlo,
    enTerm: 'Monte Carlo Simulation (1,000 Runs)',
    category: 'scientific_risk',
    moduleTag: 'پایلوت ۱D · گزارش‌ساز ۶B',
  },
  {
    id: 'mcProfitProb',
    ...HELP_DICTIONARY.mcProfitProb,
    enTerm: 'Probability of Profit & VaR 95% (P5 / P50)',
    category: 'scientific_risk',
    moduleTag: 'خلاصه نتایج · پایلوت ۱A و ۱D',
  },
  {
    id: 'var95AndP50',
    title: 'میانه سود (P50) و بدترین ۵٪ بازار (VaR 95%)',
    enTerm: 'Median P50 & Value at Risk (VaR 95%)',
    category: 'scientific_risk',
    moduleTag: 'خلاصه نتایج · پایلوت ۱D · گزارش ۶B',
    simple: 'P50 یعنی محتمل‌ترین سودی که در یک ماه عادی می‌برید؛ VaR 95% یعنی اگر ماه خیلی بدی پیش بیاید (مثلاً هم مواد گران شود و هم بازار خلوت باشد)، سود شما نهایتاً تا چه عددی پایین می‌آید.',
    example: 'اگر VaR 95% برابر +۴۹ میلیون باشد، یعنی حتی در ۹۵٪ بدترین حالت‌های بازار هم کارگاه شما ضرر نمی‌دهد!',
    why: 'به جای امید و حدس، به شما می‌گوید چه میزان ذخیره نقدی برای روز مبادا لازم است.',
  },
  {
    id: 'tornadoChart',
    ...HELP_DICTIONARY.tornadoChart,
    enTerm: 'Tornado Sensitivity Analysis (±10%)',
    category: 'scientific_risk',
    moduleTag: 'خلاصه نتایج · پایلوت ۱D',
  },
  {
    id: 'strategicReportBuilder',
    ...HELP_DICTIONARY.strategicReportBuilder,
    enTerm: 'Rule-Based Strategic NLG Engine',
    category: 'scientific_risk',
    moduleTag: 'تب ۶B · گزارش‌ساز متنی',
  },

  // --- Pantry, Waste & Arbitrage ---
  {
    id: 'packConverter',
    ...HELP_DICTIONARY.packConverter,
    enTerm: 'Iranian Market Unit Converter',
    category: 'pantry_arbitrage',
    moduleTag: 'ستون ۲A · انبار هوشمند',
  },
  {
    id: 'quickUpdate',
    ...HELP_DICTIONARY.quickUpdate,
    enTerm: '1-Minute Market Price Cascade',
    category: 'pantry_arbitrage',
    moduleTag: 'ستون ۲A · انبار هوشمند',
  },
  {
    id: 'paretoChart',
    ...HELP_DICTIONARY.paretoChart,
    enTerm: 'Pareto 80/20 Spend Concentration',
    category: 'pantry_arbitrage',
    moduleTag: 'پایلوت ۱C · گزارش ۶B',
  },
  {
    id: 'wasteIndex',
    ...HELP_DICTIONARY.wasteIndex,
    enTerm: '4-Part Waste & Leak Index',
    category: 'pantry_arbitrage',
    moduleTag: 'پایلوت ۱C · خلاصه نتایج',
  },
  {
    id: 'invisibleVariance',
    ...HELP_DICTIONARY.invisibleVariance,
    enTerm: 'Theoretical vs. Actual Variance',
    category: 'pantry_arbitrage',
    moduleTag: 'ستون ۲B · خلاصه نتایج',
    formula: 'پرت نامرئی = (مصرف واقعی انبار − مصرف تئوری رسپی‌ها) × قیمت واحد ماده',
  },
  {
    id: 'stockpileArbitrage',
    ...HELP_DICTIONARY.stockpileArbitrage,
    enTerm: 'Pre-Inflation Stockpile Arbitrage',
    category: 'pantry_arbitrage',
    moduleTag: 'ستون ۲C · آربیتراژ بازار',
    formula: 'سود خالص دپو = سود جهش قیمت − (هزینه خواب پول + ریسک خرابی انبار)',
  },
  {
    id: 'cashVsCheck',
    ...HELP_DICTIONARY.cashVsCheck,
    enTerm: 'Cash Discount vs. Sayadi Check Arbitrage',
    category: 'pantry_arbitrage',
    moduleTag: 'ستون ۲C · آربیتراژ بازار',
  },

  // --- Sales, Channels, SnappFood & Union ---
  {
    id: 'menuMatrix',
    ...HELP_DICTIONARY.menuMatrix,
    enTerm: 'Menu Engineering Matrix (BCG)',
    category: 'sales_channels',
    moduleTag: 'پایلوت ۱B · گزارش ۶B',
  },
  {
    id: 'channelProfit',
    ...HELP_DICTIONARY.channelProfit,
    enTerm: 'Multi-Channel Net Margin',
    category: 'sales_channels',
    moduleTag: 'پایلوت ۱B',
  },
  {
    id: 'unionRadar',
    ...HELP_DICTIONARY.unionRadar,
    enTerm: 'Confectionery Union Price Ceiling',
    category: 'sales_channels',
    moduleTag: 'پایلوت ۱B · ستون ۳',
  },
  {
    id: 'customCake',
    ...HELP_DICTIONARY.customCake,
    enTerm: 'Custom Fondant Cake Pricing',
    category: 'sales_channels',
    moduleTag: 'ستون ۴A · کیک سفارشی',
  },
  {
    id: 'mixBox',
    ...HELP_DICTIONARY.mixBox,
    enTerm: 'Gift Mix-Box Engineering',
    category: 'sales_channels',
    moduleTag: 'ستون ۴B · پک میکس',
  },
  {
    id: 'snappfoodShield',
    ...HELP_DICTIONARY.snappfoodShield,
    enTerm: 'SnappFood Commission Shield Price',
    category: 'sales_channels',
    moduleTag: 'ستون ۴C · اسنپ‌فود',
    formula: 'قیمت سپر اسنپ‌فود = (درآمد خالص ویترین + جعبه پیک) ÷ (۱ − درصد کمیسیون)',
  },
  {
    id: 'discountTrap',
    ...HELP_DICTIONARY.discountTrap,
    enTerm: 'Discount Volume Trap Math',
    category: 'sales_channels',
    moduleTag: 'ستون ۴C · تله تخفیف',
    formula: 'رشد فروش مورد نیاز = درصد تخفیف ÷ (حاشیه سود فعلی − درصد تخفیف)',
  },

  // --- CFO, Iranian Labor Law, Seasons & Checks ---
  {
    id: 'iranianPayroll',
    ...HELP_DICTIONARY.iranianPayroll,
    enTerm: 'Iranian Labor Law True Employer Cost',
    category: 'cfo_labor_checks',
    moduleTag: 'ستون ۵A · آموزش سربار',
    formula: 'هزینه واقعی کارفرما = حقوق و مزایا + ۲۳٪ بیمه کارفرما + (۲/۱۲ پایه عیدی) + (۱/۱۲ پایه سنوات)',
  },
  {
    id: 'seasonalSlumpShield',
    ...HELP_DICTIONARY.seasonalSlumpShield,
    enTerm: 'Shamsi Seasonal Slump Reserve',
    category: 'cfo_labor_checks',
    moduleTag: 'ستون ۵B · فصول ایران',
  },
  {
    id: 'sayadiGuard',
    ...HELP_DICTIONARY.sayadiGuard,
    enTerm: 'Sayadi Check 35-Day Stress Test',
    category: 'cfo_labor_checks',
    moduleTag: 'خلاصه نتایج · ستون ۵C',
  },
  {
    id: 'inflationShock',
    ...HELP_DICTIONARY.inflationShock,
    enTerm: 'Material Inflation Shock Simulator',
    category: 'cfo_labor_checks',
    moduleTag: 'ستون ۵D · شوک تورم',
  },
  {
    id: 'capexPayback',
    ...HELP_DICTIONARY.capexPayback,
    enTerm: 'CapEx / Equipment Payback Period',
    category: 'cfo_labor_checks',
    moduleTag: 'ستون ۵D · خرید دستگاه',
    formula: 'دوره بازگشت سرمایه (ماه) = مبلغ سرمایه‌گذاری ÷ سود خالص اضافه‌شده ماهانه',
  },
  {
    id: 'googleSheetsSync',
    ...HELP_DICTIONARY.googleSheetsSync,
    enTerm: 'Two-Way Google Sheets Sync',
    category: 'cfo_labor_checks',
    moduleTag: 'ستون ۶C · تنظیمات DNA',
  },
];

export interface CostingTrapItem {
  id: string;
  title: string;
  wrongWay: string;
  rightWay: string;
  impact: string;
}

export const COMMON_COSTING_TRAPS: CostingTrapItem[] = [
  {
    id: 'markup-vs-margin',
    title: 'دام ۱: اشتباه گرفتن «درصد روی خرید» با «حاشیه سود فروش»',
    wrongWay: 'اگر بهای تمام‌شده ۱ کیلو شیرینی ۳۰۰ هزار تومان است و ۳۰٪ سود می‌خواهید، ضرب کردن در ۱.۳۰ (عدد ۳۹۰ هزار تومان) فقط ۲۳٪ حاشیه سود واقعی می‌دهد!',
    rightWay: 'برای رسیدن به ۳۰٪ حاشیه سود واقعی از قیمت فروش، باید بهای تمام‌شده را تقسیم بر (۱ − ۰.۳۰) یعنی ۰.۷۰ کنید: ۳۰۰ ÷ ۰.۷۰ = ۴۲۸,۵۰۰ تومان.',
    impact: 'اصلاح این یک فرمول به‌تنهایی ۷٪ تا ۱۰٪ حاشیه سود گمشده کارگاه را برمی‌گرداند.',
  },
  {
    id: 'baking-shrinkage',
    title: 'دام ۲: تقسیم هزینه مواد بر «وزن خام خمیر» به جای «وزن پخته‌شده»',
    wrongWay: 'محاسبه بهای ۱ کیلو شیرینی خشک بر مبنای وزن خمیر پیش از ورود به فر (بدون لحاظ ۱۲٪ بخار شدن آب و پرت دورچین).',
    rightWay: 'همیشه هزینه کل یک پخت را فقط بر «وزن خالص قابل چیدن در ویترین» تقسیم کنید. برای شیرینی‌های شربتی (مثل باقلوا و زولبیا) جذب شربت وزن را بالا می‌برد و بالعکس.',
    impact: 'جلوگیری از خطای ۱۲٪ تا ۱۸٪ در بهای تمام‌شده شیرینی‌های خشک و کره‌ای.',
  },
  {
    id: 'hidden-labor-law',
    title: 'دام ۳: محاسبه فیش حقوقی ظاهری بدون ۲۳٪ بیمه، عیدی و سنوات',
    wrongWay: 'در نظر گرفتن حقوق ۲۰ میلیونی قناد فقط به عنوان ۲۰ میلیون هزینه در ماه و شوک ناگهانی نقدینگی در اسفند هنگام پرداخت عیدی و سنوات.',
    rightWay: 'هر ماه ۲۳٪ بیمه کارفرما (۴.۶م) + ۲/۱۲ عیدی (۳.۳۳م) + ۱/۱۲ سنوات (۱.۶۷م) را در سربار ماهانه بیاورید تا هزینه واقعی کارفرما (~۲۹.۶ میلیون) در قیمت شیرینی دیده شود.',
    impact: 'پایان شوک مالی اسفندماه و جلوگیری از کسری بودجه حقوق در پایان سال.',
  },
  {
    id: 'nominal-vs-real',
    title: 'دام ۴: خرج کردن «سود اسمی روی کاغذ» در بازار تورمی',
    wrongWay: 'برداشت کل ۱۶۰ میلیون سود حسابداری ماه، در حالی که ماه بعد کره و پسته ۵٪ گران‌تر شده‌اند و پول نقد برای پر کردن دوباره انبار کم می‌آید.',
    rightWay: 'پیش از برداشت مدیر، «ذخیره جایگزینی تورم انبار» و «سپر رکود ماه‌های خلوت» را جدا کنید و فقط «سود واقعی قابل برداشت» را برداشت نمایید.',
    impact: 'حفظ سرمایه در گردش واقعی و جلوگیری از آب‌رفتن تدریجی انبار کارگاه.',
  },
  {
    id: 'snappfood-commission',
    title: 'دام ۵: فروش هم‌قیمت ویترین در اسنپ‌فود و تپسی‌فود',
    wrongWay: 'ثبت قیمت ۵۰۰ هزار تومانی ویترین در اپلیکیشن سفارش آنلاین، بدون لحاظ ۱۸٪ کمیسیون و ۱۵ هزار تومان جعبه اضافی پیک.',
    rightWay: 'استفاده از فرمول سپر اسنپ‌فود: (درآمد خالص ویترین + جعبه پیک) ÷ (۱ − کمیسیون). در این حالت سود هر کیلو فروش آنلاین دقیقاً برابر ویترین می‌ماند.',
    impact: 'جلوگیری از زیان‌دهی پنهان در فروش‌های آنلاین که گاهی به ظاهر پررونق به نظر می‌رسند.',
  },
];
