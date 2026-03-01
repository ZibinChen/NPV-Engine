'use client';

import React, { useMemo, useState } from 'react';
import { useNPV } from '@/lib/npv-context';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Trash2, Camera, X, FlaskConical, Check } from 'lucide-react';
import type { Snapshot, ParamChange } from '@/lib/npv-types';

function groupChanges(changes: ParamChange[]): Record<string, ParamChange[]> {
  const groups: Record<string, ParamChange[]> = {};
  for (const c of changes) {
    if (!groups[c.group]) groups[c.group] = [];
    groups[c.group].push(c);
  }
  return groups;
}

function fmtWan(v: number): string {
  const wan = v / 10000;
  return `${wan >= 0 ? '' : '-'}${Math.abs(wan).toFixed(1)}万`;
}

function fmtYuan(v: number): string {
  return `¥${v.toFixed(0)}`;
}

// PV composition horizontal bars
function PVBars({ snapshot }: { snapshot: Snapshot }) {
  const pv = snapshot.npvResult.pvComposition;
  const items = [
    { label: '息收入', value: pv.interestIncome + pv.installmentIncome, color: '#6D8B74' },
    { label: '非息收入', value: pv.nonInterestIncome, color: '#8BAA7C' },
    { label: '资金成本', value: -pv.fundingCost, color: '#C17E61' },
    { label: '风险成本', value: -pv.riskCost, color: '#B85C4A' },
    { label: '运营+CAC', value: -(pv.otherCost + pv.cac), color: '#D4A87C' },
  ];
  const maxAbs = Math.max(...items.map(i => Math.abs(i.value)), 1);

  return (
    <div className="flex flex-col gap-1">
      {items.map((item) => {
        const pct = Math.abs(item.value) / maxAbs * 100;
        const isPos = item.value >= 0;
        return (
          <div key={item.label} className="flex items-center gap-1.5">
            <span className="text-[9px] w-10 text-right flex-shrink-0" style={{ color: '#8B8178' }}>{item.label}</span>
            <div className="flex-1 h-3 relative" style={{ backgroundColor: '#F5F0E8', borderRadius: '1px' }}>
              <div
                className="h-full"
                style={{
                  width: `${Math.min(pct, 100)}%`,
                  backgroundColor: item.color,
                  borderRadius: '1px',
                  opacity: isPos ? 1 : 0.7,
                }}
              />
            </div>
            <span className="text-[9px] w-10 text-right flex-shrink-0 font-mono" style={{ color: isPos ? '#4C6B4C' : '#8B4C4C' }}>
              {fmtWan(item.value)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// Detail modal (read-only)
function SnapshotDetailModal({ snapshot, onClose }: { snapshot: Snapshot; onClose: () => void }) {
  const pv = snapshot.npvResult.pvComposition;
  const grouped = groupChanges(snapshot.paramChanges);
  const groupNames = Object.keys(grouped);

  const pvRows = [
    { label: '循环利息收入', value: pv.interestIncome, color: '#6D8B74' },
    { label: '分期手续费收入', value: pv.installmentIncome, color: '#6D8B74' },
    { label: '回佣收入', value: pv.nintInterchange, color: '#8BAA7C' },
    { label: '年费收入', value: pv.nintAnnualFee, color: '#8BAA7C' },
    { label: '取现手续费', value: pv.nintCashAdvance, color: '#8BAA7C' },
    { label: '总收入', value: pv.totalIncome, color: '#4C6B4C', bold: true },
    { label: '已用额度资金成本', value: -pv.fundingCostUsed, color: '#C17E61' },
    { label: '未用额度资金成本', value: -pv.fundingCostUnused, color: '#C17E61' },
    { label: '风险成本', value: -pv.riskCost, color: '#B85C4A' },
    { label: '运营成本', value: -pv.otherOpex, color: '#D4A87C' },
    { label: '欺诈成本', value: -pv.otherFraud, color: '#D4A87C' },
    { label: '权益成本', value: -pv.otherRewards, color: '#D4A87C' },
    { label: '获客成本 (CAC)', value: -pv.cac, color: '#D4A87C' },
    { label: '终值', value: pv.terminalValue, color: '#7986CB' },
    { label: 'NPV', value: pv.pvValue, color: pv.pvValue >= 0 ? '#2E7D32' : '#C62828', bold: true },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
      <div 
        className="w-full max-w-xl max-h-[85vh] overflow-auto border shadow-lg"
        style={{ backgroundColor: '#FDF5E6', borderColor: '#5D4037', borderRadius: '4px' }}
      >
        {/* Modal Header */}
        <div className="sticky top-0 p-4 border-b flex items-center justify-between" style={{ backgroundColor: '#FDF5E6', borderColor: '#D4C5B2' }}>
          <div>
            <div className="text-sm font-semibold" style={{ color: '#3E2723' }}>{snapshot.name}</div>
            <div className="text-[10px] font-mono" style={{ color: '#8B8178' }}>
              {new Date(snapshot.createdAt).toLocaleString('zh-CN')}
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-7 w-7 p-0" style={{ color: '#5D4037' }}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* PV Details */}
        <div className="p-4 border-b" style={{ borderColor: '#E5DFD6' }}>
          <div className="text-[10px] font-medium uppercase tracking-wider mb-3" style={{ color: '#8B7355' }}>PV 明细</div>
          <div className="flex flex-col gap-0.5">
            {pvRows.map((row, i) => (
              <div 
                key={i} 
                className={`flex items-center justify-between py-1 px-2 ${row.bold ? 'border-t' : ''}`}
                style={{ 
                  backgroundColor: row.bold ? '#F5EFE3' : 'transparent', 
                  borderColor: '#D4C5B2',
                  borderRadius: row.bold ? '2px' : '0',
                }}
              >
                <span className={`text-[11px] ${row.bold ? 'font-semibold' : ''}`} style={{ color: '#3E2723' }}>
                  {row.label}
                </span>
                <span className={`text-[11px] font-mono ${row.bold ? 'font-bold' : ''}`} style={{ color: row.color }}>
                  {fmtYuan(row.value)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Param Details */}
        <div className="p-4">
          <div className="text-[10px] font-medium uppercase tracking-wider mb-3" style={{ color: '#8B7355' }}>
            参数设定 {snapshot.paramChanges.length > 0 ? `(${snapshot.paramChanges.length}项调整)` : '(默认)'}
          </div>
          {snapshot.paramChanges.length === 0 ? (
            <div className="text-[11px] text-center py-3" style={{ color: '#B0A898' }}>所有参数均为默认值</div>
          ) : (
            <div className="flex flex-col gap-3">
              {groupNames.map(group => (
                <div key={group}>
                  <div className="text-[10px] font-medium mb-1.5 pb-1 border-b" style={{ color: '#8B7355', borderColor: '#E5DFD6' }}>{group}</div>
                  <div className="flex flex-col gap-0.5">
                    {grouped[group].map((c, i) => (
                      <div key={i} className="flex items-center justify-between py-1 px-2" style={{ backgroundColor: '#FDF5E6', borderRadius: '2px' }}>
                        <span className="text-[11px]" style={{ color: '#6B5B4F' }}>{c.label}</span>
                        <div className="flex items-center gap-2 font-mono text-[11px]">
                          <span style={{ color: '#B0A898', textDecoration: 'line-through' }}>{c.defaultValue}</span>
                          <span className="font-semibold" style={{ color: '#5D4037' }}>{c.currentValue}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Snapshot card
function SnapshotCard({
  snapshot,
  baselineNPV,
  onDelete,
  onOpen,
  selected,
  onToggleSelect,
}: {
  snapshot: Snapshot;
  baselineNPV: number;
  onDelete: () => void;
  onOpen: () => void;
  selected: boolean;
  onToggleSelect: () => void;
}) {
  const npv = snapshot.npvResult.summary.npv;
  const delta = npv - baselineNPV;
  const pv = snapshot.npvResult.pvComposition;
  const totalCost = pv.riskCost + pv.fundingCost + pv.otherCost + pv.cac;
  const grouped = useMemo(() => groupChanges(snapshot.paramChanges), [snapshot.paramChanges]);
  const groupNames = Object.keys(grouped);

  return (
    <Card
      className="border flex flex-col overflow-hidden cursor-pointer transition-all hover:shadow-md"
      style={{ 
        backgroundColor: '#FFFFFF', 
        borderColor: selected ? '#5D4037' : snapshot.isBaseline ? '#8B7355' : '#D4C5B2', 
        borderRadius: '3px', 
        borderWidth: selected ? '2px' : snapshot.isBaseline ? '2px' : '1px',
        boxShadow: selected ? '0 0 0 2px rgba(93,64,55,0.15)' : 'none',
      }}
      onClick={onOpen}
    >
      {/* Header */}
      <div className="p-3 border-b" style={{ borderColor: '#E5DFD6', backgroundColor: selected ? '#F0EBE3' : snapshot.isBaseline ? '#F5EFE3' : '#FDFAF5' }}>
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => { e.stopPropagation(); onToggleSelect(); }}
              className="w-4 h-4 flex items-center justify-center flex-shrink-0 border transition-colors"
              style={{ 
                borderColor: selected ? '#5D4037' : '#B0A898', 
                backgroundColor: selected ? '#5D4037' : 'transparent',
                borderRadius: '2px',
              }}
            >
              {selected && <Check className="w-3 h-3" style={{ color: '#FFFFFF' }} />}
            </button>
            <span className="text-xs font-semibold" style={{ color: '#3E2723' }}>{snapshot.name}</span>
            {snapshot.isBaseline && (
              <span className="text-[9px] px-1.5 py-0.5 font-medium" style={{ backgroundColor: '#8B7355', color: '#FFFFFF', borderRadius: '2px' }}>
                基准
              </span>
            )}
          </div>
          {!snapshot.isBaseline && (
            <Button 
              variant="ghost" size="sm" 
              onClick={(e) => { e.stopPropagation(); onDelete(); }} 
              className="h-6 w-6 p-0" style={{ color: '#B0A898' }}
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          )}
        </div>
        <div className="text-[9px] font-mono" style={{ color: '#8B8178' }}>
          {new Date(snapshot.createdAt).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>

      {/* NPV + Income/Cost */}
      <div className="p-3 border-b" style={{ borderColor: '#E5DFD6' }}>
        <div className="flex items-baseline justify-between mb-2">
          <div>
            <div className="text-[10px]" style={{ color: '#8B8178' }}>NPV / 人</div>
            <div className="text-lg font-bold font-mono" style={{ color: npv >= 0 ? '#2E7D32' : '#C62828' }}>
              {fmtYuan(npv)}
            </div>
          </div>
          {!snapshot.isBaseline && (
            <div className="text-right">
              <div className="text-[9px]" style={{ color: '#8B8178' }}>vs 基准</div>
              <div className="text-sm font-bold font-mono" style={{ color: delta >= 0 ? '#2E7D32' : '#C62828' }}>
                {delta >= 0 ? '+' : ''}{fmtYuan(delta)}
              </div>
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="p-1.5" style={{ backgroundColor: '#F0F5EF', borderRadius: '2px' }}>
            <div className="text-[9px]" style={{ color: '#6B8B6B' }}>收入 PV</div>
            <div className="text-xs font-mono font-semibold" style={{ color: '#4C6B4C' }}>{fmtWan(pv.totalIncome)}</div>
          </div>
          <div className="p-1.5" style={{ backgroundColor: '#F5EFEF', borderRadius: '2px' }}>
            <div className="text-[9px]" style={{ color: '#8B6B6B' }}>成本 PV</div>
            <div className="text-xs font-mono font-semibold" style={{ color: '#8B4C4C' }}>{fmtWan(totalCost)}</div>
          </div>
        </div>
      </div>

      {/* PV Bars */}
      <div className="p-3 border-b" style={{ borderColor: '#E5DFD6' }}>
        <div className="text-[9px] font-medium mb-2" style={{ color: '#8B7355' }}>PV 构成</div>
        <PVBars snapshot={snapshot} />
      </div>

      {/* Parameter Changes */}
      <div className="p-3 flex-1">
        {snapshot.paramChanges.length === 0 ? (
          <div className="text-[10px] text-center py-2" style={{ color: '#B0A898' }}>
            默认参数，无调整
          </div>
        ) : (
          <div>
            <div className="text-[9px] font-medium mb-2" style={{ color: '#8B7355' }}>
              参数调整 ({snapshot.paramChanges.length}项)
            </div>
            <div className="flex flex-col gap-1.5">
              {groupNames.slice(0, 3).map(group => (
                <div key={group}>
                  <div className="text-[9px] mb-0.5" style={{ color: '#B0A898' }}>{group}</div>
                  {grouped[group].slice(0, 3).map((c, i) => (
                    <div key={i} className="flex items-center justify-between text-[10px] py-0.5 px-1.5" style={{ backgroundColor: '#FDF5E6', borderRadius: '2px' }}>
                      <span style={{ color: '#6B5B4F' }}>{c.label}</span>
                      <div className="flex items-center gap-1 font-mono">
                        <span style={{ color: '#B0A898', textDecoration: 'line-through', fontSize: '9px' }}>{c.defaultValue}</span>
                        <span style={{ color: '#5D4037' }}>{c.currentValue}</span>
                      </div>
                    </div>
                  ))}
                  {grouped[group].length > 3 && (
                    <div className="text-[9px] px-1.5 mt-0.5" style={{ color: '#B0A898' }}>+{grouped[group].length - 3} 项...</div>
                  )}
                </div>
              ))}
              {groupNames.length > 3 && (
                <div className="text-[9px]" style={{ color: '#B0A898' }}>+{groupNames.length - 3} 个分组...</div>
              )}
            </div>
          </div>
        )}
        <div className="text-[9px] text-center mt-2" style={{ color: '#B0A898' }}>
          点击查看完整详情
        </div>
      </div>
    </Card>
  );
}

export function SnapshotCompare() {
  const { snapshots, deleteSnapshot, setCurrentStage } = useNPV();
  const [detailSnap, setDetailSnap] = useState<Snapshot | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === snapshots.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(snapshots.map(s => s.id)));
    }
  };

  const baselineNPV = useMemo(() => {
    const baseline = snapshots.find(s => s.isBaseline);
    return baseline?.npvResult.summary.npv ?? 0;
  }, [snapshots]);

  return (
    <div className="h-screen flex flex-col relative" style={{ backgroundColor: '#FAF6F0' }}>
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: '#D4C5B2', backgroundColor: '#FDF5E6' }}>
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentStage('dashboard')}
            className="gap-1 -ml-2"
            style={{ color: '#5D4037' }}
          >
            <ArrowLeft className="w-4 h-4" />
            返回测算
          </Button>
          <div className="w-px h-5" style={{ backgroundColor: '#B0A898' }} />
          <div className="flex items-center gap-2">
            <Camera className="w-4 h-4" style={{ color: '#8B7355' }} />
            <h1 className="text-sm font-semibold" style={{ color: '#3E2723' }}>快照对比</h1>
            <span className="text-xs font-mono px-1.5 py-0.5" style={{ backgroundColor: '#E5DFD6', color: '#6B5B4F', borderRadius: '2px' }}>
              {snapshots.length} 个快照
            </span>
          </div>
          <div className="flex items-center gap-2">
            {selectedIds.size > 0 && (
              <span className="text-xs" style={{ color: '#8B7355' }}>
                已选 {selectedIds.size} 项
              </span>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={selectAll}
              className="text-[10px] bg-transparent"
              style={{ borderColor: '#B0A898', color: '#6B5B4F', borderRadius: '2px' }}
            >
              {selectedIds.size === snapshots.length ? '取消全选' : '全选'}
            </Button>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-auto p-4" style={{ paddingBottom: selectedIds.size >= 2 ? '80px' : undefined }}>
        {snapshots.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <Camera className="w-8 h-8" style={{ color: '#D4C5B2' }} />
            <div className="text-sm" style={{ color: '#8B8178' }}>暂无快照</div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentStage('dashboard')}
              style={{ borderColor: '#5D4037', color: '#5D4037', borderRadius: '2px' }}
            >
              返回测算
            </Button>
          </div>
        ) : (
          <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
            {snapshots.map(snap => (
              <SnapshotCard
                key={snap.id}
                snapshot={snap}
                baselineNPV={baselineNPV}
                onDelete={() => deleteSnapshot(snap.id)}
                onOpen={() => setDetailSnap(snap)}
                selected={selectedIds.has(snap.id)}
                onToggleSelect={() => toggleSelect(snap.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Detail modal */}
      {detailSnap && <SnapshotDetailModal snapshot={detailSnap} onClose={() => setDetailSnap(null)} />}

      {/* Floating experiment action bar */}
      {selectedIds.size >= 2 && (
        <div
          className="absolute bottom-0 left-0 right-0 border-t px-6 py-3 flex items-center justify-between"
          style={{
            backgroundColor: '#3E2723',
            borderColor: '#5D4037',
            boxShadow: '0 -4px 20px rgba(62,39,35,0.25)',
          }}
        >
          <div className="flex items-center gap-3">
            <div className="flex -space-x-1.5">
              {snapshots
                .filter(s => selectedIds.has(s.id))
                .slice(0, 5)
                .map((s, i) => (
                  <div
                    key={s.id}
                    className="w-6 h-6 flex items-center justify-center text-[9px] font-bold border-2"
                    style={{
                      backgroundColor: s.isBaseline ? '#8B7355' : '#5D4037',
                      borderColor: '#3E2723',
                      color: '#FFFFFF',
                      borderRadius: '2px',
                      zIndex: 5 - i,
                    }}
                  >
                    {s.name.charAt(0)}
                  </div>
                ))}
            </div>
            <div>
              <span className="text-xs font-medium" style={{ color: '#F5F0E8' }}>
                已选择 {selectedIds.size} 个策略快照
              </span>
              <span className="text-[10px] ml-2" style={{ color: '#B0A898' }}>
                将进入A/B实验设计
              </span>
            </div>
          </div>
          <Button
            size="sm"
            className="gap-1.5 text-xs px-4"
            style={{
              backgroundColor: '#C19A6B',
              color: '#FFFFFF',
              borderRadius: '2px',
              fontWeight: 600,
            }}
            onClick={() => {
              // TODO: navigate to experiment design page
              alert(`即将对 ${selectedIds.size} 个策略启动实验学习：\n${snapshots.filter(s => selectedIds.has(s.id)).map(s => `- ${s.name}`).join('\n')}`);
            }}
          >
            <FlaskConical className="w-3.5 h-3.5" />
            开始实验学习
          </Button>
        </div>
      )}
    </div>
  );
}
