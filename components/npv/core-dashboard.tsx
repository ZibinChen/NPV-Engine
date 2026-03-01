'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNPV } from '@/lib/npv-context';
// Core Dashboard
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  ArrowLeft, 
  Save,
  RefreshCw,
  Download,
  ChevronDown,
  ChevronUp,
  PanelLeftClose,
  PanelLeftOpen,
  RotateCcw,
  Info,
  Table2,
  Maximize2,
  Minimize2,
  Check,
  Camera,
  Layers,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import {
  Tooltip as LucideTooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { 
  CARD_PRODUCT_LABELS, 
  CHANNEL_LABELS, 
  SCENARIO_LABELS,
  type CardProduct,
  type AcquisitionChannel,
  type DecisionScenario,
  type RiskDistribution,
  type PVComposition,
} from '@/lib/npv-types';
import { generateWaterfallItems, generateCollapsedWaterfallItems, computeWeightedMetrics, getGradeStaticMetrics } from '@/lib/npv-engine';
import { DRILLDOWN_MAP } from '@/components/npv/calculation-drilldown';
import { computeGradeDetailMetrics } from '@/lib/npv-engine';
import type { GradeDetailRow } from '@/lib/npv-engine';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
  Tooltip as RechartsTooltip,
} from 'recharts';

const EMPTY_PV: PVComposition = {
  interestIncome: 0, installmentIncome: 0, nonInterestIncome: 0,
  nintInterchange: 0, nintAnnualFee: 0, nintCashAdvance: 0,
  totalIncome: 0, riskCost: 0, cac: 0,
  otherCost: 0, otherOpex: 0, otherFraud: 0, otherRewards: 0,
  fundingCost: 0, fundingCostUsed: 0, fundingCostUnused: 0,
  terminalValue: 0, pvValue: 0
  };

export function CoreDashboard() {
  const { 
    setCurrentStage,
    result,
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
    runCalculation,
    isCalculating,
    saveToHistory,
    highlightedFactors,
    setHighlightedFactors,
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
  } = useNPV();
  
  const [saveName, setSaveName] = useState('');
  const [showSnapshotInput, setShowSnapshotInput] = useState(false);
  const [snapshotName, setSnapshotName] = useState('');
  const [showSaveInput, setShowSaveInput] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    risk: true,
    product: false,
    financial: false,
    stress: false,
    v2: false,
  });
  
  // Chart interaction state for bidirectional linkage
  const [selectedYear, setSelectedYear] = useState('All' as string);
  const [selectedRiskLevel, setSelectedRiskLevel] = useState('All' as string);
  const [activeDriver, setActiveDriver] = useState(null as string | null);
  const [timeSeriesMetric, setTimeSeriesMetric] = useState('净值' as string);
  const [finTab, setFinTab] = useState<'breakdown' | 'timeseries'>('breakdown');
  const [paramTab, setParamTab] = useState('static' as 'static' | 'trends');
  const [drilldownItemId, setDrilldownItemId] = useState(null as string | null);
  const [waterfallExpanded, setWaterfallExpanded] = useState(false);
  const [pinnedBarId, setPinnedBarId] = useState(null as string | null);
  const [chartsCollapsed, setChartsCollapsed] = useState(false);
  const [chartsCompact, setChartsCompact] = useState(false);
  const [waterfallZoomed, setWaterfallZoomed] = useState(false);
  // biome-ignore lint/suspicious/noExplicitAny: baseline snapshot for delta comparison
  const [baselineWaterfallItems, setBaselineWaterfallItems] = useState<any[] | null>(null);
  const [showParamDialog, setShowParamDialog] = useState(false);
  const [paramStaticMode, setParamStaticMode] = useState('weighted' as 'weighted' | 'max' | 'min');
  const [paramPvItem, setParamPvItem] = useState(null as string | null);
  const [paramTrendGrade, setParamTrendGrade] = useState('加权' as string);
  const scrollBodyRef = useRef(null as HTMLDivElement | null);
  
  // Comprehensive Highlight Mapping for "Drill-Down Glow" system
  // Maps waterfall bar clicks to: table columns, static param rows, driver rows
  const highlightMap: Record<string, {
    cols: string[];           // Table 1 columns to highlight
    staticRows: string[];     // Table 3 static param rows to highlight  
    drivers: string[];        // Table 4 driver rows to highlight
    sidebarFactors: string[]; // Sidebar input fields to highlight
  }> = {
    '生息收入': {
      cols: ['循环', '分期'],
      staticRows: ['分布', '活跃率', '平均余额', '生息率', '生息余额'],
      drivers: ['活跃率', '平均余额', '生息率', '生息余额'],
      sidebarFactors: ['apr', 'revolvingRateMultiplier', 'activeRateMultiplier', 'utilizationMultiplier'],
    },
    '循环收入': {
      cols: ['循环'],
      staticRows: ['分布', '活跃率', '平均余额', '生息率', '生息余额'],
      drivers: ['活跃率', '平均余额', '生息率', '生息余额'],
      sidebarFactors: ['apr', 'revolvingRateMultiplier'],
    },
    '分期收入': {
      cols: ['分期'],
      staticRows: ['分布', '活跃率', '平均余额'],
      drivers: ['活跃率', '平均余额'],
      sidebarFactors: ['balTransferRate', 'revolvingRateMultiplier'],
    },
  '非息收入': {
  cols: ['非息'],
  staticRows: ['分布', '活跃率', '月均交易'],
  drivers: ['活跃率', '月均交易'],
  sidebarFactors: ['interchangeRate', 'annualFee', 'activeRateMultiplier'],
  },
  '回佣': {
  cols: ['回佣'],
  staticRows: ['分布', '活跃率', '月均交易'],
  drivers: ['活跃率', '月均交易'],
  sidebarFactors: ['interchangeRate', 'spendMultiplier'],
  },
  '年费': {
  cols: ['年费'],
  staticRows: ['分布', '活跃率'],
  drivers: ['活跃率'],
  sidebarFactors: ['annualFee', 'activeRateMultiplier'],
  },
  '取现费': {
  cols: ['取现费'],
  staticRows: ['分布'],
  drivers: [],
  sidebarFactors: ['cashAdvanceFee'],
  },
    '风险成本': {
      cols: ['风险'],
      staticRows: ['分布', 'PD', 'LGD', '使用率峰值'],
      drivers: ['PD', 'LGD'],
      sidebarFactors: ['pdMultiplier', 'lgdMultiplier', 'recoveryRate'],
    },
    '资金成本': {
      cols: ['资金'],
      staticRows: ['分布', '平均余额'],
      drivers: ['平均余额', 'FTP'],
      sidebarFactors: ['ftpRate', 'unusedLimitCostFactor', 'utilizationMultiplier'],
    },
    '已用额度资金成本': {
      cols: ['资金'],
      staticRows: ['分布', '平均余额', '月均交易'],
      drivers: ['平均余额', 'FTP'],
      sidebarFactors: ['ftpRate', 'utilizationMultiplier', 'spendMultiplier'],
      tag: '成本衰减',
    },
    '未用额度资金成本': {
      cols: ['资金'],
      staticRows: ['分布', '平均余额', '月均交易'],
      drivers: ['平均余额', 'FTP'],
      sidebarFactors: ['ftpRate', 'unusedLimitCostFactor', 'utilizationMultiplier'],
      tag: '成本衰减',
    },
    '获客成本': {
      cols: ['获客'],
      staticRows: ['分布', '活跃率'],
      drivers: ['活跃率'],
      sidebarFactors: ['cac'],
    },
    '残值TV': {
      cols: ['残值'],
      staticRows: ['分布', '平均余额', '生息率', '生息余额', 'PD'],
      drivers: ['生息余额', 'PD'],
      sidebarFactors: ['attritionMultiplier'],
    },
  '运营成本': {
  cols: ['运营'],
  staticRows: ['分布'],
  drivers: ['运营成本'],
  sidebarFactors: ['opexPerCard'],
  },
  '其他成本': {
  cols: ['运营'],
  staticRows: ['分布'],
  drivers: ['运营成本'],
  sidebarFactors: ['opexPerCard', 'rewardsRate'],
  },
  '运营': {
  cols: ['运营子'],
  staticRows: ['分布'],
  drivers: ['运营成本'],
  sidebarFactors: ['opexPerCard'],
  },
  '欺诈': {
  cols: ['欺诈子'],
  staticRows: ['分布'],
  drivers: [],
  sidebarFactors: ['fraudRate'],
  },
  '权益': {
  cols: ['权益子'],
  staticRows: ['分布', '月均交易'],
  drivers: ['月均交易'],
  sidebarFactors: ['rewardsRate'],
  },
  };
  
  // Helper to check if a column/row should be highlighted
  const isColumnHighlighted = (colName: string) => {
    if (!activeDriver || !highlightMap[activeDriver]) return false;
    return highlightMap[activeDriver].cols.includes(colName);
  };
  
  const isStaticRowHighlighted = (rowName: string) => {
    if (!activeDriver || !highlightMap[activeDriver]) return false;
    return highlightMap[activeDriver].staticRows.some(r => rowName.includes(r));
  };
  
  const isDriverRowHighlighted = (rowName: string) => {
    if (!activeDriver || !highlightMap[activeDriver]) return false;
    return highlightMap[activeDriver].drivers.some(d => rowName.includes(d));
  };
  
  // Highlight style for glow effect (Maillard Gold with subtle border)
  const glowStyle = {
    backgroundColor: 'rgba(193, 154, 107, 0.15)',
    boxShadow: 'inset 0 0 0 2px rgba(193, 154, 107, 0.4)',
  };
  
  // Store initial wizard values for reset
  const [wizardDefaults, setWizardDefaults] = useState<{
    riskDistribution: RiskDistribution[];
    productParams: typeof businessFactors.productParams;
    financialAssumptions: typeof businessFactors.financialAssumptions;
    stressCoefficients: typeof businessFactors.stressCoefficients;
  } | null>(null);
  
  // Capture wizard defaults on first render
  useEffect(() => {
    if (!wizardDefaults && result) {
      setWizardDefaults({
        riskDistribution: [...businessFactors.riskDistribution],
        productParams: { ...businessFactors.productParams },
        financialAssumptions: { ...businessFactors.financialAssumptions },
        stressCoefficients: { ...businessFactors.stressCoefficients },
      });
    }
  }, [result, wizardDefaults, businessFactors]);
  
  // Manual chart size toggle (no auto-compact on scroll to avoid layout jumps)
  const handleScrollBodyScroll = useCallback(() => {}, []);

  // Auto-recalculate on any parameter change
  useEffect(() => {
    if (result) {
      const timeout = setTimeout(() => {
        runCalculation();
      }, 300);
      return () => clearTimeout(timeout);
    }
  }, [
    businessFactors.riskDistribution,
    businessFactors.productParams,
    businessFactors.financialAssumptions,
    businessFactors.stressCoefficients,
    cardProduct,
    channel,
    scenario,
    runCalculation, // Add runCalculation to dependencies
    result, // Add result to track when we have a baseline
  ]);
  
  const totalPercentage = useMemo(() => 
    businessFactors.riskDistribution.reduce((sum, r) => sum + r.percentage, 0),
    [businessFactors.riskDistribution]
  );
  
  // Reset selected risk level if it no longer has data
  useEffect(() => {
    if (selectedRiskLevel !== 'All') {
      const dist = businessFactors.riskDistribution.find(d => d.level === Number(selectedRiskLevel));
      if (!dist || dist.percentage <= 0) {
        setSelectedRiskLevel('All');
      }
    }
  }, [businessFactors.riskDistribution, selectedRiskLevel]);
  
  const handleSave = () => {
    if (saveName.trim()) {
      saveToHistory(saveName.trim());
      setSaveName('');
      setShowSaveInput(false);
    }
  };
  
  const handleResetToDefaults = () => {
    if (wizardDefaults) {
      updateRiskDistribution(wizardDefaults.riskDistribution);
      updateProductParams(wizardDefaults.productParams);
      updateFinancialAssumptions(wizardDefaults.financialAssumptions);
      updateStressCoefficients(wizardDefaults.stressCoefficients);
    }
  };
  
  const handleRiskPercentageChange = (level: number, value: number) => {
    const updated = businessFactors.riskDistribution.map(r => 
      r.level === level ? { ...r, percentage: value / 100 } : r
    );
    updateRiskDistribution(updated);
  };
  
  const handleRiskLimitChange = (level: number, value: number) => {
    const updated = businessFactors.riskDistribution.map(r => 
      r.level === level ? { ...r, initialLimit: value } : r
    );
    updateRiskDistribution(updated);
  };
  
  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };
  
  const isHighlighted = (factorId: string) => highlightedFactors.includes(factorId);

  // Build filtered PVComposition based on selectedYear and selectedRiskLevel
  const filteredPV = useMemo(() => {
    if (selectedYear === 'All' && selectedRiskLevel === 'All') {
      return result?.pvComposition || EMPTY_PV;
    }
    // Build from annualMetrics
    const pv = { ...EMPTY_PV };
    const riskResults = result?.riskLevelResults || [];
    for (const r of riskResults) {
      if (selectedRiskLevel !== 'All' && r.level !== Number(selectedRiskLevel)) continue;
      const pct = selectedRiskLevel === 'All' 
        ? (businessFactors.riskDistribution.find(d => d.level === r.level)?.percentage || 0) 
        : 1;
      const metrics = r.annualMetrics || [];
      if (selectedYear === 'All') {
        // All years for this risk level
        for (const m of metrics) {
          pv.interestIncome += m.interestIncome * pct;
          pv.installmentIncome += (m.installmentIncome || 0) * pct;
          pv.nonInterestIncome += m.nonInterestIncome * pct;
          pv.nintInterchange += m.nintInterchange * pct;
          pv.nintAnnualFee += m.nintAnnualFee * pct;
          pv.nintCashAdvance += m.nintCashAdvance * pct;
          pv.riskCost -= m.riskCost * pct;
          pv.fundingCost -= m.fundingCost * pct;
          pv.fundingCostUsed += (m.fundingCostUsed || 0) * pct;
          pv.fundingCostUnused += (m.fundingCostUnused || 0) * pct;
          pv.otherCost -= (m.opexAmortized + m.fraudCost + m.rewardsCost) * pct;
          pv.otherOpex += m.opexAmortized * pct;
          pv.otherFraud += m.fraudCost * pct;
          pv.otherRewards += m.rewardsCost * pct;
        }
        // CAC from summary
        pv.cac = selectedRiskLevel === 'All' 
          ? -(result?.summary.cac || 0) 
          : -(r.cac || 0);
        pv.terminalValue = selectedRiskLevel === 'All'
          ? (result?.summary.terminalValue || 0)
          : (r.terminalValue || 0);
      } else {
        // Specific year
        const yrIdx = parseInt(selectedYear.replace('Yr', '')) - 1;
        const m = metrics[yrIdx];
        if (m) {
          pv.interestIncome += m.interestIncome * pct;
          pv.installmentIncome += (m.installmentIncome || 0) * pct;
          pv.nonInterestIncome += m.nonInterestIncome * pct;
          pv.nintInterchange += m.nintInterchange * pct;
          pv.nintAnnualFee += m.nintAnnualFee * pct;
          pv.nintCashAdvance += m.nintCashAdvance * pct;
          pv.riskCost -= m.riskCost * pct;
          pv.fundingCost -= m.fundingCost * pct;
          pv.fundingCostUsed += (m.fundingCostUsed || 0) * pct;
          pv.fundingCostUnused += (m.fundingCostUnused || 0) * pct;
          pv.otherCost -= (m.opexAmortized + m.fraudCost + m.rewardsCost) * pct;
          pv.otherOpex += m.opexAmortized * pct;
          pv.otherFraud += m.fraudCost * pct;
          pv.otherRewards += m.rewardsCost * pct;
        }
        // CAC only in Year 1
        if (yrIdx === 0) {
          pv.cac = selectedRiskLevel === 'All'
            ? -(result?.summary.cac || 0)
            : -(r.cac || 0);
        }
        // TV only for full cycle
        pv.terminalValue = 0;
      }
    }
    pv.totalIncome = pv.interestIncome + pv.installmentIncome + pv.nonInterestIncome;
    pv.pvValue = pv.interestIncome + pv.installmentIncome + pv.nonInterestIncome + pv.riskCost + pv.cac + pv.otherCost + pv.fundingCost + pv.terminalValue;
    return pv;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result, selectedYear, selectedRiskLevel, businessFactors.riskDistribution]);

  const waterfallItemsRaw = waterfallExpanded
    ? generateWaterfallItems(filteredPV)
    : generateCollapsedWaterfallItems(filteredPV);
  const waterfallItems = useMemo(() => {
    if (includeTerminalValue) {
      return waterfallItemsRaw;
    }
    const tvValue = filteredPV.terminalValue || 0;
    return waterfallItemsRaw
      .filter(item => item.label !== '残值TV')
      .map(item => {
        if (item.label === '总NPV') {
          const newNPV = item.value - tvValue;
          return { ...item, value: newNPV, y0: 0, y1: newNPV };
        }
        return item;
      });
  }, [waterfallItemsRaw, includeTerminalValue, filteredPV.terminalValue]);
  
  // Re-snapshot baseline when waterfall structure changes (expand/collapse, filters) while zoomed
  // This ensures IDs in baseline always match current waterfallItems for delta comparison
  const waterfallStructureKey = `${waterfallExpanded}_${selectedYear}_${selectedRiskLevel}_${includeTerminalValue}`;
  const prevStructureKeyRef = useRef(waterfallStructureKey);
  useEffect(() => {
    if (waterfallZoomed && baselineWaterfallItems && prevStructureKeyRef.current !== waterfallStructureKey) {
      setBaselineWaterfallItems([...waterfallItems]);
    }
    prevStructureKeyRef.current = waterfallStructureKey;
  }, [waterfallZoomed, baselineWaterfallItems, waterfallStructureKey, waterfallItems]);

  // Compute real weighted metrics for stress slider hints
  const weightedMetrics = useMemo(() => 
    computeWeightedMetrics(businessFactors),
    [businessFactors]
  );
  
  // Detail metrics for 参数细节 dialog
  const detailMetrics = useMemo(() =>
    computeGradeDetailMetrics(businessFactors),
    [businessFactors]
  );

  // PV sub-item -> param column highlight mapping for 参数细节
  const PARAM_HIGHLIGHT_MAP: Record<string, string[]> = {
    '循环收入': ['循环率', '循环额', '活跃率', '未偿还余额', '额度使用率', '生息率'],
    '分期收入': ['分期率', '分期额', '活跃率', '未偿还余额', '额度使用率'],
    '生息收入': ['循环率', '循环额', '分期率', '分期额', '活跃率', '未偿还余额', '生息率', '额度使用率'],
    '非息收入': ['消费额', '活跃率', '取现金额'],
    '回佣':     ['消费额', '活跃率'],
    '年费':     ['活跃率'],
    '取现费':   ['取现金额', '活跃率'],
    '风险成本': ['PD', 'Severity', '额度使用率', '未偿还余额'],
    '资金成本': ['额度使用率', '未偿还余额', '消费额'],
    '获客成本': ['分布%', '活跃率'],
    '其他成本': ['消费额', '活跃率'],
    '运营':     ['活跃率'],
    '欺诈':     ['消费额', '活跃率'],
    '权益':     ['消费额', '活跃率'],
    '残值':     ['循环率', '循环额', 'PD', '流失率'],
  };
  const highlightedParamCols = paramPvItem ? (PARAM_HIGHLIGHT_MAP[paramPvItem] || []) : [];
  const isParamColHL = (col: string) => highlightedParamCols.includes(col);

  // Adjusted NPV for display (exclude TV if toggle is off)
  const displayNPV = includeTerminalValue 
    ? result?.summary.npv 
    : result?.summary.npv - (result?.summary.terminalValue || 0);
  
  // Format helpers
  const formatCurrency = (value: number) => `¥${Math.round(value).toLocaleString('zh-CN')}`;
  const formatPercent = (value: number) => `${(value * 100).toFixed(1)}%`;
  
  return (
    <TooltipProvider>
      <div className="min-h-screen flex" style={{ backgroundColor: '#F5F0E8' }}>
        {/* Left Panel - Input Console (25-30%, Collapsible) */}
        <div 
          className={`flex-shrink-0 border-r overflow-y-auto transition-all duration-300 ${
            isCollapsed ? 'w-0 opacity-0' : 'w-[28%]'
          }`}
          style={{ 
            backgroundColor: '#FDF5E6',
            borderColor: '#5D4037',
            maxHeight: '100vh',
          }}
        >
          {/* Sticky Header */}
          <div 
            className="p-3 sticky top-0 border-b z-10"
            style={{ backgroundColor: '#FDF5E6', borderColor: '#5D4037' }}
          >
            <div className="flex items-center justify-between mb-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentStage('hub')}
                className="gap-1 -ml-2"
                style={{ color: '#5D4037' }}
              >
                <ArrowLeft className="w-4 h-4" />
                返回
              </Button>
              <div className="flex items-center gap-3">
                {/* Left group: Reset + Save */}
                <div className="flex gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleResetToDefaults}
                    className="gap-1 text-[10px] bg-transparent"
                    style={{ borderColor: '#B0A898', color: '#6B5B4F', borderRadius: '2px' }}
                    title="重置为向导初始值"
                  >
                    <RotateCcw className="w-3 h-3" />
                    重置
                  </Button>
                  {showSaveInput ? (
                    <div className="flex gap-1">
                      <Input
                        value={saveName}
                        onChange={(e) => setSaveName(e.target.value)}
                        placeholder="名称"
                        className="w-16 h-7 text-[10px]"
                        style={{ backgroundColor: '#FFFFFF', borderRadius: '2px' }}
                      />
                      <Button
                        size="sm"
                        onClick={handleSave}
                        className="h-7 px-2"
                        style={{ backgroundColor: '#C19A6B', color: '#FFFFFF', borderRadius: '2px' }}
                      >
                        <Save className="w-3 h-3" />
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowSaveInput(true)}
                      className="gap-1 text-[10px] bg-transparent"
                      style={{ borderColor: '#B0A898', color: '#6B5B4F', borderRadius: '2px' }}
                    >
                      <Save className="w-3 h-3" />
                      保存
                    </Button>
                  )}
                </div>

                <div className="w-px h-5" style={{ backgroundColor: '#D4C5B2' }} />

                {/* Right group: Snapshot + Compare */}
                <div className="flex gap-1.5">
                  {showSnapshotInput ? (
                    <div className="flex gap-1">
                      <Input
                        value={snapshotName}
                        onChange={(e) => setSnapshotName(e.target.value)}
                        placeholder="快照名称"
                        className="w-20 h-7 text-[10px]"
                        style={{ backgroundColor: '#FFFFFF', borderRadius: '2px' }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && snapshotName.trim()) {
                            saveSnapshot(snapshotName.trim());
                            setSnapshotName('');
                            setShowSnapshotInput(false);
                          }
                        }}
                      />
                      <Button
                        size="sm"
                        onClick={() => {
                          if (snapshotName.trim()) {
                            saveSnapshot(snapshotName.trim());
                            setSnapshotName('');
                            setShowSnapshotInput(false);
                          }
                        }}
                        className="h-7 px-2"
                        style={{ backgroundColor: '#5D4037', color: '#FFFFFF', borderRadius: '2px' }}
                      >
                        <Check className="w-3 h-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setShowSnapshotInput(false)}
                        className="h-7 px-1.5"
                        style={{ color: '#8B8178' }}
                      >
                        {'x'}
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowSnapshotInput(true)}
                      className="gap-1 text-[10px] bg-transparent"
                      style={{ borderColor: '#5D4037', color: '#5D4037', borderRadius: '2px' }}
                    >
                      <Camera className="w-3 h-3" />
                      快照
                    </Button>
                  )}
                  <Button
                    size="sm"
                    onClick={() => setCurrentStage('snapshots')}
                    className="gap-1 text-[10px]"
                    style={{ backgroundColor: '#5D4037', color: '#FFFFFF', borderRadius: '2px' }}
                  >
                    <Layers className="w-3 h-3" />
                    对比({snapshots.length})
                  </Button>
                </div>
              </div>
            </div>
            
            {/* Strategy Chips */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <Select 
                value={cardProduct || undefined} 
                onValueChange={(v) => setCardProduct(v as CardProduct)}
              >
                <SelectTrigger 
                  className="h-6 text-[10px] w-auto gap-1 px-2.5 shrink-0"
                  style={{ backgroundColor: '#C19A6B', color: '#FFFFFF', borderRadius: '12px', border: 'none' }}
                >
                  <SelectValue placeholder="产品" />
                </SelectTrigger>
                <SelectContent style={{ backgroundColor: '#FDF5E6' }}>
                  {Object.entries(CARD_PRODUCT_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key} className="text-xs">{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select 
                value={channel || undefined} 
                onValueChange={(v) => setChannel(v as AcquisitionChannel)}
              >
                <SelectTrigger 
                  className="h-6 text-[10px] w-auto gap-1 px-2.5 shrink-0"
                  style={{ backgroundColor: '#D4A574', color: '#FFFFFF', borderRadius: '12px', border: 'none' }}
                >
                  <SelectValue placeholder="渠道" />
                </SelectTrigger>
                <SelectContent style={{ backgroundColor: '#FDF5E6' }}>
                  {Object.entries(CHANNEL_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key} className="text-xs">{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select 
                value={scenario || undefined} 
                onValueChange={(v) => setScenario(v as DecisionScenario)}
              >
                <SelectTrigger 
                  className="h-6 text-[10px] w-auto gap-1 px-2.5 shrink-0"
                  style={{ backgroundColor: '#8B7355', color: '#FFFFFF', borderRadius: '12px', border: 'none' }}
                >
                  <SelectValue placeholder="情景" />
                </SelectTrigger>
                <SelectContent style={{ backgroundColor: '#FDF5E6' }}>
                  {Object.entries(SCENARIO_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key} className="text-xs">{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Accordion Sections */}
          <div className="p-3 space-y-2">
            {/* 1. Risk Distribution */}
            <CollapsibleSection
              title="风险分布"
              expanded={expandedSections.risk}
              onToggle={() => toggleSection('risk')}
            >
              <div className="space-y-1">
                {/* Summary Row */}
                <div 
                  className="flex justify-between items-center px-2 py-1.5 mb-2 text-[10px]"
                  style={{ 
                    backgroundColor: Math.abs(totalPercentage - 1) < 0.01 ? '#E8F4E8' : '#F5D5D5',
                    borderRadius: '2px',
                  }}
                >
                  <span style={{ color: '#5D4037' }}>占比合计</span>
                  <span 
                    style={{ 
                      fontFamily: 'var(--font-jetbrains), monospace',
                      fontWeight: 600,
                      color: Math.abs(totalPercentage - 1) < 0.01 ? '#4C6B4C' : '#8B4C4C',
                    }}
                  >
                    {(totalPercentage * 100).toFixed(0)}%
                  </span>
                </div>
                
                {/* Risk Level Grid with PD & Severity from static curves */}
                <div className="grid grid-cols-[32px_1fr_1fr_50px_50px] gap-x-1.5 gap-y-0.5 text-[10px]">
                  <div style={{ color: '#8B8178' }}></div>
                  <div className="text-center" style={{ color: '#8B8178' }}>占比</div>
                  <div className="text-center" style={{ color: '#8B8178' }}>额度</div>
                  <div className="text-center" style={{ color: '#8B8178' }}>PD</div>
                  <div className="text-center" style={{ color: '#8B8178' }}>Sev.</div>
                  
                  {businessFactors.riskDistribution.map((r) => {
                    const metrics = getGradeStaticMetrics(r.level - 1, 11);
                    return (
                      <React.Fragment key={r.level}>
                        <div 
                          className="py-1"
                          style={{ 
                            color: r.percentage === 0 ? '#A0978E' : '#4A3728',
                            fontWeight: 500,
                          }}
                        >
                          R{r.level}
                        </div>
                        <div className="relative">
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            step={0.1}
                            value={parseFloat((r.percentage * 100).toFixed(1))}
                            onChange={(e) => handleRiskPercentageChange(r.level, Number(e.target.value))}
                            className="h-6 text-[10px] text-right pr-5"
                            style={{ 
                              backgroundColor: r.percentage === 0 ? '#F5F0E8' : '#FFFFFF',
                              borderColor: '#E5DFD6',
                              borderRadius: '2px',
                              fontFamily: 'var(--font-jetbrains), monospace',
                            }}
                          />
                          <span 
                            className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[9px]"
                            style={{ color: '#8B8178' }}
                          >
                            %
                          </span>
                        </div>
                        <div className="relative">
                          <span 
                            className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[9px]"
                            style={{ color: '#8B8178' }}
                          >
                            ¥
                          </span>
                          <Input
                            type="number"
                            min={1000}
                            max={500000}
                            step={1000}
                            value={r.initialLimit}
                            onChange={(e) => handleRiskLimitChange(r.level, Number(e.target.value))}
                            className="h-6 text-[10px] text-right pl-4"
                            style={{ 
                              backgroundColor: r.percentage === 0 ? '#F5F0E8' : '#FFFFFF',
                              borderColor: '#E5DFD6',
                              borderRadius: '2px',
                              fontFamily: 'var(--font-jetbrains), monospace',
                            }}
                          />
                        </div>
                        <div 
                          className="h-6 flex items-center justify-center"
                          style={{ 
                            fontFamily: 'var(--font-jetbrains), monospace',
                            color: r.percentage === 0 ? '#A0978E' : '#6B5B4F',
                            fontSize: '9px',
                          }}
                        >
                          {(metrics.pd * 100).toFixed(1)}%
                        </div>
                        <div 
                          className="h-6 flex items-center justify-center"
                          style={{ 
                            fontFamily: 'var(--font-jetbrains), monospace',
                            color: r.percentage === 0 ? '#A0978E' : '#6B5B4F',
                            fontSize: '9px',
                          }}
                        >
                          {(metrics.severity * 100).toFixed(0)}%
                        </div>
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>
            </CollapsibleSection>
            
            {/* 2. Pricing: 利息收入 + 非息收入 (merged with V2) */}
            <CollapsibleSection
              title="定价参数"
              expanded={expandedSections.product}
              onToggle={() => toggleSection('product')}
            >
              {/* 2.1 利息收入相关 */}
              <div className="text-[9px] font-medium uppercase tracking-wider mb-1.5" style={{ color: '#8B7355' }}>利息收入相关</div>
              
              {/* Preference bar */}
              {(() => {
                let wRevRate = 0, wInstRate = 0;
                if (result?.riskLevelResults?.[0]?.annualMetrics?.[0]) {
                  for (const r of result.riskLevelResults) {
                    const pct = businessFactors.riskDistribution.find(d => d.level === r.level)?.percentage || 0;
                    if (r.annualMetrics?.[0]) {
                      wRevRate += r.annualMetrics[0].revolvingRate * pct;
                      wInstRate += (r.annualMetrics[0].installmentRate || 0) * pct;
                    }
                  }
                }
                const total = wRevRate + wInstRate;
                const effRevPct = total > 0 ? Math.round(wRevRate / total * 100) : Math.round((businessFactors.v2Installment?.revolvingInstSplit ?? 0.5) * 100);
                const effInstPct = 100 - effRevPct;
                return (
                  <div className="mb-2">
                    <div className="flex h-4 overflow-hidden" style={{ borderRadius: '2px', border: '1px solid #E5DFD6' }}>
                      <div className="flex items-center justify-center text-[8px] font-mono text-white" style={{ width: `${effRevPct}%`, backgroundColor: '#E65100', transition: 'width 0.3s' }}>
                        {effRevPct > 12 ? `循环${effRevPct}%` : ''}
                      </div>
                      <div className="flex items-center justify-center text-[8px] font-mono text-white" style={{ width: `${effInstPct}%`, backgroundColor: '#3949AB', transition: 'width 0.3s' }}>
                        {effInstPct > 12 ? `分期${effInstPct}%` : ''}
                      </div>
                    </div>
                    <div className="flex justify-between text-[8px] mt-0.5 font-mono" style={{ color: '#8B8178' }}>
                      <span>循环率 {(wRevRate * 100).toFixed(1)}%</span>
                      <span>分期率 {(wInstRate * 100).toFixed(1)}%</span>
                    </div>
                    <div className="flex items-center justify-center gap-2 mt-1">
                      <button
                        onClick={() => {
                          const cur = businessFactors.v2Installment?.revolvingInstSplit ?? 0.5;
                          updateV2Installment({ revolvingInstSplit: Math.max(0.05, cur - 0.05) });
                        }}
                        className="h-5 w-12 text-[9px] font-mono border flex items-center justify-center"
                        style={{ borderColor: '#3949AB', color: '#3949AB', borderRadius: '2px', cursor: 'pointer' }}
                      >
                        分期+
                      </button>
                      <span className="text-[8px] font-mono" style={{ color: '#A0978E' }}>
                        {Math.round((businessFactors.v2Installment?.revolvingInstSplit ?? 0.5) * 100)}:{Math.round((1 - (businessFactors.v2Installment?.revolvingInstSplit ?? 0.5)) * 100)}
                      </span>
                      <button
                        onClick={() => {
                          const cur = businessFactors.v2Installment?.revolvingInstSplit ?? 0.5;
                          updateV2Installment({ revolvingInstSplit: Math.min(0.95, cur + 0.05) });
                        }}
                        className="h-5 w-12 text-[9px] font-mono border flex items-center justify-center"
                        style={{ borderColor: '#E65100', color: '#E65100', borderRadius: '2px', cursor: 'pointer' }}
                      >
                        循环+
                      </button>
                    </div>
                  </div>
                );
              })()}
              
              {/* Left: 循环利率 | Right: 分期利率 */}
              <div className="grid grid-cols-2 gap-2 mb-1.5">
                <MiniInput 
                  label="循环利率(年化)" 
                  value={businessFactors.productParams.apr * 100} 
                  suffix="%" 
                  onChange={(v) => updateProductParams({ apr: v / 100 })}
                  highlighted={isHighlighted('apr')}
                  tooltip={{ desc: '循环信贷的年化利率，适用于未全额还款的客户余额', formula: '月利息 = 余额 x APR/12 x 循环率' }}
                />
                <MiniInput 
                  label="分期利率(年化)" 
                  value={(businessFactors.financialAssumptions.balTransferRate ?? 0.1825) * 100} 
                  suffix="%" 
                  onChange={(v) => updateFinancialAssumptions({ balTransferRate: v / 100 })}
                  tooltip={{ desc: '分期业务的年化利率，按期数折算为等额月费率', formula: '月费率 = 年化率/12 x (期数+1)/(2x期数)' }}
                />
              </div>
              {/* Fee rate hint + tenor */}
              <div className="text-[8px] font-mono mb-1.5 px-1" style={{ color: '#8B8178' }}>
                余额代偿费率: {((businessFactors.financialAssumptions.balTransferRate || 0.1825) / 12 * ((businessFactors.v2Installment?.installmentTenor || 12) + 1) / (2 * (businessFactors.v2Installment?.installmentTenor || 12)) * 100).toFixed(3)}%/月
              </div>
              <div className="mb-3">
                <label className="block text-[10px] mb-0.5" style={{ color: '#8B8178' }}>分期期数</label>
                <select
                  value={businessFactors.v2Installment?.installmentTenor ?? 12}
                  onChange={(e) => updateV2Installment({ installmentTenor: Number(e.target.value) })}
                  className="w-full h-6 text-[10px] border px-1"
                  style={{ backgroundColor: '#FFFFFF', borderColor: '#E5DFD6', borderRadius: '2px', fontFamily: 'var(--font-jetbrains), monospace' }}
                >
                  {[3, 6, 9, 12, 18, 24, 36].map((n) => (
                    <option key={n} value={n}>{n}期</option>
                  ))}
                </select>
              </div>
              
              {/* 2.2 非息收入相关 */}
              <div className="text-[9px] font-medium uppercase tracking-wider mb-1.5 pt-2 border-t" style={{ color: '#8B7355', borderColor: '#E5DFD6' }}>非息收入相关</div>
              <div className="grid grid-cols-2 gap-2">
                <MiniInput 
                  label="回佣率" 
                  value={businessFactors.productParams.interchangeRate * 100} 
                  suffix="%" 
                  onChange={(v) => updateProductParams({ interchangeRate: v / 100 })}
                  highlighted={isHighlighted('interchangeRate')}
                  tooltip={{ desc: '发卡行从商户收单行获得的手续费分成比例', formula: '回佣 = 月消费额 x 回佣率 x 活跃客户' }}
                />
                <MiniInput 
                  label="取现费率" 
                  value={businessFactors.productParams.cashAdvanceFee * 100} 
                  suffix="%" 
                  onChange={(v) => updateProductParams({ cashAdvanceFee: v / 100 })}
                  tooltip={{ desc: '客户ATM或柜台取现时收取的手续费比例', formula: '取现收入 = 月取现额 x 取现费率 x 活跃客户' }}
                />
                <MiniInput 
                  label="超限费" 
                  value={businessFactors.productParams.overlimitFee} 
                  prefix="¥" 
                  onChange={(v) => updateProductParams({ overlimitFee: v })}
                  tooltip={{ desc: '客户消费超出信用额度时收取的固定费用（当前模型中暂未启用）' }}
                />
                <MiniInput 
                  label="年费" 
                  value={businessFactors.productParams.annualFee} 
                  prefix="¥" 
                  onChange={(v) => updateProductParams({ annualFee: v })}
                  highlighted={isHighlighted('annualFee')}
                  tooltip={{ desc: '每年向持卡人收取的卡片使用费', formula: '月年费 = 年费/12 x 存活客户数' }}
                />
              </div>
            </CollapsibleSection>
            
            {/* 3. Financial: grouped by cost type */}
            <CollapsibleSection
              title="财务假设"
              expanded={expandedSections.financial}
              onToggle={() => toggleSection('financial')}
            >
              {/* 3.1 获客成本 */}
              <div className="text-[9px] font-medium uppercase tracking-wider mb-1.5" style={{ color: '#8B7355' }}>获客成本</div>
              <div className="grid grid-cols-1 gap-2 mb-2">
                <MiniInput 
                  label="获客成本" 
                  value={businessFactors.financialAssumptions.cac} 
                  prefix="¥" 
                  onChange={(v) => updateFinancialAssumptions({ cac: v })}
                  highlighted={isHighlighted('cac')}
                  tooltip={{ desc: '获取单个新客户的一次性营销/渠道成本，在NPV中作为第0期现金流出', formula: 'PV中直接扣减: -CAC' }}
                />
              </div>
              
              {/* 3.2 资金成本 */}
              <div className="text-[9px] font-medium uppercase tracking-wider mb-1.5 pt-2 border-t" style={{ color: '#8B7355', borderColor: '#E5DFD6' }}>资金成本</div>
              <div className="grid grid-cols-1 gap-2 mb-2">
                <MiniInput 
                  label="FTP利率" 
                  value={businessFactors.financialAssumptions.ftpRate * 100} 
                  suffix="%" 
                  onChange={(v) => updateFinancialAssumptions({ ftpRate: v / 100 })}
                  highlighted={isHighlighted('ftpRate')}
                  tooltip={{ desc: '内部资金转移定价利率，反映银行为信用卡业务配置资金的成本', formula: '已用资金成本 = (消费+余额) x FTP/12 x 活跃客户' }}
                />
                <MiniInput 
                  label="未使用额度转换系数" 
                  value={(businessFactors.financialAssumptions.unusedLimitCostFactor ?? 0.50) * 100} 
                  suffix="%" 
                  onChange={(v) => updateFinancialAssumptions({ unusedLimitCostFactor: v / 100 })}
                  tooltip={{ desc: '未使用信用额度需预留的资金头寸比例', formula: '未用成本 = max(0,额度-消费-余额) x FTP/12 x 系数 x 活跃 + 额度 x FTP/12 x 系数 x 非活跃存活' }}
                />
              </div>
              
              {/* 3.3 风险成本 */}
              <div className="text-[9px] font-medium uppercase tracking-wider mb-1.5 pt-2 border-t" style={{ color: '#8B7355', borderColor: '#E5DFD6' }}>风险成本</div>
              <div className="grid grid-cols-1 gap-2 mb-2">
                <MiniInput 
                  label="回收率" 
                  value={businessFactors.financialAssumptions.recoveryRate * 100} 
                  suffix="%" 
                  onChange={(v) => updateFinancialAssumptions({ recoveryRate: v / 100 })}
                  tooltip={{ desc: '逾期坏账中最终能通过催收回收的比例', formula: '净风险成本 = 风险损失 x (1 - 回收率)' }}
                />
              </div>
              
              {/* 3.4 其他成本 */}
              <div className="text-[9px] font-medium uppercase tracking-wider mb-1.5 pt-2 border-t" style={{ color: '#8B7355', borderColor: '#E5DFD6' }}>其他成本</div>
              <div className="grid grid-cols-2 gap-2">
                <MiniInput 
                  label="月运营成本" 
                  value={businessFactors.financialAssumptions.opexPerCard} 
                  prefix="¥" 
                  onChange={(v) => updateFinancialAssumptions({ opexPerCard: v })}
                  highlighted={isHighlighted('opexPerCard')}
                  tooltip={{ desc: '每张卡每月的运营维护成本，包括系统、客服、账单等', formula: '月运营成本 x 存活客户数' }}
                />
                <MiniInput 
                  label="欺诈率" 
                  value={(businessFactors.financialAssumptions.fraudRate ?? 0.0003) * 100} 
                  suffix="%" 
                  step={0.01}
                  onChange={(v) => updateFinancialAssumptions({ fraudRate: v / 100 })}
                  tooltip={{ desc: '因欺诈交易导致的月度损失占消费额的比例', formula: '欺诈成本 = 月消费额 x 欺诈率 x 活跃客户' }}
                />
                <MiniInput 
                  label="权益成本率" 
                  value={(businessFactors.financialAssumptions.rewardsRate ?? 0.005) * 100} 
                  suffix="%" 
                  onChange={(v) => updateFinancialAssumptions({ rewardsRate: v / 100 })}
                  highlighted={isHighlighted('rewardsRate')}
                  tooltip={{ desc: '积分/返现等客户权益占消费额的成本比例', formula: '权益成本 = min(消费额 x 权益率, 月上限) x 活跃客户' }}
                />
                <MiniInput 
                  label="权益月上限" 
                  value={businessFactors.financialAssumptions.rewardsCap ?? 100} 
                  prefix="¥" 
                  onChange={(v) => updateFinancialAssumptions({ rewardsCap: v })}
                  tooltip={{ desc: '每张卡每月权益成本的最大金额', formula: '实际权益 = min(消费额 x 权益率, 此上限)' }}
                />
              </div>
            </CollapsibleSection>
            
            {/* 4. Stress Coefficients (reordered) */}
            <CollapsibleSection
              title="压力系数"
              expanded={expandedSections.stress}
              onToggle={() => toggleSection('stress')}
            >
              <div className="space-y-2">
                <MiniSlider 
                  label="流失率" 
                  value={businessFactors.stressCoefficients.attritionMultiplier}
                  onChange={(v) => updateStressCoefficients({ attritionMultiplier: v })}
                  hint={`加权流失: ${(weightedMetrics.avgAttrition * 100).toFixed(1)}%`}
                  tooltip={{ desc: '对基准月流失率的乘数调整，>100%表示流失加速', formula: '实际流失率 = 基准流失率 x 此系数' }}
                />
                <MiniSlider 
                  label="活跃率" 
                  value={businessFactors.stressCoefficients.activeRateMultiplier}
                  onChange={(v) => updateStressCoefficients({ activeRateMultiplier: v })}
                  hint={`加权活跃: ${(weightedMetrics.avgActive * 100).toFixed(1)}%`}
                  tooltip={{ desc: '对基准月活跃率的乘数调整，影响产生消费和收入的客户比例', formula: '实际活跃率 = 基准活跃率 x 此系数' }}
                />
                <MiniSlider 
                  label="额度使用率" 
                  value={businessFactors.stressCoefficients.utilizationMultiplier}
                  onChange={(v) => updateStressCoefficients({ utilizationMultiplier: v })}
                  hint={`加权使用率: ${(weightedMetrics.avgUtil * 100).toFixed(1)}%`}
                  tooltip={{ desc: '对基准额度使用率的乘数调整，影响未偿余额规模', formula: '实际使用率 = 基准使用率 x 此系数; 余额 = 额度 x 使用率' }}
                />
                <MiniSlider 
                  label="交易额/消费额" 
                  value={businessFactors.stressCoefficients.spendMultiplier}
                  onChange={(v) => updateStressCoefficients({ spendMultiplier: v })}
                  hint={`加权月消费: ¥${Math.round(weightedMetrics.avgSpend)}`}
                  tooltip={{ desc: '对基准月消费额的乘数调整，影响回佣、权益等与消费挂钩的收支', formula: '实际月消费 = 基准月消费 x 此系数' }}
                />
                <MiniSlider 
                  label="取现金额" 
                  value={businessFactors.stressCoefficients.cashMultiplier}
                  onChange={(v) => updateStressCoefficients({ cashMultiplier: v })}
                  hint={`加权月取现: ¥${Math.round(weightedMetrics.avgCashAmt)}`}
                  tooltip={{ desc: '对基准月取现金额的乘数调整，影响取现手续费收入', formula: '实际月取现 = 基准月取现 x 此系数' }}
                />
                <MiniSlider 
                  label="生息资产比例" 
                  value={businessFactors.stressCoefficients.revolvingMultiplier}
                  onChange={(v) => updateStressCoefficients({ revolvingMultiplier: v })}
                  highlighted={isHighlighted('revolvingRate')}
                  hint={`加权生息: ${(weightedMetrics.avgRevolve * 100).toFixed(1)}%`}
                  tooltip={{ desc: '对基准循环/分期率的乘数调整，影响利息收入规模', formula: '实际循环率 = 基准循环率 x 此系数' }}
                />
                <MiniSlider 
                  label="PD压力" 
                  value={businessFactors.stressCoefficients.pdMultiplier}
                  onChange={(v) => updateStressCoefficients({ pdMultiplier: v })}
                  highlighted={isHighlighted('pdMultiplier')}
                  hint={`加权PD: ${(weightedMetrics.avgPD * 100).toFixed(2)}%`}
                  tooltip={{ desc: '对基准违约概率(PD)的乘数调整，>100%模拟经济下行场景', formula: '实际PD = 基准PD x 此系数' }}
                />
                <MiniSlider 
                  label="损失严重性" 
                  value={businessFactors.stressCoefficients.lgdMultiplier}
                  onChange={(v) => updateStressCoefficients({ lgdMultiplier: v })}
                  highlighted={isHighlighted('lgdMultiplier')}
                  hint={`加权Severity: ${(weightedMetrics.avgSeverity * 100).toFixed(1)}%`}
                  tooltip={{ desc: '对基准损失严重率(LGD)的乘数调整，影响违约后实际损失金额', formula: '实际Severity = 基准Severity x 此系数' }}
                />
              </div>
            </CollapsibleSection>
            
            {/* 5. Advanced Options Panel */}
            <div 
              className="p-3 border space-y-3"
              style={{ 
                backgroundColor: '#FFFFFF', 
                borderColor: '#C19A6B',
                borderRadius: '2px',
              }}
            >
              <div className="text-[10px] font-medium tracking-wider uppercase" style={{ color: '#8B7355' }}>
                高阶选项
              </div>
              
              {/* Discount Rate */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px]" style={{ color: '#4A3728' }}>折现率</span>
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    step={1}
                    min={1}
                    max={50}
                    value={parseFloat((discountRate * 100).toPrecision(10))}
                    onChange={(e) => setDiscountRate(Number(e.target.value) / 100)}
                    className="h-6 w-16 text-[10px] text-right pr-5"
                    style={{ 
                      backgroundColor: '#FAFAF8', 
                      borderColor: '#E5DFD6', 
                      borderRadius: '2px',
                      fontFamily: 'var(--font-jetbrains), monospace',
                    }}
                  />
                  <span className="text-[10px]" style={{ color: '#8B8178' }}>%</span>
                </div>
              </div>
              
              {/* Terminal Value Toggle + Cap */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span 
                      className="text-[11px]"
                      style={{ color: includeTerminalValue ? '#4A3728' : '#A0978E' }}
                    >
                      计入残值
                    </span>
                    <LucideTooltip>
                      <TooltipTrigger asChild>
                        <Info className="w-3 h-3 cursor-help" style={{ color: '#8B8178' }} />
                      </TooltipTrigger>
                      <TooltipContent 
                        side="right" 
                        className="max-w-[200px] text-xs"
                        style={{ backgroundColor: '#4A3728', color: '#FFFFFF', borderRadius: '2px' }}
                      >
                        残值代表 MOB 100 之后存量客户的远期折现价值。审慎起见建议默认关闭。
                      </TooltipContent>
                    </LucideTooltip>
                  </div>
                  <Switch
                    checked={includeTerminalValue}
                    onCheckedChange={setIncludeTerminalValue}
                    className="data-[state=checked]:bg-[#C19A6B] scale-90"
                  />
                </div>
                <div 
                  className="flex items-center justify-between gap-2 pl-3"
                  style={{ opacity: includeTerminalValue ? 1 : 0.4, pointerEvents: includeTerminalValue ? 'auto' : 'none' }}
                >
                  <span className="text-[10px]" style={{ color: '#6B5B4F' }}>残值上限</span>
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      step={1}
                      min={1}
                      max={50}
                      value={parseFloat((terminalValueCap * 100).toPrecision(10))}
                      onChange={(e) => setTerminalValueCap(Number(e.target.value) / 100)}
                      className="h-6 w-16 text-[10px] text-right pr-5"
                      style={{ 
                        backgroundColor: '#FAFAF8', 
                        borderColor: '#E5DFD6', 
                        borderRadius: '2px',
                        fontFamily: 'var(--font-jetbrains), monospace',
                      }}
                    />
                    <span className="text-[10px]" style={{ color: '#8B8178' }}>%</span>
                  </div>
                </div>
              </div>
              
              {/* Mean Reversion Toggle */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span 
                    className="text-[11px]"
                    style={{ color: meanReversionEnabled ? '#4A3728' : '#A0978E' }}
                  >
                    均值回归
                  </span>
                  <LucideTooltip>
                    <TooltipTrigger asChild>
                      <Info className="w-3 h-3 cursor-help" style={{ color: '#8B8178' }} />
                    </TooltipTrigger>
                    <TooltipContent 
                      side="right" 
                      className="max-w-[200px] text-xs"
                      style={{ backgroundColor: '#4A3728', color: '#FFFFFF', borderRadius: '2px' }}
                    >
                      启用后压力曲线将在远期回归基准水平。当前版本暂不参与计算。
                    </TooltipContent>
                  </LucideTooltip>
                </div>
                <Switch
                  checked={meanReversionEnabled}
                  onCheckedChange={setMeanReversionEnabled}
                  className="data-[state=checked]:bg-[#C19A6B] scale-90"
                />
              </div>
            </div>
          </div>

          {/* Sticky confirm button for zoomed waterfall comparison mode */}
          {waterfallZoomed && baselineWaterfallItems && (
            <div className="sticky bottom-0 p-3 border-t" style={{ backgroundColor: '#FDF5E6', borderColor: '#5D4037' }}>
              <div className="text-[9px] mb-2 text-center" style={{ color: '#8B8178' }}>
                瀑布图正在显示参数修改前后差值
              </div>
              <button
                onClick={() => setBaselineWaterfallItems([...waterfallItems])}
                className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-semibold transition-colors hover:opacity-90"
                style={{ backgroundColor: '#5D4037', color: '#FFFFFF', borderRadius: '2px' }}
              >
                <Check className="w-3.5 h-3.5" />
                确认修改
              </button>
            </div>
          )}
        </div>

        {/* Collapse/Expand Toggle */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="flex-shrink-0 w-5 flex items-center justify-center border-r hover:bg-[#F0EBE3] transition-colors"
          style={{ backgroundColor: '#FDF5E6', borderColor: '#5D4037' }}
          title={isCollapsed ? '展开面板' : '收起面板'}
        >
          {isCollapsed ? (
            <PanelLeftOpen className="w-3.5 h-3.5" style={{ color: '#5D4037' }} />
          ) : (
            <PanelLeftClose className="w-3.5 h-3.5" style={{ color: '#5D4037' }} />
          )}
        </button>
        
        {/* Right Panel - Analytics Dashboard with Sticky Architecture */}
        <div 
          className="flex-1 flex flex-col overflow-hidden transition-all duration-300" 
          style={{ height: '100vh' }}
        >
          {/* ===== LAYER 1: Financial Summary KPI Bar (Sticky) ===== */}
          <div 
            className="flex-shrink-0 px-4 py-2.5 border-b flex items-center justify-between"
            style={{ 
              backgroundColor: '#5D4037',
              borderColor: '#4A3728',
            }}
          >
            <div className="flex items-center gap-8">
              {/* Total NPV - Primary KPI */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-wider" style={{ color: '#D7CCC8' }}>总NPV</span>
                <span 
                  className="text-xl font-bold"
                  style={{ 
                    color: (displayNPV || 0) >= 0 ? '#A5D6A7' : '#EF9A9A',
                    fontFamily: 'var(--font-jetbrains), monospace',
                  }}
                >
                  {formatCurrency(displayNPV || 0)}
                </span>
              </div>
              <div className="h-7 w-px" style={{ backgroundColor: '#8D6E63' }} />
              {/* Total Income */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-wider" style={{ color: '#D7CCC8' }}>总收入</span>
                <span 
                  className="text-sm font-semibold"
                  style={{ 
                    color: '#A5D6A7',
                    fontFamily: 'var(--font-jetbrains), monospace',
                  }}
                >
                  {formatCurrency((result?.summary.interestIncome || 0) + (result?.pvComposition?.installmentIncome || 0) + (result?.summary.nonInterestIncome || 0))}
                </span>
              </div>
              <div className="h-7 w-px" style={{ backgroundColor: '#8D6E63' }} />
              {/* Total Cost */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-wider" style={{ color: '#D7CCC8' }}>总成本</span>
                <span 
                  className="text-sm font-semibold"
                  style={{ 
                    color: '#EF9A9A',
                    fontFamily: 'var(--font-jetbrains), monospace',
                  }}
                >
                  {formatCurrency((result?.summary.cac || 0) + (result?.summary.riskCost || 0) + (result?.summary.fundingCost || 0) + (result?.summary.opexAndOther || 0))}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[10px]" style={{ color: '#D7CCC8' }}>
                {cardProduct ? CARD_PRODUCT_LABELS[cardProduct] : '-'} | {channel ? CHANNEL_LABELS[channel] : '-'}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2"
                style={{ color: '#FFFFFF' }}
              >
                <Download className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
          
          {/* ===== Risk Level Filter Bar ===== */}
          <div 
            className="flex-shrink-0 flex items-center gap-2 px-3 py-1.5 border-b"
            style={{ backgroundColor: '#F5F0E8', borderColor: '#E5DFD6' }}
          >
            <span className="text-[10px] font-medium" style={{ color: '#4A3728' }}>客群风险等级</span>
            <div className="flex items-center gap-1">
              {['All', ...businessFactors.riskDistribution.filter(d => d.percentage > 0).map(d => String(d.level))].map(level => {
                const isActive = selectedRiskLevel === level;
                const label = level === 'All' ? '全部' : `R${level}`;
                const hasData = true;
                return (
                  <button
                    key={level}
                    onClick={() => setSelectedRiskLevel(level)}
                    disabled={!hasData}
                    className="px-2 py-0.5 text-[9px] font-medium transition-all"
                    style={{ 
                      backgroundColor: isActive ? '#5D4037' : hasData ? '#FFFFFF' : '#F5F0E8',
                      color: isActive ? '#FFFFFF' : hasData ? '#4A3728' : '#A0978E',
                      borderRadius: '2px',
                      border: `1px solid ${isActive ? '#5D4037' : '#E5DFD6'}`,
                      cursor: hasData ? 'pointer' : 'default',
                      opacity: hasData ? 1 : 0.5,
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            {selectedRiskLevel !== 'All' && (
              <span className="text-[9px] ml-1" style={{ color: '#8B8178', fontFamily: 'var(--font-jetbrains), monospace' }}>
                R{selectedRiskLevel} | 额度 {formatCurrency(businessFactors.riskDistribution.find(d => d.level === Number(selectedRiskLevel))?.initialLimit || 0)}
              </span>
            )}
          </div>
          
          {/* ===== LAYER 2: Diagnostic Charts (Collapsible) ===== */}
          <div className="flex-shrink-0 border-b relative" style={{ backgroundColor: '#FDF5E6', borderColor: '#E5DFD6' }}>
            {/* Collapse toggle */}
            <button
              onClick={() => {
                if (chartsCollapsed) { setChartsCollapsed(false); setChartsCompact(false); }
                else if (chartsCompact) { setChartsCompact(false); }
                else { setChartsCompact(true); }
              }}
              className="absolute right-2 -bottom-3 z-10 px-2 py-0.5 text-[8px] font-medium border shadow-sm transition-colors hover:opacity-80"
              style={{ backgroundColor: '#FFFFFF', borderColor: '#E5DFD6', color: '#8B8178', borderRadius: '8px' }}
            >
              {chartsCollapsed ? '展开图表' : chartsCompact ? '放大图表' : '缩小图表'}
            </button>
          <div 
            className="relative grid grid-cols-2 gap-2 px-3 py-1 overflow-hidden"
            style={{ 
              height: chartsCollapsed ? '0px' : waterfallZoomed ? '72vh' : chartsCompact ? '28vh' : '42vh',
              padding: chartsCollapsed ? '0 12px' : undefined,
              opacity: chartsCollapsed ? 0 : 1,
              transition: 'height 0.3s ease, opacity 0.2s ease, padding 0.3s ease',
            }}
          >
            {/* Left: Waterfall Chart (The "What") - zoomed mode covers full grid */}
            <Card 
              className={`border overflow-hidden flex flex-col ${waterfallZoomed ? 'col-span-2' : ''}`}
              style={{ backgroundColor: '#FFFFFF', borderColor: '#5D4037', borderRadius: '2px' }}
            >
              <div 
                className="px-2 py-1 border-b flex items-center justify-between flex-shrink-0"
                style={{ backgroundColor: '#F5F0E8', borderColor: '#E5DFD6' }}
              >
                <div className="flex items-center gap-1.5">
                  {/* Pinned bar info inline (left of controls) */}
                  {pinnedBarId && (() => {
                    const pItem = waterfallItems.find(i => i.id === pinnedBarId);
                    if (!pItem) return null;
                    const pLabel = pItem.group ? `${pItem.group} > ${pItem.label.trim()}` : pItem.label;
                    const pHasDrill = !!DRILLDOWN_MAP[pItem.id];
                    const pDrillOpen = drilldownItemId === pItem.id;
                    return (
                      <div className="flex items-center gap-1.5 pr-2 mr-2 border-r" style={{ borderColor: '#D7CCC8' }}>
                        <span
                          className="inline-block w-2 h-2 flex-shrink-0"
                          style={{
                            backgroundColor: pItem.type === 'negative' ? '#A52A2A' : pItem.type === 'total' ? '#5D4037' : '#C19A6B',
                            borderRadius: '1px',
                          }}
                        />
                        <span className="text-[9px] font-medium truncate max-w-[80px]" style={{ color: '#4A3728' }}>{pLabel}</span>
                        <span
                          className="text-[9px] font-bold flex-shrink-0"
                          style={{ color: pItem.value >= 0 ? '#4C6B4C' : '#8B4C4C', fontFamily: 'var(--font-jetbrains), monospace' }}
                        >
                          {formatCurrency(pItem.value)}
                        </span>
                        {pHasDrill && (
                          <button
                            onClick={() => setDrilldownItemId(pDrillOpen ? null : pItem.id)}
                            className="text-[8px] font-medium px-1 py-0.5 border transition-colors hover:opacity-80 flex-shrink-0"
                            style={{
                              backgroundColor: pDrillOpen ? '#4A3728' : '#5D4037',
                              color: '#FFFFFF',
                              borderColor: '#5D4037',
                              borderRadius: '2px',
                            }}
                          >
                            {pDrillOpen ? '收起' : '逻辑'}
                          </button>
                        )}
                        <button
                          onClick={() => { setPinnedBarId(null); setActiveDriver(null); setHighlightedFactors([]); setTimeSeriesMetric('净值'); setDrilldownItemId(null); }}
                          className="text-[9px] flex-shrink-0 hover:opacity-70"
                          style={{ color: '#8B8178' }}
                        >
                          x
                        </button>
                      </div>
                    );
                  })()}
                  <span className="text-[11px] font-medium" style={{ color: '#4A3728' }}>
                    PV瀑布图
                  </span>
                  <Select value={selectedYear} onValueChange={setSelectedYear}>
                    <SelectTrigger 
                      className="h-5 w-16 text-[9px] px-1.5"
                      style={{ backgroundColor: '#FFFFFF', borderColor: '#E5DFD6', borderRadius: '2px' }}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent style={{ backgroundColor: '#FDF5E6' }}>
                      <SelectItem value="All" className="text-[10px]">全周期</SelectItem>
                      {[1,2,3,4,5,6,7,8].map(yr => (
                        <SelectItem key={yr} value={`Yr${yr}`} className="text-[10px]">Yr{yr}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <button
                    onClick={() => {
                      setWaterfallExpanded(!waterfallExpanded);
                      setPinnedBarId(null);
                    }}
                    className="h-5 px-1.5 text-[9px] font-medium border transition-colors hover:opacity-80"
                    style={{
                      backgroundColor: waterfallExpanded ? '#5D4037' : '#FFFFFF',
                      color: waterfallExpanded ? '#FFFFFF' : '#4A3728',
                      borderColor: waterfallExpanded ? '#5D4037' : '#E5DFD6',
                      borderRadius: '2px',
                    }}
                  >
                    {waterfallExpanded ? '收起子项' : '展开子项'}
                  </button>
                  <button
                    onClick={() => {
                      const entering = !waterfallZoomed;
                      setWaterfallZoomed(entering);
                      if (entering) {
                        // Snapshot current waterfall items as baseline
                        setBaselineWaterfallItems([...waterfallItems]);
                      } else {
                        // Exiting zoom: clear baseline
                        setBaselineWaterfallItems(null);
                      }
                    }}
                    className="h-5 px-1.5 text-[9px] font-medium border transition-colors hover:opacity-80 flex items-center gap-0.5"
                    style={{
                      backgroundColor: waterfallZoomed ? '#5D4037' : '#FFFFFF',
                      color: waterfallZoomed ? '#FFFFFF' : '#4A3728',
                      borderColor: waterfallZoomed ? '#5D4037' : '#E5DFD6',
                      borderRadius: '2px',
                    }}
                  >
                    {waterfallZoomed ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
                    {waterfallZoomed ? '退出' : '放大'}
                  </button>
                </div>
                {activeDriver ? (
                  <button 
                    onClick={() => {
                      setActiveDriver(null);
                      setPinnedBarId(null);
                      setHighlightedFactors([]);
                      setTimeSeriesMetric('净值');
                    }}
                    className="text-[9px] px-1.5 py-0.5 hover:opacity-80 transition-opacity"
                    style={{ backgroundColor: '#C19A6B', color: '#FFFFFF', borderRadius: '2px' }}
                  >
                    清除: {activeDriver.trim()}
                  </button>
                ) : (
                  <span className="text-[9px]" style={{ color: '#8B8178' }}>
                    点击柱子联动
                  </span>
                )}
              </div>
              {/* Waterfall chart - double-click to toggle zoom */}
              <div 
                className="flex-1 flex flex-col overflow-hidden min-h-0 px-1 cursor-pointer"
                onDoubleClick={() => {
                  const entering = !waterfallZoomed;
                  setWaterfallZoomed(entering);
                  if (entering) {
                    setBaselineWaterfallItems([...waterfallItems]);
                  } else {
                    setBaselineWaterfallItems(null);
                  }
                }}
                title={waterfallZoomed ? '双击退出放大' : '双击放大'}
              >
                <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={waterfallItems.map(item => ({
                      ...item,
                      // For floating bars, we use y0/y1 to render connected bridge
                      // The bar height is the absolute difference between y0 and y1
                      barHeight: Math.abs(item.y1 - item.y0),
                      barBase: Math.min(item.y0, item.y1),
                    }))} 
                    margin={{ top: waterfallZoomed ? 28 : 2, right: 5, left: 0, bottom: waterfallZoomed ? 28 : 18 }}
                  >
                    <XAxis 
                      dataKey="label" 
                      tick={(props: { x: number; y: number; payload: { value: string; index: number } }) => {
                        const { x, y, payload } = props;
                        const item = waterfallItems[payload.index];
                        const isSubItem = item?.group;
                        const displayLabel = isSubItem ? payload.value.trim() : payload.value;
                        const zFactor = waterfallZoomed ? 1.4 : 1;
                        return (
                          <g transform={`translate(${x},${y})`}>
                            <text 
                              x={0} y={0} dy={10} 
                              textAnchor="end" 
                              fill={isSubItem ? '#8B8178' : '#6B5B4F'}
                              fontSize={(isSubItem ? 7 : 8) * zFactor}
                              fontStyle={isSubItem ? 'italic' : 'normal'}
                              transform="rotate(-30)"
                            >
                              {displayLabel}
                            </text>
                          </g>
                        );
                      }}
                      axisLine={{ stroke: '#E5DFD6' }}
                      tickLine={false}
                      interval={0}
                      height={waterfallZoomed ? 52 : 38}
                    />
                    <YAxis 
                      tick={{ fontSize: waterfallZoomed ? 11 : 9, fill: '#6B5B4F', fontFamily: 'var(--font-jetbrains), monospace' }}
                      axisLine={{ stroke: '#E5DFD6' }}
                      tickLine={false}
                      tickFormatter={(v) => `${(v/1000).toFixed(0)}k`}
                      width={waterfallZoomed ? 50 : 38}
                    />
                    <RechartsTooltip
                      content={({ active, payload }) => {
                        if (!active || !payload || !payload[1]) return null;
                        const data = payload[1].payload as { id: string; label: string; value: number; group?: string };
                        const label = data.group
                          ? `${data.group} > ${data.label.trim()}`
                          : data.label;
                        return (
                          <div
                            className="px-2 py-1 border shadow-sm"
                            style={{
                              backgroundColor: '#FDF5E6',
                              borderColor: '#5D4037',
                              borderRadius: '2px',
                              fontFamily: 'var(--font-jetbrains), monospace',
                            }}
                          >
                            <div className="text-[9px] font-medium" style={{ color: '#4A3728' }}>{label}</div>
                            <div className="text-[10px] font-bold" style={{ color: data.value >= 0 ? '#4C6B4C' : '#8B4C4C' }}>
                              {formatCurrency(data.value)}
                            </div>
                            {(() => {
                              const bItem = baselineWaterfallItems?.find((b: { id: string }) => b.id === data.id);
                              if (!bItem || !waterfallZoomed) return null;
                              const d = data.value - bItem.value;
                              if (Math.abs(d) < 0.5) return null;
                              return (
                                <div className="text-[10px] font-bold mt-0.5" style={{ color: d > 0 ? '#2E7D32' : '#C62828' }}>
                                  {d > 0 ? '+' : ''}{formatCurrency(Math.round(d))} (差值)
                                </div>
                              );
                            })()}
                            <div className="text-[8px] mt-0.5" style={{ color: '#8B8178' }}>{'点击查看详情'}</div>
                          </div>
                        );
                      }}
                    />
                    <ReferenceLine y={0} stroke="#8B8178" strokeWidth={1.5} />
                    {/* Invisible base bar for floating effect */}
                    <Bar dataKey="barBase" stackId="waterfall" fill="transparent" />
                    {/* Visible bar height */}
                    <Bar 
                      dataKey="barHeight" 
                      stackId="waterfall"
                      radius={[2, 2, 0, 0]}
                      label={waterfallZoomed ? {
                        position: 'top',
                        content: (props: Record<string, unknown>) => {
                          const { x, y, width: bw, height: bh, index } = props as { x: number; y: number; width: number; height: number; index: number };
                          const item = waterfallItems[index as number];
                          if (!item || item.id === 'total') return null;
                          const val = item.value;
                          const fmtVal = Math.abs(val) >= 1000 ? `${(val / 1000).toFixed(1)}k` : val.toFixed(0);
                          const cx = (x as number) + (bw as number) / 2;
                          // Place label above for positive, below for negative
                          const labelY = val >= 0 ? (y as number) - 6 : (y as number) + Math.abs(bh as number) + 12;

                          // Delta
                          const baseItem = baselineWaterfallItems?.find((b: { id: string }) => b.id === item.id);
                          const delta = baseItem ? val - baseItem.value : 0;
                          const hasDelta = !!baselineWaterfallItems && Math.abs(delta) > 0.5;
                          const deltaY = val >= 0 ? labelY - 12 : labelY + 12;

                          return (
                            <g>
                              <text x={cx} y={labelY} textAnchor="middle"
                                fill={val >= 0 ? '#4C6B4C' : '#8B4C4C'}
                                fontSize={10} fontFamily="var(--font-jetbrains), monospace" fontWeight={600}
                              >{fmtVal}</text>
                              {hasDelta && (
                                <>
                                  <rect x={cx - 22} y={deltaY - 9} width={44} height={13} rx={2}
                                    fill={delta > 0 ? '#E8F5E9' : '#FFEBEE'} stroke={delta > 0 ? '#66BB6A' : '#EF5350'} strokeWidth={0.5} />
                                  <text x={cx} y={deltaY} textAnchor="middle"
                                    fill={delta > 0 ? '#2E7D32' : '#C62828'}
                                    fontSize={9} fontFamily="var(--font-jetbrains), monospace" fontWeight={700}
                                  >{delta > 0 ? '+' : ''}{Math.abs(delta) >= 1000 ? `${(delta / 1000).toFixed(1)}k` : delta.toFixed(0)}</text>
                                </>
                              )}
                            </g>
                          );
                        },
                      } : false}
                  onClick={(data) => {
                  const barLabel = (data.label || '').trim();
                  const barId = data.id;
                  // Toggle active driver for full linkage system
                  const newActiveDriver = activeDriver === barLabel ? null : barLabel;
                        setActiveDriver(newActiveDriver);
                        
                        // Pin/unpin bar info panel
                        setPinnedBarId(pinnedBarId === barId ? null : barId);
                        
                        // Get related sidebar factors from highlightMap
                        const mapping = highlightMap[barLabel];
                        if (mapping) {
                          setHighlightedFactors(mapping.sidebarFactors);
                          setTimeout(() => setHighlightedFactors([]), 3000);
                        }
                      }}
                      cursor="pointer"
                    >
                      {waterfallItems.map((entry, index) => {
                        // Color scheme: sub-items get lighter shade 
                        const isSubItem = !!entry.group;
                        let fill = '#C19A6B'; // Default: Gold for income
                        if (entry.type === 'negative') fill = isSubItem ? '#C75050' : '#A52A2A';
                        else if (entry.type === 'positive') fill = isSubItem ? '#D4B48A' : '#C19A6B';
                        else if (entry.type === 'terminal') fill = '#7986CB';
                        else if (entry.type === 'total') fill = '#5D4037';
                        
                        // Highlight active bar
                        const isActive = activeDriver === entry.label;
                        if (isActive) {
                          fill = entry.type === 'negative' ? '#8B0000' : 
                                 entry.type === 'terminal' ? '#5C6BC0' :
                                 entry.type === 'total' ? '#3E2723' : '#B8860B';
                        }
                        
                        return (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={fill}
                            style={{ 
                              filter: isActive ? 'brightness(1.1)' : 'none',
                              transition: 'all 0.2s ease',
                            }}
                          />
                        );
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                </div>
                {/* Group legend - only when expanded */}
                {(waterfallExpanded || waterfallZoomed) && (
                <div 
                  className="px-2 py-0.5 border-t flex items-center gap-3 flex-shrink-0 flex-wrap"
                  style={{ borderColor: '#E5DFD6' }}
                >
                  {waterfallExpanded && (
                    <>
                      <div className="flex items-center gap-1">
                        <span className="w-2.5 h-2.5 inline-block" style={{ backgroundColor: '#D4B48A', borderRadius: '1px' }} />
                        <span className="text-[8px]" style={{ color: '#8B8178' }}>非息子项</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="w-2.5 h-2.5 inline-block" style={{ backgroundColor: '#C75050', borderRadius: '1px' }} />
                        <span className="text-[8px]" style={{ color: '#8B8178' }}>其他成本子项</span>
                      </div>
                    </>
                  )}
                  {waterfallZoomed && baselineWaterfallItems && (
                    <>
                      <div className="flex items-center gap-1 ml-auto">
                        <span className="w-2.5 h-2.5 inline-block" style={{ backgroundColor: '#2E7D32', borderRadius: '1px' }} />
                        <span className="text-[8px]" style={{ color: '#2E7D32' }}>正向差值</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="w-2.5 h-2.5 inline-block" style={{ backgroundColor: '#C62828', borderRadius: '1px' }} />
                        <span className="text-[8px]" style={{ color: '#C62828' }}>负向差值</span>
                      </div>
                      <span className="text-[8px] italic" style={{ color: '#8B8178' }}>修改左侧参数后差值自动更新，点击「确认修改」应用</span>
                    </>
                  )}
                </div>
                )}
              </div>
              {/* Drilldown Dialog (full-screen modal) */}
              <Dialog open={!!drilldownItemId} onOpenChange={(open) => { if (!open) setDrilldownItemId(null); }}>
                <DialogContent className="sm:max-w-none max-w-none p-0 gap-0 overflow-hidden flex flex-col" style={{ backgroundColor: '#FDFBF7', borderColor: '#5D4037', borderRadius: '4px', width: 'calc(100vw - 2rem)', height: '80vh' }}>
                  {drilldownItemId && DRILLDOWN_MAP[drilldownItemId] && (() => {
                    const entry = DRILLDOWN_MAP[drilldownItemId];
                    const DrillComponent = entry.component;
                    return (
                      <>
                        <DialogHeader className="px-0 py-0 space-y-0 flex-shrink-0">
                          <div className="flex items-center justify-between px-5 py-2.5 border-b" style={{ backgroundColor: '#5D4037', borderColor: '#4A3728' }}>
                            <DialogTitle className="text-sm font-bold" style={{ color: '#FFFFFF' }}>
                              {entry.title} - 计算逻辑详解
                            </DialogTitle>
                          </div>
                        </DialogHeader>
                        <div className="flex-1 overflow-y-auto px-6 py-4">
                          <DrillComponent result={result} factors={businessFactors} />
                        </div>
                      </>
                    );
                  })()}
                </DialogContent>
              </Dialog>
            </Card>
            
            {/* Right: Time Series Bar Chart (Lifecycle Seasoning Visualization) */}
            {!waterfallZoomed && (
            <Card
              className="border overflow-hidden flex flex-col"
              style={{ backgroundColor: '#FFFFFF', borderColor: '#5D4037', borderRadius: '2px' }}
            >
              <div 
                className="px-3 py-1.5 border-b flex items-center justify-between"
                style={{ backgroundColor: '#F5F0E8', borderColor: '#E5DFD6' }}
              >
                <span className="text-[11px] font-medium" style={{ color: '#4A3728' }}>
                  {activeDriver 
                    ? `${activeDriver.trim()} 生命周期 (Yr1-8)` 
                    : '生命周期曲线 (Yr1-8)'}
                  {selectedRiskLevel !== 'All' && ` - R${selectedRiskLevel}`}
                </span>
                {activeDriver ? (
                  <span 
                    className="text-[9px] px-1.5 py-0.5"
                    style={{ backgroundColor: '#C19A6B', color: '#FFFFFF', borderRadius: '2px' }}
                  >
                    {(() => {
                      const dk = activeDriver.trim();
                      if (dk === '风险成本') return 'J曲线';
                      if (dk === '获客成本') return 'Year1-Only';
                      if (['运营','欺诈','权益','运营成本','其他成本','资金成本','已用额度资金成本','未用额度资金成本'].includes(dk)) return '成本衰减';
                      return '收入衰减';
                    })()}
                  </span>
                ) : (
                  <span className="text-[9px]" style={{ color: '#8B8178' }}>
                    点击瀑布图切换
                  </span>
                )}
              </div>
              <div className="flex-1 min-h-0 p-2 pb-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={(() => {
                      // Generate time-series data filtered by risk level
                      const yearData = [];
                      const cac = selectedRiskLevel === 'All'
                        ? (result?.summary.cac || 0)
                        : (result?.riskLevelResults?.find(r => r.level === Number(selectedRiskLevel))?.cac || 0);
                      
                      for (let yr = 0; yr < 8; yr++) {
                        let interest = 0, installment = 0, nonInterest = 0, risk = 0, funding = 0, other = 0;
                        let nintInterchange = 0, nintAnnualFee = 0, nintCashAdvance = 0;
                        let otherOpex = 0, otherFraud = 0, otherRewards = 0;
                        let fundingUsed = 0, fundingUnused = 0;
                        for (const r of (result?.riskLevelResults || [])) {
                          if (selectedRiskLevel !== 'All' && r.level !== Number(selectedRiskLevel)) continue;
                          if (r.annualMetrics && r.annualMetrics[yr]) {
                            const m = r.annualMetrics[yr];
                            const pct = selectedRiskLevel === 'All'
                              ? (businessFactors.riskDistribution.find(d => d.level === r.level)?.percentage || 0)
                              : 1;
                            interest += m.interestIncome * pct;
                            installment += (m.installmentIncome || 0) * pct;
                            nonInterest += m.nonInterestIncome * pct;
                            nintInterchange += m.nintInterchange * pct;
                            nintAnnualFee += m.nintAnnualFee * pct;
                            nintCashAdvance += m.nintCashAdvance * pct;
                            risk += m.riskCost * pct;
                            funding += m.fundingCost * pct;
                            fundingUsed += (m.fundingCostUsed || 0) * pct;
                            fundingUnused += (m.fundingCostUnused || 0) * pct;
                            otherOpex += m.opexAmortized * pct;
                            otherFraud += m.fraudCost * pct;
                            otherRewards += m.rewardsCost * pct;
                            other += (m.opexAmortized + m.fraudCost + m.rewardsCost) * pct;
                          }
                        }
                        const income = interest + installment + nonInterest;
                        const cost = risk + funding + other;
                        
                        // Select value based on activeDriver
                        let value = income - cost;
                        let isCost = false;
                        const driverKey = activeDriver?.trim() || '';
                        
                        if (driverKey === '获客成本') {
                          value = yr === 0 ? cac : 0;
                          isCost = true;
                        } else if (driverKey === '循环收入' || driverKey === '利息收入' || driverKey === '生息收入') {
                          value = interest;
                        } else if (driverKey === '分期收入') {
                          value = installment;
                        } else if (driverKey === '非息收入') {
                          value = nonInterest;
                        } else if (driverKey === '回佣') {
                          value = nintInterchange;
                        } else if (driverKey === '年费') {
                          value = nintAnnualFee;
                        } else if (driverKey === '取现费') {
                          value = nintCashAdvance;
                        } else if (driverKey === '风险成本') {
                          value = risk;
                          isCost = true;
                        } else if (driverKey === '资金成本') {
                          value = funding;
                          isCost = true;
                        } else if (driverKey === '已用额度资金成本') {
                          value = fundingUsed;
                          isCost = true;
                        } else if (driverKey === '未用额度资金成本') {
                          value = fundingUnused;
                          isCost = true;
                        } else if (driverKey === '其他成本' || driverKey === '运营成本') {
                          value = other;
                          isCost = true;
                        } else if (driverKey === '运营') {
                          value = otherOpex;
                          isCost = true;
                        } else if (driverKey === '欺诈') {
                          value = otherFraud;
                          isCost = true;
                        } else if (driverKey === '权益') {
                          value = otherRewards;
                          isCost = true;
                        }
                        
                        yearData.push({ 
                          year: `Yr${yr + 1}`, 
                          value: Math.round(isCost ? -Math.abs(value) : value),
                          isCost,
                        });
                      }
                      return yearData;
                    })()}
                    margin={{ top: 10, right: 5, left: 0, bottom: 18 }}
                  >
                    <XAxis 
                      dataKey="year" 
                      tick={{ fontSize: 9, fill: '#6B5B4F' }}
                      axisLine={{ stroke: '#E5DFD6' }}
                      tickLine={false}
                      dy={4}
                    />
                    <YAxis 
                      tick={{ fontSize: 9, fill: '#6B5B4F', fontFamily: 'var(--font-jetbrains), monospace' }}
                      axisLine={{ stroke: '#E5DFD6' }}
                      tickLine={false}
                      tickFormatter={(v: number) => {
                        const abs = Math.abs(v);
                        if (abs >= 1000000) return `${(v / 1000000).toFixed(1)}M`;
                        if (abs >= 1000) return `${(v / 1000).toFixed(0)}k`;
                        if (abs >= 1) return `${v.toFixed(0)}`;
                        return `${v.toFixed(1)}`;
                      }}
                      width={42}
                    />
                    <RechartsTooltip 
                      formatter={(value: number) => [formatCurrency(Math.abs(value)), activeDriver?.trim() || '净PV']}
                      contentStyle={{ fontSize: 10, backgroundColor: '#FDF5E6', border: '1px solid #5D4037', fontFamily: 'var(--font-jetbrains), monospace', borderRadius: '2px' }}
                    />
                    <ReferenceLine y={0} stroke="#8B8178" strokeWidth={1.5} />
                    <Bar 
                      dataKey="value" 
                      radius={[2, 2, 0, 0]}
                    >
                      {(() => {
                        const dk = activeDriver?.trim() || '';
                        const isCostMetric = ['风险成本','资金成本','运营成本','其他成本','获客成本','运营','欺诈','权益'].includes(dk);
                        return [0,1,2,3,4,5,6,7].map((i) => (
                          <Cell key={`cell-${i}`} fill={isCostMetric ? '#A52A2A' : '#C19A6B'} />
                        ));
                      })()}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
            )}
          </div>
          </div>
          
          {/* ===== SCROLLING BODY: Four Core Analytics Tables ===== */}
          <div 
            ref={scrollBodyRef}
            onScroll={handleScrollBodyScroll}
            className="flex-1 overflow-y-auto p-3 space-y-3"
            style={{ backgroundColor: '#F5F0E8' }}
          >
            {/* Tabbed Group 1: Financial Tables */}
          <Card className="mb-4 border overflow-hidden" style={{ backgroundColor: '#FFFFFF', borderColor: '#5D4037', borderRadius: '2px' }}>
            <div 
              className="text-xs font-medium border-b flex items-center justify-between" 
              style={{ backgroundColor: '#5D4037', borderColor: '#5D4037', color: '#FFFFFF' }}
            >
              <div className="flex items-center">
                <button
                  onClick={() => setFinTab('breakdown')}
                  className="px-3 py-2 text-xs font-medium transition-colors"
                  style={{ 
                    backgroundColor: finTab === 'breakdown' ? '#4A3728' : 'transparent',
                    color: finTab === 'breakdown' ? '#FFFFFF' : '#D7CCC8',
                    borderBottom: finTab === 'breakdown' ? '2px solid #C19A6B' : '2px solid transparent',
                  }}
                >
                  财务明细
                </button>
                <button
                  onClick={() => setFinTab('timeseries')}
                  className="px-3 py-2 text-xs font-medium transition-colors"
                  style={{ 
                    backgroundColor: finTab === 'timeseries' ? '#4A3728' : 'transparent',
                    color: finTab === 'timeseries' ? '#FFFFFF' : '#D7CCC8',
                    borderBottom: finTab === 'timeseries' ? '2px solid #C19A6B' : '2px solid transparent',
                  }}
                >
                  时间分布
                </button>
              </div>
              {activeDriver && (
                <span className="text-[9px] px-1.5 py-0.5 mr-2" style={{ backgroundColor: 'rgba(193, 154, 107, 0.3)', borderRadius: '2px' }}>
                  联动: {activeDriver.trim()}
                </span>
              )}
            </div>
            {finTab === 'breakdown' && (
            <div className="overflow-x-auto">
              {(() => {
                // Compute weighted sub-totals from annualMetrics across all risk levels
                // biome-ignore lint/suspicious/noExplicitAny: dynamic field access
                const getWeightedAnnualSum = (field: string) => {
                  let total = 0;
                  for (const r of (result?.riskLevelResults || [])) {
                    const pct = businessFactors.riskDistribution.find(d => d.level === r.level)?.percentage || 0;
                    for (const m of (r.annualMetrics || [])) {
                      total += ((m as any)[field] as number || 0) * pct;
                    }
                  }
                  return total;
                };
                const sumNintInterchange = getWeightedAnnualSum('nintInterchange');
                const sumNintAnnualFee = getWeightedAnnualSum('nintAnnualFee');
                const sumNintCashAdvance = getWeightedAnnualSum('nintCashAdvance');
                const sumOtherOpex = getWeightedAnnualSum('opexAmortized');
                const sumOtherFraud = getWeightedAnnualSum('fraudCost');
                const sumOtherRewards = getWeightedAnnualSum('rewardsCost');

                // Per risk-level sub-totals
                // biome-ignore lint/suspicious/noExplicitAny: dynamic field access
                const getRiskAnnualSum = (r: any, field: string) => {
                  return (r.annualMetrics || []).reduce((s: number, m: any) => s + (m[field] as number || 0), 0);
                };

                const hdrStyle = { borderColor: '#E5DFD6', color: '#5D4037' };
                const hdr2Style = { borderColor: '#E5DFD6', color: '#6B5B4F', fontSize: '9px' };
                const cellMono = { fontFamily: 'var(--font-jetbrains), monospace' };
                // Section border styles for clear visual separation
                const secBorderL: Record<string, string> = { borderLeftWidth: '2px', borderLeftStyle: 'solid' };
                const secBorderR: Record<string, string> = { borderRightWidth: '2px', borderRightStyle: 'solid' };

                return (
              <table className="w-full text-xs" style={{ minWidth: '1280px' }}>
                <thead>
                  {/* Level 1: NPV | 收入(7 cols) | 成本(7 cols) | TV */}
                  <tr style={{ backgroundColor: '#F5F0E8' }}>
                    <th rowSpan={3} className="px-2 py-1 text-left font-medium border-b border-r sticky left-0 bg-[#F5F0E8]" style={{ ...hdrStyle, borderRightColor: '#D7CCC8' }}>等级</th>
                    <th rowSpan={3} className="px-2 py-1 text-right font-medium border-b border-r" style={{ ...hdrStyle, borderRightColor: '#D7CCC8' }}>分布%</th>
                    <th rowSpan={3} className="px-2 py-1 text-right font-medium border-b border-r" style={{ ...hdrStyle, ...secBorderR, borderRightColor: '#8B8178', ...(isColumnHighlighted('NPV') ? glowStyle : {}) }}>NPV</th>
                    <th colSpan={7} className="px-2 py-1 text-center font-medium border-b border-l border-r" style={{ ...hdrStyle, ...secBorderL, borderLeftColor: '#C19A6B', ...secBorderR, borderRightColor: '#C19A6B', backgroundColor: '#F9F3E8' }}>收入</th>
                    <th colSpan={9} className="px-2 py-1 text-center font-medium border-b border-l border-r" style={{ ...hdrStyle, ...secBorderL, borderLeftColor: '#A52A2A', ...secBorderR, borderRightColor: '#A52A2A', backgroundColor: '#F8F0F0' }}>成本</th>
                    {includeTerminalValue && (
                      <th rowSpan={3} className="px-2 py-1 text-right font-medium border-b border-l" style={{ ...hdrStyle, ...secBorderL, borderLeftColor: '#8B8178', ...(isColumnHighlighted('残值') ? glowStyle : {}) }}>残值</th>
                    )}
                  </tr>
                  {/* Level 2: 生息小计 | 生息明细(循环+分期) | 非息小计 | 非息明细(回佣+年费+取现费) | 获客|资金|风险 | 其他小计 | 其他明细(运营+欺诈+权益) */}
                  <tr style={{ backgroundColor: '#F5F0E8' }}>
                    <th rowSpan={2} className="px-2 py-1 text-right font-medium border-b border-l text-[10px]" style={{ ...hdrStyle, ...secBorderL, borderLeftColor: '#C19A6B', backgroundColor: '#F2ECE0', ...((isColumnHighlighted('循环') || isColumnHighlighted('分期')) ? glowStyle : {}) }}>生息小计</th>
                    <th colSpan={2} className="px-2 py-1 text-center font-medium border-b border-r text-[10px]" style={{ ...hdrStyle, borderRightColor: '#D7CCC8', ...((isColumnHighlighted('循环') || isColumnHighlighted('分期')) ? glowStyle : {}) }}>生息明细</th>
                    <th rowSpan={2} className="px-2 py-1 text-right font-medium border-b border-l text-[10px]" style={{ ...hdrStyle, backgroundColor: '#F2ECE0', borderLeftColor: '#D7CCC8', ...(isColumnHighlighted('非息') ? glowStyle : {}) }}>非息小计</th>
                    <th colSpan={3} className="px-2 py-1 text-center font-medium border-b border-r text-[10px]" style={{ ...hdrStyle, ...secBorderR, borderRightColor: '#C19A6B', ...((isColumnHighlighted('非息') || isColumnHighlighted('回佣') || isColumnHighlighted('年费') || isColumnHighlighted('取现费')) ? glowStyle : {}) }}>非息明细</th>
                    <th rowSpan={2} className="px-2 py-1 text-right font-medium border-b border-l text-[10px]" style={{ ...hdrStyle, ...secBorderL, borderLeftColor: '#A52A2A', ...(isColumnHighlighted('获客') ? glowStyle : {}) }}>获客</th>
                    <th rowSpan={2} className="px-2 py-1 text-right font-medium border-b border-l text-[10px]" style={{ ...hdrStyle, backgroundColor: '#F2ECEC', borderLeftColor: '#D7CCC8', ...(isColumnHighlighted('资金') ? glowStyle : {}) }}>资金小计</th>
                    <th colSpan={2} className="px-2 py-1 text-center font-medium border-b border-r text-[10px]" style={{ ...hdrStyle, borderRightColor: '#D7CCC8', ...(isColumnHighlighted('资金') ? glowStyle : {}) }}>资金明细</th>
                    <th rowSpan={2} className="px-2 py-1 text-right font-medium border-b border-r text-[10px]" style={{ ...hdrStyle, ...secBorderR, borderRightColor: '#D7CCC8', ...(isColumnHighlighted('风险') ? glowStyle : {}) }}>风险</th>
                    <th rowSpan={2} className="px-2 py-1 text-right font-medium border-b border-l text-[10px]" style={{ ...hdrStyle, backgroundColor: '#F2ECEC', borderLeftColor: '#D7CCC8', ...(isColumnHighlighted('运营') ? glowStyle : {}) }}>其他小计</th>
                    <th colSpan={3} className="px-2 py-1 text-center font-medium border-b border-r text-[10px]" style={{ ...hdrStyle, ...secBorderR, borderRightColor: '#A52A2A', ...((isColumnHighlighted('运营') || isColumnHighlighted('运营子') || isColumnHighlighted('欺诈子') || isColumnHighlighted('权益子')) ? glowStyle : {}) }}>其他明细</th>
                  </tr>
                  {/* Level 3: sub-items for 生息, 非息 and 其他 */}
                  <tr style={{ backgroundColor: '#FAFAF8' }}>
                    <th className="px-2 py-0.5 text-right border-b" style={{ ...hdr2Style, ...(isColumnHighlighted('循环') ? glowStyle : {}) }}>循环</th>
                    <th className="px-2 py-0.5 text-right border-b border-r" style={{ ...hdr2Style, borderRightColor: '#D7CCC8', ...(isColumnHighlighted('分期') ? glowStyle : {}) }}>分期</th>
                    <th className="px-2 py-0.5 text-right border-b" style={{ ...hdr2Style, ...(isColumnHighlighted('回佣') ? glowStyle : {}) }}>回佣</th>
                    <th className="px-2 py-0.5 text-right border-b" style={{ ...hdr2Style, ...(isColumnHighlighted('年费') ? glowStyle : {}) }}>年费</th>
                    <th className="px-2 py-0.5 text-right border-b border-r" style={{ ...hdr2Style, ...secBorderR, borderRightColor: '#C19A6B', ...(isColumnHighlighted('取现费') ? glowStyle : {}) }}>取现费</th>
                    <th className="px-2 py-0.5 text-right border-b" style={{ ...hdr2Style, ...(isColumnHighlighted('资金') ? glowStyle : {}) }}>已用</th>
                    <th className="px-2 py-0.5 text-right border-b border-r" style={{ ...hdr2Style, borderRightColor: '#D7CCC8', ...(isColumnHighlighted('资金') ? glowStyle : {}) }}>未用</th>
                    <th className="px-2 py-0.5 text-right border-b" style={{ ...hdr2Style, ...(isColumnHighlighted('运营子') ? glowStyle : {}) }}>运营</th>
                    <th className="px-2 py-0.5 text-right border-b" style={{ ...hdr2Style, ...(isColumnHighlighted('欺诈子') ? glowStyle : {}) }}>欺诈</th>
                    <th className="px-2 py-0.5 text-right border-b border-r" style={{ ...hdr2Style, ...secBorderR, borderRightColor: '#A52A2A', ...(isColumnHighlighted('权益子') ? glowStyle : {}) }}>权益</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Summary Row */}
                  <tr style={{ backgroundColor: '#FDF5E6' }}>
                    <td className="px-2 py-1.5 font-semibold border-b border-r sticky left-0 bg-[#FDF5E6]" style={{ borderColor: '#E5DFD6', color: '#4A3728', borderRightColor: '#D7CCC8' }}>汇总</td>
                    <td className="px-2 py-1.5 text-right font-medium border-b border-r" style={{ borderColor: '#E5DFD6', color: '#4A3728', ...cellMono, borderRightColor: '#D7CCC8' }}>{formatPercent(totalPercentage)}</td>
                    <td className="px-2 py-1.5 text-right font-semibold border-b border-r" style={{ borderColor: '#E5DFD6', ...secBorderR, borderRightColor: '#8B8178', color: (displayNPV || 0) >= 0 ? '#4C6B4C' : '#8B4C4C', ...cellMono, ...(isColumnHighlighted('NPV') ? glowStyle : {}) }}>
                      {formatCurrency(displayNPV || 0)}
                    </td>
                    <td className="px-2 py-1.5 text-right border-b border-l font-semibold" style={{ borderColor: '#E5DFD6', ...secBorderL, borderLeftColor: '#C19A6B', color: '#5D4037', backgroundColor: '#F9F5ED', ...cellMono, ...((isColumnHighlighted('循环') || isColumnHighlighted('分期')) ? glowStyle : {}) }}>{formatCurrency((result?.summary.interestIncome || 0) + (result?.pvComposition?.installmentIncome || 0))}</td>
                    <td className="px-2 py-1.5 text-right border-b" style={{ borderColor: '#E5DFD6', color: '#8B8178', ...cellMono, ...(isColumnHighlighted('循环') ? glowStyle : {}) }}>{formatCurrency(result?.summary.interestIncome || 0)}</td>
                    <td className="px-2 py-1.5 text-right border-b border-r" style={{ borderColor: '#E5DFD6', borderRightColor: '#D7CCC8', color: '#8B8178', ...cellMono, ...(isColumnHighlighted('分期') ? glowStyle : {}) }}>{formatCurrency(result?.pvComposition?.installmentIncome || 0)}</td>
                    <td className="px-2 py-1.5 text-right border-b border-l font-semibold" style={{ borderColor: '#E5DFD6', borderLeftColor: '#D7CCC8', color: '#5D4037', backgroundColor: '#F9F5ED', ...cellMono, ...(isColumnHighlighted('非息') ? glowStyle : {}) }}>{formatCurrency(result?.summary.nonInterestIncome || 0)}</td>
                    <td className="px-2 py-1.5 text-right border-b" style={{ borderColor: '#E5DFD6', color: '#8B8178', ...cellMono, ...((isColumnHighlighted('非息') || isColumnHighlighted('回佣')) ? glowStyle : {}) }}>{formatCurrency(sumNintInterchange)}</td>
                    <td className="px-2 py-1.5 text-right border-b" style={{ borderColor: '#E5DFD6', color: '#8B8178', ...cellMono, ...((isColumnHighlighted('非息') || isColumnHighlighted('年费')) ? glowStyle : {}) }}>{formatCurrency(sumNintAnnualFee)}</td>
                    <td className="px-2 py-1.5 text-right border-b border-r" style={{ borderColor: '#E5DFD6', ...secBorderR, borderRightColor: '#C19A6B', color: '#8B8178', ...cellMono, ...((isColumnHighlighted('非息') || isColumnHighlighted('取现费')) ? glowStyle : {}) }}>{formatCurrency(sumNintCashAdvance)}</td>
                    <td className="px-2 py-1.5 text-right border-b border-l" style={{ borderColor: '#E5DFD6', ...secBorderL, borderLeftColor: '#A52A2A', color: '#5D4037', ...cellMono, ...(isColumnHighlighted('获客') ? glowStyle : {}) }}>{formatCurrency(result?.summary.cac || 0)}</td>
                    <td className="px-2 py-1.5 text-right border-b border-l font-semibold" style={{ borderColor: '#E5DFD6', borderLeftColor: '#D7CCC8', color: '#5D4037', backgroundColor: '#F5F0F0', ...cellMono, ...(isColumnHighlighted('资金') ? glowStyle : {}) }}>{formatCurrency(result?.summary.fundingCost || 0)}</td>
                    <td className="px-2 py-1.5 text-right border-b" style={{ borderColor: '#E5DFD6', color: '#8B8178', ...cellMono, ...(isColumnHighlighted('资金') ? glowStyle : {}) }}>{formatCurrency(getWeightedAnnualSum('fundingCostUsed'))}</td>
                    <td className="px-2 py-1.5 text-right border-b border-r" style={{ borderColor: '#E5DFD6', borderRightColor: '#D7CCC8', color: '#8B8178', ...cellMono, ...(isColumnHighlighted('资金') ? glowStyle : {}) }}>{formatCurrency(getWeightedAnnualSum('fundingCostUnused'))}</td>
                    <td className="px-2 py-1.5 text-right border-b border-r" style={{ borderColor: '#E5DFD6', ...secBorderR, borderRightColor: '#D7CCC8', color: '#5D4037', ...cellMono, ...(isColumnHighlighted('风险') ? glowStyle : {}) }}>{formatCurrency(result?.summary.riskCost || 0)}</td>
                    <td className="px-2 py-1.5 text-right border-b border-l font-semibold" style={{ borderColor: '#E5DFD6', borderLeftColor: '#D7CCC8', color: '#5D4037', backgroundColor: '#F5F0F0', ...cellMono, ...(isColumnHighlighted('运营') ? glowStyle : {}) }}>{formatCurrency(result?.summary.opexAndOther || 0)}</td>
                    <td className="px-2 py-1.5 text-right border-b" style={{ borderColor: '#E5DFD6', color: '#8B8178', ...cellMono, ...((isColumnHighlighted('运营') || isColumnHighlighted('运营子')) ? glowStyle : {}) }}>{formatCurrency(sumOtherOpex)}</td>
                    <td className="px-2 py-1.5 text-right border-b" style={{ borderColor: '#E5DFD6', color: '#8B8178', ...cellMono, ...((isColumnHighlighted('运营') || isColumnHighlighted('欺诈子')) ? glowStyle : {}) }}>{formatCurrency(sumOtherFraud)}</td>
                    <td className="px-2 py-1.5 text-right border-b border-r" style={{ borderColor: '#E5DFD6', ...secBorderR, borderRightColor: '#A52A2A', color: '#8B8178', ...cellMono, ...((isColumnHighlighted('运营') || isColumnHighlighted('权益子')) ? glowStyle : {}) }}>{formatCurrency(sumOtherRewards)}</td>
                    {includeTerminalValue && (
                      <td className="px-2 py-1.5 text-right border-b border-l" style={{ borderColor: '#E5DFD6', ...secBorderL, borderLeftColor: '#8B8178', color: '#5D4037', ...cellMono, ...(isColumnHighlighted('残值') ? glowStyle : {}) }}>{formatCurrency(result?.summary.terminalValue || 0)}</td>
                    )}
                  </tr>
                  {/* Risk Level Rows */}
                  {result?.riskLevelResults.map((r) => {
                    const adjustedNPV = includeTerminalValue ? r.npv : r.npv - (r.terminalValue || 0);
                    const distribution = businessFactors.riskDistribution.find(d => d.level === r.level)?.percentage || 0;
                    const isGrayed = distribution === 0;
                    const rNintInterchange = getRiskAnnualSum(r, 'nintInterchange');
                    const rNintAnnualFee = getRiskAnnualSum(r, 'nintAnnualFee');
                    const rNintCashAdvance = getRiskAnnualSum(r, 'nintCashAdvance');
                    const rOpex = getRiskAnnualSum(r, 'opexAmortized');
                    const rFraud = getRiskAnnualSum(r, 'fraudCost');
                    const rRewards = getRiskAnnualSum(r, 'rewardsCost');
                    return (
                      <tr 
                        key={r.level} 
                        className="hover:bg-[#FAFAF8]"
                        style={{ opacity: isGrayed ? 0.3 : 1 }}
                      >
                        <td className="px-2 py-1.5 font-medium border-b border-r sticky left-0 bg-white" style={{ borderColor: '#E5DFD6', color: '#5D4037', borderRightColor: '#D7CCC8' }}>R{r.level}</td>
                        <td className="px-2 py-1.5 text-right border-b border-r" style={{ borderColor: '#E5DFD6', color: isGrayed ? '#A0978E' : '#4A3728', ...cellMono, borderRightColor: '#D7CCC8' }}>{formatPercent(distribution)}</td>
                        <td className="px-2 py-1.5 text-right border-b border-r" style={{ borderColor: '#E5DFD6', ...secBorderR, borderRightColor: '#8B8178', color: isGrayed ? '#A0978E' : adjustedNPV >= 0 ? '#4C6B4C' : '#8B4C4C', ...cellMono, ...(isColumnHighlighted('NPV') ? glowStyle : {}) }}>
                          {formatCurrency(adjustedNPV || 0)}
                        </td>
                        <td className="px-2 py-1.5 text-right border-b border-l font-medium" style={{ borderColor: '#E5DFD6', ...secBorderL, borderLeftColor: '#C19A6B', color: '#6B5B4F', backgroundColor: '#FDFAF4', ...cellMono, ...((isColumnHighlighted('循环') || isColumnHighlighted('分期')) ? glowStyle : {}) }}>{formatCurrency((r.interestIncome || 0) + getRiskAnnualSum(r, 'installmentIncome'))}</td>
                        <td className="px-2 py-1.5 text-right border-b" style={{ borderColor: '#E5DFD6', color: '#9E9489', ...cellMono, ...(isColumnHighlighted('循环') ? glowStyle : {}) }}>{formatCurrency(r.interestIncome || 0)}</td>
                        <td className="px-2 py-1.5 text-right border-b border-r" style={{ borderColor: '#E5DFD6', borderRightColor: '#D7CCC8', color: '#9E9489', ...cellMono, ...(isColumnHighlighted('分期') ? glowStyle : {}) }}>{formatCurrency(getRiskAnnualSum(r, 'installmentIncome'))}</td>
                        <td className="px-2 py-1.5 text-right border-b border-l font-medium" style={{ borderColor: '#E5DFD6', borderLeftColor: '#D7CCC8', color: '#6B5B4F', backgroundColor: '#FDFAF4', ...cellMono, ...(isColumnHighlighted('非息') ? glowStyle : {}) }}>{formatCurrency(r.nonInterestIncome || 0)}</td>
                        <td className="px-2 py-1.5 text-right border-b" style={{ borderColor: '#E5DFD6', color: '#9E9489', ...cellMono, ...((isColumnHighlighted('非息') || isColumnHighlighted('回佣')) ? glowStyle : {}) }}>{formatCurrency(rNintInterchange)}</td>
                        <td className="px-2 py-1.5 text-right border-b" style={{ borderColor: '#E5DFD6', color: '#9E9489', ...cellMono, ...((isColumnHighlighted('非息') || isColumnHighlighted('年费')) ? glowStyle : {}) }}>{formatCurrency(rNintAnnualFee)}</td>
                        <td className="px-2 py-1.5 text-right border-b border-r" style={{ borderColor: '#E5DFD6', ...secBorderR, borderRightColor: '#C19A6B', color: '#9E9489', ...cellMono, ...((isColumnHighlighted('非息') || isColumnHighlighted('取现费')) ? glowStyle : {}) }}>{formatCurrency(rNintCashAdvance)}</td>
                        <td className="px-2 py-1.5 text-right border-b border-l" style={{ borderColor: '#E5DFD6', ...secBorderL, borderLeftColor: '#A52A2A', color: '#6B5B4F', ...cellMono, ...(isColumnHighlighted('获客') ? glowStyle : {}) }}>{formatCurrency(r.cac || 0)}</td>
                        <td className="px-2 py-1.5 text-right border-b border-l font-medium" style={{ borderColor: '#E5DFD6', borderLeftColor: '#D7CCC8', color: '#6B5B4F', backgroundColor: '#FAF5F5', ...cellMono, ...(isColumnHighlighted('资金') ? glowStyle : {}) }}>{formatCurrency(r.fundingCost || 0)}</td>
                        <td className="px-2 py-1.5 text-right border-b" style={{ borderColor: '#E5DFD6', color: '#9E9489', ...cellMono, ...(isColumnHighlighted('资金') ? glowStyle : {}) }}>{formatCurrency(getRiskAnnualSum(r, 'fundingCostUsed'))}</td>
                        <td className="px-2 py-1.5 text-right border-b border-r" style={{ borderColor: '#E5DFD6', borderRightColor: '#D7CCC8', color: '#9E9489', ...cellMono, ...(isColumnHighlighted('资金') ? glowStyle : {}) }}>{formatCurrency(getRiskAnnualSum(r, 'fundingCostUnused'))}</td>
                        <td className="px-2 py-1.5 text-right border-b border-r" style={{ borderColor: '#E5DFD6', ...secBorderR, borderRightColor: '#D7CCC8', color: '#6B5B4F', ...cellMono, ...(isColumnHighlighted('风险') ? glowStyle : {}) }}>{formatCurrency(r.riskCost || 0)}</td>
                        <td className="px-2 py-1.5 text-right border-b border-l font-medium" style={{ borderColor: '#E5DFD6', borderLeftColor: '#D7CCC8', color: '#6B5B4F', backgroundColor: '#FAF5F5', ...cellMono, ...(isColumnHighlighted('运营') ? glowStyle : {}) }}>{formatCurrency(rOpex + rFraud + rRewards)}</td>
                        <td className="px-2 py-1.5 text-right border-b" style={{ borderColor: '#E5DFD6', color: '#9E9489', ...cellMono, ...((isColumnHighlighted('运营') || isColumnHighlighted('运营子')) ? glowStyle : {}) }}>{formatCurrency(rOpex)}</td>
                        <td className="px-2 py-1.5 text-right border-b" style={{ borderColor: '#E5DFD6', color: '#9E9489', ...cellMono, ...((isColumnHighlighted('运营') || isColumnHighlighted('欺诈子')) ? glowStyle : {}) }}>{formatCurrency(rFraud)}</td>
                        <td className="px-2 py-1.5 text-right border-b border-r" style={{ borderColor: '#E5DFD6', ...secBorderR, borderRightColor: '#A52A2A', color: '#9E9489', ...cellMono, ...((isColumnHighlighted('运营') || isColumnHighlighted('权益子')) ? glowStyle : {}) }}>{formatCurrency(rRewards)}</td>
                        {includeTerminalValue && (
                          <td className="px-2 py-1.5 text-right border-b border-l" style={{ borderColor: '#E5DFD6', ...secBorderL, borderLeftColor: '#8B8178', color: '#6B5B4F', ...cellMono, ...(isColumnHighlighted('残值') ? glowStyle : {}) }}>{formatCurrency(r.terminalValue || 0)}</td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
                );
              })()}
            </div>
            )}
            {finTab === 'timeseries' && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs" style={{ minWidth: '700px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#F5F0E8' }}>
                    <th className="px-2 py-1.5 text-left font-medium border-b sticky left-0 bg-[#F5F0E8]" style={{ borderColor: '#E5DFD6', color: '#5D4037' }}>等级</th>
                    <th className="px-2 py-1.5 text-right font-medium border-b" style={{ borderColor: '#E5DFD6', color: '#5D4037' }}>分布%</th>
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(yr => (
                      <th key={yr} className="px-2 py-1.5 text-right font-medium border-b" style={{ borderColor: '#E5DFD6', color: '#5D4037' }}>Yr{yr}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {/* Summary Row */}
                  <tr style={{ backgroundColor: '#FDF5E6' }}>
                    <td className="px-2 py-1.5 font-semibold border-b sticky left-0 bg-[#FDF5E6]" style={{ borderColor: '#E5DFD6', color: '#4A3728' }}>汇总</td>
                    <td className="px-2 py-1.5 text-right font-medium border-b" style={{ borderColor: '#E5DFD6', color: '#4A3728', fontFamily: 'var(--font-jetbrains), monospace' }}>{formatPercent(totalPercentage)}</td>
                    {[0, 1, 2, 3, 4, 5, 6, 7].map(yr => {
                      let yearTotal = 0;
                      for (const r of (result?.riskLevelResults || [])) {
                        const pct = businessFactors.riskDistribution.find(d => d.level === r.level)?.percentage || 0;
                        if (r.annualMetrics && r.annualMetrics[yr]) {
                          const m = r.annualMetrics[yr];
                          if (activeDriver === '循环收入' || activeDriver === '利息收入' || activeDriver === '生息收入') yearTotal += (m.interestIncome + (m.installmentIncome || 0)) * pct;
                          else if (activeDriver === '分期收入') yearTotal += (m.installmentIncome || 0) * pct;
                          else if (activeDriver === '非息收入') yearTotal += m.nonInterestIncome * pct;
                          else if (activeDriver === '风险成本') yearTotal += m.riskCost * pct;
                          else if (activeDriver === '资金成本') yearTotal += m.fundingCost * pct;
                          else if (activeDriver === '已用额度资金成本') yearTotal += (m.fundingCostUsed || 0) * pct;
                          else if (activeDriver === '未用额度资金成本') yearTotal += (m.fundingCostUnused || 0) * pct;
                          else yearTotal += (m.interestIncome + (m.installmentIncome || 0) + m.nonInterestIncome - m.riskCost - m.fundingCost - m.opexAmortized - m.fraudCost - m.rewardsCost) * pct;
                        }
                      }
                      return (
                        <td key={yr} className="px-2 py-1.5 text-right border-b" style={{ borderColor: '#E5DFD6', color: yearTotal >= 0 ? '#4C6B4C' : '#8B4C4C', fontFamily: 'var(--font-jetbrains), monospace' }}>
                          {formatCurrency(Math.round(yearTotal))}
                        </td>
                      );
                    })}
                  </tr>
                  {/* Risk Level Rows */}
                  {result?.riskLevelResults.map((r) => {
                    const distribution = businessFactors.riskDistribution.find(d => d.level === r.level)?.percentage || 0;
                    const isGrayed = distribution === 0;
                    return (
                      <tr 
                        key={r.level} 
                        className="hover:bg-[#FAFAF8]"
                        style={{ opacity: isGrayed ? 0.3 : 1 }}
                      >
                        <td className="px-2 py-1.5 font-medium border-b sticky left-0 bg-white" style={{ borderColor: '#E5DFD6', color: '#5D4037' }}>R{r.level}</td>
                        <td className="px-2 py-1.5 text-right border-b" style={{ borderColor: '#E5DFD6', color: isGrayed ? '#A0978E' : '#4A3728', fontFamily: 'var(--font-jetbrains), monospace' }}>{formatPercent(distribution)}</td>
                        {r.annualMetrics?.map((m, i) => {
                          let val = 0;
                          if (activeDriver === '循环收入' || activeDriver === '利息收入' || activeDriver === '生息收入') val = m.interestIncome + (m.installmentIncome || 0);
                          else if (activeDriver === '分期收入') val = m.installmentIncome || 0;
                          else if (activeDriver === '非息收入') val = m.nonInterestIncome;
                          else if (activeDriver === '风险成本') val = m.riskCost;
                          else if (activeDriver === '资金成本') val = m.fundingCost;
                          else if (activeDriver === '已用额度资金成本') val = m.fundingCostUsed || 0;
                          else if (activeDriver === '未用额度资金成本') val = m.fundingCostUnused || 0;
                          else val = m.interestIncome + (m.installmentIncome || 0) + m.nonInterestIncome - m.riskCost - m.fundingCost - m.opexAmortized - m.fraudCost - m.rewardsCost;
                          return (
                            <td key={i} className="px-2 py-1.5 text-right border-b" style={{ borderColor: '#E5DFD6', color: '#6B5B4F', fontFamily: 'var(--font-jetbrains), monospace' }}>
                              {formatCurrency(Math.round(val))}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            )}
          </Card>
          
          {/* Parameter Tables - Compact button */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowParamDialog(true)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-medium border transition-colors hover:opacity-90"
              style={{ backgroundColor: '#5D4037', color: '#FFFFFF', borderColor: '#5D4037', borderRadius: '2px' }}
            >
              <Table2 className="w-3 h-3" />
              参数细节
            </button>
            {activeDriver && (
              <span className="text-[9px] px-1.5 py-0.5" style={{ backgroundColor: '#F5F0E8', color: '#4A3728', borderRadius: '2px', border: '1px solid #E5DFD6' }}>
                联动: {activeDriver.trim()}
              </span>
            )}
          </div>

          {/* 参数细节 Dialog */}
          <Dialog open={showParamDialog} onOpenChange={setShowParamDialog}>
            <DialogContent className="sm:max-w-none max-w-none p-0 gap-0 overflow-hidden flex flex-col" style={{ backgroundColor: '#FDFBF7', borderColor: '#5D4037', borderRadius: '4px', width: 'calc(100vw - 2rem)', height: '62vh' }}>
              <DialogHeader className="px-0 py-0 space-y-0 flex-shrink-0">
                <div className="flex items-center justify-between" style={{ backgroundColor: '#5D4037', color: '#FFFFFF' }}>
                  <div className="flex items-center">
                    <span className="px-4 py-2.5 text-xs font-bold tracking-wide">参数细节</span>
                    <div className="h-4 w-px" style={{ backgroundColor: '#8B7355' }} />
                    {(['static', 'trends'] as const).map(tab => (
                      <button
                        key={tab}
                        onClick={() => setParamTab(tab)}
                        className="px-3 py-2.5 text-[11px] font-medium transition-colors"
                        style={{
                          backgroundColor: paramTab === tab ? '#4A3728' : 'transparent',
                          color: paramTab === tab ? '#FFFFFF' : '#D7CCC8',
                          borderBottom: paramTab === tab ? '2px solid #C19A6B' : '2px solid transparent',
                        }}
                      >
                        {tab === 'static' ? '静态参数' : '动态趋势'}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 pr-10">
                    <span className="text-[9px]" style={{ color: '#D7CCC8' }}>PV子项:</span>
                    <select
                      value={paramPvItem || ''}
                      onChange={e => setParamPvItem(e.target.value || null)}
                      className="text-[10px] px-1.5 py-0.5 border"
                      style={{ backgroundColor: '#4A3728', color: '#FFFFFF', borderColor: '#8B7355', borderRadius: '2px' }}
                    >
                      <option value="">全部(无高亮)</option>
                      {['生息收入','循环收入','分期收入','非息收入','回佣','年费','取现费','获客成本','资金成本','已用额度资金成本','未用额度资金成本','风险成本','其他成本','运营','欺诈','权益','残值'].map(item => (
                        <option key={item} value={item}>{item}</option>
                      ))}
                    </select>
                    {paramPvItem && (
                      <button onClick={() => setParamPvItem(null)} className="text-[9px] px-1 hover:opacity-70" style={{ color: '#D7CCC8' }}>x</button>
                    )}
                  </div>
                </div>
                <DialogTitle className="sr-only">参数细节</DialogTitle>
              </DialogHeader>

              {/* Toolbar */}
              <div className="flex items-center justify-between px-4 py-2 border-b flex-shrink-0" style={{ borderColor: '#E5DFD6', backgroundColor: '#F5F0E8' }}>
                {paramTab === 'static' ? (
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] font-medium mr-1" style={{ color: '#5D4037' }}>数值模式:</span>
                    {(['weighted', 'max', 'min'] as const).map(mode => (
                      <button
                        key={mode}
                        onClick={() => setParamStaticMode(mode)}
                        className="text-[10px] px-2 py-0.5 border transition-colors"
                        style={{
                          backgroundColor: paramStaticMode === mode ? '#5D4037' : '#FFFFFF',
                          color: paramStaticMode === mode ? '#FFFFFF' : '#5D4037',
                          borderColor: paramStaticMode === mode ? '#5D4037' : '#D7CCC8',
                          borderRadius: '2px',
                        }}
                      >
                        {mode === 'weighted' ? '加权平均' : mode === 'max' ? '最大值' : '最小值'}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] font-medium mr-1" style={{ color: '#5D4037' }}>风险等级:</span>
                    <select
                      value={paramTrendGrade}
                      onChange={e => setParamTrendGrade(e.target.value)}
                      className="text-[10px] px-1.5 py-0.5 border"
                      style={{ backgroundColor: '#FFFFFF', borderColor: '#D7CCC8', borderRadius: '2px', color: '#5D4037' }}
                    >
                      <option value="加权">加权平均</option>
                      {businessFactors.riskDistribution.map(rd => (
                        <option key={rd.level} value={`R${rd.level}`} disabled={rd.percentage === 0}>
                          R{rd.level} ({(rd.percentage * 100).toFixed(0)}%)
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                {paramPvItem && (
                  <span className="text-[9px] px-2 py-0.5" style={{ backgroundColor: '#C19A6B', color: '#FFFFFF', borderRadius: '2px' }}>
                    高亮: {paramPvItem}相关参数
                  </span>
                )}
              </div>

              {/* Table content */}
              <div className="flex-1 overflow-auto">
                {paramTab === 'static' && (() => {
                  const rows = detailMetrics.static;
                  const glHL = { backgroundColor: 'rgba(193, 154, 107, 0.15)', boxShadow: 'inset 0 0 0 1px rgba(193, 154, 107, 0.4)' };
                  // For max/min modes, compute per column
                  const dataRows = rows.slice(1); // skip weighted row
                  const activeRows = dataRows.filter(r => r.distribution > 0);
                  const cols: { key: keyof GradeDetailRow; label: string; hlKey: string; fmt: (v: number) => string }[] = [
                    { key: 'distribution', label: '分布%', hlKey: '分布%', fmt: formatPercent },
                    { key: 'limit', label: '额度', hlKey: '额度', fmt: formatCurrency },
                    { key: 'churnRate', label: '流失率', hlKey: '流失率', fmt: formatPercent },
                    { key: 'activeRate', label: '活跃率', hlKey: '活跃率', fmt: formatPercent },
                    { key: 'utilRate', label: '额度使用率', hlKey: '额度使用率', fmt: formatPercent },
                    { key: 'balance', label: '未偿还余额', hlKey: '未偿还余额', fmt: formatCurrency },
                    { key: 'spendAmt', label: '消费额', hlKey: '消费额', fmt: formatCurrency },
                    { key: 'interestBearingRate', label: '生息率', hlKey: '生息率', fmt: formatPercent },
                    { key: 'installmentRate', label: '分期率', hlKey: '分期率', fmt: formatPercent },
                    { key: 'installmentAmt', label: '分期额', hlKey: '分期额', fmt: formatCurrency },
                    { key: 'revolvingRate', label: '循环率', hlKey: '循环率', fmt: formatPercent },
                    { key: 'revolvingAmt', label: '循环额', hlKey: '循环额', fmt: formatCurrency },
                    { key: 'cashAmt', label: '取现金额', hlKey: '取现金额', fmt: formatCurrency },
                    { key: 'pd', label: 'PD', hlKey: 'PD', fmt: formatPercent },
                    { key: 'severity', label: 'Severity', hlKey: 'Severity', fmt: formatPercent },
                  ];
                  // Compute summary row based on mode
                  const summaryRow: { [k: string]: number } = {};
                  for (const col of cols) {
                    const vals = activeRows.map(r => r[col.key] as number);
                    if (paramStaticMode === 'weighted') {
                      summaryRow[col.key + col.label] = rows[0][col.key] as number; // weighted is first row
                    } else if (paramStaticMode === 'max') {
                      summaryRow[col.key + col.label] = vals.length > 0 ? Math.max(...vals) : 0;
                    } else {
                      summaryRow[col.key + col.label] = vals.length > 0 ? Math.min(...vals) : 0;
                    }
                  }
                  const mono = { fontFamily: 'var(--font-jetbrains), monospace' };
                  return (
                    <div className="overflow-x-auto">
                      <table className="w-full text-[11px]">
                        <thead>
                          <tr style={{ backgroundColor: '#F5F0E8' }}>
                            <th className="px-2 py-2 text-left font-semibold border-b sticky left-0 bg-[#F5F0E8] z-10" style={{ borderColor: '#E5DFD6', color: '#5D4037', minWidth: '50px' }}>等级</th>
                            {cols.map((col, ci) => (
                              <th key={ci} className="px-2 py-2 text-right font-medium border-b whitespace-nowrap" style={{ borderColor: '#E5DFD6', color: '#5D4037', ...(isParamColHL(col.hlKey) ? glHL : {}) }}>
                                {col.label}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {/* Summary row */}
                          <tr style={{ backgroundColor: '#FDF5E6' }}>
                            <td className="px-2 py-2 font-bold border-b sticky left-0 bg-[#FDF5E6] z-10" style={{ borderColor: '#D7CCC8', color: '#4A3728' }}>
                              {paramStaticMode === 'weighted' ? '加权' : paramStaticMode === 'max' ? '最大' : '最小'}
                            </td>
                            {cols.map((col, ci) => (
                              <td key={ci} className="px-2 py-2 text-right font-semibold border-b" style={{ borderColor: '#D7CCC8', color: '#4A3728', ...mono, ...(isParamColHL(col.hlKey) ? glHL : {}) }}>
                                {col.fmt(summaryRow[col.key + col.label] || 0)}
                              </td>
                            ))}
                          </tr>
                          {/* Per-grade rows */}
                          {dataRows.map((row, ri) => {
                            const isGrayed = row.distribution === 0;
                            return (
                              <tr key={ri} className="hover:bg-[#FAFAF8]" style={{ opacity: isGrayed ? 0.3 : 1 }}>
                                <td className="px-2 py-1.5 font-medium border-b sticky left-0 bg-white z-10" style={{ borderColor: '#E5DFD6', color: '#5D4037' }}>{row.grade}</td>
                                {cols.map((col, ci) => (
                                  <td key={ci} className="px-2 py-1.5 text-right border-b" style={{ borderColor: '#E5DFD6', color: '#6B5B4F', ...mono, ...(isParamColHL(col.hlKey) ? glHL : {}) }}>
                                    {col.fmt(row[col.key] as number)}
                                  </td>
                                ))}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  );
                })()}

                {paramTab === 'trends' && (() => {
                  const glHL = { backgroundColor: 'rgba(193, 154, 107, 0.15)', boxShadow: 'inset 0 0 0 1px rgba(193, 154, 107, 0.4)' };
                  const mono = { fontFamily: 'var(--font-jetbrains), monospace' };
                  // Get trend data for selected grade
                  let trendYears: GradeDetailRow[] = [];
                  if (paramTrendGrade === '加权') {
                    // Weighted average across all grades
                    const allTrends = detailMetrics.trends;
                    for (let yr = 0; yr < 8; yr++) {
                      const weighted: GradeDetailRow = {
  grade: '加权', distribution: 0, limit: 0, churnRate: 0, activeRate: 0, utilRate: 0,
  balance: 0, spendAmt: 0, revolvingRate: 0, installmentRate: 0, interestBearingRate: 0, installmentAmt: 0,
  revolvingAmt: 0, cashAmt: 0, pd: 0, severity: 0,
                      };
                      for (const gt of allTrends) {
                        const yrData = gt.years[yr];
                        if (!yrData || yrData.distribution === 0) continue;
                        const w = yrData.distribution;
                        weighted.distribution += w;
                        weighted.limit += yrData.limit * w;
                        weighted.churnRate += yrData.churnRate * w;
                        weighted.activeRate += yrData.activeRate * w;
                        weighted.utilRate += yrData.utilRate * w;
                        weighted.balance += yrData.balance * w;
                        weighted.spendAmt += yrData.spendAmt * w;
  weighted.revolvingRate += yrData.revolvingRate * w;
  weighted.installmentRate += yrData.installmentRate * w;
  weighted.interestBearingRate += yrData.interestBearingRate * w;
                        weighted.installmentAmt += yrData.installmentAmt * w;
                        weighted.revolvingAmt += yrData.revolvingAmt * w;
                        weighted.cashAmt += yrData.cashAmt * w;
                        weighted.pd += yrData.pd * w;
                        weighted.severity += yrData.severity * w;
                      }
                      trendYears.push(weighted);
                    }
                  } else {
                    const gt = detailMetrics.trends.find(t => t.grade === paramTrendGrade);
                    trendYears = gt ? gt.years : [];
                  }

                  const paramRows: { label: string; hlKey: string; key: keyof GradeDetailRow; fmt: (v: number) => string }[] = [
                    { label: '流失率', hlKey: '流失率', key: 'churnRate', fmt: formatPercent },
                    { label: '活跃率', hlKey: '活跃率', key: 'activeRate', fmt: formatPercent },
                    { label: '额度使用率', hlKey: '额度使用率', key: 'utilRate', fmt: formatPercent },
                    { label: '未偿还余额', hlKey: '未偿还余额', key: 'balance', fmt: formatCurrency },
                    { label: '消费额', hlKey: '消费额', key: 'spendAmt', fmt: formatCurrency },
                    { label: '生息率', hlKey: '生息率', key: 'interestBearingRate', fmt: formatPercent },
                    { label: '分期率', hlKey: '分期率', key: 'installmentRate', fmt: formatPercent },
                    { label: '分期额', hlKey: '分期额', key: 'installmentAmt', fmt: formatCurrency },
                    { label: '循环率', hlKey: '循环率', key: 'revolvingRate', fmt: formatPercent },
                    { label: '循环额', hlKey: '循环额', key: 'revolvingAmt', fmt: formatCurrency },
                    { label: '取现金额', hlKey: '取现金额', key: 'cashAmt', fmt: formatCurrency },
                    { label: 'PD', hlKey: 'PD', key: 'pd', fmt: formatPercent },
                    { label: 'Severity', hlKey: 'Severity', key: 'severity', fmt: formatPercent },
                  ];

                  return (
                    <div className="overflow-x-auto">
                      <table className="w-full text-[11px]">
                        <thead>
                          <tr style={{ backgroundColor: '#F5F0E8' }}>
                            <th className="px-3 py-2 text-left font-semibold border-b sticky left-0 bg-[#F5F0E8] z-10" style={{ borderColor: '#E5DFD6', color: '#5D4037', minWidth: '100px' }}>参数</th>
                            {[1,2,3,4,5,6,7,8].map(yr => (
                              <th key={yr} className="px-2 py-2 text-right font-medium border-b" style={{ borderColor: '#E5DFD6', color: '#5D4037' }}>Yr{yr}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {paramRows.map((pr, ri) => {
                            const hl = isParamColHL(pr.hlKey);
                            return (
                              <tr key={ri} className="hover:bg-[#FAFAF8]" style={hl ? glHL : {}}>
                                <td className="px-3 py-1.5 font-medium border-b sticky left-0 bg-white z-10" style={{ borderColor: '#E5DFD6', color: '#5D4037', ...(hl ? glHL : {}) }}>{pr.label}</td>
                                {trendYears.map((yr, yi) => (
                                  <td key={yi} className="px-2 py-1.5 text-right border-b" style={{ borderColor: '#E5DFD6', color: '#6B5B4F', ...mono, ...(hl ? { backgroundColor: 'rgba(193, 154, 107, 0.08)' } : {}) }}>
                                    {pr.fmt(yr[pr.key] as number)}
                                  </td>
                                ))}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  );
                })()}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
        </div>
    </TooltipProvider>
  );
}



// Collapsible Section Component with Dark Header when Expanded
function CollapsibleSection({
  title,
  expanded,
  onToggle,
  children,
}: {
  title: string;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <Card 
      className="border overflow-hidden" 
      style={{ 
        backgroundColor: '#FFFFFF', 
        borderColor: '#5D4037',
        borderRadius: '2px',
      }}
    >
      <button
        onClick={onToggle}
        className="w-full px-3 py-2 flex items-center justify-between text-left transition-colors"
        style={{ 
          backgroundColor: expanded ? '#5D4037' : '#F5F0E8',
        }}
      >
        <span 
          className="text-xs font-medium" 
          style={{ color: expanded ? '#FFFFFF' : '#4A3728' }}
        >
          {title}
        </span>
        {expanded ? (
          <ChevronUp className="w-3.5 h-3.5" style={{ color: expanded ? '#FFFFFF' : '#8B8178' }} />
        ) : (
          <ChevronDown className="w-3.5 h-3.5" style={{ color: '#8B8178' }} />
        )}
      </button>
      {expanded && (
        <div className="p-3">
          {children}
        </div>
      )}
    </Card>
  );
}

// Mini Input Component with JetBrains Mono
function MiniInput({
  label,
  value,
  prefix,
  suffix,
  onChange,
  highlighted,
  step,
  tooltip,
}: {
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
  onChange: (v: number) => void;
  highlighted?: boolean;
  step?: number;
  tooltip?: { desc: string; formula?: string };
}) {
  const displayValue = parseFloat(value.toPrecision(10));
  return (
    <div className={highlighted ? 'animate-maillard-breathe rounded p-1 -m-1' : ''}>
      <label className="flex items-center gap-0.5 text-[10px] mb-0.5" style={{ color: '#6B5B4F' }}>
        {label}
        {tooltip && (
          <TooltipProvider delayDuration={200}>
            <LucideTooltip>
              <TooltipTrigger asChild>
                <Info className="w-2.5 h-2.5 cursor-help flex-shrink-0" style={{ color: '#B0A898' }} />
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-[240px] p-2" style={{ backgroundColor: '#3E2723', color: '#F5F0E8', borderRadius: '3px', border: 'none', zIndex: 60 }}>
                <div className="text-[10px] leading-relaxed">{tooltip.desc}</div>
                {tooltip.formula && (
                  <div className="text-[9px] mt-1 pt-1 border-t font-mono leading-relaxed" style={{ borderColor: '#5D4037', color: '#D7CCC8' }}>
                    {tooltip.formula}
                  </div>
                )}
              </TooltipContent>
            </LucideTooltip>
          </TooltipProvider>
        )}
      </label>
      <div className="relative">
        {prefix && (
          <span
            className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[10px]"
            style={{ color: '#8B8178', fontFamily: 'var(--font-jetbrains), monospace' }}
          >
            {prefix}
          </span>
        )}
        <Input
          type="number"
          value={displayValue}
          step={step}
          onChange={(e) => onChange(Number(e.target.value))}
          className="text-xs h-7"
          style={{
            backgroundColor: '#FFFFFF',
            borderColor: '#E5DFD6',
            borderRadius: '2px',
            paddingLeft: prefix ? '18px' : '6px',
            paddingRight: suffix ? '22px' : '6px',
            fontFamily: 'var(--font-jetbrains), monospace',
          }}
        />
        {suffix && (
          <span
            className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px]"
            style={{ color: '#8B8178', fontFamily: 'var(--font-jetbrains), monospace' }}
          >
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

// Mini Slider Component with JetBrains Mono and optional hint from real data
function MiniSlider({
  label,
  value,
  onChange,
  highlighted,
  hint,
  tooltip,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  highlighted?: boolean;
  hint?: string;
  tooltip?: { desc: string; formula?: string };
}) {
  const isBaseline = Math.abs(value - 1) < 0.01;
  const isStress = value > 1;
  
  return (
    <div className={highlighted ? 'animate-maillard-breathe rounded p-1 -m-1' : ''}>
      <div className="flex justify-between items-center mb-0.5">
        <label className="flex items-center gap-0.5 text-[10px]" style={{ color: '#6B5B4F' }}>
          {label}
          {tooltip && (
            <TooltipProvider delayDuration={200}>
              <LucideTooltip>
                <TooltipTrigger asChild>
                  <Info className="w-2.5 h-2.5 cursor-help flex-shrink-0" style={{ color: '#B0A898' }} />
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-[240px] p-2" style={{ backgroundColor: '#3E2723', color: '#F5F0E8', borderRadius: '3px', border: 'none', zIndex: 60 }}>
                  <div className="text-[10px] leading-relaxed">{tooltip.desc}</div>
                  {tooltip.formula && (
                    <div className="text-[9px] mt-1 pt-1 border-t font-mono leading-relaxed" style={{ borderColor: '#5D4037', color: '#D7CCC8' }}>
                      {tooltip.formula}
                    </div>
                  )}
                </TooltipContent>
              </LucideTooltip>
            </TooltipProvider>
          )}
        </label>
        <span 
          className="text-[10px] font-semibold px-1 py-0.5"
          style={{ 
            fontFamily: 'var(--font-jetbrains), monospace',
            color: isBaseline ? '#4A3728' : isStress ? '#FFFFFF' : '#FFFFFF',
            backgroundColor: isBaseline ? '#F0EBE3' : isStress ? '#C17A6B' : '#6B9A6B',
            borderRadius: '2px',
          }}
        >
          {(value * 100).toFixed(0)}%
        </span>
      </div>
      <Slider
        value={[value]}
        min={0.5}
        max={2.0}
        step={0.05}
        onValueChange={(v) => onChange(v[0])}
        className="h-4"
      />
      {hint && (
        <div 
          className="mt-0.5 text-[9px]"
          style={{ 
            fontFamily: 'var(--font-jetbrains), monospace',
            color: '#8B8178',
          }}
        >
          {hint}
        </div>
      )}
    </div>
  );
}

// KPI Card Component with JetBrains Mono
function KPICard({
  label,
  value,
  positive,
  large,
}: {
  label: string;
  value: string;
  positive: boolean;
  large?: boolean;
}) {
  return (
    <Card 
      className="p-3 border"
      style={{ 
        backgroundColor: positive ? '#F0F5F2' : '#F5F0F0',
        borderColor: '#5D4037',
        borderRadius: '2px',
      }}
    >
      <div className="text-xs mb-1" style={{ color: '#6B5B4F' }}>{label}</div>
      <div 
        className={large ? 'text-xl font-bold' : 'text-lg font-semibold'}
        style={{ 
          color: positive ? '#4C6B4C' : '#8B4C4C',
          fontFamily: 'var(--font-jetbrains), monospace',
        }}
      >
        {value}
      </div>
    </Card>
  );
}
