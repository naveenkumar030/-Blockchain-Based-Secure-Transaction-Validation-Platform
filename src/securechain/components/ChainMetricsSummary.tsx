import React from 'react';
import { Blocks, Layers, ShieldCheck, Activity, Cpu } from 'lucide-react';
import { ChainSummaryMetrics } from '../types/blockchain';

interface ChainMetricsSummaryProps {
  metrics: ChainSummaryMetrics;
}

export const ChainMetricsSummary: React.FC<ChainMetricsSummaryProps> = ({ metrics }) => {
  const cards = [
    {
      label: 'Blockchain Height',
      value: metrics.totalBlocks.toLocaleString(),
      sub: 'Total Confirmed Blocks',
      icon: Blocks,
      color: 'text-[#D97757]',
      bgColor: 'bg-[#FDF4F0]',
    },
    {
      label: 'Validated Transactions',
      value: metrics.totalTransactions.toLocaleString(),
      sub: `${metrics.pendingTransactions} Pending In Mempool`,
      icon: Layers,
      color: 'text-[#2E7D32]',
      bgColor: 'bg-[#E8F5E9]',
    },
    {
      label: 'Ledger Integrity',
      value: `${metrics.chainIntegrityPercent.toFixed(1)}%`,
      sub: 'Cryptographic Chain Match',
      icon: ShieldCheck,
      color: 'text-[#D97757]',
      bgColor: 'bg-[#FDF4F0]',
    },
    {
      label: 'Validation Nodes',
      value: metrics.activeNodes.toString(),
      sub: 'Active Consensus Peers',
      icon: Cpu,
      color: 'text-[#B45309]',
      bgColor: 'bg-[#FEF3C7]',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, idx) => {
        const IconComponent = card.icon;
        return (
          <div
            key={idx}
            className="bg-white border border-[#E8E6DC] rounded-xl p-4 sm:p-5 flex items-start justify-between shadow-sm hover:border-[#D5D2C7] transition-all"
          >
            <div>
              <span className="block text-xs font-semibold text-[#8C8980] uppercase tracking-wider mb-1">
                {card.label}
              </span>
              <span className="text-2xl font-bold font-mono text-[#141413] tracking-tight">
                {card.value}
              </span>
              <span className="block text-xs text-[#595856] mt-1">
                {card.sub}
              </span>
            </div>
            <div className={`p-2.5 rounded-lg shrink-0 ${card.bgColor} ${card.color}`}>
              <IconComponent size={20} />
            </div>
          </div>
        );
      })}
    </div>
  );
};
