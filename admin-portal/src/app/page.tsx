'use client';

import { useState } from "react";
import Header from "@/components/Header";
import StatsOverview from "@/components/StatsOverview";
import RegionalTelemetryGrid from "@/components/RegionalTelemetryGrid";
import MacroEconomicAdvisor from "@/components/MacroEconomicAdvisor";
import DisasterBroadcastModal from "@/components/DisasterBroadcastModal";
import LiveEdgeFeed from "@/components/LiveEdgeFeed";
import EdgeSimulatorModal from "@/components/EdgeSimulatorModal";
import SwarmSimulator from "@/components/SwarmSimulator";
import { macroMetrics } from "@/lib/mockData";
import { Zap } from "lucide-react";

export default function Home() {
  const [broadcastLogs, setBroadcastLogs] = useState<string[]>([]);
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [showSwarmPanel, setShowSwarmPanel] = useState(false);
  const [activeNodes, setActiveNodes] = useState(macroMetrics.activeNodes);
  const [healthIndex, setHealthIndex] = useState(macroMetrics.healthIndex);

  const handleBroadcast = (msg: string) => {
    setBroadcastLogs(prev => [...prev, msg]);
  };

  const handleTelemetryBurst = (logs: string[]) => {
    setBroadcastLogs(prev => [...prev, ...logs]);
  };

  const handleSyncComplete = (result: {
    node_id: string;
    disease_detected: string;
    confidence: number;
    execution_time_ms: number;
    ai_recommendation: string;
  }) => {
    // Update active node count
    setActiveNodes(prev => prev + 1);

    // Adjust health index based on disease result
    if (result.disease_detected !== 'Healthy') {
      setHealthIndex(prev => Math.max(0, parseFloat((prev - 0.3).toFixed(1))));
    } else {
      setHealthIndex(prev => Math.min(100, parseFloat((prev + 0.1).toFixed(1))));
    }

    // Push sync event to live feed
    const feedMsg = `EDGE SYNC ${result.node_id}: ${result.disease_detected} (${result.confidence}% confidence) — ${result.execution_time_ms}ms | AI: ${result.ai_recommendation}`;
    setBroadcastLogs(prev => [...prev, feedMsg]);
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-gray-100 selection:bg-emerald-500/30">
      <Header
        activeNodesOverride={activeNodes}
        onLaunchScanner={() => setIsSimulatorOpen(true)}
      />
      
      <main className="max-w-[90rem] mx-auto px-4 sm:px-6 py-8">
        <StatsOverview
          activeNodesOverride={activeNodes}
          healthIndexOverride={healthIndex}
        />

        <div className="flex justify-end mb-6">
          <button
            onClick={() => setShowSwarmPanel(prev => !prev)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 transition-colors"
          >
            <Zap className="w-4 h-4" />
            Swarm Stress Test
          </button>
        </div>

        {showSwarmPanel && (
          <SwarmSimulator onTelemetryBurst={handleTelemetryBurst} />
        )}
        
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 space-y-6">
            <RegionalTelemetryGrid />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <MacroEconomicAdvisor />
              <DisasterBroadcastModal onBroadcast={handleBroadcast} />
            </div>
          </div>
          
          <div className="xl:col-span-1 border border-white/5 rounded-xl overflow-hidden shadow-2xl flex flex-col">
            <LiveEdgeFeed incomingLogs={broadcastLogs} />
          </div>
        </div>
      </main>

      <EdgeSimulatorModal
        isOpen={isSimulatorOpen}
        onClose={() => setIsSimulatorOpen(false)}
        onSyncComplete={handleSyncComplete}
      />
    </div>
  );
}
