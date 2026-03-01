'use client';

import { NPVProvider, useNPV } from '@/lib/npv-context';
import { ModuleEntry } from '@/components/npv/module-entry';
import { StrategyHub } from '@/components/npv/strategy-hub';
import { WizardFlow } from '@/components/npv/wizard-flow';
import { CoreDashboard } from '@/components/npv/core-dashboard';
import { SnapshotCompare } from '@/components/npv/snapshot-compare';

function NPVApp() {
  const { currentStage } = useNPV();
  
  switch (currentStage) {
    case 'entry':
      return <ModuleEntry />;
    case 'hub':
      return <StrategyHub />;
    case 'wizard':
      return <WizardFlow />;
    case 'dashboard':
      return <CoreDashboard />;
    case 'snapshots':
      return <SnapshotCompare />;
    default:
      return <ModuleEntry />;
  }
}

export default function Page() {
  return (
    <NPVProvider>
      <NPVApp />
    </NPVProvider>
  );
}
