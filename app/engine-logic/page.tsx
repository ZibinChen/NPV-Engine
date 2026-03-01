'use client';

import React from "react"

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { TrendingUp, ArrowLeft, BookOpen, Calculator, GitBranch, Layers } from 'lucide-react';

// Driver Tree Node Component
function DriverNode({ 
  label, 
  formula, 
  level = 0,
  children,
  isLeaf = false,
  highlight = false
}: { 
  label: string; 
  formula?: string;
  level?: number;
  children?: React.ReactNode;
  isLeaf?: boolean;
  highlight?: boolean;
}) {
  return (
    <div className="flex flex-col" style={{ marginLeft: level > 0 ? '24px' : '0' }}>
      <div 
        className="flex items-center gap-2 py-1.5 px-3 my-1 border"
        style={{ 
          backgroundColor: highlight ? '#C19A6B' : isLeaf ? '#FAFAF8' : '#FDF5E6',
          borderColor: highlight ? '#5D4037' : '#E5DFD6',
          borderRadius: '2px',
          borderLeftWidth: level > 0 ? '3px' : '1px',
          borderLeftColor: level > 0 ? '#C19A6B' : '#E5DFD6'
        }}
      >
        <div className="flex-1">
          <div className="text-xs font-medium" style={{ color: highlight ? '#FFFFFF' : '#4A3728' }}>
            {label}
          </div>
          {formula && (
            <div className="text-xs mt-0.5" style={{ color: highlight ? '#F5EFE6' : '#6B5B4F' }}>
              {formula}
            </div>
          )}
        </div>
      </div>
      {children && (
        <div className="border-l-2 ml-4" style={{ borderColor: '#E5DFD6' }}>
          {children}
        </div>
      )}
    </div>
  );
}

// Formula Step Component
function FormulaStep({ 
  step, 
  title, 
  description, 
  details 
}: { 
  step: number | string; 
  title: string; 
  description: string; 
  details?: string[];
}) {
  return (
    <div className="p-4 border" style={{ backgroundColor: '#FAFAF8', borderColor: '#E5DFD6', borderRadius: '2px' }}>
      <div className="flex items-start gap-3">
        <div 
          className="w-6 h-6 flex-shrink-0 flex items-center justify-center text-xs font-bold"
          style={{ backgroundColor: '#C19A6B', color: '#FFFFFF', borderRadius: '2px' }}
        >
          {step}
        </div>
        <div className="flex-1">
          <div className="text-sm font-semibold" style={{ color: '#4A3728' }}>{title}</div>
          <div className="text-xs mt-1 leading-relaxed" style={{ color: '#5D4037' }}>{description}</div>
          {details && details.length > 0 && (
            <div className="mt-2 space-y-1">
              {details.map((d, i) => (
                <div key={i} className="text-xs flex items-start gap-1.5" style={{ color: '#6B5B4F' }}>
                  <span className="mt-0.5" style={{ color: '#C19A6B' }}>{'-->'}</span>
                  <span>{d}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function EngineLogicPage() {
  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#F5F0E8' }}>
      {/* Header */}
      <header 
        className="sticky top-0 z-50 border-b-2"
        style={{ backgroundColor: '#FDF5E6', borderColor: '#5D4037' }}
      >
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-xs"
                style={{ color: '#5D4037' }}
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                返回门户
              </Button>
            </Link>
            <div className="h-4 w-px" style={{ backgroundColor: '#E5DFD6' }} />
            <div className="flex items-center gap-2">
              <div 
                className="w-6 h-6 flex items-center justify-center"
                style={{ backgroundColor: '#C19A6B', borderRadius: '2px' }}
              >
                <BookOpen className="w-3 h-3 text-white" />
              </div>
              <span className="font-semibold" style={{ color: '#4A3728' }}>计算引擎逻辑</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Introduction */}
          <Card 
            className="p-6 border-2"
            style={{ backgroundColor: '#FDF5E6', borderColor: '#5D4037', borderRadius: '4px' }}
          >
            <div className="flex items-center gap-2 mb-4">
              <Calculator className="w-5 h-5" style={{ color: '#C19A6B' }} />
              <h2 className="text-lg font-semibold" style={{ color: '#4A3728' }}>NPV计算引擎概述</h2>
            </div>
            <p className="text-sm leading-relaxed" style={{ color: '#5D4037' }}>
              本引擎采用<strong>因子驱动建模（Driver-Based Modeling）</strong>方法。核心思路是：<strong>模拟一张信用卡从开卡到第99个月的完整生命周期</strong>，
              逐月计算它产生的利息收入、手续费收入、风险损失、资金成本和运营成本，全部折现到今天的价值后求和。
              整个计算按10个风险等级独立运行（每个等级有不同的违约率、活跃率等行为曲线），最后按各等级占比加权汇总，
              得出一张卡的组合级净现值（NPV）。所有行为数据来源于真实历史的9条静态曲线矩阵，而非公式拟合。
            </p>
          </Card>

          {/* Core Calculation Logic - Text Form */}
          <Card 
            className="p-6 border-2"
            style={{ backgroundColor: '#FDF5E6', borderColor: '#5D4037', borderRadius: '4px' }}
          >
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-5 h-5" style={{ color: '#C19A6B' }} />
              <h2 className="text-lg font-semibold" style={{ color: '#4A3728' }}>核心计算逻辑（文字描述）</h2>
            </div>
            <p className="text-xs mb-5" style={{ color: '#6B5B4F' }}>以下用通俗文字描述引擎中每一步的计算方式，与代码实现一一对应。</p>

            <div className="space-y-4">
              {/* 1. NPV Main */}
              <div className="p-4 border-2" style={{ backgroundColor: '#F5F0E8', borderColor: '#C19A6B', borderRadius: '2px' }}>
                <h3 className="text-sm font-bold mb-2" style={{ color: '#4A3728' }}>总公式：每张卡的净现值（NPV）</h3>
                <div className="text-sm leading-relaxed" style={{ color: '#5D4037' }}>
                  <strong>净现值</strong> = <span style={{ color: '#4C6B4C' }}>利息收入的折现值</span> + <span style={{ color: '#4C6B4C' }}>非息收入的折现值</span> + <span style={{ color: '#7986CB' }}>残值的折现值</span> - <span style={{ color: '#A52A2A' }}>获客成本</span> - <span style={{ color: '#A52A2A' }}>风险成本的折现值</span> - <span style={{ color: '#A52A2A' }}>资金成本的折现值</span> - <span style={{ color: '#A52A2A' }}>运营及其他成本的折现值</span>
                </div>
                <div className="text-xs mt-3 p-2 border" style={{ color: '#6B5B4F', borderColor: '#E5DFD6', backgroundColor: '#FAFAF8', borderRadius: '2px' }}>
                  说明：引擎对每张卡模拟99个月（约8.3年）的生命周期。每个月的收入和成本都按月度折现率折算到今天的价值后求和。折现率默认为年化15%，按月折算。
                </div>
              </div>

              {/* 2. Monthly CF breakdown */}
              <h3 className="text-sm font-bold pt-2" style={{ color: '#4A3728' }}>每月现金流的具体计算</h3>
              <p className="text-xs -mt-2" style={{ color: '#6B5B4F' }}>引擎在每个月（MOB 1 到 99）依次计算以下各项：</p>

              {/* A. Behavioral Drivers */}
              <div className="p-4 border" style={{ backgroundColor: '#FAFAF8', borderColor: '#E5DFD6', borderRadius: '2px' }}>
                <h4 className="text-xs font-bold mb-3" style={{ color: '#4A3728' }}>A. 行为驱动因子（每月递推）</h4>
                <div className="space-y-3">
                  <FormulaStep step={1} title="流失率" 
                    description="从静态数据矩阵中读取该风险等级在当月的流失率，乘以流失率压力系数"
                    details={['如果压力系数大于1，表示客户流失加速（悲观情景）']} />
                  <FormulaStep step={2} title="存活客户数" 
                    description="上个月的存活客户数 乘以 (1 - 当月流失率)，得到当月仍然存活的客户比例"
                    details={['这是一个逐月递减的累乘过程，初始值为1（即一张卡）']} />
                  <FormulaStep step={3} title="活跃客户数" 
                    description="存活客户数 乘以 该月的活跃率（从矩阵读取） 乘以 活跃率压力系数"
                    details={['活跃客户才产生交易、利息等收入']} />
                </div>
              </div>

              {/* B. Volumes */}
              <div className="p-4 border" style={{ backgroundColor: '#FAFAF8', borderColor: '#E5DFD6', borderRadius: '2px' }}>
                <h4 className="text-xs font-bold mb-3" style={{ color: '#4A3728' }}>B. 业务量计算</h4>
                <div className="space-y-3">
                  <FormulaStep step={4} title="信用卡余额" 
                    description="授信额度 乘以 该月使用率（从矩阵读取） 乘以 使用率压力系数 乘以 额度使用率弹性乘数"
                    details={[
                      '余额是利息收入和各项成本计算的核心基础',
                      'V3: 使用率受额度弹性影响(theta弹性)，提额时使用率可能被动稀释',
                    ]} />
                  <FormulaStep step={5} title="消费金额" 
                    description="从矩阵直接读取该风险等级在该月的消费金额，再乘以消费金额压力系数 乘以 消费额弹性乘数"
                    details={[
                      '消费金额独立于额度，是回佣和权益成本的计算基础',
                      'V3: 消费额受额度弹性影响(gamma弹性)，提额时消费增长低于额度增长(次线性)',
                    ]} />
                  <FormulaStep step={6} title="取现金额" 
                    description="从矩阵读取该月取现金额，乘以取现压力系数"
                    details={['取现金额用于计算取现手续费收入']} />
                </div>
              </div>

              {/* B2. Limit Elasticity Engine */}
              <div className="p-4 border-2" style={{ backgroundColor: '#FDF5E6', borderColor: '#E65100', borderRadius: '2px' }}>
                <h4 className="text-xs font-bold mb-3" style={{ color: '#E65100' }}>B2. 额度弹性与分层敏感度引擎（V3 新模块）</h4>
                <p className="text-xs mb-3 leading-relaxed" style={{ color: '#5D4037' }}>
                  当用户调整初始额度 (Limit) 时，会触发完整的行为动力学联动。每个风险等级有独立的弹性系数，反映不同客群对额度变化的差异化反应。
                </p>
                <div className="space-y-3">
                  <FormulaStep step={'B2a'} title="额度偏离度 (Delta Limit)" 
                    description="Delta_Limit = max(Limit_new / Limit_base, 0.001)，其中 Limit_base 为该风险等级的默认基准额度"
                    details={[
                      '例: R1基准50000，用户设为70000 => Delta = 70000/50000 = 1.4',
                      '例: R5基准10000，用户设为8000 => Delta = 8000/10000 = 0.8',
                    ]} />
                  <FormulaStep step={'B2b'} title="消费额弹性 (动态 gamma)" 
                    description="gamma(ΔL) = gammaStart + (gammaEnd - gammaStart) x t，其中 t = (ΔL-1) / (ΔL-1+k); Spend_new = Spend_base x ΔL^(1+gamma)"
                    details={[
                      '核心: gamma 随额度倍数 ΔL 从 gammaStart 平滑过渡到 gammaEnd',
                      'R1: gammaStart=0.15, gammaEnd=-0.80。小幅提额时 1+gamma>1，消费增速>额度增速，Spend/Limit上升',
                      '随着额度继续提升 gamma 转负，Spend/Limit 开始下降，但消费额始终上升(因为 1+gamma>0)',
                      'R7-R10: gammaStart=-0.20, gammaEnd=-0.60。消费/额度比一直在下降，但消费额仍在增长',
                      '取现金额按相同 spendLimitMult 调整',
                    ]} />
                  <FormulaStep step={'B2c'} title="额度使用率弹性 (动态 theta)" 
                    description="theta(ΔL) = thetaStart + (thetaEnd - thetaStart) x t; Util_new = min(1, Util_base x ΔL^theta)"
                    details={[
                      '核心: theta 随 ΔL 从 thetaStart 平滑过渡到 thetaEnd',
                      'R1: thetaStart=0.20, thetaEnd=-0.70。小幅提额时 theta>0，使用率上升',
                      '额度继续提升 theta 转负，使用率开始下降，但余额(=额度x使用率)始终上升(因为 1+theta>0)',
                      'R7-R10: thetaStart=-0.30, thetaEnd=-0.70。使用率持续稀释，增长极其平缓',
                    ]} />
                  <FormulaStep step={'B2d'} title="损失严重率弹性 (phi 弹性)" 
                    description="Severity_new = min(1.0, Severity_base x (Delta_Limit)^phi)。phi为正值(放大)，风险越高放大越多"
                    details={[
                      '业务逻辑: 额度越大，高危客户违约后刷空的绝对金额越大，严重率上升。优质客户对额度免疫',
                      '低风险(R1-R2): phi = 0，额度变化不影响严重率(违约概率极低)',
                      '高风险(R10): phi = 0.60，提额50%后严重率上升约25%',
                    ]} />
                  <FormulaStep step={'B2e'} title="分期/循环率弹性 (动态 lambda)" 
                    description="lambda(ΔL) = lambdaStart + (lambdaEnd - lambdaStart) x t, t = excess^2/(excess^2+k^2); 率_new = min(0.95, 率_base x ΔL^lambda)"
                    details={[
                      '核心: lambda 使用平方插值(比 gamma/theta 的线性插值更平坦)，初始保持高值后才快速衰减',
                      'R1(低风险): lambdaStart=0.60, lambdaEnd=-0.80, k=0.90',
                      '  提额+30%: lambda≈0.47，分期/循环率适度上升',
                      '  提额+60%: lambda≈0.15，促进效果明显减弱',
                      '  继续提额: lambda转负，分期/循环率开始下降',
                      'R10(高风险): lambdaStart=1.0, lambdaEnd=-0.50, k=2.80',
                      '  提额+100%: lambda>0.8，强力促进',
                      '  提额+200%: lambda>0.5，仍有较强促进',
                      '  继续提额: lambda渐转负，促进缓慢衰减',
                    ]} />
                </div>
                <div className="mt-3 p-2 border text-[10px] leading-relaxed" style={{ borderColor: '#E5DFD6', backgroundColor: '#FAFAF8', borderRadius: '2px', color: '#6B5B4F' }}>
                  注: gamma、theta、lambda 均为 ΔL 的平滑递减函数，额度等于基准时乘数恒为1.0。gamma/theta 用线性插值 t=(ΔL-1)/((ΔL-1)+k)，lambda 用平方插值 t=(ΔL-1)^2/((ΔL-1)^2+k^2) 以实现更平坦的初始高位保持。低风险客群三者初始均为正值，因此消费/额度比、使用率、分期循环率均呈先升后降的驼峰形态。
                </div>
              </div>

              {/* C. Revenue */}
              <div className="p-4 border" style={{ backgroundColor: '#FAFAF8', borderColor: '#E5DFD6', borderRadius: '2px' }}>
                <h4 className="text-xs font-bold mb-3" style={{ color: '#4C6B4C' }}>C. 收入项计算</h4>
                <div className="space-y-3">
                  <FormulaStep step={7} title="循环利息" 
                    description="信用卡余额 乘以 循环率 乘以 循环月利率（年化/12） 乘以 活跃客户数"
                    details={[
                      '循环率独立响应: 循环利率涨→循环率跌(强), 分期费率涨→循环率涨(弱)',
                      '年化利率默认18.25%，即月利率约1.52%',
                    ]} />
                  <FormulaStep step={8} title="年费收入" 
                    description="在第0、12、24...月（每年收一次），按存活客户数 乘以 年费金额"
                    details={['默认年费395元，非年费月份此项为0']} />
                  <FormulaStep step={9} title="回佣收入" 
                    description="消费金额 乘以 商户回佣率 乘以 活跃客户数"
                    details={['默认回佣率0.40%，即每消费100元银行从商户获得0.40元']} />
                  <FormulaStep step={10} title="取现及超限手续费" 
                    description="取现金额 乘以 取现费率 乘以 活跃客户数 加上 超限费 乘以 超限发生率 乘以 活跃客户数"
                    details={['默认取现费率2.46%，超限费20元/次']} />
                  <FormulaStep step={11} title="非息收入合计" 
                    description="年费 + 回佣 + 取现手续费 + 超限手续费 的总和" />
                </div>
              </div>

              {/* C2. V2: Installment Split */}
              <div className="p-4 border-2" style={{ backgroundColor: '#FDF5E6', borderColor: '#7986CB', borderRadius: '2px' }}>
                <h4 className="text-xs font-bold mb-3" style={{ color: '#3949AB' }}>C2. V2 分期/循环切分与收入（新模块）</h4>
                <div className="space-y-3">
                  <FormulaStep step={'C2a'} title="分期率与循环率独立基准" 
                    description="矩阵循环率按偏好滑钮拆分: 循环率_base = 矩阵值 x split; 分期率_base = 矩阵值 x (1-split)"
                    details={[
                      '默认循环偏好50%，即循环和分期各占一半',
                      '两者是独立变量，总和可随利率变化而变化（不做守恒约束）',
                    ]} />
                  <FormulaStep step={'C2b'} title="非线性双向价格弹性" 
                    description="自价格: 降价 → s x sqrt(|dx|) 先强后衰减; 涨价 → s x dx^1.5 逐步加速。交叉价格保持线性(弱)"
                    details={[
                      '自价格弹性(s_rr=2.5, s_ii=4.0) >> 交叉弹性(s_ir=0.20, s_ri=0.20)',
                      '费率下降: sqrt曲线 → 分期收入在~13-14%费率附近达到峰值(量增>价降)，后续边际递减',
                      '费率上升: 幂1.5曲线 → 涨幅越大，抑制效果加速增强',
                      '循环利率涨 → 循环率跌(强)、分期率涨(弱)；分期费率涨 → 分期率跌(强)、循环率涨(弱)',
                    ]} />
                  <FormulaStep step={'C2c'} title="额度使用率非对称弹性" 
                    description="combinedDelta>0: util += utilElasticityUp x delta (强); combinedDelta<0: util += utilElasticityDown x delta (弱)"
                    details={[
                      '融资需求增加(循环率+分期率上升)时，额度使用率上升明显(默认0.80)，放大分期量增效果',
                      '融资需求减少时，额度使用率下降较温和(默认0.10)',
                      '额度使用率始终cap在[0%, 100%]',
                    ]} />
                  <FormulaStep step={'C2d'} title="余额代偿费率换算" 
                    description="余额代偿费率 = (年化手续费率 / 12) x (期数 + 1) / (2 x 期数)"
                    details={[
                      '等额本金下，本金逐月递减，实际月均利息低于简单 年化/12',
                      '例: 年化18.25%、12期 => 余额代偿费率 = 1.52% x 13/24 = 0.824%/月',
                    ]} />
                  <FormulaStep step={'C2e'} title="分期收入(平息法)" 
                    description="每月分期收入 = (本月新发分期本金 + 历史未偿分期本金) x 余额代偿费率 x 活跃客户数"
                    details={[
                      '平息法: 基于初始分期本金计息，非剩余本金',
                      '历史未偿本金(UIP)通过跨期摊销账本计算',
                    ]} />
                  <FormulaStep step={'C2f'} title="跨期摊销账本(UIP)" 
                    description="回溯过去N个月，将每月新发分期本金 x (期数 - 已过月数) / 期数 求和，得当月UIP"
                    details={[
                      '等额本金线性摊销，每月偿还 1/N 本金',
                      'UIP是未偿余额的组成部分，不额外计入资金成本或风险成本基数',
                    ]} />
                  <FormulaStep step={'C2g'} title="新增分期的确定" 
                    description="新增分期 = max(0, 未偿余额 x 分期率 - 历史UIP)"
                    details={[
                      '只有当"分期目标池"(余额 x 分期率)超过已有UIP时才新增分期',
                      '防止分期累计超过分期率对应的余额上限',
                    ]} />
                </div>
              </div>

              {/* D. Cost */}
              <div className="p-4 border" style={{ backgroundColor: '#FAFAF8', borderColor: '#E5DFD6', borderRadius: '2px' }}>
                <h4 className="text-xs font-bold mb-3" style={{ color: '#A52A2A' }}>D. 成本项计算</h4>
                <div className="space-y-3">
                  <FormulaStep step={12} title="获客成本（仅第1个月）" 
                    description="在第1个月一次性扣除获客成本"
                    details={['默认600元/卡，包含渠道费用和营销补贴']} />
                  <FormulaStep step={13} title="风险成本" 
                    description="信用卡余额 乘以 (年化违约率/12) 乘以 损失严重度 乘以 (1 - 回收率) 乘以 活跃客户数"
                    details={[
                      'UIP已包含在未偿余额中，无需额外加入EAD',
                      '违约率和严重度均按风险等级和月份从矩阵读取',
                      'V3: 损失严重度受额度弹性影响(phi弹性)，高危客户提额后严重率上升',
                      '回收率默认10.5%',
                    ]} />
                  <FormulaStep step={14} title="资金成本（含未使用额度）" 
                    description="[(消费额+余额) x FTP月利率 + (额度-消费额-余额) x FTP月利率 x 未使用额度转换系数] x 活跃客户数"
                    details={[
                      '已使用部分: (消费额 + 余额) x FTP/12，反映实际占用资金的成本',
                      '未使用额度部分: max(0, 额度 - 消费额 - 余额) x FTP/12 x 转换系数(默认20%)',
                      '业务逻辑: 银行为授信额度预留资金头寸，即使客户未使用也需承担部分资金成本',
                      'FTP默认年化2.75%，即月利率约0.23%',
                    ]} />
                  <FormulaStep step={15} title="运营成本" 
                    description="月运营固定成本 乘以 存活客户数（注意：运营成本按存活而非活跃计算）"
                    details={['默认年运营成本38元/卡，即月均约3.2元']} />
                  <FormulaStep step={16} title="欺诈成本" 
                    description="消费金额 乘以 欺诈损失率 乘以 活跃客户数"
                    details={['默认欺诈率万分之三']} />
                  <FormulaStep step={17} title="权益成本" 
                    description="消费金额 乘以 权益给付率 乘以 活跃客户数，但不超过权益封顶金额"
                    details={['默认权益率0.5%，封顶100元/月']} />
                  <FormulaStep step={18} title="其他成本合计" 
                    description="运营成本 + 欺诈成本 + 权益成本 的总和" />
                </div>
              </div>

              {/* E. Discounting */}
              <div className="p-4 border" style={{ backgroundColor: '#FAFAF8', borderColor: '#E5DFD6', borderRadius: '2px' }}>
                <h4 className="text-xs font-bold mb-3" style={{ color: '#4A3728' }}>E. 折现处理</h4>
                <div className="space-y-3">
                  <FormulaStep step={19} title="月度折现" 
                    description="将每个月的各项收入和成本，分别乘以该月的折现因子后累加。折现因子 = 1 / (1 + 月度折现率) 的 t 次方"
                    details={[
                      '第1个月折现因子为1（不折现），越往后折现因子越小',
                      '默认年化折现率15%，转换为月度后约1.17%',
                    ]} />
                </div>
              </div>

              {/* F. Terminal Value */}
              <div className="p-4 border" style={{ backgroundColor: '#FAFAF8', borderColor: '#E5DFD6', borderRadius: '2px' }}>
                <h4 className="text-xs font-bold mb-3" style={{ color: '#7986CB' }}>F. 残值计算</h4>
                <div className="space-y-3">
                  <FormulaStep step={20} title="残值（捕捉99个月之后的剩余价值）" 
                    description="取最后12个月（第88-99月）的平均净现金流，除以月度折现率，再折现到今天的价值。同时设有上限，残值不超过99个月运营期现值的一定比例"
                    details={[
                      '默认残值占比上限为15%',
                      '如果计算出的残值为负数，则取0（不计入负残值）',
                      '残值的含义：如果一张卡在99个月后仍然存活，其后续年份还将继续产生现金流',
                    ]} />
                </div>
              </div>
            </div>
          </Card>

          {/* Driver Tree Section */}
          <Card 
            className="p-6 border-2"
            style={{ backgroundColor: '#FDF5E6', borderColor: '#5D4037', borderRadius: '4px' }}
          >
            <div className="flex items-center gap-2 mb-4">
              <GitBranch className="w-5 h-5" style={{ color: '#C19A6B' }} />
              <h2 className="text-lg font-semibold" style={{ color: '#4A3728' }}>指标驱动树 (Driver Tree)</h2>
            </div>
            <p className="text-sm mb-4" style={{ color: '#6B5B4F' }}>
              以下展示NPV计算的因子层级关系，顶层指标由底层驱动因子逐级计算得出。
            </p>
            
            <div className="overflow-x-auto">
              <div className="min-w-[600px]">
                <DriverNode label="净现值 NPV" formula="将99个月的全部收入和成本折现后相加，减去获客成本，加上残值" highlight>
                  <DriverNode label="获客成本" formula="开卡时一次性投入的渠道费和营销费" level={1} />
                  <DriverNode label="月度现金流（累计折现值）" formula="每个月计算收入减成本，按月折现后求和" level={1}>
                    <DriverNode label="利息收入" formula="余额中循环部分按月利率计息，乘以活跃客户数" level={2}>
                      <DriverNode label="循环余额" formula="授信额度 乘以 使用率 乘以 循环率" level={3} isLeaf />
                      <DriverNode label="月利率" formula="年化利率除以12，默认18.25%/12" level={3} isLeaf />
                      <DriverNode label="违约率" formula="按风险等级和月份从数据矩阵中查表获取" level={3} isLeaf />
                    </DriverNode>
                    <DriverNode label="非息收入" formula="回佣 + 年费 + 取现手续费 + 超限费的合计" level={2}>
                      <DriverNode label="消费金额" formula="按风险等级和月份从数据矩阵中查表获取，乘以压力系数" level={3} isLeaf />
                      <DriverNode label="回佣率" formula="商户端费率分成给发卡行，默认0.40%" level={3} isLeaf />
                    </DriverNode>
                    <DriverNode label="风险成本" formula="余额 乘以 月化违约率 乘以 损失严重度 乘以 (1-回收率)" level={2}>
                      <DriverNode label="损失严重度" formula="按风险等级和月份从数据矩阵查表，乘以压力系数" level={3} isLeaf />
                    </DriverNode>
                    <DriverNode label="资金成本" formula="(余额+消费额) 乘以 FTP月利率 乘以 活跃客户数" level={2}>
                      <DriverNode label="FTP利率" formula="银行内部转移定价，默认年化2.75%" level={3} isLeaf />
                    </DriverNode>
                    <DriverNode label="运营及其他成本" formula="固定运营成本(按存活计) + 欺诈成本 + 权益成本(按活跃计)" level={2} isLeaf />
                  </DriverNode>
                  <DriverNode label="残值" formula="最后12个月平均净现金流的永续价值折现，不超过运营期现值的15%" level={1}>
                    <DriverNode label="永续价值" formula="平均月净现金流 除以 月折现率，折现到今天" level={2} isLeaf />
                  </DriverNode>
                </DriverNode>
              </div>
            </div>
          </Card>

          {/* Calculation Flow */}
          <Card 
            className="p-6 border-2"
            style={{ backgroundColor: '#FDF5E6', borderColor: '#5D4037', borderRadius: '4px' }}
          >
            <div className="flex items-center gap-2 mb-4">
              <Layers className="w-5 h-5" style={{ color: '#C19A6B' }} />
              <h2 className="text-lg font-semibold" style={{ color: '#4A3728' }}>计算流程</h2>
            </div>
            
            <div className="flex flex-wrap gap-3">
              {[
                { step: 1, title: '参数初始化', desc: '加载产品定价、渠道费用、压力系数等全部假设' },
                { step: 2, title: '风险分层', desc: '按10个风险等级分别独立计算，每级有不同的行为曲线' },
                { step: 3, title: '逐月递推', desc: '对每个风险等级，从第1个月到第99个月逐月计算收入和成本' },
                { step: 4, title: '月度折现', desc: '每个月的数值乘以对应折现因子后累加' },
                { step: 5, title: '残值计算', desc: '用最后一年的平均现金流估算99个月之后的剩余价值' },
                { step: 6, title: '加权汇总', desc: '将10个等级的结果按各自占比加权求和，得出组合NPV' },
              ].map((item) => (
                <div 
                  key={item.step}
                  className="flex-1 min-w-[140px] p-3 border"
                  style={{ backgroundColor: '#FAFAF8', borderColor: '#E5DFD6', borderRadius: '2px' }}
                >
                  <div 
                    className="w-6 h-6 flex items-center justify-center text-xs font-bold mb-2"
                    style={{ backgroundColor: '#C19A6B', color: '#FFFFFF', borderRadius: '2px' }}
                  >
                    {item.step}
                  </div>
                  <div className="text-xs font-medium" style={{ color: '#4A3728' }}>{item.title}</div>
                  <div className="text-xs mt-1" style={{ color: '#6B5B4F' }}>{item.desc}</div>
                </div>
              ))}
            </div>
          </Card>

          {/* Key Assumptions */}
          <Card 
            className="p-6 border-2"
            style={{ backgroundColor: '#FDF5E6', borderColor: '#5D4037', borderRadius: '4px' }}
          >
            <h2 className="text-lg font-semibold mb-4" style={{ color: '#4A3728' }}>关键默认参数</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-3 border" style={{ backgroundColor: '#FAFAF8', borderColor: '#E5DFD6', borderRadius: '2px' }}>
                <div className="text-xs font-medium mb-2" style={{ color: '#4A3728' }}>折现率</div>
                <div className="text-lg font-semibold" style={{ color: '#C19A6B' }}>15%/年</div>
                <div className="text-xs" style={{ color: '#6B5B4F' }}>转为月度约1.17%</div>
              </div>
              <div className="p-3 border" style={{ backgroundColor: '#FAFAF8', borderColor: '#E5DFD6', borderRadius: '2px' }}>
                <div className="text-xs font-medium mb-2" style={{ color: '#4A3728' }}>回收率</div>
                <div className="text-lg font-semibold" style={{ color: '#C19A6B' }}>10.5%</div>
                <div className="text-xs" style={{ color: '#6B5B4F' }}>违约后可回收比例</div>
              </div>
              <div className="p-3 border" style={{ backgroundColor: '#FAFAF8', borderColor: '#E5DFD6', borderRadius: '2px' }}>
                <div className="text-xs font-medium mb-2" style={{ color: '#4A3728' }}>计算周期</div>
                <div className="text-lg font-semibold" style={{ color: '#C19A6B' }}>99个月</div>
                <div className="text-xs" style={{ color: '#6B5B4F' }}>约8.25年生命周期</div>
              </div>
              <div className="p-3 border" style={{ backgroundColor: '#FAFAF8', borderColor: '#E5DFD6', borderRadius: '2px' }}>
                <div className="text-xs font-medium mb-2" style={{ color: '#4A3728' }}>残值上限</div>
                <div className="text-lg font-semibold" style={{ color: '#C19A6B' }}>15%</div>
                <div className="text-xs" style={{ color: '#6B5B4F' }}>不超过运营期现值的15%</div>
              </div>
            </div>
            
            {/* V3: Limit Elasticity Coefficients */}
            <div className="mt-5 mb-3">
              <h3 className="text-sm font-semibold mb-3" style={{ color: '#E65100' }}>V3 额度弹性系数（分层配置）</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse" style={{ minWidth: '700px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#5D4037' }}>
                      <th className="px-2 py-1.5 text-left text-white font-medium border" style={{ borderColor: '#4A3728' }}>弹性系数</th>
                      <th className="px-2 py-1.5 text-center text-white font-medium border" style={{ borderColor: '#4A3728' }}>说明</th>
                      {['R1','R2','R3','R4','R5','R6','R7','R8','R9','R10'].map(r => (
                        <th key={r} className="px-1.5 py-1.5 text-center text-white font-medium border" style={{ borderColor: '#4A3728' }}>{r}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { name: 'gammaStart', desc: 'gamma初始值', vals: [0.15,0.10,0.05,0.00,-0.10,-0.15,-0.20,-0.20,-0.20,-0.20] },
                      { name: 'gammaEnd', desc: 'gamma终值', vals: [-0.80,-0.70,-0.60,-0.50,-0.45,-0.45,-0.50,-0.55,-0.60,-0.60] },
                      { name: 'thetaStart', desc: 'theta初始值', vals: [0.20,0.15,0.08,0.00,-0.05,-0.10,-0.20,-0.30,-0.40,-0.40] },
                      { name: 'thetaEnd', desc: 'theta终值', vals: [-0.70,-0.60,-0.50,-0.40,-0.35,-0.40,-0.50,-0.60,-0.70,-0.80] },
                      { name: 'phi', desc: '严重率(正=放大)', vals: [0.00,0.00,0.05,0.10,0.15,0.20,0.30,0.40,0.50,0.60] },
                      { name: 'lambdaStart', desc: 'lambda初始值', vals: [0.60,0.55,0.50,0.50,0.55,0.65,0.75,0.85,0.95,1.00] },
                      { name: 'lambdaEnd', desc: 'lambda终值', vals: [-0.80,-0.75,-0.65,-0.55,-0.50,-0.50,-0.50,-0.50,-0.50,-0.50] },
                      { name: 'lambdaK', desc: 'lambda过渡宽度', vals: [0.90,1.00,1.10,1.30,1.50,1.80,2.00,2.20,2.50,2.80] },
                    ].map(row => (
                      <tr key={row.name} className="hover:bg-[#FAFAF8]">
                        <td className="px-2 py-1.5 font-mono font-bold border" style={{ borderColor: '#E5DFD6', color: '#E65100', backgroundColor: '#FDF5E6' }}>{row.name}</td>
                        <td className="px-2 py-1.5 border text-center" style={{ borderColor: '#E5DFD6', color: '#5D4037', backgroundColor: '#FDF5E6' }}>{row.desc}</td>
                        {row.vals.map((v, i) => (
                          <td key={i} className="px-1.5 py-1.5 text-center font-mono border" style={{ borderColor: '#E5DFD6', color: v === 0 ? '#A0978E' : v > 0 ? '#A52A2A' : '#4C6B4C' }}>
                            {v > 0 ? '+' : ''}{v.toFixed(2)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="text-[10px] mt-2 leading-relaxed" style={{ color: '#6B5B4F' }}>
                gamma/theta 用线性插值 t=(ΔL-1)/((ΔL-1)+1.5)，lambda 用平方插值 t=(ΔL-1)^2/((ΔL-1)^2+k^2)。Start为正值时(低风险)，小幅提额使消费/额度比、使用率、分期循环率均先升后降(驼峰)，但绝对值始终单调上升。
              </div>
              <div className="text-[10px] mt-2 p-2 border leading-relaxed" style={{ color: '#E65100', borderColor: '#E65100', backgroundColor: '#FFF8F0', borderRadius: '2px' }}>
                <span className="font-bold">gamma/theta插值: </span>transitionSpeed=3.0，线性插值 t = excess/(excess+k)，过渡更平滑
                <br />
                <span className="font-bold">lambda插值: </span>平方插值 t = excess^2/(excess^2+lambdaK^2)，初始更平坦。R1: k=0.90(平滑衰减), R10: k=2.80(缓慢衰减)
              </div>
            </div>

            {/* Additional parameters */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mt-4">
              {[
                { name: '年化利率', value: '18.25%' },
                { name: '年费', value: '395元' },
                { name: '回佣率', value: '0.40%' },
                { name: '取现费率', value: '2.46%' },
                { name: '超限费', value: '20元/次' },
                { name: 'FTP利率', value: '2.75%/年' },
                { name: '年运营成本', value: '38元/卡' },
                { name: '获客成本', value: '600元/卡' },
                { name: '欺诈损失率', value: '0.03%' },
                { name: '权益给付率', value: '0.5%' },
                { name: '权益封顶', value: '100元/月' },
                { name: '未使用额度转换系数', value: '20%' },
                ].map((p) => (
                <div key={p.name} className="p-2 border text-center" style={{ backgroundColor: '#FAFAF8', borderColor: '#E5DFD6', borderRadius: '2px' }}>
                  <div className="text-xs" style={{ color: '#6B5B4F' }}>{p.name}</div>
                  <div className="text-sm font-semibold mt-0.5" style={{ color: '#4A3728' }}>{p.value}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
