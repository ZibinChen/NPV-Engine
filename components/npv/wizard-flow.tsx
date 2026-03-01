'use client';

import { useMemo, useState } from 'react';
import { useNPV } from '@/lib/npv-context';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';

import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { 
  ArrowLeft, 
  ArrowRight, 
  Check,
  CreditCard,
  Globe,
  Target,
  AlertCircle,
  Info,
  Sparkles,
  Building2,
  Users,
  Megaphone,
  Settings2,
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { 
  CARD_PRODUCT_LABELS, 
  CHANNEL_LABELS, 
  SCENARIO_LABELS,
  CARD_PRODUCT_PRESETS,
  type CardProduct,
  type AcquisitionChannel,
  type DecisionScenario,
  type RiskDistribution,
  type V2InstallmentParams,
  DEFAULT_V2_INSTALLMENT,
} from '@/lib/npv-types';
import { STATIC_CURVES } from '@/lib/static-data';


export function WizardFlow() {
  const { 
    setCurrentStage,
    wizardStep,
    setWizardStep,
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
  } = useNPV();
  
  const canProceedStep1 = cardProduct && channel && scenario;
  const canProceedStep2 = true;
  const canProceedStep3 = true;
  
  const handleNext = () => {
    if (wizardStep === 1 && canProceedStep1) {
      setWizardStep(2);
    } else if (wizardStep === 2 && canProceedStep2) {
      setWizardStep(3);
    } else if (wizardStep === 3 && canProceedStep3) {
      runCalculation();
    }
  };
  
  const handleBack = () => {
    if (wizardStep === 1) {
      setCurrentStage('hub');
    } else {
      setWizardStep((wizardStep - 1) as 1 | 2);
    }
  };
  
  const steps = [
    { num: 1, label: '业务定义' },
    { num: 2, label: '风险分布与额度' },
    { num: 3, label: '参数假设' },
  ];
  
  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#F5F0E8' }}>
      {/* Header */}
      <header 
        className="sticky top-0 z-50 border-b-2"
        style={{ backgroundColor: '#FDF5E6', borderColor: '#5D4037' }}
      >
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="gap-1.5 text-xs"
            style={{ color: '#5D4037' }}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            {wizardStep === 1 ? '返回中心' : '上一步'}
          </Button>
          
          {/* Step Indicators */}
          <div className="flex items-center gap-1">
            {steps.map((step, idx) => (
              <div key={step.num} className="flex items-center">
                <div 
                  className="flex items-center gap-1.5 px-2.5 py-1 text-xs"
                  style={{ 
                    backgroundColor: wizardStep >= step.num ? '#C19A6B' : '#F0EBE3',
                    color: wizardStep >= step.num ? '#FFFFFF' : '#8B8178',
                    borderRadius: '2px',
                  }}
                >
                  {wizardStep > step.num ? (
                    <Check className="w-3 h-3" />
                  ) : (
                    <span className="w-3.5 text-center font-medium">{step.num}</span>
                  )}
                  <span className="hidden sm:inline">{step.label}</span>
                </div>
                {idx < steps.length - 1 && (
                  <div 
                    className="w-6 h-px mx-1"
                    style={{ backgroundColor: wizardStep > step.num ? '#C19A6B' : '#E5DFD6' }}
                  />
                )}
              </div>
            ))}
          </div>
          
          <Button
            size="sm"
            onClick={handleNext}
            disabled={(wizardStep === 1 && !canProceedStep1) || isCalculating}
            className="gap-1.5 text-xs"
            style={{ backgroundColor: '#C19A6B', color: '#FFFFFF', borderRadius: '2px' }}
          >
            {isCalculating ? '计算中...' : wizardStep === 3 ? '开始测算' : '下一步'}
            {!isCalculating && wizardStep !== 3 && <ArrowRight className="w-3.5 h-3.5" />}
          </Button>
        </div>
      </header>
      
      {/* Content */}
      <div className="flex-1 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex gap-6">
            {/* Left Panel - Description (30%) */}
            <div className="w-[30%] flex-shrink-0">
              <div className="sticky top-20">
              {wizardStep === 1 && (
                <LeftPanelStep1 cardProduct={cardProduct} channel={channel} />
              )}
                {wizardStep === 2 && (
                  <LeftPanelStep2 />
                )}
                {wizardStep === 3 && (
                  <LeftPanelStep3 cardProduct={cardProduct} />
                )}
              </div>
            </div>
            
            {/* Right Panel - Input (70%) */}
            <div className="flex-1">
              {wizardStep === 1 && (
                <Step1Content 
                  cardProduct={cardProduct}
                  channel={channel}
                  scenario={scenario}
                  setCardProduct={setCardProduct}
                  setChannel={setChannel}
                  setScenario={setScenario}
                />
              )}
              {wizardStep === 2 && (
                <Step2Content 
                  riskDistribution={businessFactors.riskDistribution}
                  updateRiskDistribution={updateRiskDistribution}
                />
              )}
              {wizardStep === 3 && (
                <Step3Content 
                  cardProduct={cardProduct}
                  channel={channel}
                  riskDistribution={businessFactors.riskDistribution}
                  productParams={businessFactors.productParams}
                  financialAssumptions={businessFactors.financialAssumptions}
                  stressCoefficients={businessFactors.stressCoefficients}
  updateProductParams={updateProductParams}
  updateFinancialAssumptions={updateFinancialAssumptions}
  updateStressCoefficients={updateStressCoefficients}
  v2Installment={businessFactors.v2Installment}
  updateV2Installment={updateV2Installment}
  />
  )}
  </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Left Panel Components - Step 1 with Dark Theme & Dynamic Guidance
function LeftPanelStep1({ 
  cardProduct, 
  channel 
}: { 
  cardProduct: CardProduct | null; 
  channel: AcquisitionChannel | null;
}) {
  // Dynamic guidance based on selections
  const productGuidance = cardProduct ? PRODUCT_GUIDANCE[cardProduct] : null;
  const channelGuidance = channel ? CHANNEL_GUIDANCE[channel] : null;
  
  return (
    <div 
      className="h-full p-5 space-y-5"
      style={{ 
        backgroundColor: '#5D4037', 
        borderRadius: '4px',
        minHeight: '500px',
      }}
    >
      <div>
        <h2 className="text-base font-semibold mb-1" style={{ color: '#FDF5E6' }}>
          业务定义
        </h2>
        <p className="text-xs leading-relaxed" style={{ color: '#D7CCC8' }}>
          产品类型决定基准FTP和年费；渠道决定基准CAC和预期活跃度。
        </p>
      </div>
      
      <div className="h-px" style={{ backgroundColor: '#8D6E63' }} />
      
      {/* Dynamic Product Guidance */}
      {productGuidance ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <CreditCard className="w-3.5 h-3.5" style={{ color: '#D4A574' }} />
            <span className="text-xs font-medium" style={{ color: '#D4A574' }}>
              {CARD_PRODUCT_LABELS[cardProduct!]}
            </span>
          </div>
          <p className="text-xs leading-relaxed" style={{ color: '#EFEBE9' }}>
            {productGuidance.description}
          </p>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <div className="p-2" style={{ backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: '2px' }}>
              <div className="text-[10px]" style={{ color: '#BCAAA4' }}>年费</div>
              <div className="text-xs font-mono font-medium" style={{ color: '#FDF5E6' }}>
                {productGuidance.annualFee === 0 ? '免年费' : `¥${productGuidance.annualFee}`}
              </div>
            </div>
            <div className="p-2" style={{ backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: '2px' }}>
              <div className="text-[10px]" style={{ color: '#BCAAA4' }}>权益成本</div>
              <div className="text-xs font-mono font-medium" style={{ color: '#FDF5E6' }}>
                ¥{productGuidance.rewardsCostPerYear}/年
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-3" style={{ backgroundColor: 'rgba(0,0,0,0.15)', borderRadius: '2px' }}>
          <div className="flex items-center gap-2 text-xs" style={{ color: '#BCAAA4' }}>
            <CreditCard className="w-3.5 h-3.5" />
            <span>请选择卡产品以查看参数说明</span>
          </div>
        </div>
      )}
      
      {/* Dynamic Channel Guidance */}
      {channelGuidance ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Globe className="w-3.5 h-3.5" style={{ color: '#D4A574' }} />
            <span className="text-xs font-medium" style={{ color: '#D4A574' }}>
              {CHANNEL_LABELS[channel!]}
            </span>
          </div>
          <p className="text-xs leading-relaxed" style={{ color: '#EFEBE9' }}>
            {channelGuidance.description}
          </p>
          <div className="mt-2">
            <div className="p-2" style={{ backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: '2px' }}>
              <div className="text-[10px]" style={{ color: '#BCAAA4' }}>获客成本 (CAC)</div>
              <div className="text-xs font-mono font-medium" style={{ color: '#FDF5E6' }}>
                ¥{channelGuidance.baseCAC}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-3" style={{ backgroundColor: 'rgba(0,0,0,0.15)', borderRadius: '2px' }}>
          <div className="flex items-center gap-2 text-xs" style={{ color: '#BCAAA4' }}>
            <Globe className="w-3.5 h-3.5" />
            <span>请选择渠道以查看获客参数</span>
          </div>
        </div>
      )}
      
      <div className="h-px" style={{ backgroundColor: '#8D6E63' }} />
      
      {/* Static Reference - Scenario PD Multiplier */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Target className="w-3.5 h-3.5" style={{ color: '#D4A574' }} />
          <span className="text-xs font-medium" style={{ color: '#D4A574' }}>情景说明</span>
        </div>
        <div className="space-y-1.5 text-[11px]" style={{ color: '#D7CCC8' }}>
          <div className="flex items-center gap-2">
            <span className="w-14">基准</span>
            <span>PD x 1.0 (正常环境)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-14">决策</span>
            <span>PD x 1.3 (审慎上浮)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-14">压力</span>
            <span>PD x 2.5 (极端压力)</span>
          </div>
        </div>
        <div className="text-[10px] pt-1" style={{ color: '#BCAAA4' }}>
          情景仅影响PD乘数，其他压力系数在参数页独立配置
        </div>
      </div>
    </div>
  );
}

// Product guidance data (annualFee must match CARD_PRODUCT_PRESETS, rewardsCostPerYear = monthly_cap * 12)
const PRODUCT_GUIDANCE: Record<CardProduct, { description: string; annualFee: number; rewardsCostPerYear: number }> = {
  standard: {
    description: '面向大众客群的入门级产品，免年费，权益简单，追求规模化获客。',
    annualFee: 0,
    rewardsCostPerYear: 0,
  },
  gold: {
    description: '中端客群定位，适度年费换取增值权益，平衡获客成本与客户价值。',
    annualFee: 150,
    rewardsCostPerYear: 600,
  },
  platinum: {
    description: '高净值客群，较高年费对应丰富权益（机场贵宾厅、酒店礼遇等），注重客户粘性。',
    annualFee: 280,
    rewardsCostPerYear: 900,
  },
  premium: {
    description: '高端权益卡，高年费匹配专属服务（私人银行、高端旅行），追求单客价值最大化。',
    annualFee: 395,
    rewardsCostPerYear: 1200,
  },
};

// Channel guidance data
  const CHANNEL_GUIDANCE: Record<AcquisitionChannel, { description: string; baseCAC: number }> = {
  online: {
  description: '数字化获客，成本适中，适合批量获取年轻客群。',
  baseCAC: 600,
  },
  branch: {
  description: '网点面对面获客，成本较低，客户质量稳定，适合中高端客群经营。',
  baseCAC: 450,
  },
  partner: {
  description: '场景合作方导流，CAC最低，客户与场景绑定度高。',
  baseCAC: 350,
  },
  'direct-sales': {
  description: '直销团队地推，CAC最高但可精准触达目标客群，适合特定产品推广。',
  baseCAC: 800,
  },
  };

function LeftPanelStep2() {
  return (
    <div 
      className="h-full p-5 space-y-5"
      style={{ 
        backgroundColor: '#5D4037', 
        borderRadius: '4px',
        minHeight: '500px',
      }}
    >
      <div>
        <h2 className="text-base font-semibold mb-1" style={{ color: '#FDF5E6' }}>
          风险分布与额度
        </h2>
        <p className="text-xs leading-relaxed" style={{ color: '#D7CCC8' }}>
          配置10个风险等级的客群占比和初始授信额度。占比总和必须为100%。
        </p>
      </div>
      
      <div className="h-px" style={{ backgroundColor: '#8D6E63' }} />
      
      {/* EL Impact Explanation */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-3.5 h-3.5" style={{ color: '#D4A574' }} />
          <span className="text-xs font-medium" style={{ color: '#D4A574' }}>风险分布对EL的影响</span>
        </div>
        <p className="text-xs leading-relaxed" style={{ color: '#EFEBE9' }}>
          风险等级越高，对应的违约概率(PD)越大。高风险客群占比增加将推高组合预期损失(EL)，直接侵蚀NPV瀑布中的风险成本节点。
        </p>
        <div className="grid grid-cols-2 gap-2 mt-2">
          <div className="p-2" style={{ backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: '2px' }}>
            <div className="text-[10px]" style={{ color: '#BCAAA4' }}>低风险(1-3级)</div>
            <div className="text-xs font-mono font-medium" style={{ color: '#FDF5E6' }}>
              PD 0.5%-2%
            </div>
          </div>
          <div className="p-2" style={{ backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: '2px' }}>
            <div className="text-[10px]" style={{ color: '#BCAAA4' }}>高风险(8-10级)</div>
            <div className="text-xs font-mono font-medium" style={{ color: '#FDF5E6' }}>
              PD 8%-15%
            </div>
          </div>
        </div>
      </div>
      
      <div className="h-px" style={{ backgroundColor: '#8D6E63' }} />
      
      {/* Default Distribution Reference */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Target className="w-3.5 h-3.5" style={{ color: '#D4A574' }} />
          <span className="text-xs font-medium" style={{ color: '#D4A574' }}>默认分布说明</span>
        </div>
        <div className="space-y-1.5 text-[11px]" style={{ color: '#D7CCC8' }}>
          <div className="flex justify-between">
            <span>风险1-5级</span>
            <span className="font-mono">占比100%（优质客群）</span>
          </div>
          <div className="flex justify-between">
            <span>风险6-10级</span>
            <span className="font-mono">占比0%（默认关闭）</span>
          </div>
        </div>
        <p className="text-[10px] mt-2" style={{ color: '#BCAAA4' }}>
          可调整6-10级占比以模拟下沉客群策略，但需关注EL上升对NPV的影响。
        </p>
      </div>
    </div>
  );
}

function LeftPanelStep3({ cardProduct }: { cardProduct: CardProduct | null }) {
  return (
    <div 
      className="h-full p-5 space-y-5"
      style={{ 
        backgroundColor: '#5D4037', 
        borderRadius: '4px',
        minHeight: '500px',
      }}
    >
      <div>
        <h2 className="text-base font-semibold mb-1" style={{ color: '#FDF5E6' }}>
          参数假设与压力测试
        </h2>
        <p className="text-xs leading-relaxed" style={{ color: '#D7CCC8' }}>
          配置定价参数、财务假设和压力系数。压力系数作为乘数应用于基准行为曲线。
        </p>
      </div>
      
      <div className="h-px" style={{ backgroundColor: '#8D6E63' }} />
      
      {/* Parameter Groups Explanation */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <CreditCard className="w-3.5 h-3.5" style={{ color: '#D4A574' }} />
          <span className="text-xs font-medium" style={{ color: '#D4A574' }}>定价参数</span>
        </div>
        <p className="text-xs leading-relaxed" style={{ color: '#EFEBE9' }}>
          包含循环利率、年费、取现费率、回佣率和超限费。循环利率默认18.25%可调整，年费由选定产品决定。
        </p>
        <div className="grid grid-cols-2 gap-2">
          <div className="p-2" style={{ backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: '2px' }}>
            <div className="text-[10px]" style={{ color: '#BCAAA4' }}>默认循环利率</div>
            <div className="text-xs font-mono font-medium" style={{ color: '#FDF5E6' }}>18.25%</div>
          </div>
          <div className="p-2" style={{ backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: '2px' }}>
            <div className="text-[10px]" style={{ color: '#BCAAA4' }}>当前产品年费</div>
            <div className="text-xs font-mono font-medium" style={{ color: '#FDF5E6' }}>
              {cardProduct ? (CARD_PRODUCT_PRESETS[cardProduct].annualFee === 0 ? '免年费' : `¥${CARD_PRODUCT_PRESETS[cardProduct].annualFee}`) : '待选择'}
            </div>
          </div>
        </div>
      </div>
      
      <div className="h-px" style={{ backgroundColor: '#8D6E63' }} />
      
      {/* Stress Factor Explanation */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-3.5 h-3.5" style={{ color: '#D4A574' }} />
          <span className="text-xs font-medium" style={{ color: '#D4A574' }}>压力系数说明</span>
        </div>
        <p className="text-xs leading-relaxed" style={{ color: '#EFEBE9' }}>
          压力系数乘数应用于静态矩阵基准曲线，与情景PD乘数叠加生效。100%为基准，偏离方向因指标含义不同。
        </p>
        <div className="space-y-1.5 text-[11px]" style={{ color: '#D7CCC8' }}>
          <div className="text-[10px] font-medium mb-1" style={{ color: '#D4A574' }}>{'> 100% 为压力方向:'}</div>
          <div className="pl-2 space-y-0.5">
            <div>PD、损失严重性、流失率</div>
          </div>
          <div className="text-[10px] font-medium mb-1 mt-1.5" style={{ color: '#D4A574' }}>{'< 100% 为压力方向:'}</div>
          <div className="pl-2 space-y-0.5">
            <div>额度使用率、循环比例、交易额、取现金额、活跃率</div>
          </div>
        </div>
        <div className="text-[10px] pt-1" style={{ color: '#BCAAA4' }}>
          情景乘数 (基准x1 / 决策x1.3 / 压力x2.5) 仅作用于PD，压力系数在此基础上再叠加
        </div>
      </div>
      
      <div className="h-px" style={{ backgroundColor: '#8D6E63' }} />
      
      {/* Impact Mapping Reference - all 8 */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Target className="w-3.5 h-3.5" style={{ color: '#D4A574' }} />
          <span className="text-xs font-medium" style={{ color: '#D4A574' }}>系数影响映射</span>
        </div>
        <div className="space-y-1 text-[10px]" style={{ color: '#BCAAA4' }}>
          <div>PD系数 → 违约概率曲线 (pd_annual)</div>
          <div>损失严重性 → Severity曲线 (severity)</div>
          <div>额度使用率 → 使用率曲线 (utilization)</div>
          <div>循环比例 → 循环信贷比例 (revolve_rate)</div>
          <div>交易额/消费额 → 月消费曲线 (spend_amt)</div>
          <div>取现金额 → 月取现曲线 (cash_amt)</div>
          <div>活跃率 → 活跃率曲线 (active_rate)</div>
          <div>流失率 → 流失率曲线 (churn_rate)</div>
        </div>
      </div>
    </div>
  );
}

// Product card data with stats
const PRODUCT_STATS: Record<CardProduct, { 
  subtitle: string;
  icon: typeof CreditCard;
  annualFee: number; 
  baseAPR: number; 
  limitRange: string;
}> = {
  standard: { subtitle: '大众客群', icon: CreditCard, annualFee: 0, baseAPR: 0.1825, limitRange: '5K-30K' },
  gold: { subtitle: '中端客群', icon: CreditCard, annualFee: 150, baseAPR: 0.1825, limitRange: '10K-50K' },
  platinum: { subtitle: '高净值客群', icon: Sparkles, annualFee: 280, baseAPR: 0.1825, limitRange: '20K-100K' },
  premium: { subtitle: '高端权益', icon: Sparkles, annualFee: 395, baseAPR: 0.1825, limitRange: '30K-200K' },
};

// Channel card data with stats
const CHANNEL_STATS: Record<AcquisitionChannel, {
  subtitle: string;
  icon: typeof Globe;
  baseCAC: number;
}> = {
  online: { subtitle: '数字获客', icon: Globe, baseCAC: 600 },
  branch: { subtitle: '网点获客', icon: Building2, baseCAC: 450 },
  partner: { subtitle: '场景合作', icon: Users, baseCAC: 350 },
  'direct-sales': { subtitle: '地推团队', icon: Megaphone, baseCAC: 800 },
};

// Step 1: Strategy Configuration with Data-Rich Cards
function Step1Content({
  cardProduct,
  channel,
  scenario,
  setCardProduct,
  setChannel,
  setScenario,
}: {
  cardProduct: CardProduct | null;
  channel: AcquisitionChannel | null;
  scenario: DecisionScenario | null;
  setCardProduct: (p: CardProduct) => void;
  setChannel: (c: AcquisitionChannel) => void;
  setScenario: (s: DecisionScenario) => void;
}) {
  const cardProducts: CardProduct[] = ['standard', 'gold', 'platinum', 'premium'];
  const channels: AcquisitionChannel[] = ['online', 'branch', 'partner', 'direct-sales'];
  const scenarios: DecisionScenario[] = ['base', 'decision', 'stress'];
  
  return (
    <div className="space-y-4" style={{ backgroundColor: '#FDF5E6', padding: '16px', borderRadius: '4px' }}>
      {/* Card Product Section */}
      <div>
        <h3 className="text-sm font-medium mb-3 flex items-center gap-2" style={{ color: '#4A3728' }}>
          <CreditCard className="w-4 h-4" style={{ color: '#C19A6B' }} />
          信用卡产品
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {cardProducts.map((product) => {
            const stats = PRODUCT_STATS[product];
            const Icon = stats.icon;
            const isSelected = cardProduct === product;
            return (
              <button
                key={product}
                onClick={() => setCardProduct(product)}
                className="p-3 border text-left transition-all"
                style={{ 
                  backgroundColor: isSelected ? '#C19A6B' : '#FFFFFF',
                  borderColor: isSelected ? '#C19A6B' : '#5D4037',
                  borderRadius: '2px',
                }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Icon className="w-4 h-4" style={{ color: isSelected ? '#FFFFFF' : '#C19A6B' }} />
                  <div>
                    <div className="text-sm font-medium" style={{ color: isSelected ? '#FFFFFF' : '#4A3728' }}>
                      {CARD_PRODUCT_LABELS[product]}
                    </div>
                    <div className="text-[10px]" style={{ color: isSelected ? '#F5EFE6' : '#8B8178' }}>
                      {stats.subtitle}
                    </div>
                  </div>
                </div>
                <div 
                  className="grid grid-cols-2 gap-x-2 gap-y-1 pt-2 border-t text-[10px] font-mono"
                  style={{ borderColor: isSelected ? 'rgba(255,255,255,0.3)' : '#E5DFD6' }}
                >
                  <div>
                    <span style={{ color: isSelected ? '#F5EFE6' : '#8B8178' }}>年费: </span>
                    <span style={{ color: isSelected ? '#FFFFFF' : '#4A3728' }}>
                      {stats.annualFee === 0 ? '免年费' : `¥${stats.annualFee}`}
                    </span>
                  </div>
                  <div>
                    <span style={{ color: isSelected ? '#F5EFE6' : '#8B8178' }}>额度: </span>
                    <span style={{ color: isSelected ? '#FFFFFF' : '#4A3728' }}>{stats.limitRange}</span>
                  </div>
                </div>
              </button>
            );
          })}

        </div>
      </div>
      
      {/* Channel Section */}
      <div>
        <h3 className="text-sm font-medium mb-3 flex items-center gap-2" style={{ color: '#4A3728' }}>
          <Globe className="w-4 h-4" style={{ color: '#C19A6B' }} />
          获客渠道
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {channels.map((ch) => {
            const stats = CHANNEL_STATS[ch];
            const Icon = stats.icon;
            const isSelected = channel === ch;
            return (
              <button
                key={ch}
                onClick={() => setChannel(ch)}
                className="p-3 border text-left transition-all"
                style={{ 
                  backgroundColor: isSelected ? '#C19A6B' : '#FFFFFF',
                  borderColor: isSelected ? '#C19A6B' : '#5D4037',
                  borderRadius: '2px',
                }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Icon className="w-4 h-4" style={{ color: isSelected ? '#FFFFFF' : '#C19A6B' }} />
                  <div>
                    <div className="text-sm font-medium" style={{ color: isSelected ? '#FFFFFF' : '#4A3728' }}>
                      {CHANNEL_LABELS[ch]}
                    </div>
                    <div className="text-[10px]" style={{ color: isSelected ? '#F5EFE6' : '#8B8178' }}>
                      {stats.subtitle}
                    </div>
                  </div>
                </div>
                <div 
                  className="grid grid-cols-2 gap-x-2 gap-y-1 pt-2 border-t text-[10px] font-mono"
                  style={{ borderColor: isSelected ? 'rgba(255,255,255,0.3)' : '#E5DFD6' }}
                >
                  <div>
                    <span style={{ color: isSelected ? '#F5EFE6' : '#8B8178' }}>CAC: </span>
                    <span style={{ color: isSelected ? '#FFFFFF' : '#4A3728' }}>¥{stats.baseCAC}</span>
                  </div>
                </div>
              </button>
            );
          })}

        </div>
      </div>
      
      {/* Scenario Section */}
      <div>
        <h3 className="text-sm font-medium mb-3 flex items-center gap-2" style={{ color: '#4A3728' }}>
          <Target className="w-4 h-4" style={{ color: '#C19A6B' }} />
          测算情景
        </h3>
        <div className="grid grid-cols-3 gap-3">
          {scenarios.map((sc) => {
            const isSelected = scenario === sc;
  const descriptions: Record<DecisionScenario, string> = {
  base: '基准PD × 1.0',
  decision: '审慎决策 PD × 1.3',
  stress: '极端压力 PD × 2.5',
  };
            return (
              <button
                key={sc}
                onClick={() => setScenario(sc)}
                className="p-3 border text-left transition-all"
                style={{ 
                  backgroundColor: isSelected ? '#C19A6B' : '#FFFFFF',
                  borderColor: isSelected ? '#C19A6B' : '#5D4037',
                  borderRadius: '2px',
                }}
              >
                <div className="text-sm font-medium" style={{ color: isSelected ? '#FFFFFF' : '#4A3728' }}>
                  {SCENARIO_LABELS[sc]}
                </div>
                <div className="text-[10px] mt-1 font-mono" style={{ color: isSelected ? '#F5EFE6' : '#8B8178' }}>
                  {descriptions[sc]}
                </div>
              </button>
            );
          })}
        </div>
      </div>
      
      {/* Selection Summary */}
      {(cardProduct || channel || scenario) && (
        <div 
          className="p-3 border flex items-center gap-3 flex-wrap"
          style={{ 
            backgroundColor: '#FFFFFF', 
            borderColor: '#C19A6B',
            borderRadius: '2px',
          }}
        >
          <span className="text-xs font-medium" style={{ color: '#6B5B4F' }}>已选择:</span>
          {cardProduct && (
            <span 
              className="text-[11px] px-2 py-0.5 font-medium"
              style={{ backgroundColor: '#C19A6B', color: '#FFFFFF', borderRadius: '2px' }}
            >
              {CARD_PRODUCT_LABELS[cardProduct]}
            </span>
          )}
          {channel && (
            <span 
              className="text-[11px] px-2 py-0.5 font-medium"
              style={{ backgroundColor: '#D4A574', color: '#FFFFFF', borderRadius: '2px' }}
            >
              {CHANNEL_LABELS[channel]}
            </span>
          )}
          {scenario && (
            <span 
              className="text-[11px] px-2 py-0.5 font-medium"
              style={{ backgroundColor: '#8B7355', color: '#FFFFFF', borderRadius: '2px' }}
            >
              {SCENARIO_LABELS[scenario]}
            </span>
          )}
        </div>
      )}
      

    </div>
  );
}

// Step 2: Risk Distribution - Dual Matrix with Summary Bar (No Sliders, Compact Inputs)
function Step2Content({
  riskDistribution,
  updateRiskDistribution,
}: {
  riskDistribution: RiskDistribution[];
  updateRiskDistribution: (d: RiskDistribution[]) => void;
}) {
  // Calculate weighted average risk level and average limit
  const { totalPercentage, weightedRiskLevel, weightedAvgLimit } = useMemo(() => {
    let totalPct = 0;
    let weightedRisk = 0;
    let weightedLimit = 0;
    
    for (const r of riskDistribution) {
      totalPct += r.percentage;
      weightedRisk += r.level * r.percentage;
      weightedLimit += r.initialLimit * r.percentage;
    }
    
    return {
      totalPercentage: totalPct,
      weightedRiskLevel: totalPct > 0 ? weightedRisk / totalPct : 0,
      weightedAvgLimit: totalPct > 0 ? weightedLimit / totalPct : 0,
    };
  }, [riskDistribution]);
  
  const handlePercentageChange = (level: number, value: number) => {
    const updated = riskDistribution.map(r => 
      r.level === level ? { ...r, percentage: value / 100 } : r
    );
    updateRiskDistribution(updated);
  };
  
  const handleLimitChange = (level: number, value: number) => {
    const updated = riskDistribution.map(r => 
      r.level === level ? { ...r, initialLimit: value } : r
    );
    updateRiskDistribution(updated);
  };
  
  const isPercentageValid = Math.abs(totalPercentage - 1) < 0.01;
  
  return (
    <div className="space-y-4" style={{ backgroundColor: '#FDF5E6', padding: '16px', borderRadius: '4px' }}>
      {/* Dynamic Summary Bar with JetBrains Mono */}
      <div 
        className="p-4 flex items-center justify-between border"
        style={{ 
          backgroundColor: '#FFFFFF', 
          borderColor: '#5D4037',
          borderRadius: '2px',
        }}
      >
        <div className="flex items-center gap-8">
          <div>
            <span className="text-xs" style={{ color: '#6B5B4F' }}>组合加权平均风险等级</span>
            <div 
              className="text-xl font-semibold mt-0.5"
              style={{ color: '#4A3728', fontFamily: 'var(--font-jetbrains), monospace' }}
            >
              {weightedRiskLevel.toFixed(2)} <span className="text-sm font-normal">级</span>
            </div>
          </div>
          <div className="h-10 w-px" style={{ backgroundColor: '#E5DFD6' }} />
          <div>
            <span className="text-xs" style={{ color: '#6B5B4F' }}>加权平均额度</span>
            <div 
              className="text-xl font-semibold mt-0.5"
              style={{ color: '#4A3728', fontFamily: 'var(--font-jetbrains), monospace' }}
            >
              ¥{Math.round(weightedAvgLimit).toLocaleString()}
            </div>
          </div>
        </div>
        <div 
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium"
          style={{ 
            backgroundColor: isPercentageValid ? '#D4E8D4' : '#F5D5D5',
            color: isPercentageValid ? '#4C6B4C' : '#8B4C4C',
            borderRadius: '2px',
            fontFamily: 'var(--font-jetbrains), monospace',
          }}
        >
          {isPercentageValid ? (
            <Check className="w-3.5 h-3.5" />
          ) : (
            <AlertCircle className="w-3.5 h-3.5" />
          )}
          占比合计 {(totalPercentage * 100).toFixed(0)}%
        </div>
      </div>
      
      {/* Dual Matrix Tables - Compact with numeric inputs only */}
      <div className="grid grid-cols-2 gap-4">
        {/* Left Matrix: Risk Level Percentage - No Sliders */}
        <Card className="border overflow-hidden" style={{ backgroundColor: '#FFFFFF', borderColor: '#5D4037', borderRadius: '2px' }}>
          <div 
            className="px-3 py-2 text-xs font-medium"
            style={{ backgroundColor: '#5D4037', color: '#FFFFFF' }}
          >
            风险等级占比分布
          </div>
          <div className="divide-y" style={{ borderColor: '#F0EBE3' }}>
            {riskDistribution.map((r) => (
              <div 
                key={r.level}
                className="grid grid-cols-[50px_1fr] gap-3 px-3 py-2 items-center"
                style={{ backgroundColor: r.percentage === 0 ? '#FAFAF8' : '#FFFFFF' }}
              >
                <div 
                  className="text-xs font-medium"
                  style={{ color: r.percentage === 0 ? '#A0978E' : '#4A3728' }}
                >
                  风险{r.level}
                </div>
                <div className="relative">
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={Math.round(r.percentage * 100)}
                    onChange={(e) => handlePercentageChange(r.level, Number(e.target.value))}
                    className="text-right text-xs h-7 pr-6"
                    style={{ 
                      backgroundColor: r.percentage === 0 ? '#F5F0E8' : '#FFFFFF', 
                      borderColor: '#E5DFD6',
                      borderRadius: '2px',
                      fontFamily: 'var(--font-jetbrains), monospace',
                    }}
                  />
                  <span 
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-xs" 
                    style={{ color: '#8B8178', fontFamily: 'var(--font-jetbrains), monospace' }}
                  >
                    %
                  </span>
                </div>
              </div>
            ))}
          </div>
          <div 
            className="px-3 py-2 flex justify-between items-center text-xs border-t"
            style={{ backgroundColor: '#F0EBE3', borderColor: '#E5DFD6' }}
          >
            <span className="font-medium" style={{ color: '#5D4037' }}>合计</span>
            <span 
              className="font-semibold"
              style={{ 
                color: isPercentageValid ? '#4C6B4C' : '#8B4C4C',
                fontFamily: 'var(--font-jetbrains), monospace',
              }}
            >
              {(totalPercentage * 100).toFixed(0)}%
            </span>
          </div>
        </Card>
        
        {/* Right Matrix: Initial Limit - Compact */}
        <Card className="border overflow-hidden" style={{ backgroundColor: '#FFFFFF', borderColor: '#5D4037', borderRadius: '2px' }}>
          <div 
            className="px-3 py-2 text-xs font-medium"
            style={{ backgroundColor: '#5D4037', color: '#FFFFFF' }}
          >
            初始授信额度
          </div>
          <div className="divide-y" style={{ borderColor: '#F0EBE3' }}>
            {riskDistribution.map((r) => (
              <div 
                key={r.level}
                className="grid grid-cols-[50px_1fr] gap-3 px-3 py-2 items-center"
                style={{ backgroundColor: r.percentage === 0 ? '#FAFAF8' : '#FFFFFF' }}
              >
                <div 
                  className="text-xs font-medium"
                  style={{ color: r.percentage === 0 ? '#A0978E' : '#4A3728' }}
                >
                  风险{r.level}
                </div>
                <div className="relative">
                  <span 
                    className="absolute left-2 top-1/2 -translate-y-1/2 text-xs" 
                    style={{ color: '#8B8178', fontFamily: 'var(--font-jetbrains), monospace' }}
                  >
                    ¥
                  </span>
                  <Input
                    type="number"
                    min={1000}
                    max={500000}
                    step={1000}
                    value={r.initialLimit}
                    onChange={(e) => handleLimitChange(r.level, Number(e.target.value))}
                    className="text-right text-xs h-7 pl-5 pr-2"
                    style={{ 
                      backgroundColor: r.percentage === 0 ? '#F5F0E8' : '#FFFFFF', 
                      borderColor: '#E5DFD6',
                      borderRadius: '2px',
                      fontFamily: 'var(--font-jetbrains), monospace',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div 
            className="px-3 py-2 flex justify-between items-center text-xs border-t"
            style={{ backgroundColor: '#F0EBE3', borderColor: '#E5DFD6' }}
          >
            <span className="font-medium" style={{ color: '#5D4037' }}>加权平均</span>
            <span 
              className="font-semibold" 
              style={{ 
                color: '#4A3728',
                fontFamily: 'var(--font-jetbrains), monospace',
              }}
            >
              ¥{Math.round(weightedAvgLimit).toLocaleString()}
            </span>
          </div>
        </Card>
      </div>
    </div>
  );
}

// Helper: Read real values from STATIC_CURVES for a given risk level (month 12 = index 11)
function getStaticBaseValues(level: number, month = 11) {
  const g = level - 1;
  return {
    pd: STATIC_CURVES.pd_annual[g]?.[month] ?? 0,
    severity: STATIC_CURVES.severity[g]?.[month] ?? 0,
    utilization: STATIC_CURVES.utilization[g]?.[month] ?? 0,
    revolving: STATIC_CURVES.revolve_rate[g]?.[month] ?? 0,
    spend: STATIC_CURVES.spend_amt[g]?.[month] ?? 0,
    cash: STATIC_CURVES.cash_amt[g]?.[month] ?? 0,
    active: STATIC_CURVES.active_rate[g]?.[month] ?? 1.0,
  };
}

// Step 3: Parameters with Data Inheritance and Dynamic Impact Mapping
function Step3Content({
  cardProduct,
  channel,
  riskDistribution,
  productParams,
  financialAssumptions,
  stressCoefficients,
  updateProductParams,
  updateFinancialAssumptions,
  updateStressCoefficients,
  v2Installment,
  updateV2Installment,
}: {
  cardProduct: CardProduct | null;
  channel: AcquisitionChannel | null;
  riskDistribution: RiskDistribution[];
  productParams: {
    apr: number;
    annualFee: number;
    interchangeRate: number;
    overlimitFee: number;
    cashAdvanceFee: number;
    lateFee: number;
  };
  financialAssumptions: {
    ftpRate: number;
    cac: number;
    recoveryRate: number;
    opexPerCard: number;
    rewardsRate: number;
    fraudRate: number;
    rewardsCap: number;
    balTransferRate: number;
  };
  stressCoefficients: {
    pdMultiplier: number;
    lgdMultiplier: number;
    activeRateMultiplier: number;
    utilizationMultiplier: number;
    revolvingMultiplier: number;
    spendMultiplier: number;
    attritionMultiplier: number;
    interestMarginMultiplier: number;
  };
  updateProductParams: (p: Partial<typeof productParams>) => void;
  updateFinancialAssumptions: (a: Partial<typeof financialAssumptions>) => void;
  updateStressCoefficients: (c: Partial<typeof stressCoefficients>) => void;
  v2Installment?: V2InstallmentParams;
  updateV2Installment?: (p: Partial<V2InstallmentParams>) => void;
}) {
  // Calculate weighted average baseline values from STATIC_CURVES x risk distribution
  const weightedBaselines = useMemo(() => {
    let totalPct = 0;
    let weightedPD = 0;
    let weightedSeverity = 0;
    let weightedUtilization = 0;
    let weightedRevolving = 0;
    let weightedSpend = 0;
    let weightedCash = 0;
    let weightedActive = 0;
    let weightedLimit = 0;
    
    for (const r of riskDistribution) {
      if (r.percentage > 0) {
        const base = getStaticBaseValues(r.level);
        totalPct += r.percentage;
        weightedPD += base.pd * r.percentage;
        weightedSeverity += base.severity * r.percentage;
        weightedUtilization += base.utilization * r.percentage;
        weightedRevolving += base.revolving * r.percentage;
        weightedSpend += base.spend * r.percentage;
        weightedCash += base.cash * r.percentage;
        weightedActive += base.active * r.percentage;
        weightedLimit += r.initialLimit * r.percentage;
      }
    }
    
    // Normalize if not 100%
    if (totalPct > 0 && totalPct !== 1) {
      weightedPD /= totalPct;
      weightedSeverity /= totalPct;
      weightedUtilization /= totalPct;
      weightedRevolving /= totalPct;
      weightedSpend /= totalPct;
      weightedCash /= totalPct;
      weightedActive /= totalPct;
      weightedLimit /= totalPct;
    }
    
    return {
      pd: totalPct > 0 ? weightedPD : 0.02,
      severity: totalPct > 0 ? weightedSeverity : 0.45,
      utilization: totalPct > 0 ? weightedUtilization : 0.46,
      revolving: totalPct > 0 ? weightedRevolving : 0.42,
      spend: totalPct > 0 ? weightedSpend : 7907,
      cash: totalPct > 0 ? weightedCash : 5,
      active: totalPct > 0 ? weightedActive : 0.75,
      attrition: 0.015, // Fixed baseline from churn matrix average
    };
  }, [riskDistribution]);
  
  // Inherit defaults from Step 1 selections
  const inheritedDefaults = useMemo(() => {
    const productStats = cardProduct ? PRODUCT_STATS[cardProduct] : null;
    const channelStats = channel ? CHANNEL_STATS[channel] : null;
    
    return {
      apr: productStats ? productStats.baseAPR * 100 : 18.25,
      annualFee: productStats ? productStats.annualFee : 395,
      cac: channelStats ? channelStats.baseCAC : 600,
      ftpRate: 2.75,
    };
  }, [cardProduct, channel]);
  return (
    <div className="space-y-4" style={{ backgroundColor: '#FDF5E6', padding: '16px', borderRadius: '4px' }}>
      {/* Data Inheritance Summary Banner */}
      <div 
        className="p-3 flex items-center justify-between text-xs border"
        style={{ 
          backgroundColor: '#FFFFFF', 
          borderColor: '#C19A6B',
          borderRadius: '2px',
        }}
      >
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span style={{ color: '#6B5B4F' }}>产品:</span>
            <span 
              className="font-medium px-1.5 py-0.5"
              style={{ 
                backgroundColor: cardProduct ? '#FDF5E6' : '#F5F0E8',
                color: cardProduct ? '#4A3728' : '#A0978E',
                borderRadius: '2px',
              }}
            >
              {cardProduct ? CARD_PRODUCT_LABELS[cardProduct] : '未选择'}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span style={{ color: '#6B5B4F' }}>渠道:</span>
            <span 
              className="font-medium px-1.5 py-0.5"
              style={{ 
                backgroundColor: channel ? '#FDF5E6' : '#F5F0E8',
                color: channel ? '#4A3728' : '#A0978E',
                borderRadius: '2px',
              }}
            >
              {channel ? CHANNEL_LABELS[channel] : '未选择'}
            </span>
          </div>
          <div className="h-4 w-px" style={{ backgroundColor: '#E5DFD6' }} />
          <div className="flex items-center gap-1.5">
            <span style={{ color: '#6B5B4F' }}>组合加权PD:</span>
            <span 
              className="font-mono font-medium"
              style={{ color: '#C19A6B' }}
            >
              {(weightedBaselines.pd * 100).toFixed(2)}%
            </span>
          </div>
        </div>
        <div 
          className="text-[10px] px-2 py-1"
          style={{ 
            backgroundColor: '#E8F4E8',
            color: '#4C6B4C',
            borderRadius: '2px',
          }}
        >
          参数已从 Step 1 & 2 继承
        </div>
      </div>
      
      {/* 1. 定价参数 - matching sidebar structure */}
      <Card className="border overflow-hidden" style={{ backgroundColor: '#FFFFFF', borderColor: '#5D4037', borderRadius: '2px' }}>
        <div 
          className="px-3 py-2 text-xs font-medium flex items-center gap-2"
          style={{ backgroundColor: '#5D4037', color: '#FFFFFF' }}
        >
          <CreditCard className="w-3.5 h-3.5" />
          定价参数
        </div>
        <div className="p-4 space-y-4">
          {/* 1.1 利息收入相关 */}
          <div className="text-[10px] font-medium uppercase tracking-wider" style={{ color: '#8B7355' }}>利息收入相关</div>
          
          {/* Revolving / Installment split bar */}
          {v2Installment && updateV2Installment && (
            <div>
              <div className="flex h-5 overflow-hidden" style={{ borderRadius: '2px', border: '1px solid #E5DFD6' }}>
                <div className="flex items-center justify-center text-[10px] font-mono text-white" style={{ width: `${Math.round(v2Installment.revolvingInstSplit * 100)}%`, backgroundColor: '#E65100', transition: 'width 0.3s' }}>
                  {Math.round(v2Installment.revolvingInstSplit * 100) > 15 ? `循环 ${Math.round(v2Installment.revolvingInstSplit * 100)}%` : ''}
                </div>
                <div className="flex items-center justify-center text-[10px] font-mono text-white" style={{ width: `${Math.round((1 - v2Installment.revolvingInstSplit) * 100)}%`, backgroundColor: '#3949AB', transition: 'width 0.3s' }}>
                  {Math.round((1 - v2Installment.revolvingInstSplit) * 100) > 15 ? `分期 ${Math.round((1 - v2Installment.revolvingInstSplit) * 100)}%` : ''}
                </div>
              </div>
              <div className="flex justify-between text-[10px] mt-0.5 font-mono" style={{ color: '#8B8178' }}>
                <span>循环率 {(weightedBaselines.revolving * v2Installment.revolvingInstSplit * 100).toFixed(1)}%</span>
                <span>分期率 {(weightedBaselines.revolving * (1 - v2Installment.revolvingInstSplit) * 100).toFixed(1)}%</span>
              </div>
              <div className="flex items-center justify-center gap-3 mt-1.5">
                <button
                  onClick={() => updateV2Installment({ revolvingInstSplit: Math.max(0.05, v2Installment.revolvingInstSplit - 0.05) })}
                  className="h-6 px-3 text-[10px] font-mono border flex items-center"
                  style={{ borderColor: '#3949AB', color: '#3949AB', borderRadius: '2px', cursor: 'pointer' }}
                >
                  分期 +5%
                </button>
                <span className="text-[9px] font-mono" style={{ color: '#A0978E' }}>
                  {Math.round(v2Installment.revolvingInstSplit * 100)}:{Math.round((1 - v2Installment.revolvingInstSplit) * 100)}
                </span>
                <button
                  onClick={() => updateV2Installment({ revolvingInstSplit: Math.min(0.95, v2Installment.revolvingInstSplit + 0.05) })}
                  className="h-6 px-3 text-[10px] font-mono border flex items-center"
                  style={{ borderColor: '#E65100', color: '#E65100', borderRadius: '2px', cursor: 'pointer' }}
                >
                  循环 +5%
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <ParamInputV2 
              label="循环利率(年化)" 
              value={productParams.apr * 100} 
              suffix="%" 
              defaultValue={18.25}
              onChange={(v) => updateProductParams({ apr: v / 100 })}
              tooltip={{ desc: '循环信贷的年化利率，适用于未全额还款的客户余额', formula: '月利息 = 未偿余额 x APR/12 x 循环率' }}
            />
            <ParamInputV2 
              label="分期利率(年化)" 
              value={financialAssumptions.balTransferRate * 100} 
              suffix="%" 
              defaultValue={18.25}
              onChange={(v) => updateFinancialAssumptions({ balTransferRate: v / 100 })}
              tooltip={{ desc: '分期业务的年化利率，按期数折算为等额月费率', formula: '月费率 = 年化率/12 x (期数+1)/(2x期数)' }}
            />
            <ParamInputV2 
              label="分期期数" 
              value={v2Installment?.installmentTenor ?? 12} 
              suffix="期" 
              defaultValue={12}
              onChange={(v) => updateV2Installment?.({ installmentTenor: Math.round(Math.max(3, Math.min(36, v))) })}
              tooltip={{ desc: '分期贷款的还款期数，影响月费率折算和收入分布', formula: '分期期数越长，单笔手续费率越低但总利息越多' }}
            />
          </div>
          <div className="text-[9px] font-mono px-1" style={{ color: '#8B8178' }}>
            余额代偿费率: {((financialAssumptions.balTransferRate || 0.1825) / 12 * ((v2Installment?.installmentTenor || 12) + 1) / (2 * (v2Installment?.installmentTenor || 12)) * 100).toFixed(3)}%/月
          </div>

          {/* 1.2 非息收入相关 */}
          <div className="pt-3 border-t" style={{ borderColor: '#E5DFD6' }}>
            <div className="text-[10px] font-medium uppercase tracking-wider mb-3" style={{ color: '#8B7355' }}>非息收入相关</div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <ParamInputV2 
                label="回佣率" 
                value={productParams.interchangeRate * 100} 
                suffix="%" 
                defaultValue={0.40}
                onChange={(v) => updateProductParams({ interchangeRate: v / 100 })}
                tooltip={{ desc: '每笔消费交易中，发卡行从商户收单行获得的手续费分成比例', formula: '回佣收入 = 月消费额 x 回佣率 x 活跃客户数' }}
              />
              <ParamInputV2 
                label="取现费率" 
                value={productParams.cashAdvanceFee * 100} 
                suffix="%" 
                defaultValue={2.46}
                onChange={(v) => updateProductParams({ cashAdvanceFee: v / 100 })}
                tooltip={{ desc: '客户通过ATM或柜台取现时收取的手续费比例', formula: '取现收入 = 月取现额 x 取现费率 x 活跃客户数' }}
              />
              <ParamInputV2 
                label="超限费" 
                value={productParams.overlimitFee} 
                prefix="¥" 
                defaultValue={20}
                onChange={(v) => updateProductParams({ overlimitFee: v })}
                tooltip={{ desc: '客户消费超出信用额度时收取的固定费用（当前模型中暂未启用）' }}
              />
              <ParamInputV2 
                label="年费" 
                value={productParams.annualFee} 
                prefix="¥" 
                defaultValue={inheritedDefaults.annualFee}
                inheritedFrom={cardProduct ? CARD_PRODUCT_LABELS[cardProduct] : undefined}
                onChange={(v) => updateProductParams({ annualFee: v })}
                tooltip={{ desc: '每年向持卡人收取的卡片使用费，按12个月平均计入月收入', formula: '月年费收入 = 年费/12 x 存活客户数' }}
              />
            </div>
          </div>
        </div>
      </Card>
      
      {/* 2. 财务假设 - matching sidebar sub-groups */}
      <Card className="border overflow-hidden" style={{ backgroundColor: '#FFFFFF', borderColor: '#5D4037', borderRadius: '2px' }}>
        <div 
          className="px-3 py-2 text-xs font-medium flex items-center gap-2"
          style={{ backgroundColor: '#5D4037', color: '#FFFFFF' }}
        >
          <Settings2 className="w-3.5 h-3.5" />
          财务假设
        </div>
        <div className="p-4 space-y-4">
          {/* 2.1 获客成本 */}
          <div>
            <div className="text-[10px] font-medium uppercase tracking-wider mb-3" style={{ color: '#8B7355' }}>获客成本</div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <ParamInputV2 
                label="获客成本 (CAC)" 
                value={financialAssumptions.cac} 
                prefix="¥" 
                defaultValue={inheritedDefaults.cac}
                inheritedFrom={channel ? CHANNEL_LABELS[channel] : undefined}
                onChange={(v) => updateFinancialAssumptions({ cac: v })}
                tooltip={{ desc: '获取单个新客户的一次性营销/渠道成本，在NPV中作为第0期的现金流出', formula: 'PV中直接扣减: -CAC' }}
              />
            </div>
          </div>
          
          {/* 2.2 资金成本 */}
          <div className="pt-3 border-t" style={{ borderColor: '#E5DFD6' }}>
            <div className="text-[10px] font-medium uppercase tracking-wider mb-3" style={{ color: '#8B7355' }}>资金成本</div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <ParamInputV2 
                label="FTP利率" 
                value={financialAssumptions.ftpRate * 100} 
                suffix="%" 
                defaultValue={inheritedDefaults.ftpRate}
                inheritedFrom={cardProduct ? CARD_PRODUCT_LABELS[cardProduct] : undefined}
                onChange={(v) => updateFinancialAssumptions({ ftpRate: v / 100 })}
                tooltip={{ desc: '内部资金转移定价利率，反映银行为信用卡业务配置资金的成本', formula: '已用资金成本 = (消费+余额) x FTP/12 x 活跃客户数' }}
              />
              <ParamInputV2 
                label="未使用额度转换系数" 
                value={(financialAssumptions.unusedLimitCostFactor ?? 0.50) * 100} 
                suffix="%" 
                defaultValue={50}
                onChange={(v) => updateFinancialAssumptions({ unusedLimitCostFactor: v / 100 })}
                tooltip={{ desc: '未使用信用额度需预留的资金头寸比例，监管要求银行为未用授信备付资金', formula: '未用资金成本 = max(0,额度-消费-余额) x FTP/12 x 系数 x 活跃客户 + 额度 x FTP/12 x 系数 x 非活跃存活客户' }}
              />
            </div>
          </div>
          
          {/* 2.3 风险成本 */}
          <div className="pt-3 border-t" style={{ borderColor: '#E5DFD6' }}>
            <div className="text-[10px] font-medium uppercase tracking-wider mb-3" style={{ color: '#8B7355' }}>风险成本</div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <ParamInputV2 
                label="回收率" 
                value={financialAssumptions.recoveryRate * 100} 
                suffix="%" 
                defaultValue={10.5}
                onChange={(v) => updateFinancialAssumptions({ recoveryRate: v / 100 })}
                tooltip={{ desc: '逾期坏账中最终能通过催收回收的比例，用于折减净风险损失', formula: '净风险成本 = 风险损失 x (1 - 回收率)' }}
              />
            </div>
          </div>
          
          {/* 2.4 其他成本 */}
          <div className="pt-3 border-t" style={{ borderColor: '#E5DFD6' }}>
            <div className="text-[10px] font-medium uppercase tracking-wider mb-3" style={{ color: '#8B7355' }}>其他成本</div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <ParamInputV2 
                label="月运营成本" 
                value={financialAssumptions.opexPerCard} 
                prefix="¥" 
                defaultValue={38}
                onChange={(v) => updateFinancialAssumptions({ opexPerCard: v })}
                tooltip={{ desc: '每张卡每月的运营维护成本，包括系统、客服、账单等固定开支', formula: '月运营成本 x 存活客户数，在发卡首月按总额摊销' }}
              />
              <ParamInputV2 
                label="欺诈率" 
                value={financialAssumptions.fraudRate * 100} 
                suffix="%" 
                step={0.01}
                defaultValue={0.03}
                onChange={(v) => updateFinancialAssumptions({ fraudRate: v / 100 })}
                tooltip={{ desc: '因欺诈交易导致的月度损失占消费额的比例', formula: '欺诈成本 = 月消费额 x 欺诈率 x 活跃客户数' }}
              />
              <ParamInputV2 
                label="权益成本率" 
                value={financialAssumptions.rewardsRate * 100} 
                suffix="%" 
                defaultValue={0.5}
                onChange={(v) => updateFinancialAssumptions({ rewardsRate: v / 100 })}
                tooltip={{ desc: '积分/返现等客户权益占消费额的成本比例，受月上限约束', formula: '权益成本 = min(消费额 x 权益率, 月上限) x 活跃客户数' }}
              />
              <ParamInputV2 
                label="权益月上限" 
                value={financialAssumptions.rewardsCap} 
                prefix="¥" 
                defaultValue={100}
                onChange={(v) => updateFinancialAssumptions({ rewardsCap: v })}
                tooltip={{ desc: '每张卡每月权益成本的最大金额，超出部分不再计入', formula: '实际权益 = min(消费额 x 权益率, 此上限)' }}
              />
            </div>
          </div>


        </div>
      </Card>
      
      {/* 3. 压力系数 - matching sidebar order */}
      <Card className="border overflow-hidden" style={{ backgroundColor: '#FFFFFF', borderColor: '#5D4037', borderRadius: '2px' }}>
        <div 
          className="px-3 py-2 text-xs font-medium flex items-center justify-between"
          style={{ backgroundColor: '#5D4037', color: '#FFFFFF' }}
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="w-3.5 h-3.5" />
            压力系数 (乘数)
          </div>
          <span className="text-[10px] font-normal opacity-80">100% = 基准，滑动查看影响</span>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-4">
            <StressSliderV2 
              label="流失率" 
              targetParam="月流失率"
              baselineValue={weightedBaselines.attrition}
              valueUnit="%"
              valueMultiplier={100}
              value={stressCoefficients.attritionMultiplier}
              onChange={(v) => updateStressCoefficients({ attritionMultiplier: v })}
            />
            <StressSliderV2 
              label="活跃率" 
              targetParam="组合加权活跃率"
              baselineValue={weightedBaselines.active}
              valueUnit="%"
              valueMultiplier={100}
              value={stressCoefficients.activeRateMultiplier}
              onChange={(v) => updateStressCoefficients({ activeRateMultiplier: v })}
            />
            <StressSliderV2 
              label="额度使用率" 
              targetParam="组合加权使用率"
              baselineValue={weightedBaselines.utilization}
              valueUnit="%"
              valueMultiplier={100}
              value={stressCoefficients.utilizationMultiplier}
              onChange={(v) => updateStressCoefficients({ utilizationMultiplier: v })}
            />
            <StressSliderV2 
              label="交易额/消费额" 
              targetParam="组合加权月消费额"
              baselineValue={weightedBaselines.spend}
              valueUnit=""
              valuePrefix="¥"
              valueMultiplier={1}
              value={stressCoefficients.spendMultiplier}
              onChange={(v) => updateStressCoefficients({ spendMultiplier: v })}
            />
            <StressSliderV2 
              label="取现金额" 
              targetParam="组合加权月取现额"
              baselineValue={weightedBaselines.cash}
              valueUnit=""
              valuePrefix="¥"
              valueMultiplier={1}
              value={stressCoefficients.cashMultiplier}
              onChange={(v) => updateStressCoefficients({ cashMultiplier: v })}
            />
            <StressSliderV2 
              label="生息资产比例" 
              targetParam="组合加权循环率"
              baselineValue={weightedBaselines.revolving}
              valueUnit="%"
              valueMultiplier={100}
              value={stressCoefficients.revolvingMultiplier}
              onChange={(v) => updateStressCoefficients({ revolvingMultiplier: v })}
            />
            <StressSliderV2 
              label="PD压力" 
              targetParam="组合加权违约概率"
              baselineValue={weightedBaselines.pd}
              valueUnit="%"
              valueMultiplier={100}
              value={stressCoefficients.pdMultiplier}
              onChange={(v) => updateStressCoefficients({ pdMultiplier: v })}
            />
            <StressSliderV2 
              label="损失严重性" 
              targetParam="组合加权Severity"
              baselineValue={weightedBaselines.severity}
              valueUnit="%"
              valueMultiplier={100}
              value={stressCoefficients.lgdMultiplier}
              onChange={(v) => updateStressCoefficients({ lgdMultiplier: v })}
            />
          </div>
        </div>
      </Card>
    </div>
  );
}

// Parameter Input Component V2 with JetBrains Mono, default indicator, and inheritance display
function ParamInputV2({
  label,
  value,
  prefix,
  suffix,
  defaultValue,
  inheritedFrom,
  onChange,
  disabled = false,
  step,
  tooltip,
}: {
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
  defaultValue: number;
  inheritedFrom?: string;
  onChange: (v: number) => void;
  disabled?: boolean;
  step?: number;
  tooltip?: { desc: string; formula?: string };
}) {
  const isDefault = Math.abs(value - defaultValue) < 0.001;
  // Round to avoid floating-point display noise
  const displayValue = parseFloat(value.toPrecision(10));
  
  return (
    <div>
      <label className="flex items-center gap-1 text-xs mb-1.5" style={{ color: '#6B5B4F' }}>
        {label}
        {tooltip && (
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="w-3 h-3 cursor-help flex-shrink-0" style={{ color: '#B0A898' }} />
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[260px] p-2.5" style={{ backgroundColor: '#3E2723', color: '#F5F0E8', borderRadius: '3px', border: 'none' }}>
                <div className="text-[11px] leading-relaxed">{tooltip.desc}</div>
                {tooltip.formula && (
                  <div className="text-[10px] mt-1.5 pt-1.5 border-t font-mono leading-relaxed" style={{ borderColor: '#5D4037', color: '#D7CCC8' }}>
                    {tooltip.formula}
                  </div>
                )}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </label>
      <div className="relative">
        {prefix && (
          <span 
            className="absolute left-2 top-1/2 -translate-y-1/2 text-xs" 
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
          disabled={disabled}
          className="text-xs h-8"
          style={{ 
            backgroundColor: disabled ? '#F5F0E8' : '#FFFFFF',
            borderColor: '#E5DFD6',
            paddingLeft: prefix ? '22px' : '8px',
            paddingRight: suffix ? '28px' : '8px',
            borderRadius: '2px',
            fontFamily: 'var(--font-jetbrains), monospace',
          }}
        />
        {suffix && (
          <span 
            className="absolute right-2 top-1/2 -translate-y-1/2 text-xs" 
            style={{ color: '#8B8178', fontFamily: 'var(--font-jetbrains), monospace' }}
          >
            {suffix}
          </span>
        )}
      </div>
      <div className="flex items-center justify-between mt-1">
        <div className="flex items-center gap-1">
          <span className="text-[10px]" style={{ color: '#A0978E' }}>
            默认: {prefix}{typeof defaultValue === 'number' ? defaultValue.toFixed(suffix === '%' ? 2 : 0) : defaultValue}{suffix}
          </span>
          {inheritedFrom && (
            <span 
              className="text-[9px] px-1 py-0.5"
              style={{ 
                backgroundColor: '#E8F4E8', 
                color: '#4C6B4C',
                borderRadius: '2px',
              }}
            >
              来自 {inheritedFrom}
            </span>
          )}
        </div>
        {!isDefault && (
          <button 
            onClick={() => onChange(defaultValue)}
            className="text-[10px] underline"
            style={{ color: '#C19A6B' }}
          >
            重置
          </button>
        )}
      </div>
    </div>
  );
}

// Stress Slider V2 with Impact Mapping
function StressSliderV2({
  label,
  targetParam,
  baselineValue,
  valueUnit,
  valuePrefix = '',
  valueMultiplier,
  value,
  onChange,
}: {
  label: string;
  targetParam: string;
  baselineValue: number;
  valueUnit: string;
  valuePrefix?: string;
  valueMultiplier: number;
  value: number;
  onChange: (v: number) => void;
}) {
  const resultingValue = baselineValue * value * valueMultiplier;
  const isBaseline = Math.abs(value - 1) < 0.001;
  const isStress = value > 1;
  
  return (
    <div className="space-y-2">
      {/* Header: Label + Coefficient Value */}
      <div className="flex justify-between items-center">
        <label className="text-xs font-medium" style={{ color: '#4A3728' }}>{label}</label>
        <span 
          className="text-xs font-semibold px-1.5 py-0.5"
          style={{ 
            color: isBaseline ? '#4A3728' : isStress ? '#FFFFFF' : '#FFFFFF',
            backgroundColor: isBaseline ? '#F0EBE3' : isStress ? '#C17A6B' : '#6B9A6B',
            borderRadius: '2px',
            fontFamily: 'var(--font-jetbrains), monospace',
          }}
        >
          {(value * 100).toFixed(0)}%
        </span>
      </div>
      
      {/* Slider */}
      <Slider
        value={[value]}
        min={0.5}
        max={2.0}
        step={0.05}
        onValueChange={(v) => onChange(v[0])}
      />
      
      {/* Impact Indicator */}
      <div 
        className="flex items-center justify-between px-2 py-1.5 text-[10px]"
        style={{ 
          backgroundColor: '#F5F0E8', 
          borderRadius: '2px',
          border: '1px solid #E5DFD6',
        }}
      >
        <span style={{ color: '#6B5B4F' }}>
          {targetParam}
        </span>
        <span 
          style={{ 
            color: isBaseline ? '#4A3728' : isStress ? '#8B4C4C' : '#4C6B4C',
            fontFamily: 'var(--font-jetbrains), monospace',
            fontWeight: 600,
          }}
        >
          {valuePrefix}{resultingValue.toFixed(valueUnit === '%' ? 2 : 0)}{valueUnit}
        </span>
      </div>
    </div>
  );
}
