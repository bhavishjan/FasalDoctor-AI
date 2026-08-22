'use client';

import { Radio, Scan } from "lucide-react";
import { macroMetrics } from "@/lib/mockData";

interface HeaderProps {
  activeNodesOverride?: number;
  onLaunchScanner: () => void;
}

export default function Header({ activeNodesOverride, onLaunchScanner }: HeaderProps) {
  const activeNodes = activeNodesOverride ?? macroMetrics.activeNodes;

  return (
    <header className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 border-b border-white/10 bg-black/40 backdrop-blur-md gap-4">
      <div className="flex items-center gap-3">
        <div className="bg-emerald-500/20 p-2 rounded-lg">
          <Radio className="text-emerald-400 w-6 h-6" />
        </div>
        <h1 className="text-xl font-bold tracking-wider text-white">National Agri-OS Command Center</h1>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={onLaunchScanner}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white text-sm font-medium rounded-lg transition-all shadow-lg shadow-cyan-500/20"
        >
          <Scan className="w-4 h-4" />
          Launch Edge Scanner
        </button>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 rounded-full border border-emerald-500/20">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
          </span>
          <span className="text-sm font-medium text-emerald-400">Edge Grid: Active - {activeNodes.toLocaleString()} Nodes Synced</span>
        </div>
      </div>
    </header>
  );
}
