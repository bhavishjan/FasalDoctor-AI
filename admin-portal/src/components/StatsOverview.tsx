'use client';

import { useEffect, useState } from "react";
import { Activity, AlertTriangle, Cpu, TrendingUp } from "lucide-react";
import { macroMetrics } from "@/lib/mockData";

interface DashboardStats {
  total_farmers: number;
  active_seasons: number;
  total_scans_today: number;
  disease_detection_rate: number;
  active_edge_nodes: number;
  active_threats: number;
  marketplace_active_listings: number;
  national_health_index: number;
}

interface StatsOverviewProps {
  activeNodesOverride?: number;
  healthIndexOverride?: number;
}

export default function StatsOverview({ activeNodesOverride, healthIndexOverride }: StatsOverviewProps) {
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch('/api/dashboard');
        if (res.ok) {
          setStats(await res.json());
        }
      } catch {
        // Fall back to mock data
      }
    };
    fetchStats();
    const interval = setInterval(fetchStats, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const activeNodes = activeNodesOverride ?? stats?.active_edge_nodes ?? macroMetrics.activeNodes;
  const healthIndex = healthIndexOverride ?? stats?.national_health_index ?? macroMetrics.healthIndex;
  const ureaPrice = macroMetrics.ureaPriceCurrent; // TODO: fetch from /api/market

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
      <div className="bg-white/5 border border-white/10 rounded-xl p-5 backdrop-blur-sm relative overflow-hidden group hover:border-white/20 transition-all">
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl -mr-10 -mt-10 group-hover:bg-emerald-500/20 transition-all"></div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-gray-400">Nat. Crop Health Index</h3>
          <Activity className="w-5 h-5 text-emerald-400" />
        </div>
        <p className="text-3xl font-bold text-white">{healthIndex}%</p>
        <p className="text-xs text-emerald-400 mt-1">
          {stats ? `${stats.total_scans_today.toLocaleString()} scans today` : 'Optimal Status'}
        </p>
      </div>
      
      <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-5 backdrop-blur-sm relative overflow-hidden group hover:border-red-500/30 transition-all">
        <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-gray-400">Overproduction Threat</h3>
          <AlertTriangle className="w-5 h-5 text-red-400" />
        </div>
        <p className="text-xl font-bold text-red-400 mt-1">CRITICAL: {macroMetrics.wheatYieldPredicted} Wheat Surplus</p>
        {stats && stats.active_threats > 0 && (
          <p className="text-xs text-red-400/70 mt-1">{stats.active_threats} active climate threats</p>
        )}
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
        <p className="text-3xl font-bold text-white">PKR {ureaPrice.toLocaleString()}</p>
        <p className="text-xs text-amber-400 mt-1">Live tracking / 50kg bag</p>
      </div>
    </div>
  );
}
