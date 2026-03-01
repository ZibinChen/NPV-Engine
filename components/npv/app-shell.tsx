'use client';

import React from "react"

import { cn } from '@/lib/utils';
import { useNPV, type WizardStep } from '@/lib/npv-context';
import { Check, ChevronRight, LayoutDashboard, Settings, TrendingUp, Database } from 'lucide-react';

const steps: { id: WizardStep; label: string; icon: React.ReactNode }[] = [
  { id: 'scenario', label: '策略场景', icon: <LayoutDashboard className="h-4 w-4" /> },
  { id: 'factors', label: '业务因子', icon: <Settings className="h-4 w-4" /> },
  { id: 'results', label: '测算结果', icon: <TrendingUp className="h-4 w-4" /> },
];

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const { currentStep, setCurrentStep, result } = useNPV();
  
  const currentStepIndex = steps.findIndex(s => s.id === currentStep);
  
  const canNavigateTo = (step: WizardStep): boolean => {
    const stepIndex = steps.findIndex(s => s.id === step);
    
    // Can always go back
    if (stepIndex < currentStepIndex) return true;
    
    // Can go to results only if we have results
    if (step === 'results') return !!result;
    
    // Can go to factors from scenario
    if (step === 'factors' && currentStep === 'scenario') return true;
    
    return stepIndex <= currentStepIndex;
  };
  
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
                <Database className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-foreground">NPV Management Engine</h1>
                <p className="text-xs text-muted-foreground">信用卡全生命周期测算工具</p>
              </div>
            </div>
            
            {/* Step Indicator */}
            <nav className="hidden md:flex items-center gap-1">
              {steps.map((step, index) => {
                const isActive = step.id === currentStep;
                const isCompleted = index < currentStepIndex;
                const canClick = canNavigateTo(step.id);
                
                return (
                  <div key={step.id} className="flex items-center">
                    <button
                      onClick={() => canClick && setCurrentStep(step.id)}
                      disabled={!canClick}
                      className={cn(
                        'flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all',
                        isActive && 'bg-primary text-primary-foreground',
                        isCompleted && !isActive && 'bg-secondary text-secondary-foreground',
                        !isActive && !isCompleted && 'text-muted-foreground',
                        canClick && !isActive && 'hover:bg-secondary/80 cursor-pointer',
                        !canClick && 'cursor-not-allowed opacity-50'
                      )}
                    >
                      {isCompleted && !isActive ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        step.icon
                      )}
                      {step.label}
                    </button>
                    
                    {index < steps.length - 1 && (
                      <ChevronRight className="mx-2 h-4 w-4 text-muted-foreground/50" />
                    )}
                  </div>
                );
              })}
            </nav>
            
            {/* Mobile Step Indicator */}
            <div className="flex md:hidden items-center gap-2">
              <span className="text-sm font-medium text-foreground">
                {steps[currentStepIndex].label}
              </span>
              <span className="text-xs text-muted-foreground">
                ({currentStepIndex + 1}/{steps.length})
              </span>
            </div>
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {children}
      </main>
      
      {/* Footer */}
      <footer className="border-t border-border bg-card/50 py-4">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="text-center text-xs text-muted-foreground">
            NPV Management Engine v1.0 - 仅供内部演示使用
          </p>
        </div>
      </footer>
    </div>
  );
}
