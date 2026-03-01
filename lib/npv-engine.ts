// ============================================================================
// NPV CALCULATION ENGINE V2.0 - Static Data Driven (99-Month Model)
// ============================================================================
// Uses EXACT real Excel data from lib/static-data.ts
// All 9 behavioral curves are time-series matrices, NOT formula-generated
// ============================================================================

import type {
  BusinessFactors,
  RiskLevel,
  RiskLevelSummary,
  AnnualMetrics,
  NPVResult,
  StrategyConfig,
  PVComposition,
  WaterfallItem,
  RiskDistribution,
  V2InstallmentParams,
  LimitElasticityCoeffs,
} from './npv-types';
import { DEFAULT_V2_INSTALLMENT, DEFAULT_LIMIT_ELASTICITY, DEFAULT_RISK_DISTRIBUTION } from './npv-types';

import { STATIC_CURVES, SCENARIO_MULT } from './static-data';

// ============================================
// 1. DEFAULT SCALARS (from Excel model)
// ============================================
const SCALARS: Record<string, number> = {
  apr: 0.1825,
  fee_annual: 395,
  fee_overlimit: 20,
  fee_cash_rate: 0.0246,
  interchange_rate: 0.004,
  ftp: 0.0275,
  opex_annual: 38,
  recovery_rate: 0.105,
  fraud_rate: 0.0003,
  reward_rate: 0.005,
  reward_cap: 100,
  cpa: 600,
  discount_rate: 0.15,
  tv_cap_percent: 0.15,
};

// ============================================
// 2. SEASONING ACCESSOR (for UI charts)
// ============================================
export type MetricType =
  | 'CAC'
  | 'Risk'
  | 'NonInterest'
  | 'Interest'
  | 'Active'
  | 'Funds'
  | 'Utilization';

export function getSeasoningFactor(
  metricType: MetricType,
  yearIndex: number,
): number {
  // In V2.0, seasoning is embedded in the static data curves
  // Return a normalized factor for chart display
  const defaults: Record<MetricType, number[]> = {
    CAC: [1.0, 0, 0, 0, 0, 0, 0, 0],
    Risk: [0.3, 0.8, 1.2, 1.5, 1.3, 1.0, 0.8, 0.7],
    NonInterest: [0.5, 0.9, 1.0, 1.0, 1.0, 0.95, 0.9, 0.85],
    Interest: [0.3, 0.6, 0.9, 1.0, 1.0, 1.0, 1.0, 1.0],
    Active: [1.0, 0.95, 0.9, 0.85, 0.8, 0.78, 0.75, 0.72],
    Funds: [0.5, 0.9, 1.0, 1.0, 0.95, 0.9, 0.85, 0.8],
    Utilization: [0.3, 0.7, 0.9, 1.0, 1.0, 1.0, 1.0, 1.0],
  };
  return defaults[metricType][yearIndex] ?? 1.0;
}

export function getSeasoningCurves() {
  return {
    CAC: [1.0, 0, 0, 0, 0, 0, 0, 0],
    Risk: [0.3, 0.8, 1.2, 1.5, 1.3, 1.0, 0.8, 0.7],
    NonInterest: [0.5, 0.9, 1.0, 1.0, 1.0, 0.95, 0.9, 0.85],
    Interest: [0.3, 0.6, 0.9, 1.0, 1.0, 1.0, 1.0, 1.0],
    Active: [1.0, 0.95, 0.9, 0.85, 0.8, 0.78, 0.75, 0.72],
    Funds: [0.5, 0.9, 1.0, 1.0, 0.95, 0.9, 0.85, 0.8],
    Utilization: [0.3, 0.7, 0.9, 1.0, 1.0, 1.0, 1.0, 1.0],
  };
}

// ============================================
// 3. CORE 99-MONTH ENGINE
// ============================================

interface MonthlyAccumulator {
  int: number;
  inst: number; // V2: installment fee income
  nint: number;
  risk: number;
  fund: number;
  fundUsed: number;   // used-limit funding cost
  fundUnused: number;  // unused-limit funding cost
  other: number;
  acq: number;
  tv: number;
}

interface MonthlySnapshot {
  month: number;
  valid: number;
  active: number;
  spend: number;
  balance: number;
  revolveRate: number;
  pd: number;
  severity: number;
  intIncome: number;
  instIncome: number;  // V2: installment fee (discounted)
  nintIncome: number;
  nintInterchange: number;
  nintAnnualFee: number;
  nintCashAdvance: number;
  riskCost: number;
  fundCost: number;
  fundUsedCost: number;
  fundUnusedCost: number;
  otherCost: number;
  otherOpex: number;
  otherFraud: number;
  otherRewards: number;
  // V2 diagnostics
  installmentRate: number;
  uipPast: number;
}

function runMonthlyEngine(
  gradeIndex: number,
  limit: number,
  factors: BusinessFactors,
  scenarioType: string,
): {
  acc: MonthlyAccumulator;
  monthlySnapshots: MonthlySnapshot[];
  ncf: number[];
} {
  const T = 99;
  const curves = STATIC_CURVES;
  const { stressCoefficients, financialAssumptions, productParams } = factors;

  // Scenario PD multiplier
  const scenPdMult = SCENARIO_MULT[scenarioType] || 1.0;

  // Monthly discount factors
  const r_mo_disc = Math.pow(1 + SCALARS.discount_rate, 1 / 12) - 1;
  // df[0] = 1.0 (first month, no discounting), df[1] = 1/(1+r)^1, etc.
  const df = Array.from(
    { length: T },
    (_, t) => 1 / Math.pow(1 + r_mo_disc, t),
  );

  // Monthly rates from scalars
  const r_revolve = (productParams.apr || SCALARS.apr) / 12;
  const r_ftp = (financialAssumptions.ftpRate || SCALARS.ftp) / 12;
  const r_opex = (financialAssumptions.opexPerCard || SCALARS.opex_annual) / 12;

  // V2: Installment params
  const v2i: V2InstallmentParams = factors.v2Installment || DEFAULT_V2_INSTALLMENT;
  const tenor = Math.max(1, Math.round(v2i.installmentTenor));
  const g = gradeIndex;

  // V2: Balance transfer fee rate (余额代偿费率)
  // Under equal-principal amortization: fee_rate = (annual_rate / 12) * (N + 1) / (2 * N)
  const instAnnualRate = financialAssumptions.balTransferRate || productParams.apr || SCALARS.apr;
  const r_inst = (instAnnualRate / 12) * (tenor + 1) / (2 * tenor);

  // V2: Base rates — revolve_rate from matrix is split by the slider into two independent base rates
  const splitRev = Math.max(0, Math.min(1, v2i.revolvingInstSplit));

  // V2: Price deltas (in percentage points, e.g. 18.25% → 15% = -3.25pp)
  // dRevAPR: positive means revolving APR increased from default 18.25%
  // dInstAPR: positive means installment fee rate increased from default 18.25%
  const defaultAPR = SCALARS.apr; // 18.25% baseline
  const currentRevAPR = productParams.apr || SCALARS.apr;
  const currentInstAPR = financialAssumptions.balTransferRate || currentRevAPR;
  const dRevAPR = (currentRevAPR - defaultAPR) * 100;   // in pp
  const dInstAPR = (currentInstAPR - defaultAPR) * 100;  // in pp

  // V2: Sensitivity coefficients
  const s_rr = v2i.sRevToRevAPR ?? 2.5;    // revRate own-price (strong)
  const s_ir = v2i.sInstToRevAPR ?? 0.20;  // instRate cross to revAPR (weak)
  const s_ii = v2i.sInstToInstAPR ?? 4.0;  // instRate own-price (strong, peak ~13-14%)
  const s_ri = v2i.sRevToInstAPR ?? 0.20;  // revRate cross to instAPR (weak)
  const utilElastDown = v2i.utilElasticity ?? 0.10;       // util downside (moderate)
  const utilElastUp = v2i.utilElasticityUp ?? 0.80;       // util upside (strong, amplifies volume)

  // Non-linear sensitivity helper — returns SIGNED value (same sign as dx).
  // dx > 0 (price RISE):   returns +s * dx^1.5   (positive, accelerating)
  // dx < 0 (price DROP):   returns -s * sqrt(|dx|) (negative, decelerating boost)
  // dx = 0: returns 0
  //
  // This way, own-price formula "base - nlSens(s, dx)" works correctly:
  //   price rises (dx>0) → nlSens positive → base - positive = rate DROPS
  //   price drops (dx<0) → nlSens negative → base - negative = rate RISES
  function nlSens(s: number, dx: number): number {
    if (dx > 0) {
      return s * Math.pow(dx, 1.5);       // price rise → positive → will reduce own rate
    } else if (dx < 0) {
      return -s * Math.sqrt(Math.abs(dx)); // price drop → negative → will boost own rate
    }
    return 0;
  }

  // V3: Limit elasticity engine — dynamic γ(ΔL) and θ(ΔL)
  // γ and θ are smooth functions of ΔL: interpolate from Start→End via t = excess/(excess+k)
  // Spend_new = Spend_base * ΔL^(1+γ)  →  Spend always rises (1+γ > 0)
  // Util_new  = Util_base * ΔL^θ        →  Balance = Limit*Util always rises (1+θ > 0)
  // Spend/Limit and Util show hump shape because γ and θ transition from positive to negative
  const le: LimitElasticityCoeffs = factors.limitElasticity || DEFAULT_LIMIT_ELASTICITY;
  const baseLimit = DEFAULT_RISK_DISTRIBUTION[g]?.initialLimit || limit;
  const deltaLimit = Math.max(limit / baseLimit, 0.001);
  const excess = Math.max(0, deltaLimit - 1.0);
  const k = le.transitionSpeed ?? 1.5;
  const t = excess / (excess + k); // 0→1 smooth transition

  const gamma_eff = (le.gammaStart[g] ?? 0.15) + ((le.gammaEnd[g] ?? -0.8) - (le.gammaStart[g] ?? 0.15)) * t;
  const theta_eff = (le.thetaStart[g] ?? 0.2) + ((le.thetaEnd[g] ?? -0.7) - (le.thetaStart[g] ?? 0.2)) * t;
  const phi_g = le.phi[g] ?? 0.0;
  // Dynamic lambda: squared interpolation for flat initial plateau
  const lK = le.lambdaK?.[g] ?? 0.55;
  const tLambda = excess * excess / (excess * excess + lK * lK); // 0→1, flat near 0
  const lambda_eff = (le.lambdaStart?.[g] ?? 1.0) + ((le.lambdaEnd?.[g] ?? -0.8) - (le.lambdaStart?.[g] ?? 1.0)) * tLambda;

  const spendLimitMult = deltaLimit === 1.0 ? 1.0 : Math.pow(deltaLimit, 1.0 + gamma_eff);
  const utilLimitMult = deltaLimit === 1.0 ? 1.0 : Math.pow(deltaLimit, theta_eff);
  const sevLimitMult = deltaLimit === 1.0 ? 1.0 : Math.pow(deltaLimit, phi_g);
  const rateLimitMult = deltaLimit === 1.0 ? 1.0 : Math.pow(deltaLimit, lambda_eff);

  // V3: Unused limit funding cost factor
  const unusedLimitFactor = financialAssumptions.unusedLimitCostFactor ?? 0.50;

  const acc: MonthlyAccumulator = {
    int: 0,
    inst: 0,
    nint: 0,
    risk: 0,
    fund: 0,
    fundUsed: 0,
    fundUnused: 0,
    other: 0,
    acq: 0,
    tv: 0,
  };
  const ncf: number[] = [];
  const monthlySnapshots: MonthlySnapshot[] = [];

  // V2: Amortization ledger — stores each month's originated installment principal
  const origPrincipals: number[] = [];

  let curr_valid = 1.0;

  for (let t = 0; t < T; t++) {
    // --- A. Driver Engine ---
    const churn = Math.min(
      curves.churn_rate[g][t] * stressCoefficients.attritionMultiplier,
      1.0,
    );
    curr_valid *= 1 - churn;
    const valid = curr_valid;

    const active_rate = Math.min(
      curves.active_rate[g][t] * stressCoefficients.activeRateMultiplier,
      1.0,
    );
    const active = valid * active_rate;

    // --- B & C. Volumes + Revenue (V2: independent revolving & installment rates) ---
    // V3: Apply limit elasticity to spend (sub-linear scaling with limit)
    const spend = curves.spend_amt[g][t] * stressCoefficients.spendMultiplier * spendLimitMult;
    const cash = curves.cash_amt[g][t] * (stressCoefficients.cashMultiplier ?? stressCoefficients.spendMultiplier) * spendLimitMult;

    // Matrix revolve_rate is split by slider into base rates (no "totalFinancingRate")
    // V3: Apply limit elasticity to revolving/installment rates (higher limit → higher rates)
    const matrixRate = curves.revolve_rate[g][t] * stressCoefficients.revolvingMultiplier;
    const revRate_base = Math.min(0.95, matrixRate * splitRev * rateLimitMult);
    const instRate_base = Math.min(0.95, matrixRate * (1 - splitRev) * rateLimitMult);

    // V2: Non-linear price sensitivity (no conservation scaling)
    //
    // Economic logic:
    //   revAPR drops → revolving cheaper → revRate UP, instRate DOWN
    //   revAPR rises → revolving expensive → revRate DOWN, instRate UP
    //   instAPR drops → installment cheaper → instRate UP, revRate DOWN
    //   instAPR rises → installment expensive → instRate DOWN, revRate UP
    //
    // nlSens(s, dx): dx>0 (price rise) → positive (convex), dx<0 (price drop) → positive (sqrt)
    // Own-price: rate moves OPPOSITE to price → subtract nlSens
    // Cross-price: rate moves SAME as other price → add linear term
    const revRate_adj = revRate_base
      - nlSens(s_rr, dRevAPR) / 100      // own: revAPR up → revRate DOWN; revAPR down → revRate UP
      + s_ri * dInstAPR / 100;            // cross: instAPR up → revRate UP (shift to revolving)
    const instRate_adj = instRate_base
      - nlSens(s_ii, dInstAPR) / 100      // own: instAPR up → instRate DOWN; instAPR down → instRate UP
      + s_ir * dRevAPR / 100;             // cross: revAPR up → instRate UP (shift to installment)
    const finalRevRate = Math.max(0, Math.min(0.95, revRate_adj));
    const finalInstRate = Math.max(0, Math.min(0.95, instRate_adj));

    // V2: Asymmetric utilization elasticity
    // combined rate rises → util rises more (utilElastUp, stronger)
    // combined rate drops → util drops less (utilElastDown, moderate)
    const combinedBase = matrixRate;
    const combinedNew = finalRevRate + finalInstRate;
    const combinedDelta = combinedNew - combinedBase;
    // V3: Apply limit elasticity to utilization (higher limit → dilution for low-risk)
    const baseUtil = curves.utilization[g][t] * stressCoefficients.utilizationMultiplier * utilLimitMult;
    const elast = combinedDelta >= 0 ? utilElastUp : utilElastDown;
    const adjUtil = Math.max(0, Math.min(1.0, baseUtil + elast * combinedDelta));
    const bal = limit * adjUtil;

    // 1. Revolving interest
    const val_int = bal * finalRevRate * r_revolve * active;

    // 2. Installment income (V2: flat-fee method with amortization ledger)
    //
    // UIP is *part of* the outstanding balance (not additional).
    // The "installment target pool" this month = bal * finalInstRate.
    // We only originate new installments if UIP hasn't already filled that target.
    //
    // Step 2a: Compute UIP_Past from the amortization ledger (before this month's origination)
    let uip_past = 0;
    for (let v = 0; v < origPrincipals.length; v++) {
      const age = t - v;
      if (age > 0 && age <= tenor) {
        const remainFrac = (tenor - age) / tenor; // linear amortization
        uip_past += origPrincipals[v] * remainFrac;
      }
    }

    // Step 2b: New origination = max(0, target - existing UIP)
    const instTarget = bal * finalInstRate;
    const orig_t = Math.max(0, instTarget - uip_past);
    origPrincipals.push(orig_t);

    // Step 2c: Update UIP to include this month's origination (full principal, age=0)
    const uip_total = uip_past + orig_t;

    // Step 2d: Flat-fee income on ALL active installments (current + past, based on initial principal)
    let instIncome_fromPast = 0;
    for (let v = 0; v < origPrincipals.length - 1; v++) {
      const age = t - v;
      if (age > 0 && age <= tenor) {
        instIncome_fromPast += origPrincipals[v] * r_inst;
      }
    }
    const val_inst = (orig_t * r_inst + instIncome_fromPast) * active;

    // 3. Annual Fee
    const val_fee =
      t % 12 === 0 ? (productParams.annualFee ?? SCALARS.fee_annual) * valid : 0;

    // 4. Non-Interest: Interchange + Overlimit + Cash
    const val_intchg =
      spend *
      (productParams.interchangeRate || SCALARS.interchange_rate) *
      active;
    const val_ovl =
      (productParams.overlimitFee || SCALARS.fee_overlimit) *
      curves.ovl_incidence[g][t] *
      active;
    const val_cash =
      cash *
      (productParams.cashAdvanceFee || SCALARS.fee_cash_rate) *
      active;

    const val_nint_group = val_fee + val_intchg + val_ovl + val_cash;

    // --- D. Costs ---
    // UIP is *part of* the outstanding balance, so bal already covers it.
    // No need to add UIP separately to EAD or funding base.
    const pd_final =
      curves.pd_annual[g][t] * scenPdMult * stressCoefficients.pdMultiplier;
    // V3: Apply limit elasticity to severity (higher limit → amplified for high-risk)
    const sev_final = Math.min(
      curves.severity[g][t] * stressCoefficients.lgdMultiplier * sevLimitMult,
      1.0,
    );
    const risk_gross = bal * (pd_final / 12) * sev_final;
    const val_risk =
      risk_gross *
      (1 - (financialAssumptions.recoveryRate || SCALARS.recovery_rate)) *
      active;

    // Fund: split into used-limit and unused-limit components
    const usedAmount = spend + bal;
    const unusedLimit = Math.max(0, limit - usedAmount);
    const val_fund_used = usedAmount * r_ftp * active;
    // Unused limit cost = active customers' unused portion + inactive surviving customers' full limit
    const val_fund_unused_active = unusedLimit * r_ftp * unusedLimitFactor * active;
    const val_fund_unused_inactive = limit * r_ftp * unusedLimitFactor * (valid - active);
    const val_fund_unused = val_fund_unused_active + val_fund_unused_inactive;
    const val_fund = val_fund_used + val_fund_unused;

    // Other costs (unchanged)
    const val_opex = r_opex * valid;
    const val_fraud = spend * (financialAssumptions.fraudRate ?? SCALARS.fraud_rate) * active;
    const rew_unit = Math.min(
      spend * (financialAssumptions.rewardsRate || SCALARS.reward_rate),
      financialAssumptions.rewardsCap ?? SCALARS.reward_cap,
    );
    const val_reward = rew_unit * active;
    const val_other_group = val_opex + val_fraud + val_reward;

    // Acquisition (M1 Only)
    const val_acq =
      t === 0 ? (financialAssumptions.cac || SCALARS.cpa) * 1.0 : 0;

    // --- E. Discounting ---
    const d = df[t];
    acc.int += val_int * d;
    acc.inst += val_inst * d;
    acc.nint += val_nint_group * d;
    acc.risk += val_risk * d;
    acc.fund += val_fund * d;
    acc.fundUsed += val_fund_used * d;
    acc.fundUnused += val_fund_unused * d;
    acc.other += val_other_group * d;
    acc.acq += val_acq * d;

    // NCF (Pre-discount) for TV — includes installment income
    ncf.push(
      val_int + val_inst + val_nint_group - (val_risk + val_fund + val_other_group + val_acq),
    );

    monthlySnapshots.push({
      month: t + 1,
      valid,
      active,
      spend,
      balance: bal,
      revolveRate: finalRevRate,
      pd: pd_final,
      severity: sev_final,
      intIncome: val_int * d,
      instIncome: val_inst * d,
      nintIncome: val_nint_group * d,
      nintInterchange: val_intchg * d,
      nintAnnualFee: val_fee * d,
      nintCashAdvance: (val_cash + val_ovl) * d,
      riskCost: val_risk * d,
      fundCost: val_fund * d,
      fundUsedCost: val_fund_used * d,
      fundUnusedCost: val_fund_unused * d,
      otherCost: val_other_group * d,
      otherOpex: val_opex * d,
      otherFraud: val_fraud * d,
      otherRewards: val_reward * d,
      installmentRate: finalInstRate,
      uipPast: uip_total,
    });
  }

  // --- F. Terminal Value ---
  const ncf_ops = ncf.map(
    (v, i) => v + (i === 0 ? (financialAssumptions.cac || SCALARS.cpa) : 0),
  );
  const sum_last = ncf_ops.slice(87, 99).reduce((a, b) => a + b, 0);
  const avg_cf = sum_last / 12;

  let tv_val = (avg_cf / r_mo_disc) * df[T - 1];
  const pv_ops = acc.int + acc.inst + acc.nint - (acc.risk + acc.fund + acc.other);
  const e = SCALARS.tv_cap_percent;
  const cap = pv_ops * (e / (1 - e));

  if (tv_val > 0) tv_val = Math.min(tv_val, cap);
  if (tv_val < 0) tv_val = 0;
  acc.tv = tv_val;

  return { acc, monthlySnapshots, ncf };
}

// ============================================
// 4. BRIDGE: Monthly -> Annual Metrics
// ============================================
// Converts 99-month snapshots into 8 AnnualMetrics for UI compatibility

function monthlyToAnnualMetrics(
  snapshots: MonthlySnapshot[],
  limit: number,
  gradeIndex: number,
): AnnualMetrics[] {
  const annualMetrics: AnnualMetrics[] = [];

  for (let year = 1; year <= 8; year++) {
    const startMonth = (year - 1) * 12;
    const endMonth = Math.min(year * 12, snapshots.length);
    const yearSnapshots = snapshots.slice(startMonth, endMonth);

    const zeroMetric: AnnualMetrics = {
      year,
      activityRate: 0, transaction: 0, utilizationRate: 0,
      balance: 0, revolvingRate: 0, revolvingBalance: 0,
      pd: 0, lgd: 0,
      interestIncome: 0, nonInterestIncome: 0,
      nintInterchange: 0, nintAnnualFee: 0, nintCashAdvance: 0,
      riskCost: 0, fundingCost: 0, fundingCostUsed: 0, fundingCostUnused: 0,
      opexAmortized: 0, fraudCost: 0, rewardsCost: 0, marketingCost: 0,
      installmentIncome: 0, installmentRate: 0, uipPast: 0,
    };

    if (yearSnapshots.length === 0) {
      annualMetrics.push(zeroMetric);
      continue;
    }

    // Average metrics over the year
    const avgActive =
      yearSnapshots.reduce((s, m) => s + m.active, 0) / yearSnapshots.length;
    const avgBal =
      yearSnapshots.reduce((s, m) => s + m.balance, 0) / yearSnapshots.length;
    const avgRevRate =
      yearSnapshots.reduce((s, m) => s + m.revolveRate, 0) /
      yearSnapshots.length;
    const avgPD =
      yearSnapshots.reduce((s, m) => s + m.pd, 0) / yearSnapshots.length;
    const avgSeverity =
      yearSnapshots.reduce((s, m) => s + m.severity, 0) /
      yearSnapshots.length;

    // Sum income/cost over the year (already discounted in snapshots)
    const totalInt = yearSnapshots.reduce((s, m) => s + m.intIncome, 0);
    const totalNint = yearSnapshots.reduce((s, m) => s + m.nintIncome, 0);
    const totalNintInterchange = yearSnapshots.reduce((s, m) => s + m.nintInterchange, 0);
    const totalNintAnnualFee = yearSnapshots.reduce((s, m) => s + m.nintAnnualFee, 0);
    const totalNintCashAdvance = yearSnapshots.reduce((s, m) => s + m.nintCashAdvance, 0);
    const totalRisk = yearSnapshots.reduce((s, m) => s + m.riskCost, 0);
    const totalFund = yearSnapshots.reduce((s, m) => s + m.fundCost, 0);
    const totalFundUsed = yearSnapshots.reduce((s, m) => s + m.fundUsedCost, 0);
    const totalFundUnused = yearSnapshots.reduce((s, m) => s + m.fundUnusedCost, 0);
    const totalOther = yearSnapshots.reduce((s, m) => s + m.otherCost, 0);
    const totalOpex = yearSnapshots.reduce((s, m) => s + m.otherOpex, 0);
    const totalFraud = yearSnapshots.reduce((s, m) => s + m.otherFraud, 0);
    const totalRewards = yearSnapshots.reduce((s, m) => s + m.otherRewards, 0);
    const totalSpend = yearSnapshots.reduce((s, m) => s + m.spend, 0);
    const totalInstIncome = yearSnapshots.reduce((s, m) => s + m.instIncome, 0);
    const avgInstRate = yearSnapshots.reduce((s, m) => s + m.installmentRate, 0) / yearSnapshots.length;
    const avgUipPast = yearSnapshots.reduce((s, m) => s + m.uipPast, 0) / yearSnapshots.length;

    annualMetrics.push({
      year,
      activityRate: avgActive,
      transaction: Math.round(totalSpend),
      utilizationRate: Math.min(0.99, avgBal / Math.max(limit, 1)),
      balance: Math.round(avgBal),
      revolvingRate: avgRevRate,
      revolvingBalance: Math.round(avgBal * avgRevRate),
      pd: Math.min(0.95, avgPD),
      lgd: avgSeverity * (1 - SCALARS.recovery_rate),
      interestIncome: Math.round(totalInt),
      nonInterestIncome: Math.round(totalNint),
      nintInterchange: Math.round(totalNintInterchange),
      nintAnnualFee: Math.round(totalNintAnnualFee),
      nintCashAdvance: Math.round(totalNintCashAdvance),
      riskCost: Math.round(totalRisk),
      fundingCost: Math.round(totalFund),
      fundingCostUsed: Math.round(totalFundUsed),
      fundingCostUnused: Math.round(totalFundUnused),
      opexAmortized: Math.round(totalOpex),
      fraudCost: Math.round(totalFraud),
      rewardsCost: Math.round(totalRewards),
      marketingCost: Math.round(totalOther),
      installmentIncome: Math.round(totalInstIncome),
      installmentRate: avgInstRate,
      uipPast: Math.round(avgUipPast),
    });
  }

  return annualMetrics;
}

// ============================================
// 5. RISK LEVEL NPV CALCULATION
// ============================================

function calculateRiskLevelNPV(
  level: RiskLevel,
  riskDist: RiskDistribution,
  factors: BusinessFactors,
  scenarioType: string,
  includeTV: boolean,
): RiskLevelSummary {
  const gradeIndex = level - 1;
  const limit = riskDist.initialLimit || 20000;

  // Run the full 99-month engine
  const { acc, monthlySnapshots } = runMonthlyEngine(
    gradeIndex,
    limit,
    factors,
    scenarioType,
  );

  // Convert to annual metrics for UI
  const annualMetrics = monthlyToAnnualMetrics(
    monthlySnapshots,
    limit,
    gradeIndex,
  );

  const tv = includeTV ? acc.tv : 0;
  const npv =
    acc.int + acc.inst + acc.nint + tv - (acc.risk + acc.fund + acc.other + acc.acq);

  const y1 = annualMetrics[0];
  // Find peak utilization across all years
  const utilizationPeak = Math.max(...annualMetrics.map((m) => m.utilizationRate));

  return {
    level,
    npv: Math.round(npv),
    cac: Math.round(acc.acq),
    interestIncome: Math.round(acc.int),
    nonInterestIncome: Math.round(acc.nint),
    riskCost: Math.round(acc.risk),
    fundingCost: Math.round(acc.fund),
    opexAndOther: Math.round(acc.other),
    terminalValue: Math.round(tv),

    // Per-active metrics (Year 1 snapshot)
    activityRate: y1.activityRate,
    monthlyTransaction: Math.round(y1.transaction / 12),
    utilizationPeak,
    avgBalance: y1.balance,
    revolvingRate: y1.revolvingRate,
    avgRevolvingBalance: y1.revolvingBalance,
    basePD: y1.pd,
    baseLGD: y1.lgd,

    annualMetrics,
  };
}

// ============================================
// 6. MAIN EXPORT: calculateNPV
// ============================================

export function calculateNPV(
  strategyConfig: StrategyConfig,
  factors: BusinessFactors,
  options?: { includeTV?: boolean; discountRate?: number; terminalValueCap?: number },
  ): NPVResult {
  const scenarioType = strategyConfig.scenario || 'base';
  const includeTV = options?.includeTV ?? true;
  // Temporarily override SCALARS for this calculation run
  const savedDiscountRate = SCALARS.discount_rate;
  const savedTvCap = SCALARS.tv_cap_percent;
  if (options?.discountRate !== undefined) SCALARS.discount_rate = options.discountRate;
  if (options?.terminalValueCap !== undefined) SCALARS.tv_cap_percent = options.terminalValueCap;

  const riskLevelResults: RiskLevelSummary[] = [];

  for (const riskDist of factors.riskDistribution) {
    riskLevelResults.push(
      calculateRiskLevelNPV(
        riskDist.level,
        riskDist,
        factors,
        scenarioType,
        includeTV,
      ),
    );
  }

  // Weighted Aggregation
  let totalNPV = 0;
  let totalCAC = 0;
  let totalInt = 0;
  let totalInst = 0;
  let totalNonInt = 0;
  let totalRisk = 0;
  let totalFund = 0;
  let totalOpex = 0;
  let totalTV = 0;
  // Sub-component aggregation
  let totalNintInterchange = 0;
  let totalNintAnnualFee = 0;
  let totalNintCashAdvance = 0;
  let totalOtherOpex = 0;
  let totalOtherFraud = 0;
  let totalOtherRewards = 0;
  let totalFundUsed = 0;
  let totalFundUnused = 0;

  riskLevelResults.forEach((r, i) => {
    const w = factors.riskDistribution[i].percentage;
    totalNPV += r.npv * w;
    totalCAC += r.cac * w;
    totalInt += r.interestIncome * w;
    totalNonInt += r.nonInterestIncome * w;
    totalRisk += r.riskCost * w;
    totalFund += r.fundingCost * w;
    totalOpex += r.opexAndOther * w;
    totalTV += r.terminalValue * w;
    // Aggregate sub-components from annualMetrics
    for (const m of (r.annualMetrics || [])) {
      totalNintInterchange += m.nintInterchange * w;
      totalNintAnnualFee += m.nintAnnualFee * w;
      totalNintCashAdvance += m.nintCashAdvance * w;
      totalOtherOpex += m.opexAmortized * w;
      totalOtherFraud += m.fraudCost * w;
      totalOtherRewards += m.rewardsCost * w;
      totalFundUsed += (m.fundingCostUsed || 0) * w;
      totalFundUnused += (m.fundingCostUnused || 0) * w;
      totalInst += (m.installmentIncome || 0) * w;
    }
  });

  const summary: RiskLevelSummary = {
    level: 5 as RiskLevel,
    npv: Math.round(totalNPV),
    cac: Math.round(totalCAC),
    interestIncome: Math.round(totalInt),
    nonInterestIncome: Math.round(totalNonInt),
    riskCost: Math.round(totalRisk),
    fundingCost: Math.round(totalFund),
    opexAndOther: Math.round(totalOpex),
    terminalValue: Math.round(totalTV),
    activityRate: 0,
    monthlyTransaction: 0,
    utilizationPeak: 0,
    avgBalance: 0,
    revolvingRate: 0,
    avgRevolvingBalance: 0,
    basePD: 0,
    baseLGD: 0,
    annualMetrics: [],
  };

  const pvComposition: PVComposition = {
    nonInterestIncome: summary.nonInterestIncome,
    nintInterchange: Math.round(totalNintInterchange),
    nintAnnualFee: Math.round(totalNintAnnualFee),
    nintCashAdvance: Math.round(totalNintCashAdvance),
    interestIncome: summary.interestIncome,
    installmentIncome: Math.round(totalInst),
    totalIncome: summary.nonInterestIncome + summary.interestIncome + Math.round(totalInst),
    riskCost: -summary.riskCost,
    cac: -summary.cac,
    otherCost: -summary.opexAndOther,
    otherOpex: Math.round(totalOtherOpex),
    otherFraud: Math.round(totalOtherFraud),
    otherRewards: Math.round(totalOtherRewards),
    fundingCost: -summary.fundingCost,
    fundingCostUsed: Math.round(totalFundUsed),
    fundingCostUnused: Math.round(totalFundUnused),
    terminalValue: summary.terminalValue,
    pvValue: summary.npv,
  };

  // Restore SCALARS
  SCALARS.discount_rate = savedDiscountRate;
  SCALARS.tv_cap_percent = savedTvCap;

  return {
    id: `res_${Date.now()}`,
    strategyConfig,
    businessFactors: factors,
    summary,
    riskLevelResults,
    pvComposition,
    calculatedAt: new Date(),
  };
}

// ============================================
// 7. WEIGHTED METRIC CALCULATOR (for UI stress hints)
// ============================================
// Computes real distribution-weighted monthly averages from static curves

export function computeWeightedMetrics(
  factors: BusinessFactors,
): {
  avgPD: number;
  avgSeverity: number;
  avgUtil: number;
  avgRevolve: number;
  avgCashAmt: number;
  avgSpend: number;
  avgActive: number;
  avgAttrition: number;
} {
  const curves = STATIC_CURVES;
  const { riskDistribution, stressCoefficients } = factors;
  
  let avgPD = 0;
  let avgSeverity = 0;
  let avgUtil = 0;
  let avgRevolve = 0;
  let avgCashAmt = 0;
  let avgSpend = 0;
  let avgActive = 0;
  let avgAttrition = 0;
  
  // Use month 12 as representative "stabilized" month for display
  const refMonth = 11; // index 11 = month 12
  
  for (const rd of riskDistribution) {
    const g = rd.level - 1;
    const w = rd.percentage;
    if (w <= 0) continue;
    
    avgPD += curves.pd_annual[g][refMonth] * stressCoefficients.pdMultiplier * w;
    avgSeverity += Math.min(1.0, curves.severity[g][refMonth] * stressCoefficients.lgdMultiplier) * w;
    avgUtil += Math.min(1.0, curves.utilization[g][refMonth] * stressCoefficients.utilizationMultiplier) * w;
    avgRevolve += Math.min(1.0, curves.revolve_rate[g][refMonth] * stressCoefficients.revolvingMultiplier) * w;
    avgCashAmt += curves.cash_amt[g][refMonth] * (stressCoefficients.cashMultiplier ?? stressCoefficients.spendMultiplier) * w;
    avgSpend += curves.spend_amt[g][refMonth] * stressCoefficients.spendMultiplier * w;
    avgActive += Math.min(1.0, curves.active_rate[g][refMonth] * stressCoefficients.activeRateMultiplier) * w;
    avgAttrition += Math.min(1.0, curves.churn_rate[g][refMonth] * stressCoefficients.attritionMultiplier) * w;
  }
  
  return { avgPD, avgSeverity, avgUtil, avgRevolve, avgCashAmt, avgSpend, avgActive, avgAttrition };
}

// Helper: Get PD and Severity for a specific risk level from static curves
export function getGradeStaticMetrics(
  gradeIndex: number,
  month: number = 11,
): { pd: number; severity: number } {
  const curves = STATIC_CURVES;
  return {
    pd: curves.pd_annual[gradeIndex]?.[month] ?? 0,
    severity: curves.severity[gradeIndex]?.[month] ?? 0,
  };
}

// ============================================
// 8A. GRADE DETAIL METRICS (for 参数细节 Dialog)
// ============================================

export interface GradeDetailRow {
  grade: string;       // 'R1'...'R10' or '加权'
  distribution: number;
  limit: number;
  churnRate: number;
  activeRate: number;
  utilRate: number;
  balance: number;     // limit * utilRate
  spendAmt: number;
  revolvingRate: number;  // = revolve_rate * splitRev (after stress)
  installmentRate: number; // = revolve_rate * (1-splitRev)
  interestBearingRate: number; // = revolvingRate + installmentRate (total interest-bearing rate)
  installmentAmt: number; // balance * installmentRate (approx UIP)
  revolvingAmt: number;   // balance * revolvingRate
  cashAmt: number;
  pd: number;
  severity: number;
}

export interface GradeDetailTrendRow {
  grade: string;
  years: GradeDetailRow[]; // 8 entries, one per year
}

/**
 * Compute per-grade detail metrics using static curves + stress factors.
 * Returns both point-in-time (month 12) for static table, and annual averages for trends.
 */
export function computeGradeDetailMetrics(
  factors: BusinessFactors,
): { static: GradeDetailRow[]; trends: GradeDetailTrendRow[] } {
  const curves = STATIC_CURVES;
  const { riskDistribution, stressCoefficients, v2Installment } = factors;
  const splitRev = Math.max(0, Math.min(1, v2Installment.revolvingInstSplit));
  const refMonth = 11; // month 12

  const staticRows: GradeDetailRow[] = [];
  const trendRows: GradeDetailTrendRow[] = [];

  // V3: Limit elasticity
  const le: LimitElasticityCoeffs = factors.limitElasticity || DEFAULT_LIMIT_ELASTICITY;

  for (const rd of riskDistribution) {
    const g = rd.level - 1;
    const limit = rd.initialLimit;
    const w = rd.percentage;

    // V3: Compute limit deviation multipliers with diminishing returns
    const baseLimit = DEFAULT_RISK_DISTRIBUTION[g]?.initialLimit || limit;
    const dL = Math.max(limit / baseLimit, 0.001);
    const exc = Math.max(0, dL - 1.0);
    const k2 = le.transitionSpeed ?? 1.5;
    const t2 = exc / (exc + k2);
    const gEff = (le.gammaStart[g] ?? 0.15) + ((le.gammaEnd[g] ?? -0.8) - (le.gammaStart[g] ?? 0.15)) * t2;
    const tEff = (le.thetaStart[g] ?? 0.2) + ((le.thetaEnd[g] ?? -0.7) - (le.thetaStart[g] ?? 0.2)) * t2;
    const lK2 = le.lambdaK?.[g] ?? 0.55;
    const tL2 = exc * exc / (exc * exc + lK2 * lK2);
    const lEff = (le.lambdaStart?.[g] ?? 1.0) + ((le.lambdaEnd?.[g] ?? -0.8) - (le.lambdaStart?.[g] ?? 1.0)) * tL2;
    const spMult = dL === 1 ? 1 : Math.pow(dL, 1.0 + gEff);
    const utMult = dL === 1 ? 1 : Math.pow(dL, tEff);
    const svMult = dL === 1 ? 1 : Math.pow(dL, le.phi[g] ?? 0);
    const rtMult = dL === 1 ? 1 : Math.pow(dL, lEff);

    // --- Static (month 12) ---
    const churn = Math.min(curves.churn_rate[g]?.[refMonth] * stressCoefficients.attritionMultiplier, 1.0);
    const active = Math.min(curves.active_rate[g]?.[refMonth] * stressCoefficients.activeRateMultiplier, 1.0);
    const util = Math.min(curves.utilization[g]?.[refMonth] * stressCoefficients.utilizationMultiplier * utMult, 1.0);
    const bal = limit * util;
    const spend = curves.spend_amt[g]?.[refMonth] * stressCoefficients.spendMultiplier * spMult;
    const matrixRate = Math.min(curves.revolve_rate[g]?.[refMonth] * stressCoefficients.revolvingMultiplier, 1.0);
    const revRate = Math.min(0.95, matrixRate * splitRev * rtMult);
    const instRate = Math.min(0.95, matrixRate * (1 - splitRev) * rtMult);
    const cash = curves.cash_amt[g]?.[refMonth] * (stressCoefficients.cashMultiplier ?? stressCoefficients.spendMultiplier) * spMult;
    const pd = curves.pd_annual[g]?.[refMonth] * stressCoefficients.pdMultiplier;
    const sev = Math.min(curves.severity[g]?.[refMonth] * stressCoefficients.lgdMultiplier * svMult, 1.0);

    staticRows.push({
      grade: `R${rd.level}`,
      distribution: w,
      limit,
      churnRate: churn,
      activeRate: active,
      utilRate: util,
      balance: bal,
      spendAmt: spend,
      revolvingRate: revRate,
      installmentRate: instRate,
      interestBearingRate: revRate + instRate,
      installmentAmt: bal * instRate,
      revolvingAmt: bal * revRate,
      cashAmt: cash,
      pd,
      severity: sev,
    });

    // --- Trends (annual averages) ---
    const yearRows: GradeDetailRow[] = [];
    for (let yr = 1; yr <= 8; yr++) {
      const startM = (yr - 1) * 12;
      const endM = Math.min(yr * 12, 99);
      let sumChurn = 0, sumActive = 0, sumUtil = 0, sumSpend = 0, sumCash = 0;
      let sumRevRate = 0, sumInstRate = 0, sumPd = 0, sumSev = 0;
      let count = 0;
      for (let t = startM; t < endM; t++) {
        if (!curves.active_rate[g]?.[t]) continue;
        sumChurn += Math.min(curves.churn_rate[g][t] * stressCoefficients.attritionMultiplier, 1.0);
        sumActive += Math.min(curves.active_rate[g][t] * stressCoefficients.activeRateMultiplier, 1.0);
        sumUtil += Math.min(curves.utilization[g][t] * stressCoefficients.utilizationMultiplier * utMult, 1.0);
        sumSpend += curves.spend_amt[g][t] * stressCoefficients.spendMultiplier * spMult;
        sumCash += curves.cash_amt[g][t] * (stressCoefficients.cashMultiplier ?? stressCoefficients.spendMultiplier) * spMult;
        const mr = Math.min(curves.revolve_rate[g][t] * stressCoefficients.revolvingMultiplier, 1.0);
        sumRevRate += Math.min(0.95, mr * splitRev * rtMult);
        sumInstRate += Math.min(0.95, mr * (1 - splitRev) * rtMult);
        sumPd += curves.pd_annual[g][t] * stressCoefficients.pdMultiplier;
        sumSev += Math.min(curves.severity[g][t] * stressCoefficients.lgdMultiplier * svMult, 1.0);
        count++;
      }
      const n = count || 1;
      const aUtil = sumUtil / n;
      const aBal = limit * aUtil;
      const aRevRate = sumRevRate / n;
      const aInstRate = sumInstRate / n;
      yearRows.push({
        grade: `R${rd.level}`,
        distribution: w,
        limit,
        churnRate: sumChurn / n,
        activeRate: sumActive / n,
        utilRate: aUtil,
        balance: aBal,
        spendAmt: sumSpend / n,
  revolvingRate: aRevRate,
  installmentRate: aInstRate,
  interestBearingRate: aRevRate + aInstRate,
  installmentAmt: aBal * aInstRate,
        revolvingAmt: aBal * aRevRate,
        cashAmt: sumCash / n,
        pd: sumPd / n,
        severity: sumSev / n,
      });
    }
    trendRows.push({ grade: `R${rd.level}`, years: yearRows });
  }

  // Add weighted summary row to static
  const weightedRow: GradeDetailRow = {
    grade: '加权',
    distribution: staticRows.reduce((s, r) => s + r.distribution, 0),
    limit: staticRows.reduce((s, r) => s + r.limit * r.distribution, 0),
    churnRate: staticRows.reduce((s, r) => s + r.churnRate * r.distribution, 0),
    activeRate: staticRows.reduce((s, r) => s + r.activeRate * r.distribution, 0),
    utilRate: staticRows.reduce((s, r) => s + r.utilRate * r.distribution, 0),
    balance: staticRows.reduce((s, r) => s + r.balance * r.distribution, 0),
    spendAmt: staticRows.reduce((s, r) => s + r.spendAmt * r.distribution, 0),
  revolvingRate: staticRows.reduce((s, r) => s + r.revolvingRate * r.distribution, 0),
  installmentRate: staticRows.reduce((s, r) => s + r.installmentRate * r.distribution, 0),
  interestBearingRate: staticRows.reduce((s, r) => s + r.interestBearingRate * r.distribution, 0),
    installmentAmt: staticRows.reduce((s, r) => s + r.installmentAmt * r.distribution, 0),
    revolvingAmt: staticRows.reduce((s, r) => s + r.revolvingAmt * r.distribution, 0),
    cashAmt: staticRows.reduce((s, r) => s + r.cashAmt * r.distribution, 0),
    pd: staticRows.reduce((s, r) => s + r.pd * r.distribution, 0),
    severity: staticRows.reduce((s, r) => s + r.severity * r.distribution, 0),
  };

  return { static: [weightedRow, ...staticRows], trends: trendRows };
}

// ============================================
// 8B. WATERFALL GENERATOR
// ============================================

export function generateWaterfallItems(pv: PVComposition): WaterfallItem[] {
  const items: WaterfallItem[] = [];

  const cac = Math.abs(pv.cac);
  items.push({
    id: 'cac',
    label: '获客成本',
    value: -cac,
    y0: 0,
    y1: -cac,
    runningTotal: -cac,
    type: 'negative',
    linkedFactors: [],
  });

  // 生息收入 sub-items: 循环收入 + 分期收入
  const intY1 = -cac + pv.interestIncome;
  items.push({
    id: 'int',
    label: '  循环收入',
    value: pv.interestIncome,
    y0: -cac,
    y1: intY1,
    runningTotal: intY1,
    type: 'positive',
    linkedFactors: [],
    group: '生息收入',
  });

  const instIncome = pv.installmentIncome || 0;
  const instY1 = intY1 + instIncome;
  items.push({
    id: 'inst',
    label: '  分期收入',
    value: instIncome,
    y0: intY1,
    y1: instY1,
    runningTotal: instY1,
    type: 'positive',
    linkedFactors: [],
    group: '生息收入',
  });

  // Non-interest income sub-items
  const nintInterchangeY1 = instY1 + (pv.nintInterchange || 0);
  items.push({
    id: 'nint_interchange',
    label: '  回佣',
    value: pv.nintInterchange || 0,
    y0: instY1,
    y1: nintInterchangeY1,
    runningTotal: nintInterchangeY1,
    type: 'positive',
    linkedFactors: [],
    group: '非息收入',
  });

  const nintFeeY1 = nintInterchangeY1 + (pv.nintAnnualFee || 0);
  items.push({
    id: 'nint_fee',
    label: '  年费',
    value: pv.nintAnnualFee || 0,
    y0: nintInterchangeY1,
    y1: nintFeeY1,
    runningTotal: nintFeeY1,
    type: 'positive',
    linkedFactors: [],
    group: '非息收入',
  });

  const nonIntY1 = nintFeeY1 + (pv.nintCashAdvance || 0);
  items.push({
    id: 'nint_cash',
    label: '  取现费',
    value: pv.nintCashAdvance || 0,
    y0: nintFeeY1,
    y1: nonIntY1,
    runningTotal: nonIntY1,
    type: 'positive',
    linkedFactors: [],
    group: '非息收入',
  });

  // 资金成本: split into 已用额度 and 未用额度 sub-items
  const fundUsedAbs = Math.abs(pv.fundingCostUsed || 0);
  const fundUnusedAbs = Math.abs(pv.fundingCostUnused || 0);
  const fundUsedY1 = nonIntY1 - fundUsedAbs;
  items.push({
    id: 'fund_used',
    label: '  已用额度资金成本',
    value: -fundUsedAbs,
    y0: nonIntY1,
    y1: fundUsedY1,
    runningTotal: fundUsedY1,
    type: 'negative',
    linkedFactors: [],
    group: '资金成本',
  });

  const fundY1 = fundUsedY1 - fundUnusedAbs;
  items.push({
    id: 'fund_unused',
    label: '  未用额度资金成本',
    value: -fundUnusedAbs,
    y0: fundUsedY1,
    y1: fundY1,
    runningTotal: fundY1,
    type: 'negative',
    linkedFactors: [],
    group: '资金成本',
  });

  const riskY1 = fundY1 - Math.abs(pv.riskCost);
  items.push({
    id: 'risk',
    label: '风险成本',
    value: -Math.abs(pv.riskCost),
    y0: fundY1,
    y1: riskY1,
    runningTotal: riskY1,
    type: 'negative',
    linkedFactors: [],
  });

  // Other cost sub-items
  const otherOpexY1 = riskY1 - Math.abs(pv.otherOpex || 0);
  items.push({
    id: 'other_opex',
    label: '  运营',
    value: -Math.abs(pv.otherOpex || 0),
    y0: riskY1,
    y1: otherOpexY1,
    runningTotal: otherOpexY1,
    type: 'negative',
    linkedFactors: [],
    group: '其他成本',
  });

  const otherFraudY1 = otherOpexY1 - Math.abs(pv.otherFraud || 0);
  items.push({
    id: 'other_fraud',
    label: '  欺诈',
    value: -Math.abs(pv.otherFraud || 0),
    y0: otherOpexY1,
    y1: otherFraudY1,
    runningTotal: otherFraudY1,
    type: 'negative',
    linkedFactors: [],
    group: '其他成本',
  });

  const otherY1 = otherFraudY1 - Math.abs(pv.otherRewards || 0);
  items.push({
    id: 'other_rewards',
    label: '  权益',
    value: -Math.abs(pv.otherRewards || 0),
    y0: otherFraudY1,
    y1: otherY1,
    runningTotal: otherY1,
    type: 'negative',
    linkedFactors: [],
    group: '其他成本',
  });

  const tvY1 = otherY1 + pv.terminalValue;
  items.push({
    id: 'tv',
    label: '残值TV',
    value: pv.terminalValue,
    y0: otherY1,
    y1: tvY1,
    runningTotal: tvY1,
    type: 'terminal',
    linkedFactors: [],
  });

  items.push({
    id: 'npv',
    label: '总NPV',
    value: pv.pvValue,
    y0: 0,
    y1: pv.pvValue,
    runningTotal: pv.pvValue,
    type: 'total',
    linkedFactors: [],
  });

  return items;
}

/** Collapsed waterfall: aggregate sub-items into parent groups */
export function generateCollapsedWaterfallItems(pv: PVComposition): WaterfallItem[] {
  const items: WaterfallItem[] = [];

  const cac = Math.abs(pv.cac);
  items.push({ id: 'cac', label: '获客成本', value: -cac, y0: 0, y1: -cac, runningTotal: -cac, type: 'negative', linkedFactors: [] });

  // 生息收入 = 循环收入 + 分期收入 (collapsed into one bar)
  const interestTotal = pv.interestIncome + (pv.installmentIncome || 0);
  const intY1 = -cac + interestTotal;
  items.push({ id: 'int_total', label: '生息收入', value: interestTotal, y0: -cac, y1: intY1, runningTotal: intY1, type: 'positive', linkedFactors: [] });

  const nonIntY1 = intY1 + pv.nonInterestIncome;
  items.push({ id: 'nint', label: '非息收入', value: pv.nonInterestIncome, y0: intY1, y1: nonIntY1, runningTotal: nonIntY1, type: 'positive', linkedFactors: [] });

  const fundTotal = Math.abs(pv.fundingCost);
  const fundY1 = nonIntY1 - fundTotal;
  items.push({ id: 'fund', label: '资金成本', value: -fundTotal, y0: nonIntY1, y1: fundY1, runningTotal: fundY1, type: 'negative', linkedFactors: [] });

  const riskY1 = fundY1 - Math.abs(pv.riskCost);
  items.push({ id: 'risk', label: '风险成本', value: -Math.abs(pv.riskCost), y0: fundY1, y1: riskY1, runningTotal: riskY1, type: 'negative', linkedFactors: [] });

  const otherY1 = riskY1 + pv.otherCost; // otherCost is already negative
  items.push({ id: 'other', label: '其他成本', value: pv.otherCost, y0: riskY1, y1: otherY1, runningTotal: otherY1, type: 'negative', linkedFactors: [] });

  const tvY1 = otherY1 + pv.terminalValue;
  items.push({ id: 'tv', label: '残值TV', value: pv.terminalValue, y0: otherY1, y1: tvY1, runningTotal: tvY1, type: 'terminal', linkedFactors: [] });

  items.push({ id: 'npv', label: '总NPV', value: pv.pvValue, y0: 0, y1: pv.pvValue, runningTotal: pv.pvValue, type: 'total', linkedFactors: [] });

  return items;
}
