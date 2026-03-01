'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import type {
  BusinessFactors,
  StrategyConfig,
  NPVResult,
  CardProduct,
  AcquisitionChannel,
  DecisionScenario,
  AppStage,
  WizardStep,
  RiskDistribution,
  ProductParams,
  FinancialAssumptions,
  StressCoefficients,
  CalculationHistory,
  V2InstallmentParams,
  Snapshot,
  ParamChange,
} from './npv-types';
import {
  DEFAULT_BUSINESS_FACTORS,
  DEFAULT_RISK_DISTRIBUTION,
  DEFAULT_PRODUCT_PARAMS,
  DEFAULT_FINANCIAL_ASSUMPTIONS,
  DEFAULT_STRESS_COEFFICIENTS,
  DEFAULT_V2_INSTALLMENT,
  CARD_PRODUCT_PRESETS,
  CHANNEL_CAC_PRESETS,
} from './npv-types';
import { calculateNPV } from './npv-engine';

interface NPVContextType {
  // Navigation
  currentStage: AppStage;
  setCurrentStage: (stage: AppStage) => void;
  wizardStep: WizardStep;
  setWizardStep: (step: WizardStep) => void;
  
  // Strategy configuration
  strategyConfig: StrategyConfig | null;
  cardProduct: CardProduct | null;
  channel: AcquisitionChannel | null;
  scenario: DecisionScenario | null;
  setCardProduct: (product: CardProduct) => void;
  setChannel: (channel: AcquisitionChannel) => void;
  setScenario: (scenario: DecisionScenario) => void;
  
  // Business factors
  businessFactors: BusinessFactors;
  updateRiskDistribution: (distribution: RiskDistribution[]) => void;
  updateProductParams: (params: Partial<ProductParams>) => void;
  updateFinancialAssumptions: (assumptions: Partial<FinancialAssumptions>) => void;
  updateStressCoefficients: (coefficients: Partial<StressCoefficients>) => void;
  updateV2Installment: (params: Partial<V2InstallmentParams>) => void;
  resetFactors: () => void;
  
  // Calculation
  result: NPVResult | null;
  isCalculating: boolean;
  runCalculation: () => void;
  
  // History
  history: CalculationHistory[];
  saveToHistory: (name: string) => void;
  loadFromHistory: (id: string) => void;
  deleteFromHistory: (id: string) => void;
  
  // Factor highlighting (for causal tracing)
  highlightedFactors: string[];
  setHighlightedFactors: (factors: string[]) => void;
  
  // Global offset for Step 1
  channelQualityOffset: number;
  setChannelQualityOffset: (offset: number) => void;
  
  // Terminal Value toggle (default: OFF)
  includeTerminalValue: boolean;
  setIncludeTerminalValue: (include: boolean) => void;
  
  // Advanced params
  terminalValueCap: number;
  setTerminalValueCap: (cap: number) => void;
  discountRate: number;
  setDiscountRate: (rate: number) => void;
  meanReversionEnabled: boolean;
  setMeanReversionEnabled: (enabled: boolean) => void;
  
  // Snapshots
  snapshots: Snapshot[];
  saveSnapshot: (name: string) => void;
  deleteSnapshot: (id: string) => void;
  loadSnapshot: (id: string) => void;
  
  // Reset
  resetAll: () => void;
  startNewAnalysis: () => void;
}

const NPVContext = createContext<NPVContextType | null>(null);

export function useNPV() {
  const context = useContext(NPVContext);
  if (!context) {
    throw new Error('useNPV must be used within NPVProvider');
  }
  return context;
}

// Compute parameter differences vs a reference (defaults to the baseline/initial factors)
function computeParamChanges(factors: BusinessFactors, ref?: BusinessFactors): ParamChange[] {
  const changes: ParamChange[] = [];
  const def = ref ?? DEFAULT_BUSINESS_FACTORS;
  const pct = (v: number) => `${(v * 100).toFixed(2)}%`;
  const yuan = (v: number) => `¥${v.toFixed(0)}`;
  const num = (v: number) => v.toFixed(2);
  // Product params
  const pp = factors.productParams, dp = def.productParams;
  if (Math.abs(pp.apr - dp.apr) > 1e-6) changes.push({ label: '循环利率', group: '产品参数', defaultValue: pct(dp.apr), currentValue: pct(pp.apr) });
  if (Math.abs(pp.annualFee - dp.annualFee) > 0.5) changes.push({ label: '年费', group: '产品参数', defaultValue: yuan(dp.annualFee), currentValue: yuan(pp.annualFee) });
  if (Math.abs(pp.interchangeRate - dp.interchangeRate) > 1e-6) changes.push({ label: '回佣率', group: '产品参数', defaultValue: pct(dp.interchangeRate), currentValue: pct(pp.interchangeRate) });
  if (Math.abs(pp.cashAdvanceFee - dp.cashAdvanceFee) > 1e-6) changes.push({ label: '取现费率', group: '产品参数', defaultValue: pct(dp.cashAdvanceFee), currentValue: pct(pp.cashAdvanceFee) });
  if (Math.abs(pp.overlimitFee - dp.overlimitFee) > 0.5) changes.push({ label: '超限费', group: '产品参数', defaultValue: yuan(dp.overlimitFee), currentValue: yuan(pp.overlimitFee) });
  // Financial assumptions
  const fa = factors.financialAssumptions, da = def.financialAssumptions;
  if (Math.abs(fa.ftpRate - da.ftpRate) > 1e-6) changes.push({ label: 'FTP利率', group: '财务假设', defaultValue: pct(da.ftpRate), currentValue: pct(fa.ftpRate) });
  if (Math.abs(fa.cac - da.cac) > 0.5) changes.push({ label: '获客成本', group: '财务假设', defaultValue: yuan(da.cac), currentValue: yuan(fa.cac) });
  if (Math.abs(fa.recoveryRate - da.recoveryRate) > 1e-6) changes.push({ label: '回收率', group: '财务假设', defaultValue: pct(da.recoveryRate), currentValue: pct(fa.recoveryRate) });
  if (Math.abs(fa.opexPerCard - da.opexPerCard) > 0.5) changes.push({ label: '月运营成本', group: '财务假设', defaultValue: yuan(da.opexPerCard), currentValue: yuan(fa.opexPerCard) });
  if (Math.abs(fa.rewardsRate - da.rewardsRate) > 1e-6) changes.push({ label: '权益成本率', group: '财务假设', defaultValue: pct(da.rewardsRate), currentValue: pct(fa.rewardsRate) });
  if (Math.abs(fa.fraudRate - da.fraudRate) > 1e-6) changes.push({ label: '欺诈率', group: '财务假设', defaultValue: pct(da.fraudRate), currentValue: pct(fa.fraudRate) });
  if (Math.abs(fa.rewardsCap - da.rewardsCap) > 0.5) changes.push({ label: '权益月上限', group: '财务假设', defaultValue: yuan(da.rewardsCap), currentValue: yuan(fa.rewardsCap) });
  if (Math.abs(fa.balTransferRate - da.balTransferRate) > 1e-6) changes.push({ label: '分期利率', group: '财务假设', defaultValue: pct(da.balTransferRate), currentValue: pct(fa.balTransferRate) });
  if (Math.abs((fa.unusedLimitCostFactor ?? 0.5) - (da.unusedLimitCostFactor ?? 0.5)) > 1e-6) changes.push({ label: '未使用额度转换系数', group: '财务假设', defaultValue: pct(da.unusedLimitCostFactor), currentValue: pct(fa.unusedLimitCostFactor) });
  // Stress coefficients
  const sc = factors.stressCoefficients, ds = def.stressCoefficients;
  const stressFields: { key: keyof StressCoefficients; label: string }[] = [
    { key: 'pdMultiplier', label: 'PD压力' }, { key: 'lgdMultiplier', label: '损失严重性' },
    { key: 'activeRateMultiplier', label: '活跃率' }, { key: 'utilizationMultiplier', label: '额度使用率' },
    { key: 'revolvingMultiplier', label: '生息资产比例' }, { key: 'spendMultiplier', label: '交易额/消费额' },
    { key: 'cashMultiplier', label: '取现金额' }, { key: 'attritionMultiplier', label: '流失率' },
  ];
  for (const f of stressFields) {
    if (Math.abs(sc[f.key] - ds[f.key]) > 0.001) changes.push({ label: f.label, group: '压力系数', defaultValue: num(ds[f.key]), currentValue: num(sc[f.key]) });
  }
  // Risk distribution
  for (let i = 0; i < 10; i++) {
    const rd = factors.riskDistribution[i], dd = DEFAULT_RISK_DISTRIBUTION[i];
    if (Math.abs(rd.percentage - dd.percentage) > 0.001) changes.push({ label: `R${i + 1}占比`, group: '客群分布', defaultValue: pct(dd.percentage), currentValue: pct(rd.percentage) });
    if (Math.abs(rd.initialLimit - dd.initialLimit) > 1) changes.push({ label: `R${i + 1}初始额度`, group: '客群分布', defaultValue: yuan(dd.initialLimit), currentValue: yuan(rd.initialLimit) });
  }
  return changes;
}

interface NPVProviderProps {
  children: ReactNode;
}

export function NPVProvider({ children }: NPVProviderProps) {
  // Navigation state
  const [currentStage, setCurrentStage] = useState<AppStage>('entry');
  const [wizardStep, setWizardStep] = useState<WizardStep>(1);
  
  // Strategy selections
  const [cardProduct, setCardProductState] = useState<CardProduct | null>(null);
  const [channel, setChannelState] = useState<AcquisitionChannel | null>(null);
  const [scenario, setScenarioState] = useState<DecisionScenario | null>(null);
  
  // Business factors
  const [businessFactors, setBusinessFactors] = useState<BusinessFactors>(DEFAULT_BUSINESS_FACTORS);
  
  // Calculation results
  const [result, setResult] = useState<NPVResult | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  
  // History
  const [history, setHistory] = useState<CalculationHistory[]>([]);
  
  // Snapshots
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [baselineInitialized, setBaselineInitialized] = useState(false);
  
  // UI state
  const [highlightedFactors, setHighlightedFactors] = useState<string[]>([]);
  
  // Global offset
  const [channelQualityOffset, setChannelQualityOffset] = useState(1.0);
  
  // Terminal Value toggle (default: OFF for conservative approach)
  const [includeTerminalValue, setIncludeTerminalValue] = useState(false);
  // Advanced params
  const [terminalValueCap, setTerminalValueCap] = useState(0.15); // 15%
  const [discountRate, setDiscountRate] = useState(0.15); // 15%
  const [meanReversionEnabled, setMeanReversionEnabled] = useState(false);
  
  // Build strategy config from selections
  const strategyConfig: StrategyConfig | null = cardProduct && channel && scenario
    ? {
        id: `strategy_${Date.now()}`,
        name: `${cardProduct}-${channel}-${scenario}`,
        cardProduct,
        channel,
        scenario,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    : null;
  
  // Setters
  const setCardProduct = useCallback((product: CardProduct) => {
    setCardProductState(product);
    // Sync product params (年费、APR etc.) with engine
    const preset = CARD_PRODUCT_PRESETS[product];
    setBusinessFactors(prev => ({
      ...prev,
      productParams: { ...preset },
    }));
  }, []);
  
  const setChannel = useCallback((ch: AcquisitionChannel) => {
    setChannelState(ch);
    // Sync CAC with engine
    const cac = CHANNEL_CAC_PRESETS[ch];
    setBusinessFactors(prev => ({
      ...prev,
      financialAssumptions: { ...prev.financialAssumptions, cac },
    }));
  }, []);
  
  const setScenario = useCallback((sc: DecisionScenario) => {
    setScenarioState(sc);
    // Scenarios only affect PD via SCENARIO_MULT in static-data.ts
    // The engine reads strategyConfig.scenario directly
    // Reset stress coefficients to neutral when switching scenarios
    setBusinessFactors(prev => ({
      ...prev,
      stressCoefficients: { ...DEFAULT_STRESS_COEFFICIENTS },
    }));
  }, []);
  
  // Update business factors
  const updateRiskDistribution = useCallback((distribution: RiskDistribution[]) => {
    setBusinessFactors(prev => ({
      ...prev,
      riskDistribution: distribution,
    }));
  }, []);
  
  const updateProductParams = useCallback((params: Partial<ProductParams>) => {
    setBusinessFactors(prev => ({
      ...prev,
      productParams: { ...prev.productParams, ...params },
    }));
  }, []);
  
  const updateFinancialAssumptions = useCallback((assumptions: Partial<FinancialAssumptions>) => {
    setBusinessFactors(prev => ({
      ...prev,
      financialAssumptions: { ...prev.financialAssumptions, ...assumptions },
    }));
  }, []);
  
  const updateStressCoefficients = useCallback((coefficients: Partial<StressCoefficients>) => {
    setBusinessFactors(prev => ({
      ...prev,
      stressCoefficients: { ...prev.stressCoefficients, ...coefficients },
    }));
  }, []);
  
  const updateV2Installment = useCallback((params: Partial<V2InstallmentParams>) => {
    setBusinessFactors(prev => ({
      ...prev,
      v2Installment: { ...(prev.v2Installment || DEFAULT_V2_INSTALLMENT), ...params },
    }));
  }, []);

  const resetFactors = useCallback(() => {
    setBusinessFactors(DEFAULT_BUSINESS_FACTORS);
  }, []);
  
  // Run NPV calculation
  const runCalculation = useCallback(() => {
    if (!strategyConfig) return;
    
    setIsCalculating(true);
    
    setTimeout(() => {
      const npvResult = calculateNPV(strategyConfig, businessFactors, {
        includeTV: includeTerminalValue,
        discountRate,
        terminalValueCap,
      });
      setResult(npvResult);
      setIsCalculating(false);
      setCurrentStage('dashboard');
    }, 300);
  }, [strategyConfig, businessFactors, includeTerminalValue, discountRate, terminalValueCap]);
  
  // History management
  const saveToHistory = useCallback((name: string) => {
    if (!result) return;
    
    // Calculate payback month from cumulative NPV
    let paybackMonth = 0;
    let cumulativeNPV = -result.summary.cac;
    const monthlyNetCF = (result.summary.npv + result.summary.cac) / 96; // Approximate monthly cash flow
    for (let m = 1; m <= 96; m++) {
      cumulativeNPV += monthlyNetCF;
      if (cumulativeNPV >= 0 && paybackMonth === 0) {
        paybackMonth = m;
        break;
      }
    }
    
    const historyItem: CalculationHistory = {
      id: `history_${Date.now()}`,
      name,
      result,
      savedAt: new Date(),
      thumbnail: {
        totalNPV: result.summary.npv,
        roi: result.summary.npv / result.summary.cac,
        paybackMonth: paybackMonth || 96,
      },
    };
    
    setHistory(prev => [historyItem, ...prev]);
  }, [result]);
  
  const loadFromHistory = useCallback((id: string) => {
    const item = history.find(h => h.id === id);
    if (!item) return;
    
    setResult(item.result);
    setBusinessFactors(item.result.businessFactors);
    setCardProductState(item.result.strategyConfig.cardProduct);
    setChannelState(item.result.strategyConfig.channel);
    setScenarioState(item.result.strategyConfig.scenario);
    setCurrentStage('dashboard');
  }, [history]);
  
  const deleteFromHistory = useCallback((id: string) => {
    setHistory(prev => prev.filter(h => h.id !== id));
  }, []);
  
  // Snapshot methods — paramChanges compares against the baseline snapshot's params
  const saveSnapshot = useCallback((name: string) => {
    if (!result) return;
    setSnapshots(prev => {
      const baseline = prev.find(s => s.isBaseline);
      const baseFactors = baseline ? baseline.businessFactors : businessFactors;
      const snap: Snapshot = {
        id: `snap_${Date.now()}`,
        name,
        createdAt: new Date(),
        businessFactors: JSON.parse(JSON.stringify(businessFactors)),
        npvResult: result,
        paramChanges: computeParamChanges(businessFactors, baseFactors),
        isBaseline: false,
      };
      return [...prev, snap];
    });
  }, [result, businessFactors]);

  const deleteSnapshot = useCallback((id: string) => {
    setSnapshots(prev => prev.filter(s => s.id !== id || s.isBaseline));
  }, []);

  const loadSnapshot = useCallback((id: string) => {
    const snap = snapshots.find(s => s.id === id);
    if (!snap) return;
    setBusinessFactors(JSON.parse(JSON.stringify(snap.businessFactors)));
    setResult(snap.npvResult);
    setCurrentStage('dashboard');
  }, [snapshots]);

  // Auto-create baseline snapshot when first NPV result is calculated
  // Uses the CURRENT businessFactors (as set up in wizard), not DEFAULT_BUSINESS_FACTORS
  useEffect(() => {
    if (result && !baselineInitialized) {
      const baselineSnap: Snapshot = {
        id: 'baseline_default',
        name: '初始设定',
        createdAt: new Date(),
        businessFactors: JSON.parse(JSON.stringify(businessFactors)),
        npvResult: result,
        paramChanges: [],  // baseline is the reference point — always 0 changes
        isBaseline: true,
      };
      setSnapshots(prev => {
        if (prev.some(s => s.isBaseline)) return prev;
        return [baselineSnap, ...prev];
      });
      setBaselineInitialized(true);
    }
  }, [result, baselineInitialized, businessFactors]);

  // Reset everything
  const resetAll = useCallback(() => {
    setCurrentStage('entry');
    setWizardStep(1);
    setCardProductState(null);
    setChannelState(null);
    setScenarioState(null);
    setBusinessFactors(DEFAULT_BUSINESS_FACTORS);
    setResult(null);
    setHighlightedFactors([]);
  }, []);
  
  // Start new analysis (from hub)
  const startNewAnalysis = useCallback(() => {
    setWizardStep(1);
    setCardProductState(null);
    setChannelState(null);
    setScenarioState(null);
    setBusinessFactors(DEFAULT_BUSINESS_FACTORS);
    setResult(null);
    setHighlightedFactors([]);
    setCurrentStage('wizard');
  }, []);
  
  const value: NPVContextType = {
    currentStage,
    setCurrentStage,
    wizardStep,
    setWizardStep,
    strategyConfig,
    cardProduct,
    channel,
    scenario,
    setCardProduct,
    setChannel,
    setScenario,
    businessFactors,
    updateRiskDistribution,
    updateProductParams,
    updateFinancialAssumptions,
    updateStressCoefficients,
    updateV2Installment,
    resetFactors,
    result,
    isCalculating,
    runCalculation,
    history,
    saveToHistory,
    loadFromHistory,
    deleteFromHistory,
    highlightedFactors,
    setHighlightedFactors,
    channelQualityOffset,
    setChannelQualityOffset,
    includeTerminalValue,
    setIncludeTerminalValue,
    terminalValueCap,
    setTerminalValueCap,
    discountRate,
    setDiscountRate,
    meanReversionEnabled,
    setMeanReversionEnabled,
    snapshots,
    saveSnapshot,
    deleteSnapshot,
    loadSnapshot,
    resetAll,
    startNewAnalysis,
  };
  
  return (
    <NPVContext.Provider value={value}>
      {children}
    </NPVContext.Provider>
  );
}
