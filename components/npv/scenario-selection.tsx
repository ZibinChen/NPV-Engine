'use client';

import React from "react"

import { cn } from '@/lib/utils';
import { useNPV } from '@/lib/npv-context';
import type { CardProduct, AcquisitionChannel, DecisionScenario } from '@/lib/npv-types';
import { Button } from '@/components/ui/button';
import {
  CreditCard,
  Award,
  Crown,
  Gem,
  Globe,
  Building2,
  Handshake,
  UserPlus,
  Shield,
  Scale,
  Zap,
  ArrowRight,
  Lock,
} from 'lucide-react';

// Card product options (年费递降，APR统一18.25%不展示)
const cardProducts: {
  id: CardProduct;
  name: string;
  description: string;
  icon: React.ReactNode;
  features: string[];
}[] = [
  {
    id: 'standard',
    name: '标准卡',
    description: '入门级信用卡产品',
    icon: <CreditCard className="h-6 w-6" />,
    features: ['免年费', '基础权益'],
  },
  {
    id: 'gold',
    name: '金卡',
    description: '中端商务客群',
    icon: <Award className="h-6 w-6" />,
    features: ['年费150', '积分加速'],
  },
  {
    id: 'platinum',
    name: '白金卡',
    description: '高端权益产品',
    icon: <Crown className="h-6 w-6" />,
    features: ['年费280', '贵宾服务'],
  },
  {
    id: 'premium',
    name: '高端权益卡',
    description: '顶级尊享产品',
    icon: <Gem className="h-6 w-6" />,
    features: ['年费395', '全球礼遇'],
  },
];

// Acquisition channels (活跃率不展示，所有产品活跃一致; CAC按渠道差异)
const channels: {
  id: AcquisitionChannel;
  name: string;
  description: string;
  icon: React.ReactNode;
  cac: string;
}[] = [
  {
    id: 'online',
    name: '线上渠道',
    description: '官网/APP直接申请',
    icon: <Globe className="h-6 w-6" />,
    cac: 'CAC ¥600',
  },
  {
    id: 'branch',
    name: '网点渠道',
    description: '分支机构办理',
    icon: <Building2 className="h-6 w-6" />,
    cac: 'CAC ¥450',
  },
  {
    id: 'partner',
    name: '合作方渠道',
    description: '场景方联合获客',
    icon: <Handshake className="h-6 w-6" />,
    cac: 'CAC ¥350',
  },
  {
    id: 'direct-sales',
    name: '直销渠道',
    description: '销售团队推广',
    icon: <UserPlus className="h-6 w-6" />,
    cac: 'CAC ¥800',
  },
];

// Decision scenarios (只影响PD: 基准x1, 决策x1.3, 压力x2.5)
const scenarios: {
  id: DecisionScenario;
  name: string;
  description: string;
  icon: React.ReactNode;
  riskProfile: string;
}[] = [
  {
    id: 'base',
    name: '基准情景',
    description: '正常经济环境，基准PD',
    icon: <Scale className="h-6 w-6" />,
    riskProfile: 'PD x 1.0',
  },
  {
    id: 'decision',
    name: '决策情景',
    description: '审慎决策，PD上浮30%',
    icon: <Shield className="h-6 w-6" />,
    riskProfile: 'PD x 1.3',
  },
  {
    id: 'stress',
    name: '压力情景',
    description: '极端压力测试，PD上浮150%',
    icon: <Zap className="h-6 w-6" />,
    riskProfile: 'PD x 2.5',
  },
];

interface SelectionCardProps {
  selected: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  name: string;
  description: string;
  badge?: string;
  features?: string[];
  disabled?: boolean;
}

function SelectionCard({
  selected,
  onClick,
  icon,
  name,
  description,
  badge,
  features,
  disabled,
}: SelectionCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'relative flex flex-col items-start rounded-xl border-2 p-4 text-left transition-all duration-200',
        'hover:border-primary/50 hover:shadow-md',
        selected && 'border-primary bg-primary/5 shadow-md animate-maillard-breathe',
        !selected && 'border-border bg-card',
        disabled && 'cursor-not-allowed opacity-50'
      )}
    >
      {/* Icon */}
      <div
        className={cn(
          'mb-3 flex h-12 w-12 items-center justify-center rounded-lg transition-colors',
          selected ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'
        )}
      >
        {icon}
      </div>
      
      {/* Content */}
      <h3 className="text-base font-semibold text-foreground">{name}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      
      {/* Badge */}
      {badge && (
        <span className="mt-2 inline-block rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
          {badge}
        </span>
      )}
      
      {/* Features */}
      {features && features.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {features.map((feature) => (
            <span
              key={feature}
              className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground"
            >
              {feature}
            </span>
          ))}
        </div>
      )}
      
      {/* Selection indicator */}
      {selected && (
        <div className="absolute right-3 top-3 h-3 w-3 rounded-full bg-primary" />
      )}
    </button>
  );
}

// Placeholder card for "存量策略"
function PlaceholderCard() {
  return (
    <div className="relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted/30 p-8 text-center">
      {/* Scan line effect */}
      <div className="absolute inset-0 overflow-hidden rounded-xl">
        <div className="absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent animate-scan-line" />
      </div>
      
      <Lock className="mb-3 h-10 w-10 text-muted-foreground/50" />
      <h3 className="text-base font-semibold text-muted-foreground">存量策略 - 组合调优</h3>
      <p className="mt-1 text-sm text-muted-foreground/70">即将推出</p>
      
      <span className="mt-4 inline-block rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
        Coming Soon
      </span>
    </div>
  );
}

export function ScenarioSelection() {
  const {
    strategyConfig,
    setCardProduct,
    setChannel,
    setScenario,
    canProceed,
    setCurrentStep,
  } = useNPV();

  const selectedProduct = strategyConfig?.cardProduct;
  const selectedChannel = strategyConfig?.channel;
  const selectedScenario = strategyConfig?.scenario;

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-foreground">新客策略 - 场景配置</h2>
        <p className="mt-2 text-muted-foreground">
          选择卡产品、获客渠道和决策情景，构建测算组合
        </p>
      </div>

      {/* Card Product Selection */}
      <section>
        <h3 className="mb-4 text-lg font-semibold text-foreground">卡产品</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cardProducts.map((product) => (
            <SelectionCard
              key={product.id}
              selected={selectedProduct === product.id}
              onClick={() => setCardProduct(product.id)}
              icon={product.icon}
              name={product.name}
              description={product.description}
              features={product.features}
            />
          ))}
        </div>
      </section>

      {/* Acquisition Channel Selection */}
      <section>
        <h3 className="mb-4 text-lg font-semibold text-foreground">获客渠道</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {channels.map((channel) => (
            <SelectionCard
              key={channel.id}
              selected={selectedChannel === channel.id}
              onClick={() => setChannel(channel.id)}
              icon={channel.icon}
              name={channel.name}
              description={channel.description}
              badge={channel.cac}
            />
          ))}
        </div>
      </section>

      {/* Decision Scenario Selection */}
      <section>
        <h3 className="mb-4 text-lg font-semibold text-foreground">决策情景</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {scenarios.map((scenario) => (
            <SelectionCard
              key={scenario.id}
              selected={selectedScenario === scenario.id}
              onClick={() => setScenario(scenario.id)}
              icon={scenario.icon}
              name={scenario.name}
              description={scenario.description}
              badge={scenario.riskProfile}
            />
          ))}
        </div>
      </section>

      {/* Placeholder Section */}
      <section className="border-t border-border pt-8">
        <h3 className="mb-4 text-lg font-semibold text-muted-foreground">其他策略类型</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <PlaceholderCard />
        </div>
      </section>

      {/* Action Button */}
      <div className="flex justify-end border-t border-border pt-6">
        <Button
          size="lg"
          onClick={() => setCurrentStep('factors')}
          disabled={!canProceed}
          className="gap-2"
        >
          下一步：配置业务因子
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
