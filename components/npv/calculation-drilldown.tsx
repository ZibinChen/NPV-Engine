'use client';

import React from 'react';
import type { NPVResult, BusinessFactors } from '@/lib/npv-types';
import { X } from 'lucide-react';

// ============================================================================
// Shared formatting helpers
// ============================================================================
const fmt = (v: number) =>
  v < 0
    ? `-¥${Math.abs(v).toLocaleString('zh-CN', { maximumFractionDigits: 0 })}`
    : `¥${v.toLocaleString('zh-CN', { maximumFractionDigits: 0 })}`;

const pct = (v: number) => `${(v * 100).toFixed(2)}%`;

// ============================================================================
// Reusable UI primitives
// ============================================================================

function FormulaBlock({ formula, description }: { formula: string; description?: string }) {
  return (
    <div className="px-4 py-3 my-3 border" style={{ backgroundColor: '#F5F0E8', borderColor: '#E5DFD6', borderRadius: '2px' }}>
      {description && (
        <div className="text-xs mb-1.5" style={{ color: '#8B8178' }}>{description}</div>
      )}
      <div className="text-sm font-medium" style={{ color: '#4A3728' }}>{formula}</div>
    </div>
  );
}

function StepHeading({ step, title }: { step: number; title: string }) {
  return (
    <div className="flex items-center gap-2 mt-5 mb-3">
      <span
        className="flex-shrink-0 w-6 h-6 flex items-center justify-center text-xs font-bold"
        style={{ backgroundColor: '#5D4037', color: '#FFFFFF', borderRadius: '2px' }}
      >
        {step}
      </span>
      <span className="text-sm font-semibold" style={{ color: '#4A3728' }}>{title}</span>
    </div>
  );
}

function ParamRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <tr style={highlight ? { backgroundColor: '#FDF5E6' } : {}}>
      <td className="px-3 py-1.5 text-xs border-b" style={{ borderColor: '#E5DFD6', color: '#6B5B4F' }}>{label}</td>
      <td className="px-3 py-1.5 text-xs text-right font-mono border-b" style={{ borderColor: '#E5DFD6', color: '#4A3728' }}>{value}</td>
    </tr>
  );
}

function ResultHighlight({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="flex items-center justify-between px-4 py-3 my-3 border"
      style={{ backgroundColor: '#5D4037', borderColor: '#5D4037', borderRadius: '2px' }}
    >
      <span className="text-xs font-medium" style={{ color: '#D7CCC8' }}>{label}</span>
      <span className="text-sm font-mono font-bold" style={{ color: '#FFFFFF' }}>{value}</span>
    </div>
  );
}

function YearMatrix({
  title,
  headers,
  rows,
}: {
  title: string;
  headers: string[];
  rows: { label: string; values: string[]; highlight?: boolean }[];
}) {
  return (
    <div className="my-2 overflow-x-auto">
      <div className="text-xs font-medium mb-2" style={{ color: '#8B8178' }}>{title}</div>
      <table className="w-full text-[10px]" style={{ minWidth: '500px' }}>
        <thead>
          <tr style={{ backgroundColor: '#F5F0E8' }}>
            <th className="px-1.5 py-1 text-left font-medium border-b sticky left-0 bg-[#F5F0E8]" style={{ borderColor: '#E5DFD6', color: '#5D4037' }}></th>
            {headers.map((h) => (
              <th key={h} className="px-1.5 py-1 text-right font-medium border-b" style={{ borderColor: '#E5DFD6', color: '#5D4037' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} style={row.highlight ? { backgroundColor: '#FDF5E6' } : {}}>
              <td className="px-1.5 py-1 font-medium border-b sticky left-0 bg-white" style={{ borderColor: '#E5DFD6', color: '#5D4037', ...(row.highlight ? { backgroundColor: '#FDF5E6' } : {}) }}>{row.label}</td>
              {row.values.map((v, i) => (
                <td key={i} className="px-1.5 py-1 text-right font-mono border-b" style={{ borderColor: '#E5DFD6', color: '#4A3728' }}>{v}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ============================================================================
// Per-item drilldown content generators
// ============================================================================

type DrilldownProps = { result: NPVResult; factors: BusinessFactors };

const yearHeaders = ['第1年', '第2年', '第3年', '第4年', '第5年', '第6年', '第7年', '第8年'];

function getWeightedAnnual(result: NPVResult, factors: BusinessFactors) {
  const w: ReturnType<typeof zeroAnnualRow>[] = [];
  for (let yr = 0; yr < 8; yr++) {
    const row = zeroAnnualRow();
    for (const r of result.riskLevelResults) {
      const pctW = factors.riskDistribution.find(d => d.level === r.level)?.percentage || 0;
      const m = r.annualMetrics?.[yr];
      if (!m) continue;
      row.activityRate += m.activityRate * pctW;
      row.transaction += m.transaction * pctW;
      row.balance += m.balance * pctW;
      row.revolvingRate += m.revolvingRate * pctW;
      row.revolvingBalance += m.revolvingBalance * pctW;
      row.pd += m.pd * pctW;
      row.lgd += m.lgd * pctW;
      row.interestIncome += m.interestIncome * pctW;
      row.nonInterestIncome += m.nonInterestIncome * pctW;
      row.nintInterchange += m.nintInterchange * pctW;
      row.nintAnnualFee += m.nintAnnualFee * pctW;
      row.nintCashAdvance += m.nintCashAdvance * pctW;
      row.riskCost += m.riskCost * pctW;
      row.fundingCost += m.fundingCost * pctW;
      row.opexAmortized += m.opexAmortized * pctW;
      row.fraudCost += m.fraudCost * pctW;
      row.rewardsCost += m.rewardsCost * pctW;
      row.installmentIncome += (m.installmentIncome || 0) * pctW;
      row.installmentRate += (m.installmentRate || 0) * pctW;
      row.uipPast += (m.uipPast || 0) * pctW;
    }
    w.push(row);
  }
  return w;
}

function zeroAnnualRow() {
  return {
    activityRate: 0, transaction: 0, balance: 0,
    revolvingRate: 0, revolvingBalance: 0, pd: 0, lgd: 0,
    interestIncome: 0, nonInterestIncome: 0,
    nintInterchange: 0, nintAnnualFee: 0, nintCashAdvance: 0,
    riskCost: 0, fundingCost: 0, opexAmortized: 0, fraudCost: 0, rewardsCost: 0,
    installmentIncome: 0, installmentRate: 0, uipPast: 0,
  };
}

// ---------- CAC ----------
function CACDrilldown({ result, factors }: DrilldownProps) {
  const cac = factors.financialAssumptions.cac;
  return (
    <>
      <StepHeading step={1} title="获客成本" />
      <FormulaBlock formula="获客成本 = 每张卡的渠道获客费用，在开卡当月一次性扣除" description="仅第1个月发生，无需折现" />
      <table className="w-full text-[10px] my-2"><tbody>
        <ParamRow label="每卡获客费" value={fmt(cac)} />
        <ParamRow label="发生时间" value="第1个月（无折现）" />
      </tbody></table>
      <StepHeading step={2} title="加权说明" />
      <FormulaBlock formula={`所有风险等级共用同一获客费 ${fmt(cac)}，无需按等级拆分`} />
      <ResultHighlight label="获客成本（折现值）" value={fmt(-cac)} />
    </>
  );
}

// ---------- Interest Income (循环收入) ----------
function InterestDrilldown({ result, factors }: DrilldownProps) {
  const wa = getWeightedAnnual(result, factors);
  const apr = factors.productParams.apr;
  return (
    <>
      <StepHeading step={1} title="每月循环收入的计算方式" />
      <FormulaBlock
        formula="每月循环收入 = 信用卡余额 x 循环率 x 循环月利率 x 活跃客户数"
        description="循环率独立于分期率，受循环利率(自价格弹性强)和分期利率(交叉弹性弱)双向调节"
      />
      <table className="w-full text-[10px] my-2"><tbody>
        <ParamRow label="年化利率" value={pct(apr)} />
        <ParamRow label="月利率（年化/12）" value={pct(apr / 12)} />
      </tbody></table>

      <StepHeading step={2} title="客户存活与活跃递推" />
      <FormulaBlock
        formula="存活客户 = 上月存活数 x (1 - 当月流失率)；活跃客户 = 存活客户 x 当月活跃率"
        description="客户逐月流失后，只有活跃的才产生利息"
      />
      <YearMatrix
        title="加权活跃率（按风险等级加权）"
        headers={yearHeaders}
        rows={[
          { label: '活跃率', values: wa.map(m => pct(m.activityRate)), highlight: true },
        ]}
      />

      <StepHeading step={3} title="余额和循环率年度数据" />
      <YearMatrix
        title="驱动因子（加权）"
        headers={yearHeaders}
        rows={[
          { label: '平均余额', values: wa.map(m => fmt(Math.round(m.balance))) },
          { label: '循环率', values: wa.map(m => pct(m.revolvingRate)), highlight: true },
          { label: '循环余额', values: wa.map(m => fmt(Math.round(m.revolvingBalance))) },
        ]}
      />

      <StepHeading step={4} title="各年利息收入（折现后）" />
      <YearMatrix
        title="利息收入折现值"
        headers={yearHeaders}
        rows={[
          { label: '利息折现值', values: wa.map(m => fmt(Math.round(m.interestIncome))), highlight: true },
        ]}
      />
      <ResultHighlight label="循环收入折现合计" value={fmt(Math.round(wa.reduce((s, m) => s + m.interestIncome, 0)))} />
    </>
  );
}

// ---------- Interchange (回佣) ----------
function InterchangeDrilldown({ result, factors }: DrilldownProps) {
  const wa = getWeightedAnnual(result, factors);
  const rate = factors.productParams.interchangeRate;
  return (
    <>
      <StepHeading step={1} title="每月回佣的计算方式" />
      <FormulaBlock
        formula="每月回佣 = 当月消费金额 x 商户回佣费率 x 活跃客户数"
        description="商户每笔交易向发卡行支付的手续费分成"
      />
      <table className="w-full text-[10px] my-2"><tbody>
        <ParamRow label="回佣费率" value={pct(rate)} />
      </tbody></table>
      <StepHeading step={2} title="消费金额（加权）" />
      <YearMatrix
        title="驱动因子"
        headers={yearHeaders}
        rows={[
          { label: '活跃率', values: wa.map(m => pct(m.activityRate)) },
          { label: '年消费总额', values: wa.map(m => fmt(Math.round(m.transaction))), highlight: true },
        ]}
      />
      <StepHeading step={3} title="各年回佣（折现后）" />
      <YearMatrix
        title="回佣折现值"
        headers={yearHeaders}
        rows={[{ label: '回佣折现值', values: wa.map(m => fmt(Math.round(m.nintInterchange))), highlight: true }]}
      />
      <ResultHighlight label="回佣折现合计" value={fmt(Math.round(wa.reduce((s, m) => s + m.nintInterchange, 0)))} />
    </>
  );
}

// ---------- Annual Fee (年费) ----------
function AnnualFeeDrilldown({ result, factors }: DrilldownProps) {
  const wa = getWeightedAnnual(result, factors);
  const fee = factors.productParams.annualFee;
  return (
    <>
      <StepHeading step={1} title="年费的计算方式" />
      <FormulaBlock
        formula="年费 = 年费金额 x 存活客户数（每12个月收取一次，在第0、12、24...月收取）"
        description="年费按存活客户数收取，不要求客户活跃"
      />
      <table className="w-full text-[10px] my-2"><tbody>
        <ParamRow label="年费金额" value={fmt(fee)} />
        <ParamRow label="收取频率" value="每12个月一次" />
        <ParamRow label="计费口径" value="存活客户（非活跃客户也收取）" />
      </tbody></table>
      <StepHeading step={2} title="各年年费（折现后）" />
      <YearMatrix
        title="年费折现值"
        headers={yearHeaders}
        rows={[{ label: '年费折现值', values: wa.map(m => fmt(Math.round(m.nintAnnualFee))), highlight: true }]}
      />
      <ResultHighlight label="年费折现合计" value={fmt(Math.round(wa.reduce((s, m) => s + m.nintAnnualFee, 0)))} />
    </>
  );
}

// ---------- Cash Advance Fee (取现费) ----------
function CashAdvanceDrilldown({ result, factors }: DrilldownProps) {
  const wa = getWeightedAnnual(result, factors);
  const rate = factors.productParams.cashAdvanceFee;
  const ovlFee = factors.productParams.overlimitFee;
  return (
    <>
      <StepHeading step={1} title="取现费与超限费的计算方式" />
      <FormulaBlock
        formula="取现费 = 取现金额 x 取现费率 x 活跃客户数 + 超限费金额 x 超限发生率 x 活跃客户数"
        description="两项手续费均以活跃客户为口径计算"
      />
      <table className="w-full text-[10px] my-2"><tbody>
        <ParamRow label="取现费率" value={pct(rate)} />
        <ParamRow label="超限费（每次）" value={fmt(ovlFee)} />
      </tbody></table>
      <StepHeading step={2} title="各年取现费（折现后）" />
      <YearMatrix
        title="取现及超限费折现值"
        headers={yearHeaders}
        rows={[{ label: '取现费折现值', values: wa.map(m => fmt(Math.round(m.nintCashAdvance))), highlight: true }]}
      />
      <ResultHighlight label="取现费折现合计" value={fmt(Math.round(wa.reduce((s, m) => s + m.nintCashAdvance, 0)))} />
    </>
  );
}

// ---------- Funding Cost (资金成本) ----------
function FundingCostDrilldown({ result, factors }: DrilldownProps) {
  const wa = getWeightedAnnual(result, factors);
  const ftp = factors.financialAssumptions.ftpRate;
  const unusedFactor = factors.financialAssumptions.unusedLimitCostFactor ?? 0.50;
  return (
    <>
      <StepHeading step={1} title="资金成本的两部分构成" />
      <FormulaBlock
        formula="资金成本 = 已用额度资金成本 + 未用额度资金成本"
        description="银行为信用卡业务占用的资金支付的内部利息，分为已使用额度和未使用额度两部分"
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 my-3">
        <div className="p-3 border" style={{ backgroundColor: '#FAFAF8', borderColor: '#E5DFD6', borderRadius: '2px' }}>
          <div className="text-xs font-semibold mb-2" style={{ color: '#5D4037' }}>已用额度资金成本</div>
          <FormulaBlock formula="(消费金额 + 信用卡余额) x FTP月利率 x 活跃客户数" />
          <div className="text-[11px]" style={{ color: '#6B5B4F' }}>银行为客户实际占用的资金（消费+余额）按FTP利率计算的内部资金转移成本</div>
        </div>
        <div className="p-3 border" style={{ backgroundColor: '#FDF5E6', borderColor: '#E5DFD6', borderRadius: '2px' }}>
          <div className="text-xs font-semibold mb-2" style={{ color: '#E65100' }}>未用额度资金成本</div>
          <FormulaBlock formula="max(0, 额度-消费额-余额) x FTP月利率 x 转换系数 x 活跃客户数 + 额度 x FTP月利率 x 转换系数 x (存活客户数 - 活跃客户数)" />
          <div className="text-[11px] mt-2 leading-relaxed" style={{ color: '#6B5B4F' }}>
            <span className="font-semibold">第一项（活跃客户）：</span>活跃客户中未使用的额度部分(额度-消费-余额)产生的资金占用成本<br/>
            <span className="font-semibold">第二项（非活跃存活客户）：</span>存活但不活跃的客户，其全部额度均视为未使用，按转换系数折算资金占用成本
          </div>
        </div>
      </div>

      <StepHeading step={2} title="关键参数" />
      <table className="w-full text-xs my-2"><tbody>
        <ParamRow label="年化FTP利率" value={pct(ftp)} />
        <ParamRow label="FTP月利率" value={pct(ftp / 12)} />
        <ParamRow label="未使用额度转换系数" value={pct(unusedFactor)} highlight />
      </tbody></table>

      <StepHeading step={3} title="驱动因子（加权）" />
      <YearMatrix
        title="余额、消费额与活跃率"
        headers={yearHeaders}
        rows={[
          { label: '平均余额', values: wa.map(m => fmt(Math.round(m.balance))) },
          { label: '年消费额', values: wa.map(m => fmt(Math.round(m.transaction))) },
          { label: '活跃率', values: wa.map(m => pct(m.activityRate)) },
        ]}
      />

      <StepHeading step={4} title="各年资金成本明细（折现后）" />
      <YearMatrix
        title="资金成本分项"
        headers={yearHeaders}
        rows={[
          { label: '已用额度资金成本', values: wa.map(m => fmt(-Math.round(m.fundingCostUsed || 0))) },
          { label: '未用额度资金成本', values: wa.map(m => fmt(-Math.round(m.fundingCostUnused || 0))), highlight: true },
          { label: '资金成本合计', values: wa.map(m => fmt(-Math.round(m.fundingCost))), highlight: true },
        ]}
      />
      <div className="flex gap-4 mt-2">
        <ResultHighlight label="已用额度资金成本合计" value={fmt(-Math.round(wa.reduce((s, m) => s + (m.fundingCostUsed || 0), 0)))} />
        <ResultHighlight label="未用额度资金成本合计" value={fmt(-Math.round(wa.reduce((s, m) => s + (m.fundingCostUnused || 0), 0)))} />
      </div>
      <ResultHighlight label="资金成本折现总计" value={fmt(-Math.round(wa.reduce((s, m) => s + m.fundingCost, 0)))} />
    </>
  );
}

// ---------- Risk Cost (风险成本) ----------
function RiskCostDrilldown({ result, factors }: DrilldownProps) {
  const wa = getWeightedAnnual(result, factors);
  const recovery = factors.financialAssumptions.recoveryRate;
  return (
    <>
      <StepHeading step={1} title="每月风险成本的计算方式" />
      <FormulaBlock
        formula="每月风险成本 = 信用卡余额 x (年化违约率/12) x 损失严重度 x (1 - 回收率) x 活跃客户数"
        description="预期信用损失 = 违约概率 x 违约损失率 x 风险敞口。UIP已包含在未偿余额中，无需额外计入"
      />
      <table className="w-full text-[10px] my-2"><tbody>
        <ParamRow label="违约后回收率" value={pct(recovery)} />
        <ParamRow label="违约率压力系数" value={`x${factors.stressCoefficients.pdMultiplier.toFixed(2)}`} />
        <ParamRow label="损失严重度压力系数" value={`x${factors.stressCoefficients.lgdMultiplier.toFixed(2)}`} />
      </tbody></table>
      <StepHeading step={2} title="违约率与损失严重度年度曲线（加权）" />
      <YearMatrix
        title="风险参数"
        headers={yearHeaders}
        rows={[
          { label: '年化违约率', values: wa.map(m => pct(m.pd)), highlight: true },
          { label: '损失严重度', values: wa.map(m => pct(m.lgd)) },
          { label: '平均余额', values: wa.map(m => fmt(Math.round(m.balance))) },
          { label: '活跃率', values: wa.map(m => pct(m.activityRate)) },
        ]}
      />
      <StepHeading step={3} title="各年风险成本（折现后）" />
      <YearMatrix
        title="风险成本折现值"
        headers={yearHeaders}
        rows={[{ label: '风险成本折现值', values: wa.map(m => fmt(-Math.round(m.riskCost))), highlight: true }]}
      />
      <ResultHighlight label="风险成本折现合计" value={fmt(-Math.round(wa.reduce((s, m) => s + m.riskCost, 0)))} />
    </>
  );
}

// ---------- Opex (运营) ----------
function OpexDrilldown({ result, factors }: DrilldownProps) {
  const wa = getWeightedAnnual(result, factors);
  const opex = factors.financialAssumptions.opexPerCard;
  return (
    <>
      <StepHeading step={1} title="每月运营成本的计算方式" />
      <FormulaBlock
        formula="每月运营成本 = (年运营成本 / 12) x 存活客户数"
        description="运营成本按存活客户分摊，即使客户不活跃也有运营维护成本"
      />
      <table className="w-full text-[10px] my-2"><tbody>
        <ParamRow label="年运营成本（每卡）" value={fmt(opex)} />
        <ParamRow label="月运营成本" value={fmt(Math.round(opex / 12))} />
        <ParamRow label="计费口径" value="存活客户（含不活跃客户）" highlight />
      </tbody></table>
      <StepHeading step={2} title="各年运营成本（折现后）" />
      <YearMatrix
        title="运营成本折现值"
        headers={yearHeaders}
        rows={[{ label: '运营成本折现值', values: wa.map(m => fmt(-Math.round(m.opexAmortized))), highlight: true }]}
      />
      <ResultHighlight label="运营成本折现合计" value={fmt(-Math.round(wa.reduce((s, m) => s + m.opexAmortized, 0)))} />
    </>
  );
}

// ---------- Fraud (欺诈) ----------
function FraudDrilldown({ result, factors }: DrilldownProps) {
  const wa = getWeightedAnnual(result, factors);
  const fraudRate = factors.financialAssumptions.fraudRate;
  return (
    <>
      <StepHeading step={1} title="每月欺诈成本的计算方式" />
      <FormulaBlock
        formula="每月欺诈成本 = 消费金额 x 欺诈损失率 x 活跃客户数"
        description="因欺诈交易造成的银行损失"
      />
      <table className="w-full text-[10px] my-2"><tbody>
        <ParamRow label="欺诈损失率" value={pct(fraudRate)} />
        <ParamRow label="计费口径" value="活跃客户" />
      </tbody></table>
      <StepHeading step={2} title="各年欺诈成本（折现后）" />
      <YearMatrix
        title="欺诈成本折现值"
        headers={yearHeaders}
        rows={[{ label: '欺诈成本折现值', values: wa.map(m => fmt(-Math.round(m.fraudCost))), highlight: true }]}
      />
      <ResultHighlight label="欺诈成本折现合计" value={fmt(-Math.round(wa.reduce((s, m) => s + m.fraudCost, 0)))} />
    </>
  );
}

// ---------- Rewards (权益) ----------
function RewardsDrilldown({ result, factors }: DrilldownProps) {
  const wa = getWeightedAnnual(result, factors);
  const rewardRate = factors.financialAssumptions.rewardsRate;
  const rewardCap = factors.financialAssumptions.rewardsCap;
  return (
    <>
      <StepHeading step={1} title="每月权益成本的计算方式" />
      <FormulaBlock
        formula="每月权益成本 = 取(消费金额 x 权益给付率, 封顶金额)中的较小值 x 活跃客户数"
        description="积分/返现等权益给付成本，设有每月封顶金额"
      />
      <table className="w-full text-[10px] my-2"><tbody>
        <ParamRow label="权益给付率" value={pct(rewardRate)} />
        <ParamRow label="每月封顶金额" value={fmt(rewardCap)} />
        <ParamRow label="计费口径" value="活跃客户" />
      </tbody></table>
      <StepHeading step={2} title="各年权益成本（折现后）" />
      <YearMatrix
        title="权益成本折现值"
        headers={yearHeaders}
        rows={[{ label: '权益成本折现值', values: wa.map(m => fmt(-Math.round(m.rewardsCost))), highlight: true }]}
      />
      <ResultHighlight label="权益成本折现合计" value={fmt(-Math.round(wa.reduce((s, m) => s + m.rewardsCost, 0)))} />
    </>
  );
}

// ---------- Installment Income (分期收入 V2) ----------
function InstallmentDrilldown({ result, factors }: DrilldownProps) {
  const wa = getWeightedAnnual(result, factors);
  const v2i = factors.v2Installment;
  const instAnnualRate = factors.financialAssumptions.balTransferRate || factors.productParams.apr;
  const tenor = v2i?.installmentTenor ?? 12;
  const feeRate = (instAnnualRate / 12) * (tenor + 1) / (2 * tenor);
  const split = v2i?.revolvingInstSplit ?? 0.50;
  return (
    <>
      <StepHeading step={1} title="分期/循环非线性定价逻辑" />
      <FormulaBlock
        formula="费率下降: 效果 = s x sqrt(|变化量|) (先强后弱)&#10;费率上升: 效果 = s x |变化量|^1.5 (逐步加速)"
        description="自价格弹性采用非线性函数: 降价时促进效果先强后衰减(sqrt曲线), 涨价时抑制效果逐步加速(幂1.5曲线)。交叉弹性保持线性(弱)"
      />
      <table className="w-full text-[10px] my-2"><tbody>
        <ParamRow label="基准偏好" value={`${Math.round(split * 100)}% 循环 / ${Math.round((1 - split) * 100)}% 分期`} />
        <ParamRow label="分期期数(tenor)" value={`${tenor} 个月`} />
        <ParamRow label="分期利率(年化)" value={pct(instAnnualRate)} />
        <ParamRow label="循环利率(年化)" value={pct(factors.productParams.apr)} />
      </tbody></table>

      <StepHeading step={2} title="余额代偿费率的换算" />
      <FormulaBlock
        formula={`余额代偿费率 = (年化利率/12) x (期数+1) / (2 x 期数) = ${(feeRate * 100).toFixed(4)}%/月`}
        description="等额本金下每月利息递减，费率是按初始本金计的平均月利率，低于 年化利率/12"
      />
      <table className="w-full text-[10px] my-2"><tbody>
        <ParamRow label="年化利率/12" value={pct(instAnnualRate / 12)} />
        <ParamRow label="余额代偿费率" value={`${(feeRate * 100).toFixed(4)}%/月`} highlight />
        <ParamRow label="折算差异" value={`${((instAnnualRate / 12 - feeRate) / (instAnnualRate / 12) * 100).toFixed(1)}% 低于简单月利率`} />
      </tbody></table>

      <StepHeading step={3} title="新增分期本金的确定" />
      <FormulaBlock
        formula="本月新增分期 = max(0, 未偿余额 x 分期率 - 历史UIP)"
        description="UIP属于未偿余额的一部分。只有当'分期目标池'(余额 x 分期率)超过已有UIP时，才会产生新增分期"
      />

      <StepHeading step={4} title="分期收入(平息法)与跨期摊销" />
      <FormulaBlock
        formula="每月分期收入 = (本月新增分期本金 + 过去N期历史分期本金) x 余额代偿费率 x 活跃客户数"
        description="平息法: 基于初始分期本金(非剩余本金)计息。历史分期本金按等额本金线性摊销逐月递减"
      />

      <StepHeading step={5} title="历史未偿分期本金(UIP)的计算" />
      <FormulaBlock
        formula={`UIP = 回溯过去 ${tenor} 个月，将每月新增分期本金 x 剩余比例 求和。剩余比例 = (${tenor} - 已过月数) / ${tenor}`}
        description="UIP是未偿余额的组成部分，不额外计入资金成本或风险成本的基数"
      />

      <StepHeading step={6} title="各年分期收入(折现后)" />
      <YearMatrix
        title="分期收入折现值"
        headers={yearHeaders}
        rows={[
          { label: '分期收入', values: wa.map(m => fmt(Math.round(m.installmentIncome))), highlight: true },
          { label: '平均分期率', values: wa.map(m => pct(m.installmentRate)) },
          { label: '平均UIP', values: wa.map(m => fmt(Math.round(m.uipPast))) },
        ]}
      />
      <ResultHighlight label="分期收入折现合计" value={fmt(Math.round(wa.reduce((s, m) => s + m.installmentIncome, 0)))} />
    </>
  );
}

// ---------- Terminal Value (残值TV) ----------
function TVDrilldown({ result, factors }: DrilldownProps) {
  const tv = result.pvComposition.terminalValue;
  const discountRate = 0.15;
  return (
    <>
      <StepHeading step={1} title="计算最后一年的平均净现金流" />
      <FormulaBlock
        formula="取第88到99个月（最后12个月）的运营净现金流，计算月均值"
        description="这个月均值代表了卡片在生命周期尾部的稳态盈利水平"
      />
      <StepHeading step={2} title="用永续年金公式估算99个月之后的剩余价值" />
      <FormulaBlock
        formula="残值原始值 = 月均净现金流 / 月度折现率，然后折现回今天的价值"
        description="假设99个月后现金流保持稳定，用永续年金公式将未来全部价值折现"
      />
      <table className="w-full text-[10px] my-2"><tbody>
        <ParamRow label="年化折现率" value={pct(discountRate)} />
        <ParamRow label="月度折现率" value={pct(Math.pow(1 + discountRate, 1/12) - 1)} />
      </tbody></table>
      <StepHeading step={3} title="残值上限约束" />
      <FormulaBlock
        formula="残值不超过运营期（99个月）总现值的15%，避免残值过大主导净现值结果"
        description="同时如果残值为负数，则取0（不计入负残值）"
      />
      <FormulaBlock formula="最终残值 = 取(原始残值, 上限值)中的较小值，且不低于0" />
      <ResultHighlight label="残值折现值" value={fmt(Math.round(tv))} />
    </>
  );
}

// ---------- Total NPV ----------
function NPVTotalDrilldown({ result, factors }: DrilldownProps) {
  const pv = result.pvComposition;
  return (
    <>
      <StepHeading step={1} title="净现值汇总" />
      <FormulaBlock
        formula="净现值 = 生息收入(循环收入+分期收入) + 非息收入 - 获客成本 - 资金成本 - 风险成本 - 其他成本 + 残值"
        description="将全部收入和成本的折现值汇总，加上残值，得出每张卡的净现值"
      />
      <StepHeading step={2} title="各项折现值明细" />
      <table className="w-full text-[10px] my-2"><tbody>
        <ParamRow label="(+) 循环收入" value={fmt(pv.interestIncome)} />
        <ParamRow label="(+) 分期收入" value={fmt(pv.installmentIncome || 0)} />
        <ParamRow label="    = 生息收入合计" value={fmt(pv.interestIncome + (pv.installmentIncome || 0))} highlight />
        <ParamRow label="(+) 回佣" value={fmt(pv.nintInterchange)} />
        <ParamRow label="(+) 年费" value={fmt(pv.nintAnnualFee)} />
        <ParamRow label="(+) 取现及超限费" value={fmt(pv.nintCashAdvance)} />
        <ParamRow label="(-) 获客成本" value={fmt(pv.cac)} highlight />
        <ParamRow label="(-) 资金成本" value={fmt(pv.fundingCost)} highlight />
        <ParamRow label="(-) 风险成本" value={fmt(pv.riskCost)} highlight />
        <ParamRow label="(-) 运营维护" value={fmt(-pv.otherOpex)} highlight />
        <ParamRow label="(-) 欺诈损失" value={fmt(-pv.otherFraud)} highlight />
        <ParamRow label="(-) 权益给付" value={fmt(-pv.otherRewards)} highlight />
        <ParamRow label="(+) 残值" value={fmt(pv.terminalValue)} />
      </tbody></table>
      <StepHeading step={3} title="折现说明" />
      <FormulaBlock
        formula="每个月的折现因子 = 1 除以 (1 + 月度折现率) 的 t 次方。年化折现率15%，转换为月度约1.17%"
        description="以上全部数据均已按月折现到今天的价值，模型覆盖99个月"
      />
      <ResultHighlight label="总净现值" value={fmt(pv.pvValue)} />
    </>
  );
}

// Composite: Non-interest Income (collapsed view)
function NonInterestCompositeDrilldown({ result, factors }: DrilldownProps) {
  const fmt = (v: number) => `¥${Math.round(v).toLocaleString('zh-CN')}`;
  const pv = result.pvComposition;
  return (
    <>
      <StepHeading step={1} title="非息收入构成" />
      <FormulaBlock formula="非息收入合计 = 回佣 + 年费 + 取现及超限手续费" description="三项手续费类收入汇总" />
      <table className="w-full text-[10px] border" style={{ borderColor: '#E5DFD6', borderRadius: '2px' }}>
        <thead><tr style={{ backgroundColor: '#F5F0E8' }}>
          <th className="px-2 py-1 text-left border-b" style={{ borderColor: '#E5DFD6', color: '#5D4037' }}>子项</th>
          <th className="px-2 py-1 text-right border-b" style={{ borderColor: '#E5DFD6', color: '#5D4037' }}>PV金额</th>
          <th className="px-2 py-1 text-right border-b" style={{ borderColor: '#E5DFD6', color: '#5D4037' }}>占比</th>
        </tr></thead>
        <tbody>
          {[
            { l: '回佣（商户手续费分成）', v: pv.nintInterchange },
            { l: '年费', v: pv.nintAnnualFee },
            { l: '取现及超限手续费', v: pv.nintCashAdvance },
          ].map(r => (
            <tr key={r.l} className="hover:bg-[#FAFAF8]">
              <td className="px-2 py-1 border-b" style={{ borderColor: '#E5DFD6', color: '#4A3728' }}>{r.l}</td>
              <td className="px-2 py-1 text-right border-b" style={{ borderColor: '#E5DFD6', color: '#4C6B4C', fontFamily: 'var(--font-jetbrains), monospace' }}>{fmt(r.v)}</td>
              <td className="px-2 py-1 text-right border-b" style={{ borderColor: '#E5DFD6', color: '#8B8178', fontFamily: 'var(--font-jetbrains), monospace' }}>{pv.nonInterestIncome ? ((r.v / pv.nonInterestIncome) * 100).toFixed(1) : 0}%</td>
            </tr>
          ))}
          <tr style={{ backgroundColor: '#FDF5E6' }}>
            <td className="px-2 py-1 font-semibold border-b" style={{ borderColor: '#E5DFD6', color: '#4A3728' }}>合计</td>
            <td className="px-2 py-1 text-right font-bold border-b" style={{ borderColor: '#E5DFD6', color: '#4C6B4C', fontFamily: 'var(--font-jetbrains), monospace' }}>{fmt(pv.nonInterestIncome)}</td>
            <td className="px-2 py-1 text-right border-b" style={{ borderColor: '#E5DFD6', color: '#4A3728' }}>100%</td>
          </tr>
        </tbody>
      </table>
      <div className="mt-3">
        <StepHeading step={2} title="回佣计算" />
        <InterchangeDrilldown result={result} factors={factors} />
      </div>
      <div className="mt-3">
        <StepHeading step={3} title="年费计算" />
        <AnnualFeeDrilldown result={result} factors={factors} />
      </div>
      <div className="mt-3">
        <StepHeading step={4} title="取现费计算" />
        <CashAdvanceDrilldown result={result} factors={factors} />
      </div>
    </>
  );
}

// Composite: Other Costs (collapsed view)
function OtherCostCompositeDrilldown({ result, factors }: DrilldownProps) {
  const fmt = (v: number) => `¥${Math.round(v).toLocaleString('zh-CN')}`;
  const pv = result.pvComposition;
  const totalOther = Math.abs(pv.otherCost);
  return (
    <>
      <StepHeading step={1} title="其他成本构成" />
      <FormulaBlock formula="其他成本合计 = 运营维护成本 + 欺诈损失 + 权益给付成本" description="三项非资金、非风险类成本汇总" />
      <table className="w-full text-[10px] border" style={{ borderColor: '#E5DFD6', borderRadius: '2px' }}>
        <thead><tr style={{ backgroundColor: '#F5F0E8' }}>
          <th className="px-2 py-1 text-left border-b" style={{ borderColor: '#E5DFD6', color: '#5D4037' }}>子项</th>
          <th className="px-2 py-1 text-right border-b" style={{ borderColor: '#E5DFD6', color: '#5D4037' }}>PV金额</th>
          <th className="px-2 py-1 text-right border-b" style={{ borderColor: '#E5DFD6', color: '#5D4037' }}>占比</th>
        </tr></thead>
        <tbody>
          {[
            { l: '运营维护成本', v: pv.otherOpex },
            { l: '欺诈损失', v: pv.otherFraud },
            { l: '权益给付成本', v: pv.otherRewards },
          ].map(r => (
            <tr key={r.l} className="hover:bg-[#FAFAF8]">
              <td className="px-2 py-1 border-b" style={{ borderColor: '#E5DFD6', color: '#4A3728' }}>{r.l}</td>
              <td className="px-2 py-1 text-right border-b" style={{ borderColor: '#E5DFD6', color: '#8B4C4C', fontFamily: 'var(--font-jetbrains), monospace' }}>{fmt(-r.v)}</td>
              <td className="px-2 py-1 text-right border-b" style={{ borderColor: '#E5DFD6', color: '#8B8178', fontFamily: 'var(--font-jetbrains), monospace' }}>{totalOther ? ((r.v / totalOther) * 100).toFixed(1) : 0}%</td>
            </tr>
          ))}
          <tr style={{ backgroundColor: '#FDF5E6' }}>
            <td className="px-2 py-1 font-semibold border-b" style={{ borderColor: '#E5DFD6', color: '#4A3728' }}>合计</td>
            <td className="px-2 py-1 text-right font-bold border-b" style={{ borderColor: '#E5DFD6', color: '#8B4C4C', fontFamily: 'var(--font-jetbrains), monospace' }}>{fmt(totalOther)}</td>
            <td className="px-2 py-1 text-right border-b" style={{ borderColor: '#E5DFD6', color: '#4A3728' }}>100%</td>
          </tr>
        </tbody>
      </table>
      <div className="mt-3">
        <StepHeading step={2} title="运营成本计算" />
        <OpexDrilldown result={result} factors={factors} />
      </div>
      <div className="mt-3">
        <StepHeading step={3} title="欺诈成本计算" />
        <FraudDrilldown result={result} factors={factors} />
      </div>
      <div className="mt-3">
        <StepHeading step={4} title="权益成本计算" />
        <RewardsDrilldown result={result} factors={factors} />
      </div>
    </>
  );
}

// ============================================================================
// MAIN DRILLDOWN DIALOG COMPONENT
// ============================================================================

const DRILLDOWN_MAP: Record<string, {
  title: string;
  component: React.ComponentType<DrilldownProps>;
}> = {
  'cac': { title: '获客成本', component: CACDrilldown },
  'int': { title: '循环收入（生息收入）', component: InterestDrilldown },
  'int_total': { title: '生息收入（循环+分期）', component: InterestDrilldown },
  'inst': { title: '分期收入（生息收入）', component: InstallmentDrilldown },
  'nint': { title: '非息收入（汇总）', component: NonInterestCompositeDrilldown },
  'nint_interchange': { title: '回佣（商户手续费分成）', component: InterchangeDrilldown },
  'nint_fee': { title: '年费', component: AnnualFeeDrilldown },
  'nint_cash': { title: '取现及超限手续费', component: CashAdvanceDrilldown },
  'fund': { title: '资金成本（内部转移定价）', component: FundingCostDrilldown },
  'fund_used': { title: '已用额度资金成本', component: FundingCostDrilldown },
  'fund_unused': { title: '未用额度资金成本', component: FundingCostDrilldown },
  'risk': { title: '风险成本（预期信用损失）', component: RiskCostDrilldown },
  'other': { title: '其他成本（汇总）', component: OtherCostCompositeDrilldown },
  'other_opex': { title: '运营维护成本', component: OpexDrilldown },
  'other_fraud': { title: '欺诈损失', component: FraudDrilldown },
  'other_rewards': { title: '权益给付成本', component: RewardsDrilldown },
  'tv': { title: '残值（99个月后的剩余价值）', component: TVDrilldown },
  'npv': { title: '总净现值汇总', component: NPVTotalDrilldown },
};

export function CalculationDrilldown({
  itemId,
  result,
  factors,
  onClose,
}: {
  itemId: string;
  result: NPVResult;
  factors: BusinessFactors;
  onClose: () => void;
}) {
  const entry = DRILLDOWN_MAP[itemId];
  if (!entry) return null;

  const Component = entry.component;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(74, 55, 40, 0.5)' }}>
      <div
        className="relative flex flex-col border shadow-xl"
        style={{
          backgroundColor: '#FFFFFF',
          borderColor: '#5D4037',
          borderRadius: '3px',
          width: 'min(92vw, 680px)',
          maxHeight: '85vh',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b" style={{ backgroundColor: '#5D4037', borderColor: '#5D4037' }}>
          <div>
            <div className="text-xs font-bold" style={{ color: '#FFFFFF' }}>{entry.title}</div>
            <div className="text-[9px] mt-0.5" style={{ color: '#D7CCC8' }}>计算逻辑逐步展开 | 全部数据已折现到今天的价值</div>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:opacity-80 transition-opacity"
            style={{ color: '#D7CCC8' }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 py-3" style={{ maxHeight: 'calc(85vh - 52px)' }}>
          <Component result={result} factors={factors} />
          
          {/* Weighted distribution reminder at bottom */}
          <div className="mt-4 px-3 py-2 border" style={{ backgroundColor: '#FAFAF8', borderColor: '#E5DFD6', borderRadius: '2px' }}>
            <div className="text-[9px] font-medium mb-1" style={{ color: '#8B8178' }}>加权说明</div>
            <div className="text-[9px]" style={{ color: '#6B5B4F' }}>
              上述数据均为按风险等级加权后的每张卡口径，各等级权重:
              {factors.riskDistribution.filter(d => d.percentage > 0).map(d => (
                <span key={d.level} className="ml-1">风险{d.level}级={pct(d.percentage)}</span>
              ))}
            </div>
            <div className="text-[9px] mt-0.5" style={{ color: '#6B5B4F' }}>
              客户递推: 1张卡 {'-->'} 逐月存活递减 {'-->'} 乘以活跃率得活跃客户 | 折现率: 年化{pct(0.15)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export { DRILLDOWN_MAP };
