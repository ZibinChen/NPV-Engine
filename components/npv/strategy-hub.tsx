'use client';

import Link from 'next/link';
import { useNPV } from '@/lib/npv-context';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Plus, 
  ArrowLeft, 
  Trash2,
  Settings,
  BookOpen,
  Eye,
} from 'lucide-react';
import { CARD_PRODUCT_LABELS, CHANNEL_LABELS, SCENARIO_LABELS } from '@/lib/npv-types';
import type { CardProduct, Channel, Scenario } from '@/lib/npv-types';

// Mock history data for showcase mode
const MOCK_HISTORY = [
  {
    id: 'mock_1',
    name: '2025Q1 高端白金卡 - 线上获客方案',
    savedAt: new Date('2025-01-15T10:30:00'),
    cardProduct: 'platinum' as CardProduct,
    channel: 'online' as Channel,
    scenario: 'decision' as Scenario,
  },
  {
    id: 'mock_2',
    name: '2024Q4 联名卡 - 流量平台下沉尝试',
    savedAt: new Date('2024-12-08T14:15:00'),
    cardProduct: 'young' as CardProduct,
    channel: 'thirdParty' as Channel,
    scenario: 'stress' as Scenario,
  },
  {
    id: 'mock_3',
    name: '标准卡 - 额度调优测试 v2',
    savedAt: new Date('2025-01-20T09:45:00'),
    cardProduct: 'standard' as CardProduct,
    channel: 'branch' as Channel,
    scenario: 'decision' as Scenario,
  },
];

export function StrategyHub() {
  const { 
    setCurrentStage, 
    startNewAnalysis, 
    history, 
    loadFromHistory,
    deleteFromHistory 
  } = useNPV();
  
  // Format date
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };
  
  const isShowcaseMode = history.length === 0;
  
  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#F5F0E8' }}>
      {/* Global Header */}
      <header 
        className="sticky top-0 z-50 border-b-2"
        style={{ backgroundColor: '#FDF5E6', borderColor: '#5D4037' }}
      >
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentStage('entry')}
              className="gap-1.5 text-xs"
              style={{ color: '#5D4037' }}
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              返回门户
            </Button>
            <div className="h-4 w-px" style={{ backgroundColor: '#E5DFD6' }} />
            <span className="font-semibold" style={{ color: '#4A3728' }}>获客策略中心</span>
          </div>
          
          {/* Header Buttons - Navigate to detail pages */}
          <div className="flex items-center gap-2">
            <Link href="/curves">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs bg-transparent"
                style={{ borderColor: '#5D4037', color: '#5D4037', borderRadius: '4px' }}
              >
                <Settings className="w-3.5 h-3.5" />
                管理后端假设曲线
              </Button>
            </Link>
            <Link href="/engine-logic">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs bg-transparent"
                style={{ borderColor: '#5D4037', color: '#5D4037', borderRadius: '4px' }}
              >
                <BookOpen className="w-3.5 h-3.5" />
                计算引擎逻辑
              </Button>
            </Link>
          </div>
        </div>
      </header>
      
      <div className="flex-1 p-6">
        <div className="max-w-6xl mx-auto">
        
          {/* New Analysis Button */}
          <Card 
            className="mb-8 cursor-pointer transition-all duration-200 hover:shadow-md border-2 border-dashed"
            style={{ 
              backgroundColor: '#FDF5E6',
              borderColor: '#C19A6B',
              borderRadius: '4px',
            }}
            onClick={startNewAnalysis}
          >
            <div className="p-6 flex items-center gap-4">
              <div 
                className="w-12 h-12 flex items-center justify-center"
                style={{ backgroundColor: '#C19A6B', borderRadius: '4px' }}
              >
                <Plus className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-medium" style={{ color: '#4A3728' }}>
                  新建策略分析
                </h3>
                <p className="text-sm" style={{ color: '#6B5B4F' }}>
                  开始新的NPV测算，配置产品、渠道和决策情景
                </p>
              </div>
            </div>
          </Card>
          
          {/* History Section */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium" style={{ color: '#4A3728' }}>
                历史测算记录
              </h2>
              {isShowcaseMode && (
                <span 
                  className="text-xs px-2 py-1"
                  style={{ 
                    backgroundColor: '#F0EBE3', 
                    color: '#8B8178',
                    borderRadius: '2px',
                  }}
                >
                  演示数据
                </span>
              )}
            </div>
            
            <Card style={{ backgroundColor: '#FDF5E6', border: '1px solid #E5DFD6', borderRadius: '2px' }}>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: '2px solid #5D4037' }}>
                      <th className="text-left px-4 py-3 font-medium text-xs" style={{ color: '#5D4037' }}>名称</th>
                      <th className="text-left px-4 py-3 font-medium text-xs" style={{ color: '#5D4037' }}>保存时间</th>
                      <th className="text-left px-4 py-3 font-medium text-xs" style={{ color: '#5D4037' }}>卡产品</th>
                      <th className="text-left px-4 py-3 font-medium text-xs" style={{ color: '#5D4037' }}>获客渠道</th>
                      <th className="text-left px-4 py-3 font-medium text-xs" style={{ color: '#5D4037' }}>情景</th>
                      <th className="text-right px-4 py-3 font-medium text-xs" style={{ color: '#5D4037' }}>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isShowcaseMode ? (
                      MOCK_HISTORY.map((item) => (
                        <tr 
                          key={item.id} 
                          className="transition-colors duration-150"
                          style={{ borderBottom: '1px solid #E5DFD6' }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F0EBE3'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          <td className="px-4 py-3 font-medium" style={{ color: '#4A3728' }}>{item.name}</td>
                          <td className="px-4 py-3 text-xs" style={{ color: '#8B8178' }}>{formatDate(item.savedAt)}</td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 text-xs" style={{ backgroundColor: '#F0EBE3', color: '#5D4037', borderRadius: '2px' }}>
                              {CARD_PRODUCT_LABELS[item.cardProduct]}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 text-xs" style={{ backgroundColor: '#F0EBE3', color: '#5D4037', borderRadius: '2px' }}>
                              {CHANNEL_LABELS[item.channel]}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 text-xs" style={{ backgroundColor: '#F0EBE3', color: '#5D4037', borderRadius: '2px' }}>
                              {SCENARIO_LABELS[item.scenario]}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={startNewAnalysis}
                              className="gap-1 text-xs bg-transparent h-7"
                              style={{ borderColor: '#5D4037', color: '#5D4037', borderRadius: '2px' }}
                            >
                              <Eye className="w-3 h-3" />
                              查看
                            </Button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      history.map((item) => (
                        <tr 
                          key={item.id} 
                          className="transition-colors duration-150"
                          style={{ borderBottom: '1px solid #E5DFD6' }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F0EBE3'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          <td className="px-4 py-3 font-medium" style={{ color: '#4A3728' }}>{item.name}</td>
                          <td className="px-4 py-3 text-xs" style={{ color: '#8B8178' }}>{formatDate(item.savedAt)}</td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 text-xs" style={{ backgroundColor: '#F0EBE3', color: '#5D4037', borderRadius: '2px' }}>
                              {CARD_PRODUCT_LABELS[item.result.strategyConfig.cardProduct]}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 text-xs" style={{ backgroundColor: '#F0EBE3', color: '#5D4037', borderRadius: '2px' }}>
                              {CHANNEL_LABELS[item.result.strategyConfig.channel]}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 text-xs" style={{ backgroundColor: '#F0EBE3', color: '#5D4037', borderRadius: '2px' }}>
                              {SCENARIO_LABELS[item.result.strategyConfig.scenario]}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => loadFromHistory(item.id)}
                                className="gap-1 text-xs bg-transparent h-7"
                                style={{ borderColor: '#5D4037', color: '#5D4037', borderRadius: '2px' }}
                              >
                                <Eye className="w-3 h-3" />
                                查看
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0"
                                onClick={() => deleteFromHistory(item.id)}
                              >
                                <Trash2 className="w-3.5 h-3.5" style={{ color: '#A69B8C' }} />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
                {history.length === 0 && !isShowcaseMode && (
                  <div className="text-center py-8 text-sm" style={{ color: '#8B8178' }}>
                    暂无历史记录
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
