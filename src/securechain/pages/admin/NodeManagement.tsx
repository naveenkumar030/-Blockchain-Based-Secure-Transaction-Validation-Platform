import React, { useState } from 'react';
import { ArrowLeft, Cpu, RefreshCw, CheckCircle, AlertTriangle, Radio } from 'lucide-react';
import { NodeStatus } from '../../types/blockchain';

export default function NodeManagement() {
  const [nodes] = useState<NodeStatus[]>([
    {
      nodeId: 'NODE-01-PRIMARY',
      peerAddress: '10.0.1.12:9033',
      status: 'ONLINE',
      currentHeight: 1420,
      latencyMs: 14,
      lastHeartbeat: '10s ago',
    },
    {
      nodeId: 'NODE-02-VALIDATOR',
      peerAddress: '10.0.1.18:9033',
      status: 'ONLINE',
      currentHeight: 1420,
      latencyMs: 22,
      lastHeartbeat: '8s ago',
    },
    {
      nodeId: 'NODE-03-VALIDATOR',
      peerAddress: '10.0.1.25:9033',
      status: 'ONLINE',
      currentHeight: 1420,
      latencyMs: 31,
      lastHeartbeat: '12s ago',
    },
    {
      nodeId: 'NODE-04-BACKUP',
      peerAddress: '10.0.2.04:9033',
      status: 'SYNCING',
      currentHeight: 1418,
      latencyMs: 110,
      lastHeartbeat: '25s ago',
    },
  ]);

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <a href="/securechain/admin" className="p-2 rounded-lg bg-white border border-[#E8E6DC] text-[#5C5A55] hover:text-[#141413] hover:border-[#141413] transition-colors shadow-xs">
            <ArrowLeft size={18} />
          </a>
          <div>
            <h1 className="text-2xl font-bold text-[#141413] tracking-tight">Consensus Nodes Management</h1>
            <p className="text-xs text-[#5C5A55] mt-0.5">
              Peer network synchronization status, validator latency, and node consensus health
            </p>
          </div>
        </div>

        <button className="flex items-center gap-2 px-4 py-2 bg-white border border-[#E8E6DC] hover:border-[#D97757] hover:text-[#D97757] text-[#141413] rounded-lg text-xs font-semibold transition-colors shadow-xs">
          <RefreshCw size={14} /> Ping Peer Network
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {nodes.map((n) => (
          <div key={n.nodeId} className="bg-white border border-[#E8E6DC] rounded-xl p-5 space-y-3 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Cpu size={18} className="text-[#D97757]" />
                <span className="font-bold font-mono text-sm text-[#141413]">{n.nodeId}</span>
              </div>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                  n.status === 'ONLINE'
                    ? 'bg-[#E8F5E9] text-[#2E7D32] border border-[#C8E6C9]'
                    : 'bg-[#FEF3C7] text-[#B45309] border border-[#FDE68A]'
                }`}
              >
                <Radio size={10} className="animate-pulse" />
                {n.status}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#E8E6DC] text-center text-xs">
              <div className="bg-[#FAF9F5] p-2 rounded-lg border border-[#E8E6DC]">
                <span className="text-[10px] text-[#8C8980] block uppercase font-medium">Height</span>
                <span className="font-mono text-[#141413] font-bold">#{n.currentHeight}</span>
              </div>
              <div className="bg-[#FAF9F5] p-2 rounded-lg border border-[#E8E6DC]">
                <span className="text-[10px] text-[#8C8980] block uppercase font-medium">Latency</span>
                <span className="font-mono text-[#2E7D32] font-bold">{n.latencyMs}ms</span>
              </div>
              <div className="bg-[#FAF9F5] p-2 rounded-lg border border-[#E8E6DC]">
                <span className="text-[10px] text-[#8C8980] block uppercase font-medium">Heartbeat</span>
                <span className="font-mono text-[#5C5A55]">{n.lastHeartbeat}</span>
              </div>
            </div>

            <div className="text-[11px] font-mono text-[#8C8980] truncate">Peer: {n.peerAddress}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
