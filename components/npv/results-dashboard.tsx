'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { useNPV } from '@/lib/npv-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ArrowLeft,
  RefreshCw,
  Download,
  TrendingUp,
  TrendingDown,
  Target,
  Clock,
  Save,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Cell,
  ReferenceLine,
} from 'recharts';
import type { WaterfallItem } from '@/lib/npv-types';

// Format currency
function formatCurrency(value: number): string {
  if (Math.abs(value) >= 10000) {
    return `¥${(value / 10000).toFixed(1)}万`;
  }
  return `¥${value.toFixed(0)}`;
}

// Waterfall chart component
function WaterfallChart({ data, onBarClick }: { data: WaterfallItem[]; onBarClick: (item: WaterfallItem) => void }) {
  // Transform data for waterfall display
  const chartData = useMemo(() => {
    let cumulative = 0;
    return data.map((item, index) => {
      const start = item.type === 'total' ? 0 : cumulative;
      const end = item.type === 'total' ? item.value : cumulative + item.value;
      cumulative = item.type === 'total' ? cumulative : end;
      
      return {
        ...item,
        start: Math.min(start, end),
        end: Math.max(start, end),
        value: item.value,
        displayValue: item.value,
        fill: item.type === 'income' 
          ? '#4C6B4C' // Positive green 
          : item.type === 'cost' 
          ? '#8B4C4C' // Negative red
          : '#C19A6B', // Total - latte gold
      };
    });
  }, [data]);

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData} layout="vertical" margin={{ left: 80, right: 40 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E5DFD6" />
        <XAxis type="number" tickFormatter={formatCurrency} stroke="#6B635A" fontSize={12} />
        <YAxis type="category" dataKey="label" stroke="#6B635A" fontSize={12} width={70} />
        <Tooltip
          formatter={(value: number) => [formatCurrency(value), '金额']}
          contentStyle={{
            backgroundColor: '#FDF5E6',
            border: '1px solid #E5DFD6',
            borderRadius: '8px',
          }}
        />
        <ReferenceLine x={0} stroke="#6B635A" strokeWidth={2} />
        <Bar
          dataKey="value"
          radius={[0, 4, 4, 0]}
          onClick={(data) => onBarClick(data)}
          cursor="pointer"
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.fill} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// NPV Cumulative curve
function NPVCurveChart() {
  const { result } = useNPV();
  
  if (!result) return null;
  
  // Sample every 5 MOBs for cleaner display
  const chartData = result.mobData
    .filter((_, i) => i % 5 === 0 || i === result.mobData.length - 1)
    .map((point) => ({
      mob: point.mob,
      npv: point.cumulativeNPV,
    }));
  
  return (
    <ResponsiveContainer width="100%" height={250}>
      <LineChart data={chartData} margin={{ left: 20, right: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E5DFD6" />
        <XAxis 
          dataKey="mob" 
          stroke="#6B635A" 
          fontSize={12}
          label={{ value: 'MOB', position: 'insideBottom', offset: -5, fontSize: 11 }}
        />
        <YAxis 
          stroke="#6B635A" 
          fontSize={12} 
          tickFormatter={formatCurrency}
        />
        <Tooltip
          formatter={(value: number) => [formatCurrency(value), '累计NPV']}
          labelFormatter={(label) => `MOB ${label}`}
          contentStyle={{
            backgroundColor: '#FDF5E6',
            border: '1px solid #E5DFD6',
            borderRadius: '8px',
          }}
        />
        <ReferenceLine y={0} stroke="#8B4C4C" strokeDasharray="5 5" />
        {result.breakEvenMOB && (
          <ReferenceLine 
            x={result.breakEvenMOB} 
            stroke="#4C6B4C" 
            strokeDasharray="5 5"
            label={{ value: '盈亏平衡', position: 'top', fontSize: 10 }}
          />
        )}
        <Line
          type="monotone"
          dataKey="npv"
          stroke="#C19A6B"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 6, fill: '#C19A6B' }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

// Sensitivity heatmap
function SensitivityHeatmap() {
  const { sensitivityMatrix, result } = useNPV();
  
  if (!result || sensitivityMatrix.length === 0) return null;
  
  // Group by PD multiplier
  const pdMultipliers = [0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0];
  const limitAdjustments = [-0.5, -0.25, 0, 0.25, 0.5];
  
  // Find min/max for color scaling
  const values = sensitivityMatrix.map(p => p.npvValue);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  
  // Color interpolation
  const getColor = (value: number) => {
    const ratio = (value - minValue) / (maxValue - minValue);
    
    if (value < 0) {
      // Negative: light red
      const intensity = Math.min(Math.abs(value) / Math.abs(minValue), 1);
      return `rgba(139, 76, 76, ${0.2 + intensity * 0.5})`;
    }
    // Positive: green
    return `rgba(76, 107, 76, ${0.2 + ratio * 0.5})`;
  };
  
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className="p-2 text-left text-muted-foreground">PD倍数 \ 额度调整</th>
            {limitAdjustments.map((adj) => (
              <th key={adj} className="p-2 text-center text-muted-foreground">
                {adj > 0 ? `+${adj * 100}%` : `${adj * 100}%`}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {pdMultipliers.map((pd) => (
            <tr key={pd}>
              <td className="p-2 font-medium">{pd}x</td>
              {limitAdjustments.map((adj) => {
                const point = sensitivityMatrix.find(
                  (p) => p.pdMultiplier === pd && p.limitAdjustment === adj
                );
                
                return (
                  <td
                    key={`${pd}-${adj}`}
                    className="p-2 text-center transition-all hover:scale-105"
                    style={{ backgroundColor: point ? getColor(point.npvValue) : 'transparent' }}
                  >
                    {point ? formatCurrency(point.npvValue) : '-'}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Summary KPI cards
function KPICards() {
  const { result } = useNPV();
  
  if (!result) return null;
  
  const kpis = [
    {
      label: '总NPV',
      value: formatCurrency(result.totalNPV),
      icon: result.totalNPV >= 0 ? TrendingUp : TrendingDown,
      color: result.totalNPV >= 0 ? 'text-[#4C6B4C]' : 'text-[#8B4C4C]',
      bgColor: result.totalNPV >= 0 ? 'bg-[#D4E8D4]' : 'bg-[#E8D4D4]',
    },
    {
      label: '盈亏平衡',
      value: result.breakEvenMOB ? `MOB ${result.breakEvenMOB}` : '未达成',
      icon: Target,
      color: result.breakEvenMOB ? 'text-[#4C6B4C]' : 'text-[#8B4C4C]',
      bgColor: result.breakEvenMOB ? 'bg-[#D4E8D4]' : 'bg-[#E8D4D4]',
    },
    {
      label: '残值',
      value: formatCurrency(result.terminalValue),
      icon: Clock,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
  ];
  
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {kpis.map((kpi) => (
        <Card key={kpi.label} className="bg-card">
          <CardContent className="flex items-center gap-4 p-4">
            <div className={cn('flex h-12 w-12 items-center justify-center rounded-lg', kpi.bgColor)}>
              <kpi.icon className={cn('h-6 w-6', kpi.color)} />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{kpi.label}</p>
              <p className={cn('text-2xl font-bold', kpi.color)}>{kpi.value}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// Factor highlight panel
function LinkedFactorsPanel() {
  const { highlightedFactors, setHighlightedFactors, businessFactors } = useNPV();
  
  if (highlightedFactors.length === 0) {
    return (
      <div className="rounded-lg border border-dashed bg-muted/30 p-6 text-center">
        <p className="text-sm text-muted-foreground">
          点击瀑布图中的节点，查看关联的业务因子
        </p>
      </div>
    );
  }
  
  const factorLabels: Record<string, { label: string; value: string }> = {
    apr: { label: 'APR', value: `${(businessFactors.apr * 100).toFixed(2)}%` },
    revolvingRate: { label: '循环比例', value: `${(businessFactors.revolvingRate * 100).toFixed(0)}%` },
    utilizationRate: { label: '使用率', value: `${(businessFactors.utilizationRate * 100).toFixed(0)}%` },
    avgCreditLimit: { label: '平均额度', value: `¥${businessFactors.avgCreditLimit.toLocaleString()}` },
    interchangeRate: { label: '回佣率', value: `${(businessFactors.interchangeRate * 100).toFixed(2)}%` },
    annualFee: { label: '年费', value: `¥${businessFactors.annualFee}` },
    cashAdvanceFee: { label: '取现费率', value: `${(businessFactors.cashAdvanceFee * 100).toFixed(2)}%` },
    monthlySpend: { label: '月均消费', value: `¥${businessFactors.monthlySpend.toLocaleString()}` },
    riskLevel: { label: '风险等级', value: `${businessFactors.riskLevel}级` },
    lgd: { label: 'LGD', value: `${(businessFactors.lgd * 100).toFixed(0)}%` },
    ftpRate: { label: 'FTP', value: `${(businessFactors.ftpRate * 100).toFixed(2)}%` },
    opexPerCard: { label: '单卡成本', value: `¥${businessFactors.opexPerCard}` },
    cac: { label: 'CAC', value: `¥${businessFactors.cac}` },
    rewardsRate: { label: '权益率', value: `${(businessFactors.rewardsRate * 100).toFixed(1)}%` },
  };
  
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-foreground">关联业务因子</h4>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setHighlightedFactors([])}
          className="text-xs"
        >
          清除
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {highlightedFactors.map((factor) => {
          const info = factorLabels[factor];
          if (!info) return null;
          
          return (
            <div
              key={factor}
              className="animate-maillard-breathe rounded-lg border border-primary bg-primary/5 px-3 py-2"
            >
              <p className="text-xs text-muted-foreground">{info.label}</p>
              <p className="text-sm font-semibold text-foreground">{info.value}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ResultsDashboard() {
  const { result, setCurrentStep, resetAll, setHighlightedFactors } = useNPV();
  
  if (!result) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-muted-foreground">暂无测算结果</p>
        <Button variant="outline" onClick={() => setCurrentStep('scenario')} className="mt-4">
          返回开始
        </Button>
      </div>
    );
  }
  
  const handleWaterfallClick = (item: WaterfallItem) => {
    if (item.linkedFactors.length > 0) {
      setHighlightedFactors(item.linkedFactors);
    }
  };
  
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">NPV 测算结果</h2>
          <p className="mt-1 text-muted-foreground">
            {result.strategyConfig.cardProduct} - {result.strategyConfig.channel} - {result.strategyConfig.scenario}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2 bg-transparent">
            <Save className="h-4 w-4" />
            保存记录
          </Button>
          <Button variant="outline" size="sm" className="gap-2 bg-transparent">
            <Download className="h-4 w-4" />
            导出报告
          </Button>
        </div>
      </div>
      
      {/* KPI Summary */}
      <KPICards />
      
      {/* Main Charts Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Waterfall Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">NPV 瀑布图</CardTitle>
          </CardHeader>
          <CardContent>
            <WaterfallChart data={result.waterfall} onBarClick={handleWaterfallClick} />
            <div className="mt-4 border-t pt-4">
              <LinkedFactorsPanel />
            </div>
          </CardContent>
        </Card>
        
        {/* NPV Curve */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">累计 NPV 曲线</CardTitle>
          </CardHeader>
          <CardContent>
            <NPVCurveChart />
            <div className="mt-4 flex items-center justify-center gap-6 text-xs">
              <div className="flex items-center gap-2">
                <div className="h-0.5 w-4 bg-[#C19A6B]" />
                <span>累计NPV</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-0.5 w-4 border-b border-dashed border-[#8B4C4C]" />
                <span>零线</span>
              </div>
              {result.breakEvenMOB && (
                <div className="flex items-center gap-2">
                  <div className="h-0.5 w-4 border-b border-dashed border-[#4C6B4C]" />
                  <span>盈亏平衡点</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Sensitivity Heatmap */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">敏感度分析热力图</CardTitle>
          <p className="text-sm text-muted-foreground">
            X轴: 初始额度调整 | Y轴: PD压力系数
          </p>
        </CardHeader>
        <CardContent>
          <SensitivityHeatmap />
        </CardContent>
      </Card>
      
      {/* Action Buttons */}
      <div className="flex justify-between border-t border-border pt-6">
        <Button
          variant="outline"
          onClick={() => setCurrentStep('factors')}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          调整参数
        </Button>
        
        <Button onClick={resetAll} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          新建测算
        </Button>
      </div>
    </div>
  );
}
