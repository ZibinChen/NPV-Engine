'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { TrendingUp, ArrowLeft, Activity, Percent, CreditCard, TrendingDown } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

// Generate MOB 1-100 data for different risk grades
function generatePDCurve(riskGrade: number): { mob: number; pd: number }[] {
  const basePD = [0.005, 0.008, 0.012, 0.018, 0.030, 0.045, 0.065, 0.090, 0.120, 0.150][riskGrade - 1];
  return Array.from({ length: 100 }, (_, i) => {
    const mob = i + 1;
    // S-curve decay: PD peaks around MOB 12-18, then decays
    const peakMob = 15;
    const decay = 1 / (1 + Math.exp(-0.15 * (mob - peakMob)));
    const pd = basePD * (0.3 + 0.7 * decay) * (1 - 0.3 * Math.min(mob / 100, 1));
    return { mob, pd: pd * 100 };
  });
}

function generateActivityCurve(): { mob: number; rate: number }[] {
  return Array.from({ length: 100 }, (_, i) => {
    const mob = i + 1;
    // Ramp up to 80% by MOB 6, stable, then decay
    let rate: number;
    if (mob <= 6) {
      rate = 0.5 + 0.3 * (mob / 6);
    } else if (mob <= 24) {
      rate = 0.75 + 0.05 * Math.sin(mob / 4);
    } else {
      rate = 0.75 - 0.15 * ((mob - 24) / 76);
    }
    return { mob, rate: rate * 100 };
  });
}

function generateUtilizationCurve(): { mob: number; rate: number }[] {
  return Array.from({ length: 100 }, (_, i) => {
    const mob = i + 1;
    // Peak at MOB 12, stable, then slow decay
    let rate: number;
    if (mob <= 12) {
      rate = 0.2 + 0.25 * (mob / 12);
    } else if (mob <= 36) {
      rate = 0.42 + 0.08 * Math.sin((mob - 12) / 6);
    } else {
      rate = 0.45 - 0.1 * ((mob - 36) / 64);
    }
    return { mob, rate: rate * 100 };
  });
}

function generateRevolvingCurve(riskGrade: number): { mob: number; rate: number }[] {
  const baseRate = [0.30, 0.32, 0.35, 0.40, 0.45, 0.50, 0.55, 0.60, 0.68, 0.75][riskGrade - 1];
  return Array.from({ length: 100 }, (_, i) => {
    const mob = i + 1;
    // Gradually increases then stabilizes
    const ramp = Math.min(1, mob / 18);
    const rate = baseRate * (0.7 + 0.3 * ramp);
    return { mob, rate: rate * 100 };
  });
}

// Combine data for charts
const pdData = Array.from({ length: 100 }, (_, i) => {
  const mob = i + 1;
  const result: Record<string, number> = { mob };
  [1, 3, 5, 7, 10].forEach(grade => {
    result[`grade${grade}`] = generatePDCurve(grade)[i].pd;
  });
  return result;
});

const activityData = generateActivityCurve();
const utilizationData = generateUtilizationCurve();

const revolvingData = Array.from({ length: 100 }, (_, i) => {
  const mob = i + 1;
  const result: Record<string, number> = { mob };
  [1, 3, 5, 7, 10].forEach(grade => {
    result[`grade${grade}`] = generateRevolvingCurve(grade)[i].rate;
  });
  return result;
});

const gradeColors: Record<string, string> = {
  grade1: '#4A7C59',
  grade3: '#7BA05B',
  grade5: '#C19A6B',
  grade7: '#B87333',
  grade10: '#8B4C4C',
};

// Detailed data tables
const pdTableData = [
  { grade: 1, mob1: 0.15, mob6: 0.35, mob12: 0.45, mob24: 0.40, mob48: 0.30, mob72: 0.20, mob100: 0.12 },
  { grade: 2, mob1: 0.24, mob6: 0.56, mob12: 0.72, mob24: 0.64, mob48: 0.48, mob72: 0.32, mob100: 0.19 },
  { grade: 3, mob1: 0.36, mob6: 0.84, mob12: 1.08, mob24: 0.96, mob48: 0.72, mob72: 0.48, mob100: 0.29 },
  { grade: 4, mob1: 0.54, mob6: 1.26, mob12: 1.62, mob24: 1.44, mob48: 1.08, mob72: 0.72, mob100: 0.43 },
  { grade: 5, mob1: 0.90, mob6: 2.10, mob12: 2.70, mob24: 2.40, mob48: 1.80, mob72: 1.20, mob100: 0.72 },
  { grade: 6, mob1: 1.35, mob6: 3.15, mob12: 4.05, mob24: 3.60, mob48: 2.70, mob72: 1.80, mob100: 1.08 },
  { grade: 7, mob1: 1.95, mob6: 4.55, mob12: 5.85, mob24: 5.20, mob48: 3.90, mob72: 2.60, mob100: 1.56 },
  { grade: 8, mob1: 2.70, mob6: 6.30, mob12: 8.10, mob24: 7.20, mob48: 5.40, mob72: 3.60, mob100: 2.16 },
  { grade: 9, mob1: 3.60, mob6: 8.40, mob12: 10.8, mob24: 9.60, mob48: 7.20, mob72: 4.80, mob100: 2.88 },
  { grade: 10, mob1: 4.50, mob6: 10.5, mob12: 13.5, mob24: 12.0, mob48: 9.00, mob72: 6.00, mob100: 3.60 },
];

export default function CurvesPage() {
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
                <TrendingUp className="w-3 h-3 text-white" />
              </div>
              <span className="font-semibold" style={{ color: '#4A3728' }}>后端假设曲线管理</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Page Description */}
          <div className="mb-4">
            <p className="text-sm" style={{ color: '#6B5B4F' }}>
              MOB 1-100 的基础行为假设曲线，用于驱动NPV计算引擎。以下曲线基于历史数据拟合，按风险等级分层展示。
            </p>
          </div>

          {/* Charts Grid - 2x2 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* PD Curve Chart */}
            <Card 
              className="p-4 border-2"
              style={{ backgroundColor: '#FDF5E6', borderColor: '#5D4037', borderRadius: '4px' }}
            >
              <div className="flex items-center gap-2 mb-4">
                <TrendingDown className="w-4 h-4" style={{ color: '#8B4C4C' }} />
                <h3 className="font-semibold text-sm" style={{ color: '#4A3728' }}>
                  PD曲线 (月度违约概率 %)
                </h3>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={pdData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5DFD6" />
                    <XAxis 
                      dataKey="mob" 
                      tick={{ fontSize: 10, fill: '#6B5B4F' }}
                      tickFormatter={(v) => v % 20 === 0 ? v : ''}
                    />
                    <YAxis tick={{ fontSize: 10, fill: '#6B5B4F' }} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#FDF5E6', borderColor: '#E5DFD6', borderRadius: '2px', fontSize: '11px' }}
                      formatter={(value: number) => [`${value.toFixed(2)}%`, '']}
                    />
                    <Legend wrapperStyle={{ fontSize: '10px' }} />
                    <Line type="monotone" dataKey="grade1" stroke={gradeColors.grade1} dot={false} name="风险1级" strokeWidth={1.5} />
                    <Line type="monotone" dataKey="grade3" stroke={gradeColors.grade3} dot={false} name="风险3级" strokeWidth={1.5} />
                    <Line type="monotone" dataKey="grade5" stroke={gradeColors.grade5} dot={false} name="风险5级" strokeWidth={1.5} />
                    <Line type="monotone" dataKey="grade7" stroke={gradeColors.grade7} dot={false} name="风险7级" strokeWidth={1.5} />
                    <Line type="monotone" dataKey="grade10" stroke={gradeColors.grade10} dot={false} name="风险10级" strokeWidth={1.5} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Activity Rate Chart */}
            <Card 
              className="p-4 border-2"
              style={{ backgroundColor: '#FDF5E6', borderColor: '#5D4037', borderRadius: '4px' }}
            >
              <div className="flex items-center gap-2 mb-4">
                <Activity className="w-4 h-4" style={{ color: '#4A7C59' }} />
                <h3 className="font-semibold text-sm" style={{ color: '#4A3728' }}>
                  活跃率曲线 (%)
                </h3>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={activityData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5DFD6" />
                    <XAxis 
                      dataKey="mob" 
                      tick={{ fontSize: 10, fill: '#6B5B4F' }}
                      tickFormatter={(v) => v % 20 === 0 ? v : ''}
                    />
                    <YAxis tick={{ fontSize: 10, fill: '#6B5B4F' }} domain={[0, 100]} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#FDF5E6', borderColor: '#E5DFD6', borderRadius: '2px', fontSize: '11px' }}
                      formatter={(value: number) => [`${value.toFixed(1)}%`, '活跃率']}
                    />
                    <Line type="monotone" dataKey="rate" stroke="#4A7C59" dot={false} strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Utilization Rate Chart */}
            <Card 
              className="p-4 border-2"
              style={{ backgroundColor: '#FDF5E6', borderColor: '#5D4037', borderRadius: '4px' }}
            >
              <div className="flex items-center gap-2 mb-4">
                <CreditCard className="w-4 h-4" style={{ color: '#C19A6B' }} />
                <h3 className="font-semibold text-sm" style={{ color: '#4A3728' }}>
                  额度使用率曲线 (%)
                </h3>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={utilizationData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5DFD6" />
                    <XAxis 
                      dataKey="mob" 
                      tick={{ fontSize: 10, fill: '#6B5B4F' }}
                      tickFormatter={(v) => v % 20 === 0 ? v : ''}
                    />
                    <YAxis tick={{ fontSize: 10, fill: '#6B5B4F' }} domain={[0, 60]} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#FDF5E6', borderColor: '#E5DFD6', borderRadius: '2px', fontSize: '11px' }}
                      formatter={(value: number) => [`${value.toFixed(1)}%`, '使用率']}
                    />
                    <Line type="monotone" dataKey="rate" stroke="#C19A6B" dot={false} strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Revolving Rate Chart */}
            <Card 
              className="p-4 border-2"
              style={{ backgroundColor: '#FDF5E6', borderColor: '#5D4037', borderRadius: '4px' }}
            >
              <div className="flex items-center gap-2 mb-4">
                <Percent className="w-4 h-4" style={{ color: '#B87333' }} />
                <h3 className="font-semibold text-sm" style={{ color: '#4A3728' }}>
                  生息率曲线 (%)
                </h3>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={revolvingData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5DFD6" />
                    <XAxis 
                      dataKey="mob" 
                      tick={{ fontSize: 10, fill: '#6B5B4F' }}
                      tickFormatter={(v) => v % 20 === 0 ? v : ''}
                    />
                    <YAxis tick={{ fontSize: 10, fill: '#6B5B4F' }} domain={[0, 100]} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#FDF5E6', borderColor: '#E5DFD6', borderRadius: '2px', fontSize: '11px' }}
                      formatter={(value: number) => [`${value.toFixed(1)}%`, '']}
                    />
                    <Legend wrapperStyle={{ fontSize: '10px' }} />
                    <Line type="monotone" dataKey="grade1" stroke={gradeColors.grade1} dot={false} name="风险1级" strokeWidth={1.5} />
                    <Line type="monotone" dataKey="grade3" stroke={gradeColors.grade3} dot={false} name="风险3级" strokeWidth={1.5} />
                    <Line type="monotone" dataKey="grade5" stroke={gradeColors.grade5} dot={false} name="风险5级" strokeWidth={1.5} />
                    <Line type="monotone" dataKey="grade7" stroke={gradeColors.grade7} dot={false} name="风险7级" strokeWidth={1.5} />
                    <Line type="monotone" dataKey="grade10" stroke={gradeColors.grade10} dot={false} name="风险10级" strokeWidth={1.5} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          {/* Detailed Data Table */}
          <Card 
            className="p-4 border-2"
            style={{ backgroundColor: '#FDF5E6', borderColor: '#5D4037', borderRadius: '4px' }}
          >
            <h3 className="font-semibold text-sm mb-4" style={{ color: '#4A3728' }}>
              PD曲线详细数据 (月度违约概率 %)
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ backgroundColor: '#F0EBE3' }}>
                    <th className="text-left p-2 font-medium" style={{ color: '#4A3728', borderBottom: '1px solid #E5DFD6' }}>风险等级</th>
                    <th className="text-right p-2 font-medium" style={{ color: '#4A3728', borderBottom: '1px solid #E5DFD6' }}>MOB 1</th>
                    <th className="text-right p-2 font-medium" style={{ color: '#4A3728', borderBottom: '1px solid #E5DFD6' }}>MOB 6</th>
                    <th className="text-right p-2 font-medium" style={{ color: '#4A3728', borderBottom: '1px solid #E5DFD6' }}>MOB 12</th>
                    <th className="text-right p-2 font-medium" style={{ color: '#4A3728', borderBottom: '1px solid #E5DFD6' }}>MOB 24</th>
                    <th className="text-right p-2 font-medium" style={{ color: '#4A3728', borderBottom: '1px solid #E5DFD6' }}>MOB 48</th>
                    <th className="text-right p-2 font-medium" style={{ color: '#4A3728', borderBottom: '1px solid #E5DFD6' }}>MOB 72</th>
                    <th className="text-right p-2 font-medium" style={{ color: '#4A3728', borderBottom: '1px solid #E5DFD6' }}>MOB 100</th>
                  </tr>
                </thead>
                <tbody>
                  {pdTableData.map((row, idx) => (
                    <tr 
                      key={row.grade}
                      style={{ backgroundColor: idx % 2 === 0 ? '#FAFAF8' : '#FDF5E6' }}
                    >
                      <td className="p-2 font-medium" style={{ color: '#4A3728', borderBottom: '1px solid #E5DFD6' }}>
                        风险{row.grade}级
                      </td>
                      <td className="p-2 text-right" style={{ color: '#5D4037', borderBottom: '1px solid #E5DFD6' }}>{row.mob1.toFixed(2)}%</td>
                      <td className="p-2 text-right" style={{ color: '#5D4037', borderBottom: '1px solid #E5DFD6' }}>{row.mob6.toFixed(2)}%</td>
                      <td className="p-2 text-right" style={{ color: '#5D4037', borderBottom: '1px solid #E5DFD6' }}>{row.mob12.toFixed(2)}%</td>
                      <td className="p-2 text-right" style={{ color: '#5D4037', borderBottom: '1px solid #E5DFD6' }}>{row.mob24.toFixed(2)}%</td>
                      <td className="p-2 text-right" style={{ color: '#5D4037', borderBottom: '1px solid #E5DFD6' }}>{row.mob48.toFixed(2)}%</td>
                      <td className="p-2 text-right" style={{ color: '#5D4037', borderBottom: '1px solid #E5DFD6' }}>{row.mob72.toFixed(2)}%</td>
                      <td className="p-2 text-right" style={{ color: '#5D4037', borderBottom: '1px solid #E5DFD6' }}>{row.mob100.toFixed(2)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Key Assumptions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card 
              className="p-4 border"
              style={{ backgroundColor: '#FAFAF8', borderColor: '#E5DFD6', borderRadius: '2px' }}
            >
              <h4 className="font-medium text-xs mb-2" style={{ color: '#4A3728' }}>LGD 假设</h4>
              <div className="text-xs space-y-1" style={{ color: '#6B5B4F' }}>
                <div>无担保信用卡：60%</div>
                <div>回收周期：12-24个月</div>
                <div>回收率：25%-35%</div>
              </div>
            </Card>
            <Card 
              className="p-4 border"
              style={{ backgroundColor: '#FAFAF8', borderColor: '#E5DFD6', borderRadius: '2px' }}
            >
              <h4 className="font-medium text-xs mb-2" style={{ color: '#4A3728' }}>折现率假设</h4>
              <div className="text-xs space-y-1" style={{ color: '#6B5B4F' }}>
                <div>月度折现率：0.5%</div>
                <div>年化折现率：6.17%</div>
                <div>基于FTP利率+风险溢价</div>
              </div>
            </Card>
            <Card 
              className="p-4 border"
              style={{ backgroundColor: '#FAFAF8', borderColor: '#E5DFD6', borderRadius: '2px' }}
            >
              <h4 className="font-medium text-xs mb-2" style={{ color: '#4A3728' }}>残值假设</h4>
              <div className="text-xs space-y-1" style={{ color: '#6B5B4F' }}>
                <div>长期增长率 g：2%</div>
                <div>TV = CF100 × (1+g)/(r-g)</div>
                <div>折现至MOB 100</div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
