'use client';

import { Activity, AlertTriangle, Cpu, TrendingUp } from "lucide-react";
import { macroMetrics } from "@/lib/mockData";

interface StatsOverviewProps {
  activeNodesOverride?: number;
  healthIndexOverride?: number;
}

export default function StatsOverview({ activeNodesOverride, healthIndexOverride }: StatsOverviewProps) {
  const activeNodes = activeNodesOverride ?? macroMetrics.activeNodes;
  const healthIndex = healthIndexOverride ?? macroMetrics.healthIndex;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
      <div className="bg-white/5 border border-white/10 rounded-xl p-5 backdrop-blur-sm relative overflow-hidden group hover:border-white/20 transition-all">
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl -mr-10 -mt-10 group-hover:bg-emerald-500/20 transition-all"></div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-gray-400">Nat. Crop Health Index</h3>
          <Activity className="w-5 h-5 text-emerald-400" />
        </div>
        <p className="text-3xl font-bold text-white">{healthIndex}%</p>
        <p className="text-xs text-emerald-400 mt-1">Optimal Status</p>
      </div>
      
      <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-5 backdrop-blur-sm relative overflow-hidden group hover:border-red-500/30 transition-all">
        <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-gray-400">Overproduction Threat</h3>
          <AlertTriangle className="w-5 h-5 text-red-400" />
        </div>
        <p className="text-xl font-bold text-red-400 mt-1">CRITICAL: {macroMetrics.wheatYieldPredicted} Wheat Surplus</p>
      </div>
      
      <div className="bg-white/5 border border-white/10 rounded-xl p-5 backdrop-blur-sm relative overflow-hidden group hover:border-white/20 transition-all">
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-gray-400">Active Nodes</h3>
          <Cpu className="w-5 h-5 text-blue-400" />
        </div>
        <p className="text-3xl font-bold text-white">{activeNodes.toLocaleString()}</p>
        <p className="text-xs text-blue-400 mt-1">Edge C++ Instances Synced</p>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-xl p-5 backdrop-blur-sm relative overflow-hidden group hover:border-white/20 transition-all">
        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-gray-400">Fertilizer Price Index</h3>
          <TrendingUp className="w-5 h-5 text-amber-400" />
        </div>
        <p className="text-3xl font-bold text-white">PKR {macroMetrics.ureaPriceCurrent.toLocaleString()}</p>
        <p className="text-xs text-amber-400 mt-1">Live tracking / 50kg bag</p>
      </div>
    </div>
  );
}
