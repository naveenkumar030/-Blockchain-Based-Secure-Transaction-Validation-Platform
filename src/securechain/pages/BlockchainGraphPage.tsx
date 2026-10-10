import React, { useState, useEffect, useRef, useCallback } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { 
  Share2, 
  RefreshCw, 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  Filter, 
  Layers, 
  ArrowLeft, 
  ShieldCheck, 
  ExternalLink, 
  Database,
  Hash,
  Users,
  Box,
  ArrowRight
} from 'lucide-react';
import { securechainApi } from '../services/securechainApi';

interface GraphNode {
  id: string;
  label: string;
  type: 'block' | 'transaction' | 'user' | string;
  properties: Record<string, any>;
  x?: number;
  y?: number;
}

interface GraphLink {
  source: string | GraphNode;
  target: string | GraphNode;
  type: string;
}

interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
  stats: {
    total_nodes: number;
    total_links: number;
    blocks: number;
    transactions: number;
    users: number;
  };
}

export default function BlockchainGraphPage() {
  const [graphData, setGraphData] = useState<GraphData>({
    nodes: [],
    links: [],
    stats: { total_nodes: 0, total_links: 0, blocks: 0, transactions: 0, users: 0 }
  });
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [dbStatus, setDbStatus] = useState<string>('Connected to Neo4j Aura');

  const fgRef = useRef<any>(null);

  const loadGraph = useCallback(async () => {
    setLoading(true);
    try {
      const res = await securechainApi.getBlockchainGraph(80);
      if (res && res.nodes) {
        setGraphData({
          nodes: res.nodes,
          links: res.links,
          stats: res.stats || {
            total_nodes: res.nodes.length,
            total_links: res.links.length,
            blocks: res.nodes.filter((n: any) => n.type === 'block').length,
            transactions: res.nodes.filter((n: any) => n.type === 'transaction').length,
            users: res.nodes.filter((n: any) => n.type === 'user').length
          }
        });
      }
    } catch (err: any) {
      console.error('Failed to load Neo4j graph:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGraph();
  }, [loadGraph]);

  const handleSyncEntireLedger = async () => {
    setSyncing(true);
    try {
      await securechainApi.syncBlockchainGraph();
      await loadGraph();
    } catch (err) {
      console.error('Failed to trigger graph sync:', err);
    } finally {
      setSyncing(false);
    }
  };

  const filteredData = React.useMemo(() => {
    if (filterType === 'all') return graphData;
    const allowedNodeIds = new Set(
      graphData.nodes
        .filter(n => n.type === filterType)
        .map(n => n.id)
    );
    const filteredNodes = graphData.nodes.filter(n => allowedNodeIds.has(n.id));
    const filteredLinks = graphData.links.filter(l => {
      const sId = typeof l.source === 'object' ? (l.source as any).id : l.source;
      const tId = typeof l.target === 'object' ? (l.target as any).id : l.target;
      return allowedNodeIds.has(sId) && allowedNodeIds.has(tId);
    });
    return {
      nodes: filteredNodes,
      links: filteredLinks,
      stats: graphData.stats
    };
  }, [graphData, filterType]);

  const getNodeColor = (type: string) => {
    switch (type) {
      case 'block':
        return '#D97757'; // Terracotta accent for blocks
      case 'transaction':
        return '#2563EB'; // Royal Blue for transactions
      case 'user':
        return '#059669'; // Emerald for users
      default:
        return '#78716C';
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF9F5] text-[#141413] flex flex-col font-sans">
      {/* ── Top Navigation Bar ── */}
      <header className="border-b border-[#E8E6DC] bg-white/80 backdrop-blur-md sticky top-0 z-30 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <a
            href="/blockchain/dashboard"
            className="p-2 rounded-lg bg-[#FAF9F5] border border-[#E8E6DC] text-[#5C5A55] hover:text-[#141413] hover:border-[#141413] transition-colors"
            title="Return to Dashboard"
          >
            <ArrowLeft size={18} />
          </a>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-[#141413]">
                Neo4j Blockchain Graph Topology
              </h1>
              <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]">
                <Database size={12} />
                Live Aura Instance
              </span>
            </div>
            <p className="text-xs text-[#8C8980]">
              Visualizing cryptographic links: (Block) ─[:PREVIOUS_BLOCK]─▶ (Block), (Transaction) ─[:INCLUDED_IN]─▶ (Block), (User) ─[:SENT]─▶ (Transaction)
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={handleSyncEntireLedger}
            disabled={syncing}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg bg-white border border-[#E8E6DC] text-[#141413] hover:bg-[#FAF9F5] transition shadow-xs disabled:opacity-50"
          >
            <RefreshCw size={14} className={syncing ? 'animate-spin text-[#D97757]' : ''} />
            {syncing ? 'Synchronizing Ledger...' : 'Sync with Neo4j'}
          </button>
          <a
            href="/blockchain/blocks"
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg bg-[#D97757] text-white hover:bg-[#C66545] transition shadow-xs"
          >
            <Box size={14} />
            Inspect Block Ledger
          </a>
        </div>
      </header>

      {/* ── Metrics Summary Bar ── */}
      <div className="bg-white border-b border-[#E8E6DC] px-6 py-3 flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#D97757]"></span>
            <span className="text-[#5C5A55]">Blocks:</span>
            <strong className="text-[#141413] font-bold">{graphData.stats.blocks}</strong>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#2563EB]"></span>
            <span className="text-[#5C5A55]">Transactions:</span>
            <strong className="text-[#141413] font-bold">{graphData.stats.transactions}</strong>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#059669]"></span>
            <span className="text-[#5C5A55]">Users / Nodes:</span>
            <strong className="text-[#141413] font-bold">{graphData.stats.users}</strong>
          </div>
          <div className="h-4 w-px bg-[#E8E6DC]"></div>
          <div className="flex items-center gap-1.5 text-[#5C5A55]">
            <Share2 size={13} className="text-[#8C8980]" />
            <span>Total Graph Links:</span>
            <strong className="text-[#141413]">{graphData.stats.total_links}</strong>
          </div>
        </div>

        {/* Filter Chips */}
        <div className="flex items-center gap-1.5">
          <span className="text-[#8C8980] flex items-center gap-1 text-[11px] font-medium mr-1">
            <Filter size={12} /> Filter:
          </span>
          {[
            { id: 'all', label: 'All Entities' },
            { id: 'block', label: 'Blocks Only' },
            { id: 'transaction', label: 'Transactions' },
            { id: 'user', label: 'Users' },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilterType(f.id)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition ${
                filterType === f.id
                  ? 'bg-[#141413] text-white shadow-xs'
                  : 'bg-[#FAF9F5] text-[#5C5A55] border border-[#E8E6DC] hover:text-[#141413]'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Main Canvas Area with Graph & Drawer ── */}
      <div className="flex-1 relative overflow-hidden flex bg-[#121212]">
        {loading && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#121212]/80 backdrop-blur-xs text-white">
            <RefreshCw size={28} className="animate-spin text-[#D97757] mb-2" />
            <span className="text-sm font-medium">Fetching blockchain graph from Neo4j Aura...</span>
          </div>
        )}

        {/* 2D Force Graph Container */}
        <div className="flex-1 h-full w-full relative">
          <ForceGraph2D
            ref={fgRef}
            graphData={filteredData}
            nodeId="id"
            nodeLabel={(node: any) => `${node.label} (${node.type})`}
            nodeColor={(node: any) => getNodeColor(node.type)}
            nodeRelSize={7}
            nodeCanvasObject={(node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
              const label = node.label || node.id;
              const fontSize = Math.max(12 / globalScale, 3.5);
              const color = getNodeColor(node.type);
              const radius = node.type === 'block' ? 9 : node.type === 'transaction' ? 7 : 6;

              // Node circle outer glow
              ctx.beginPath();
              ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI, false);
              ctx.fillStyle = color;
              ctx.fill();
              ctx.lineWidth = 1.5 / globalScale;
              ctx.strokeStyle = '#FFFFFF';
              ctx.stroke();

              // Node text label
              ctx.font = `${fontSize}px sans-serif`;
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillStyle = '#E5E7EB';
              ctx.fillText(label, node.x, node.y + radius + fontSize);
            }}
            linkColor={(link: any) => {
              if (link.type === 'PREVIOUS_BLOCK') return '#D97757';
              if (link.type === 'INCLUDED_IN') return '#3B82F6';
              if (link.type === 'SENT' || link.type === 'CREATED') return '#10B981';
              return '#6B7280';
            }}
            linkWidth={(link: any) => (link.type === 'PREVIOUS_BLOCK' ? 2.5 : 1.5)}
            linkDirectionalArrowLength={4}
            linkDirectionalArrowRelPos={0.9}
            linkDirectionalParticles={(link: any) => (link.type === 'PREVIOUS_BLOCK' ? 4 : 2)}
            linkDirectionalParticleSpeed={0.006}
            linkDirectionalParticleWidth={2}
            onNodeClick={(node: any) => setSelectedNode(node)}
            cooldownTicks={100}
            backgroundColor="#141414"
          />

          {/* Floating Canvas Controls */}
          <div className="absolute bottom-6 left-6 flex items-center gap-1.5 bg-[#1F1F1F]/90 backdrop-blur-md border border-[#333333] p-1.5 rounded-xl text-white shadow-lg">
            <button
              onClick={() => fgRef.current?.zoom(fgRef.current.zoom() * 1.3, 400)}
              className="p-2 hover:bg-[#333333] rounded-lg transition"
              title="Zoom In"
            >
              <ZoomIn size={16} />
            </button>
            <button
              onClick={() => fgRef.current?.zoom(fgRef.current.zoom() * 0.7, 400)}
              className="p-2 hover:bg-[#333333] rounded-lg transition"
              title="Zoom Out"
            >
              <ZoomOut size={16} />
            </button>
            <button
              onClick={() => fgRef.current?.zoomToFit(400, 30)}
              className="p-2 hover:bg-[#333333] rounded-lg transition"
              title="Fit to Screen"
            >
              <Maximize2 size={16} />
            </button>
          </div>

          {/* Legend Overlay */}
          <div className="absolute top-6 left-6 bg-[#1F1F1F]/85 backdrop-blur-md border border-[#333333] rounded-xl p-3.5 text-xs text-white space-y-2.5 shadow-lg">
            <h4 className="font-bold text-[11px] text-[#A3A3A3] uppercase tracking-wider">
              Neo4j Legend
            </h4>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#D97757] border border-white"></span>
              <span>(:Block) - Hash-linked node</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#2563EB] border border-white"></span>
              <span>(:Transaction) - Confirmed payload</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#059669] border border-white"></span>
              <span>(:User) - Wallet / Node Identity</span>
            </div>
            <div className="pt-2 border-t border-[#333333] space-y-1 text-[11px] text-[#A3A3A3]">
              <div><strong className="text-[#D97757]">──▶</strong> :PREVIOUS_BLOCK (Hash Link)</div>
              <div><strong className="text-[#3B82F6]">──▶</strong> :INCLUDED_IN (Block Containment)</div>
              <div><strong className="text-[#10B981]">──▶</strong> :SENT / :CREATED (Originator)</div>
            </div>
          </div>
        </div>

        {/* ── Node Inspection Side Drawer ── */}
        {selectedNode && (
          <aside className="w-96 bg-[#1A1A1A] border-l border-[#333333] p-5 text-white overflow-y-auto flex flex-col justify-between shadow-2xl z-20">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-[#333333]">
                <div className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: getNodeColor(selectedNode.type) }}
                  ></span>
                  <span className="text-xs font-bold uppercase tracking-wider text-[#A3A3A3]">
                    {selectedNode.type} Entity
                  </span>
                </div>
                <button
                  onClick={() => setSelectedNode(null)}
                  className="text-[#888888] hover:text-white p-1"
                >
                  ✕
                </button>
              </div>

              <h3 className="text-base font-bold text-white mt-3 break-all">
                {selectedNode.label}
              </h3>
              <p className="text-xs text-[#888888] font-mono mt-0.5">
                ID: {selectedNode.id}
              </p>

              {/* Property Details */}
              <div className="mt-5 space-y-3">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#A3A3A3]">
                  Cryptographic Properties
                </h4>
                <div className="space-y-2 bg-[#262626] p-3 rounded-xl border border-[#333333] text-xs">
                  {Object.entries(selectedNode.properties || {}).map(([key, val]) => (
                    <div key={key} className="flex flex-col gap-0.5 pb-2 border-b border-[#333333] last:border-0 last:pb-0">
                      <span className="text-[11px] font-medium text-[#888888] uppercase">{key}</span>
                      <span className="font-mono text-[#E5E7EB] break-all select-all text-[11px]">
                        {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="pt-4 border-t border-[#333333] space-y-2">
              {selectedNode.type === 'transaction' && (
                <a
                  href={`/blockchain/verify?txId=${selectedNode.properties.transaction_id || selectedNode.label}`}
                  className="flex items-center justify-center gap-2 w-full py-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-lg text-xs font-semibold transition"
                >
                  <ShieldCheck size={14} />
                  Run Cryptographic Audit
                </a>
              )}
              {selectedNode.type === 'block' && (
                <a
                  href="/blockchain/blocks"
                  className="flex items-center justify-center gap-2 w-full py-2 bg-[#D97757] hover:bg-[#C66545] text-white rounded-lg text-xs font-semibold transition"
                >
                  <Box size={14} />
                  View Block in Ledger
                </a>
              )}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
