'use client';

import Link from 'next/link';
import { useNPV } from '@/lib/npv-context';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TrendingUp, Layers, ArrowRight, Settings, BookOpen } from 'lucide-react';

export function ModuleEntry() {
  const { setCurrentStage } = useNPV();

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#F5F0E8' }}>
      {/* Global Header */}
      <header 
        className="sticky top-0 z-50 border-b-2"
        style={{ backgroundColor: '#FDF5E6', borderColor: '#5D4037' }}
      >
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div 
              className="w-8 h-8 flex items-center justify-center"
              style={{ backgroundColor: '#C19A6B', borderRadius: '2px' }}
            >
              <TrendingUp className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold" style={{ color: '#4A3728' }}>NPV 管理引擎</span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/curves">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs bg-transparent"
                style={{ borderColor: '#5D4037', color: '#5D4037', borderRadius: '2px' }}
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
                style={{ borderColor: '#5D4037', color: '#5D4037', borderRadius: '2px' }}
              >
                <BookOpen className="w-3.5 h-3.5" />
                计算引擎逻辑
              </Button>
            </Link>
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-4xl">
          {/* Page Title */}
          <div className="text-center mb-10">
            <h1 className="text-2xl font-semibold mb-2" style={{ color: '#4A3728' }}>
              业务门户
            </h1>
            <p className="text-sm" style={{ color: '#6B5B4F' }}>
              选择业务模块开始测算
            </p>
          </div>
        
          {/* Module Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Acquisition Strategy Card - Active */}
            <Card 
              className="group relative overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-lg border-2"
              style={{ 
                backgroundColor: '#FDF5E6',
                borderColor: '#5D4037',
                borderRadius: '4px',
              }}
              onClick={() => setCurrentStage('hub')}
            >
              <div className="p-6">
                <div 
                  className="w-12 h-12 flex items-center justify-center mb-4"
                  style={{ backgroundColor: '#C19A6B', borderRadius: '2px' }}
                >
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                
                <h2 className="text-lg font-semibold mb-2" style={{ color: '#4A3728' }}>
                  获客策略 - 业务测算
                </h2>
                
                <p className="text-xs mb-4 leading-relaxed" style={{ color: '#6B5B4F' }}>
                  用于新产品评估、渠道方案及初始额度优化
                </p>
                
                <div className="space-y-1.5 mb-4 text-xs" style={{ color: '#5D4037' }}>
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-1" style={{ backgroundColor: '#C19A6B' }} />
                    产品定价与收益模拟
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-1" style={{ backgroundColor: '#C19A6B' }} />
                    风险分层与额度优化
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-1" style={{ backgroundColor: '#C19A6B' }} />
                    渠道ROI对比分析
                  </div>
                </div>
                
                <div 
                  className="flex items-center gap-2 text-sm font-medium group-hover:gap-3 transition-all"
                  style={{ color: '#C19A6B' }}
                >
                  进入模块
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </Card>
            
            {/* Stock Strategy Card - Disabled with Coming Soon */}
            <Card 
              className="relative overflow-hidden border-2"
              style={{ 
                backgroundColor: '#F0EBE3',
                borderColor: '#E5DFD6',
                borderRadius: '4px',
              }}
            >
              {/* Coming Soon Badge */}
              <div 
                className="absolute top-3 right-3 px-2 py-0.5 text-xs font-medium"
                style={{ backgroundColor: '#E5DFD6', color: '#6B635A', borderRadius: '2px' }}
              >
                Coming Soon
              </div>
              
              <div className="p-6 opacity-50">
                <div 
                  className="w-12 h-12 flex items-center justify-center mb-4"
                  style={{ backgroundColor: '#A69B8C', borderRadius: '2px' }}
                >
                  <Layers className="w-6 h-6 text-white" />
                </div>
                
                <h2 className="text-lg font-semibold mb-2" style={{ color: '#6B635A' }}>
                  存量策略 - 组合调优
                </h2>
                
                <p className="text-xs mb-4 leading-relaxed" style={{ color: '#8B8178' }}>
                  用于提降额决策、分期转化预测
                </p>
                
                <div className="space-y-1.5 mb-4 text-xs" style={{ color: '#8B8178' }}>
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-1" style={{ backgroundColor: '#A69B8C' }} />
                    额度动态调整策略
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-1" style={{ backgroundColor: '#A69B8C' }} />
                    分期产品转化预测
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-1" style={{ backgroundColor: '#A69B8C' }} />
                    组合风险再平衡
                  </div>
                </div>
              </div>
              
              {/* Scan line animation */}
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div 
                  className="absolute inset-x-0 h-px animate-scan-line"
                  style={{ 
                    background: 'linear-gradient(90deg, transparent, rgba(166,155,140,0.4), transparent)'
                  }}
                />
              </div>
            </Card>
          </div>
          
          {/* Footer */}
          <div className="mt-10 text-center">
            <p className="text-xs" style={{ color: '#A69B8C' }}>
              基于Driver-Based模型的MOB 1-100递推计算引擎
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
