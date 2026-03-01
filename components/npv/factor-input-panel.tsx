'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { useNPV } from '@/lib/npv-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  ArrowLeft,
  ArrowRight,
  Calculator,
  Info,
  RefreshCw,
  Settings,
  Wallet,
  Activity,
  Loader2,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function InputField({
  label,
  description,
  value,
  onChange,
  prefix,
  suffix,
  min,
  max,
  step = 1,
  highlighted,
}: {
  label: string;
  description: string;
  value: number;
  onChange: (v: number) => void;
  prefix?: string;
  suffix?: string;
  min?: number;
  max?: number;
  step?: number;
  highlighted?: boolean;
}) {
  return (
    <div className={cn(
      'rounded-lg border p-3 transition-all',
      highlighted ? 'border-amber-600 bg-amber-50/50' : 'border-border bg-card',
    )}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <Label className="text-xs font-medium">{label}</Label>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3 w-3 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent><p className="text-xs">{description}</p></TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
      <div className="relative">
        {prefix && (
          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{prefix}</span>
        )}
        <Input
          type="number"
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={(e) => onChange(Number(e.target.value))}
          className={cn('h-8 text-sm text-right', prefix && 'pl-6', suffix && 'pr-8')}
        />
        {suffix && (
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{suffix}</span>
        )}
      </div>
    </div>
  );
}

function SliderField({
  label,
  description,
  value,
  onChange,
  min = 0.5,
  max = 2.0,
  step = 0.05,
  hint,
  highlighted,
}: {
  label: string;
  description: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  hint?: string;
  highlighted?: boolean;
}) {
  return (
    <div className={cn(
      'rounded-lg border p-3 transition-all',
      highlighted ? 'border-amber-600 bg-amber-50/50' : 'border-border bg-card',
    )}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <Label className="text-xs font-medium">{label}</Label>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3 w-3 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent><p className="text-xs">{description}</p></TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <span className="text-sm font-semibold tabular-nums" style={{ color: value !== 1.0 ? '#A52A2A' : '#5D4037' }}>
          {value.toFixed(2)}x
        </span>
      </div>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={([v]) => onChange(v)}
        className="w-full"
      />
      <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
        <span>{min}x</span>
        {hint && <span className="text-[10px]" style={{ color: '#8B7355' }}>{hint}</span>}
        <span>{max}x</span>
      </div>
    </div>
  );
}

function SelectField({
  label,
  description,
  value,
  onChange,
  options,
}: {
  label: string;
  description: string;
  value: number;
  onChange: (v: number) => void;
  options: { value: number; label: string }[];
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <Label className="text-xs font-medium">{label}</Label>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3 w-3 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent><p className="text-xs">{description}</p></TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
      <select
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-8 text-sm border rounded px-2 bg-white"
      >
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Section header                                                     */
/* ------------------------------------------------------------------ */

function SectionHeader({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle?: string }) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </div>
      <div>
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
        {subtitle && <p className="text-[11px] text-muted-foreground">{subtitle}</p>}
      </div>
    </div>
  );
}

function SubGroupLabel({ label }: { label: string }) {
  return (
    <div className="col-span-full text-[10px] font-semibold uppercase tracking-wider mt-2 mb-0.5" style={{ color: '#8B7355' }}>
      {label}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Panel                                                         */
/* ------------------------------------------------------------------ */

export function FactorInputPanel() {
  const {
    businessFactors,
    updateProductParams,
    updateFinancialAssumptions,
    updateStressCoefficients,
    updateV2Installment,
    resetFactors,
    runCalculation,
    isCalculating,
    setCurrentStep,
    highlightedFactors,
  } = useNPV();

  const isHL = (key: string) => highlightedFactors.includes(key);
  const pp = businessFactors.productParams;
  const fa = businessFactors.financialAssumptions;
  const sc = businessFactors.stressCoefficients;
  const v2 = businessFactors.v2Installment;

  // Revolving / installment split display
  const revPct = Math.round((v2.revolvingInstSplit) * 100);
  const instPct = 100 - revPct;

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">参数假设</h2>
          <p className="mt-1 text-muted-foreground">
            调整各项业务参数，影响NPV测算结果
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={resetFactors} className="gap-2 bg-transparent">
            <RefreshCw className="h-4 w-4" />
            重置参数
          </Button>
        </div>
      </div>

      {/* ============ 1. 定价参数 ============ */}
      <section className="rounded-xl border bg-card/50 p-6">
        <SectionHeader icon={<Settings className="h-5 w-5" />} title="定价参数" subtitle="利息收入及非息收入相关定价" />

        {/* 1.1 利息收入相关 */}
        <SubGroupLabel label="利息收入相关" />
        {/* Revolving/Installment split bar */}
        <div className="mb-3">
          <div className="flex h-6 overflow-hidden rounded border" style={{ borderColor: '#E5DFD6' }}>
            <div className="flex items-center justify-center text-[10px] font-mono text-white" style={{ width: `${revPct}%`, backgroundColor: '#E65100', transition: 'width 0.3s' }}>
              {revPct > 12 ? `循环 ${revPct}%` : ''}
            </div>
            <div className="flex items-center justify-center text-[10px] font-mono text-white" style={{ width: `${instPct}%`, backgroundColor: '#3949AB', transition: 'width 0.3s' }}>
              {instPct > 12 ? `分期 ${instPct}%` : ''}
            </div>
          </div>
          <div className="flex items-center justify-center gap-3 mt-2">
            <button
              onClick={() => updateV2Installment({ revolvingInstSplit: Math.max(0.05, v2.revolvingInstSplit - 0.05) })}
              className="h-6 px-3 text-[10px] font-mono border flex items-center justify-center rounded"
              style={{ borderColor: '#3949AB', color: '#3949AB', cursor: 'pointer' }}
            >
              分期+
            </button>
            <span className="text-[11px] font-mono text-muted-foreground">
              {revPct}:{instPct}
            </span>
            <button
              onClick={() => updateV2Installment({ revolvingInstSplit: Math.min(0.95, v2.revolvingInstSplit + 0.05) })}
              className="h-6 px-3 text-[10px] font-mono border flex items-center justify-center rounded"
              style={{ borderColor: '#E65100', color: '#E65100', cursor: 'pointer' }}
            >
              循环+
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <InputField
            label="循环利率(年化)"
            description="循环信贷年化利率"
            value={Number((pp.apr * 100).toFixed(2))}
            suffix="%"
            min={5}
            max={24}
            step={0.25}
            onChange={(v) => updateProductParams({ apr: v / 100 })}
            highlighted={isHL('apr')}
          />
          <InputField
            label="分期利率(年化)"
            description="分期业务年化利率"
            value={Number(((fa.balTransferRate ?? 0.1825) * 100).toFixed(2))}
            suffix="%"
            min={5}
            max={24}
            step={0.25}
            onChange={(v) => updateFinancialAssumptions({ balTransferRate: v / 100 })}
          />
          <SelectField
            label="分期期数"
            description="每笔分期的默认期数"
            value={v2.installmentTenor ?? 12}
            onChange={(v) => updateV2Installment({ installmentTenor: v })}
            options={[3,6,9,12,18,24,36].map(n => ({ value: n, label: `${n}期` }))}
          />
          <div className="rounded-lg border border-border bg-muted/30 p-3 flex flex-col justify-center">
            <span className="text-[10px] text-muted-foreground">余额代偿费率</span>
            <span className="text-sm font-semibold tabular-nums" style={{ fontFamily: 'var(--font-jetbrains), monospace' }}>
              {((fa.balTransferRate || 0.1825) / 12 * ((v2.installmentTenor || 12) + 1) / (2 * (v2.installmentTenor || 12)) * 100).toFixed(3)}%/月
            </span>
          </div>
        </div>

        {/* 1.2 非息收入相关 */}
        <SubGroupLabel label="非息收入相关" />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <InputField
            label="回佣率"
            description="商户回佣比例"
            value={Number((pp.interchangeRate * 100).toFixed(2))}
            suffix="%"
            min={0.1}
            max={3}
            step={0.05}
            onChange={(v) => updateProductParams({ interchangeRate: v / 100 })}
            highlighted={isHL('interchangeRate')}
          />
          <InputField
            label="取现费率"
            description="取现手续费率"
            value={Number((pp.cashAdvanceFee * 100).toFixed(2))}
            suffix="%"
            min={0.5}
            max={5}
            step={0.1}
            onChange={(v) => updateProductParams({ cashAdvanceFee: v / 100 })}
          />
          <InputField
            label="超限费"
            description="超出额度时收取的费用"
            value={pp.overlimitFee}
            prefix="¥"
            min={0}
            max={200}
            step={5}
            onChange={(v) => updateProductParams({ overlimitFee: v })}
          />
          <InputField
            label="年费"
            description="信用卡年度服务费"
            value={pp.annualFee}
            prefix="¥"
            min={0}
            max={3000}
            step={50}
            onChange={(v) => updateProductParams({ annualFee: v })}
            highlighted={isHL('annualFee')}
          />
        </div>
      </section>

      {/* ============ 2. 财务假设 ============ */}
      <section className="rounded-xl border bg-card/50 p-6">
        <SectionHeader icon={<Wallet className="h-5 w-5" />} title="财务假设" subtitle="成本结构与费率假设" />

        {/* 2.1 获客成本 */}
        <SubGroupLabel label="获客成本" />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 mb-1">
          <InputField
            label="CAC 获客成本"
            description="单客户获取成本"
            value={fa.cac}
            prefix="¥"
            min={0}
            max={5000}
            step={50}
            onChange={(v) => updateFinancialAssumptions({ cac: v })}
            highlighted={isHL('cac')}
          />
        </div>

        {/* 2.2 资金成本 */}
        <SubGroupLabel label="资金成本" />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 mb-1">
          <InputField
            label="FTP 利率"
            description="内部资金转移价格"
            value={Number((fa.ftpRate * 100).toFixed(2))}
            suffix="%"
            min={0.5}
            max={8}
            step={0.25}
            onChange={(v) => updateFinancialAssumptions({ ftpRate: v / 100 })}
            highlighted={isHL('ftpRate')}
          />
          <InputField
            label="未使用额度转换系数"
            description="闲置额度占用资金比例"
            value={Number(((fa.unusedLimitCostFactor ?? 0.50) * 100).toFixed(0))}
            suffix="%"
            min={0}
            max={100}
            step={5}
            onChange={(v) => updateFinancialAssumptions({ unusedLimitCostFactor: v / 100 })}
          />
        </div>

        {/* 2.3 风险成本 */}
        <SubGroupLabel label="风险成本" />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 mb-1">
          <InputField
            label="回收率"
            description="违约后资产回收比例"
            value={Number((fa.recoveryRate * 100).toFixed(1))}
            suffix="%"
            min={0}
            max={50}
            step={0.5}
            onChange={(v) => updateFinancialAssumptions({ recoveryRate: v / 100 })}
          />
        </div>

        {/* 2.4 其他成本 */}
        <SubGroupLabel label="其他成本" />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <InputField
            label="月运营成本"
            description="每卡月运营费用"
            value={fa.opexPerCard}
            prefix="¥"
            min={0}
            max={200}
            step={5}
            onChange={(v) => updateFinancialAssumptions({ opexPerCard: v })}
            highlighted={isHL('opexPerCard')}
          />
          <InputField
            label="欺诈率"
            description="欺诈损失率"
            value={Number(((fa.fraudRate ?? 0.0003) * 100).toFixed(3))}
            suffix="%"
            min={0}
            max={1}
            step={0.01}
            onChange={(v) => updateFinancialAssumptions({ fraudRate: v / 100 })}
          />
          <InputField
            label="权益成本率"
            description="消费权益返还比例"
            value={Number(((fa.rewardsRate ?? 0.005) * 100).toFixed(2))}
            suffix="%"
            min={0}
            max={3}
            step={0.1}
            onChange={(v) => updateFinancialAssumptions({ rewardsRate: v / 100 })}
            highlighted={isHL('rewardsRate')}
          />
          <InputField
            label="权益月上限"
            description="每账户每月权益上限"
            value={fa.rewardsCap ?? 100}
            prefix="¥"
            min={0}
            max={500}
            step={10}
            onChange={(v) => updateFinancialAssumptions({ rewardsCap: v })}
          />
        </div>
      </section>

      {/* ============ 3. 压力系数 ============ */}
      <section className="rounded-xl border bg-card/50 p-6">
        <SectionHeader icon={<Activity className="h-5 w-5" />} title="压力系数" subtitle="行为及风险参数压力调节 (1.0x = 基准)" />
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
          <SliderField
            label="流失率"
            description="客户流失压力系数"
            value={sc.attritionMultiplier}
            onChange={(v) => updateStressCoefficients({ attritionMultiplier: v })}
          />
          <SliderField
            label="活跃率"
            description="月度活跃率压力系数"
            value={sc.activeRateMultiplier}
            onChange={(v) => updateStressCoefficients({ activeRateMultiplier: v })}
          />
          <SliderField
            label="额度使用率"
            description="信用额度使用率压力系数"
            value={sc.utilizationMultiplier}
            onChange={(v) => updateStressCoefficients({ utilizationMultiplier: v })}
          />
          <SliderField
            label="交易额/消费额"
            description="月消费金额压力系数"
            value={sc.spendMultiplier}
            onChange={(v) => updateStressCoefficients({ spendMultiplier: v })}
          />
          <SliderField
            label="取现金额"
            description="取现金额压力系数"
            value={sc.cashMultiplier}
            onChange={(v) => updateStressCoefficients({ cashMultiplier: v })}
          />
          <SliderField
            label="生息资产比例"
            description="循环/分期率压力系数"
            value={sc.revolvingMultiplier}
            onChange={(v) => updateStressCoefficients({ revolvingMultiplier: v })}
            highlighted={isHL('revolvingRate')}
          />
          <SliderField
            label="PD 压力"
            description="违约率压力系数"
            value={sc.pdMultiplier}
            onChange={(v) => updateStressCoefficients({ pdMultiplier: v })}
            highlighted={isHL('pdMultiplier')}
          />
          <SliderField
            label="损失严重性"
            description="Severity / LGD 压力系数"
            value={sc.lgdMultiplier}
            onChange={(v) => updateStressCoefficients({ lgdMultiplier: v })}
            highlighted={isHL('lgdMultiplier')}
          />
        </div>
      </section>

      {/* Action Buttons */}
      <div className="flex justify-between border-t border-border pt-6">
        <Button
          variant="outline"
          onClick={() => setCurrentStep('scenario')}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          返回场景配置
        </Button>

        <Button
          size="lg"
          onClick={runCalculation}
          disabled={isCalculating}
          className="gap-2"
        >
          {isCalculating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              计算中...
            </>
          ) : (
            <>
              <Calculator className="h-4 w-4" />
              运行NPV测算
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
