// NPV Management Engine - Core Types (Aligned with Excel Model)

// Card product types
export type CardProduct = 'standard' | 'gold' | 'platinum' | 'premium';
export type AcquisitionChannel = 'online' | 'branch' | 'partner' | 'direct-sales';
export type DecisionScenario = 'base' | 'decision' | 'stress';

// Risk level 1-10
export type RiskLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

// Application stages
export type AppStage = 'entry' | 'hub' | 'wizard' | 'dashboard' | 'snapshots';
export type WizardStep = 1 | 2 | 3;

// Strategy configuration
export interface StrategyConfig {
  id: string;
  name: string;
  cardProduct: CardProduct;
  channel: AcquisitionChannel;
  scenario: DecisionScenario;
  createdAt: Date;
  updatedAt: Date;
}

// Risk distribution (percentage per risk level)
export interface RiskDistribution {
  level: RiskLevel;
  percentage: number; // e.g., 0.33 = 33%
  initialLimit: number; // Initial credit limit for this level
}

// Default risk distribution from Excel
// Note: Levels 1-5 have descending distribution summing to 100%, levels 6-10 default to 0%
export const DEFAULT_RISK_DISTRIBUTION: RiskDistribution[] = [
  { level: 1, percentage: 0.33, initialLimit: 50000 },
  { level: 2, percentage: 0.27, initialLimit: 30000 },
  { level: 3, percentage: 0.19, initialLimit: 20000 },
  { level: 4, percentage: 0.12, initialLimit: 15000 },
  { level: 5, percentage: 0.09, initialLimit: 10000 },
  { level: 6, percentage: 0.00, initialLimit: 8000 },
  { level: 7, percentage: 0.00, initialLimit: 5000 },
  { level: 8, percentage: 0.00, initialLimit: 3000 },
  { level: 9, percentage: 0.00, initialLimit: 2000 },
  { level: 10, percentage: 0.00, initialLimit: 1000 },
];

// Product parameters
export interface ProductParams {
  apr: number; // Annual Percentage Rate e.g., 0.1825 = 18.25%
  annualFee: number; // e.g., 395
  interchangeRate: number; // e.g., 0.0125 = 1.25%
  overlimitFee: number; // e.g., 20
  cashAdvanceFee: number; // e.g., 0.0246 = 2.46%
  lateFee: number; // Late payment fee
}

// Financial assumptions
export interface FinancialAssumptions {
  ftpRate: number; // Funds Transfer Pricing e.g., 0.0275 = 2.75%
  cac: number; // Customer Acquisition Cost (e.g., 600)
  recoveryRate: number; // Recovery rate on defaults (e.g., 0.105 = 10.5%)
  opexPerCard: number; // Monthly operational cost per card
  rewardsRate: number; // e.g., 0.005 = 0.5%
  fraudRate: number; // e.g., 0.0003 = 0.03%
  rewardsCap: number; // Monthly reward cap per account (e.g., 100)
  balTransferRate: number; // Balance transfer APR (display only) e.g., 0.1825
  unusedLimitCostFactor: number; // Unused credit line funding cost conversion factor (default 0.50 = 50%)
}

// Stress coefficients (multipliers)
export interface StressCoefficients {
  pdMultiplier: number; // PD stress multiplier
  lgdMultiplier: number; // LGD stress multiplier
  activeRateMultiplier: number; // Activity rate multiplier
  utilizationMultiplier: number; // Utilization rate multiplier
  revolvingMultiplier: number; // Revolving rate multiplier
  spendMultiplier: number; // Spending / transaction multiplier
  cashMultiplier: number; // Cash advance amount multiplier
  attritionMultiplier: number; // Attrition rate multiplier
  interestMarginMultiplier: number; // Interest margin multiplier
}

// V2: Installment parameters
export interface V2InstallmentParams {
  installmentTenor: number;          // N months (e.g. 12)
  revolvingInstSplit: number;        // 0-1, 0.5 = 50% revolving / 50% installment
  // 4 sensitivity coefficients (semi-elasticity: delta_rate per 1% APR change)
  // revRate response:  revRate_new = revRate_base - sRevToRevAPR * dRevAPR + sRevToInstAPR * dInstAPR
  // instRate response: instRate_new = instRate_base + sInstToRevAPR * dRevAPR - sInstToInstAPR * dInstAPR
  sRevToRevAPR: number;     // revolving rate sensitivity to revolving APR (large, e.g. 0.15)
  sInstToRevAPR: number;    // installment rate sensitivity to revolving APR (small, e.g. 0.06)
  sInstToInstAPR: number;   // installment rate sensitivity to installment fee rate (large, e.g. 0.15)
  sRevToInstAPR: number;    // revolving rate sensitivity to installment fee rate (small, e.g. 0.06)
  // Utilization elasticity to combined financing rate delta (asymmetric)
  utilElasticity: number;     // downside: combined rate drops → util drops (moderate, e.g. 0.10)
  utilElasticityUp: number;   // upside: combined rate rises → util rises (stronger, e.g. 0.35)
}

// Limit elasticity coefficients (per-grade tiered sensitivity)
// Dynamic γ(ΔL) and θ(ΔL): smooth interpolation from Start→End as ΔL rises
// Spend_new = Spend_base * ΔL^(1+γ)  → Spend always rises; Spend/Limit shows hump when γ crosses 0
// Util_new = min(1, Util_base * ΔL^θ) → Balance always rises; Util shows hump when θ crosses 0
// phi: severity elasticity, lambda: revolving/installment rate elasticity
export interface LimitElasticityCoeffs {
  // Dynamic gamma(ΔL): smoothly interpolates from gammaStart → gammaEnd as ΔL rises
  // Spend_new = Spend_base * ΔL^(1+γ), γ>0 → Spend/Limit rises, γ<0 → Spend/Limit falls
  // As long as 1+γ>0 (always true with our ranges), Spend itself always increases
  gammaStart: number[];  // γ at ΔL=1 per grade [R1..R10]
  gammaEnd: number[];    // γ at ΔL→large per grade [R1..R10]
  // Dynamic theta(ΔL): smoothly interpolates from thetaStart → thetaEnd
  // Util_new = min(1, Util_base * ΔL^θ), θ>0 → Util rises, θ<0 → Util falls
  // Balance = Limit_new * Util_new always increases as long as 1+θ>0
  thetaStart: number[];  // θ at ΔL=1 per grade [R1..R10]
  thetaEnd: number[];    // θ at ΔL→large per grade [R1..R10]
  phi: number[];         // severity elasticity per grade, positive = amplification
  // Dynamic lambda(ΔL): revolving/installment rate elasticity
  // lambda(ΔL) = lambdaStart + (lambdaEnd - lambdaStart) * t, where t = excess^2/(excess^2+lambdaK^2)
  // Squared form keeps lambda high for small excess (flat plateau), then drops
  // Low risk: starts ~1.0, stays >0.5 within +30%, crosses 0 around +60%, ends -0.8
  // High risk: starts ~1.0, stays >0.6 within +100%, crosses 0 around +200%, ends -0.5
  lambdaStart: number[];  // λ at ΔL=1 per grade
  lambdaEnd: number[];    // λ at ΔL→large per grade
  lambdaK: number[];      // per-grade transition width (low risk ~0.55, high risk ~2.0)
  transitionSpeed: number; // controls gamma/theta interpolation speed (default 1.5)
}

export const DEFAULT_LIMIT_ELASTICITY: LimitElasticityCoeffs = {
  // gamma(ΔL): start → end. Low risk starts positive (Spend/Limit initially rises), ends very negative.
  // High risk starts negative (already diluted), ends more negative.
  gammaStart: [ 0.15,  0.10,  0.05,  0.00, -0.10, -0.15, -0.20, -0.20, -0.20, -0.20],
  gammaEnd:   [-0.80, -0.70, -0.60, -0.50, -0.45, -0.45, -0.50, -0.55, -0.60, -0.60],
  // theta(ΔL): start → end. Low risk starts positive (Util initially rises), ends negative.
  // High risk starts negative, ends more negative.
  thetaStart: [ 0.20,  0.15,  0.08,  0.00, -0.05, -0.10, -0.20, -0.30, -0.40, -0.40],
  thetaEnd:   [-0.70, -0.60, -0.50, -0.40, -0.35, -0.40, -0.50, -0.60, -0.70, -0.80],
  phi:        [ 0.00,  0.00,  0.05,  0.10,  0.15,  0.20,  0.30,  0.40,  0.50,  0.60],
  // lambda(ΔL): low risk — peaks early, drops fast; high risk — stays high much longer
  // R1: start=1.0, at +30% excess lambda>0.5, at +60% ~0, end=-0.80
  // R10: start=1.0, at +100% lambda>0.6, at +200% ~0.2, end=-0.50
  lambdaStart: [ 0.60,  0.55,  0.50,  0.50,  0.55,  0.65,  0.75,  0.85,  0.95,  1.00],
  lambdaEnd:   [-0.80, -0.75, -0.65, -0.55, -0.50, -0.50, -0.50, -0.50, -0.50, -0.50],
  lambdaK:     [ 0.90,  1.00,  1.10,  1.30,  1.50,  1.80,  2.00,  2.20,  2.50,  2.80],
  transitionSpeed: 3.0,
};

// Combined business factors
export interface BusinessFactors {
  riskDistribution: RiskDistribution[];
  productParams: ProductParams;
  financialAssumptions: FinancialAssumptions;
  stressCoefficients: StressCoefficients;
  v2Installment: V2InstallmentParams;
  limitElasticity?: LimitElasticityCoeffs;
}

// Per-risk-level annual metrics (Yr1-Yr8)
export interface AnnualMetrics {
  year: number;
  activityRate: number; // [Orig]活跃率 (per Orig)
  transaction: number; // [Act]月均交易
  utilizationRate: number; // [Act]额度使用率
  balance: number; // [Act]平均余额
  revolvingRate: number; // [Act]生息率
  revolvingBalance: number; // [Act]生息余额
  pd: number; // [Risk]PD (seasoned)
  lgd: number; // [Risk]LGD
  interestIncome: number; // [Orig]利息收入
  nonInterestIncome: number; // [Orig]非利息收入
  nintInterchange: number; // 回佣
  nintAnnualFee: number; // 年费
  nintCashAdvance: number; // 取现手续费+超限费
  riskCost: number; // [Orig]风险成本
  fundingCost: number; // [Orig]资金成本(合计)
  fundingCostUsed: number; // [Orig]已用额度资金成本
  fundingCostUnused: number; // [Orig]未用额度资金成本
  opexAmortized: number; // [Orig]运营成本摊销
  fraudCost: number; // 欺诈成本
  rewardsCost: number; // 权益成本
  marketingCost: number; // [Orig]权益/营销成本 (legacy alias)
  installmentIncome: number; // V2: 分期手续费收入
  installmentRate: number;   // V2: 平均分期率
  uipPast: number;           // V2: 平均历史未偿分期本金
}

// Per-risk-level summary (what shows in the main table)
export interface RiskLevelSummary {
  level: RiskLevel;
  npv: number;
  cac: number;
  interestIncome: number;
  nonInterestIncome: number;
  riskCost: number;
  fundingCost: number;
  opexAndOther: number; // 运营/其他成本
  terminalValue: number; // 残值TV
  
  // Per-active metrics (for Table 3: Static Parameters)
  activityRate: number; // 活跃率 (Year 1)
  monthlyTransaction: number; // 月均交易
  utilizationPeak: number; // 使用率峰值
  avgBalance: number; // 平均余额
  revolvingRate: number; // 生息率
  avgRevolvingBalance: number; // 生息余额
  basePD: number; // Base PD (Year 1)
  baseLGD: number; // Base LGD
  
  // Detailed annual metrics (for Table 4: Driver Trends)
  annualMetrics: AnnualMetrics[];
}

// PV Composition (for waterfall)
export interface PVComposition {
  nonInterestIncome: number;
  nintInterchange: number;
  nintAnnualFee: number;
  nintCashAdvance: number;
  interestIncome: number;
  installmentIncome: number; // V2: 分期手续费收入PV
  totalIncome: number;
  riskCost: number;
  cac: number;
  otherCost: number;
  otherOpex: number;
  otherFraud: number;
  otherRewards: number;
  fundingCost: number;
  fundingCostUsed: number;
  fundingCostUnused: number;
  terminalValue: number;
  pvValue: number;
}

// Summary-specific fields for aggregate display
export interface SummaryExtension {
  weightedPD: number;
  weightedLGD: number;
}

// Full NPV Result
export interface NPVResult {
  id: string;
  strategyConfig: StrategyConfig;
  businessFactors: BusinessFactors;
  
  // Summary totals (with weighted aggregates)
  summary: RiskLevelSummary & SummaryExtension;
  
  // Per-risk-level breakdown
  riskLevelResults: RiskLevelSummary[];
  
  // PV composition for waterfall
  pvComposition: PVComposition;
  
  calculatedAt: Date;
}

// Waterfall item for chart (floating bar physics)
export interface WaterfallItem {
  id: string;
  label: string;
  value: number;
  y0: number; // Floating bar start coordinate
  y1: number; // Floating bar end coordinate
  runningTotal: number;
  type: 'positive' | 'negative' | 'total' | 'terminal'; // terminal = TV (blue)
  linkedFactors: string[];
  group?: string; // Parent group label for sub-items (e.g. '非息收入', '其他成本')
  }

// History record
export interface CalculationHistory {
  id: string;
  name: string;
  result: NPVResult;
  savedAt: Date;
  thumbnail?: {
    totalNPV: number;
    roi: number;
    paybackMonth: number;
  };
}

// Card product parameter presets (年费递降，APR统一18.25%)
export const CARD_PRODUCT_PRESETS: Record<CardProduct, ProductParams> = {
  premium: { apr: 0.1825, annualFee: 395, interchangeRate: 0.004, overlimitFee: 20, cashAdvanceFee: 0.0246, lateFee: 50 },
  platinum: { apr: 0.1825, annualFee: 280, interchangeRate: 0.004, overlimitFee: 20, cashAdvanceFee: 0.0246, lateFee: 50 },
  gold: { apr: 0.1825, annualFee: 150, interchangeRate: 0.004, overlimitFee: 20, cashAdvanceFee: 0.0246, lateFee: 50 },
  standard: { apr: 0.1825, annualFee: 0, interchangeRate: 0.004, overlimitFee: 20, cashAdvanceFee: 0.0246, lateFee: 50 },
};

// Channel CAC presets
export const CHANNEL_CAC_PRESETS: Record<AcquisitionChannel, number> = {
  online: 600,
  branch: 450,
  partner: 350,
  'direct-sales': 800,
};

// Default values
export const DEFAULT_PRODUCT_PARAMS: ProductParams = CARD_PRODUCT_PRESETS.standard;

export const DEFAULT_FINANCIAL_ASSUMPTIONS: FinancialAssumptions = {
  ftpRate: 0.0275,
  cac: 600,
  recoveryRate: 0.105,
  opexPerCard: 38,
  rewardsRate: 0.005,
  fraudRate: 0.0003,
  rewardsCap: 100,
  balTransferRate: 0.1825,
  unusedLimitCostFactor: 0.50, // 50% of unused limit incurs funding cost
};

// V2 installment defaults
// Sensitivity: own-price effect > cross-price effect
// e.g. revAPR +1% → revRate drops 0.15, instRate rises 0.06
export const DEFAULT_V2_INSTALLMENT: V2InstallmentParams = {
  installmentTenor: 12,
  revolvingInstSplit: 0.50,
  sRevToRevAPR:  2.5,     // revRate own-price (strong): sqrt on drop, dx^1.5 on rise
  sInstToRevAPR: 0.20,    // instRate cross to revAPR (weak, linear)
  sInstToInstAPR: 4.0,    // instRate own-price (strong): tuned so peak income ~13-14% fee rate
  sRevToInstAPR:  0.20,   // revRate cross to instAPR (weak, linear)
  utilElasticity: 0.10,   // downside: combined rate drops → util drops (moderate)
  utilElasticityUp: 0.80, // upside: combined rate rises → util rises (strong, amplifies volume)
};

export const DEFAULT_STRESS_COEFFICIENTS: StressCoefficients = {
  pdMultiplier: 1.0,
  lgdMultiplier: 1.0,
  activeRateMultiplier: 1.0,
  utilizationMultiplier: 1.0,
  revolvingMultiplier: 1.0,
  spendMultiplier: 1.0,
  cashMultiplier: 1.0,
  attritionMultiplier: 1.0,
  interestMarginMultiplier: 1.0,
};

export const DEFAULT_BUSINESS_FACTORS: BusinessFactors = {
  riskDistribution: DEFAULT_RISK_DISTRIBUTION,
  productParams: DEFAULT_PRODUCT_PARAMS,
  financialAssumptions: DEFAULT_FINANCIAL_ASSUMPTIONS,
  stressCoefficients: DEFAULT_STRESS_COEFFICIENTS,
  v2Installment: DEFAULT_V2_INSTALLMENT,
};

// Card product display names
export const CARD_PRODUCT_LABELS: Record<CardProduct, string> = {
  standard: '标准信用卡',
  gold: '金卡',
  platinum: '白金卡',
  premium: '高端权益卡',
};

export const CHANNEL_LABELS: Record<AcquisitionChannel, string> = {
  online: '线上',
  branch: '网点',
  partner: '合作方',
  'direct-sales': '直销',
};

export const SCENARIO_LABELS: Record<DecisionScenario, string> = {
  base: '基准情景',
  decision: '决策情景',
  stress: '压力情景',
};

// Snapshot: frozen parameter state + NPV result for comparison
export interface ParamChange {
  label: string;       // e.g. "循环利率(年化)"
  group: string;       // e.g. "产品参数", "财务假设", "压力系数", "客群分布"
  defaultValue: string; // formatted default, e.g. "18.25%"
  currentValue: string; // formatted current, e.g. "15.00%"
}

export interface Snapshot {
  id: string;
  name: string;
  createdAt: Date;
  businessFactors: BusinessFactors;
  npvResult: NPVResult;
  paramChanges: ParamChange[]; // diff vs DEFAULT_BUSINESS_FACTORS
  isBaseline: boolean; // true for the auto-generated default snapshot
}
