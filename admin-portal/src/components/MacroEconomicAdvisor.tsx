'use client';

import { useEffect, useState } from "react";
import { TrendingUp } from "lucide-react";

interface ForecastData {
  crop_type: string;
  forecast_season: string;
  total_predicted_yield_tonnes: number;
  national_demand_tonnes: number;
  surplus_deficit_tonnes: number;
  surplus_pct: number;
  recommendation: string;
  status: string;
}

export default function MacroEconomicAdvisor() {
  const [forecasts, setForecasts] = useState<ForecastData[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    const fetchForecast = async () => {
      try {
        const res = await fetch('/api/forecast');
        if (res.ok) {
          const data = await res.json();
          if (data.length > 0) setForecasts(data);
        }
      } catch {
        // Fall back to static content
      }
    };
    fetchForecast();
    const interval = setInterval(fetchForecast, 60000); // Refresh every 60s
    return () => clearInterval(interval);
  }, []);

  // Cycle through surplus crops
  useEffect(() => {
    if (forecasts.length <= 1) return;
    const cycleInterval = setInterval(() => {
      setActiveIdx(prev => (prev + 1) % forecasts.length);
    }, 8000);
    return () => clearInterval(cycleInterval);
  }, [forecasts.length]);

  const active = forecasts[activeIdx];
  const isSurplus = active && active.surplus_pct > 10;
  const isDeficit = active && active.surplus_pct < 0;

  // Static fallback when no API data
  if (!active) {
    return (
      <div className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-xl p-6 backdrop-blur-sm relative overflow-hidden">
        <div className="absolute -right-10 -top-10 w-40 h-40 bg-indigo-500/20 blur-3xl rounded-full"></div>
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-indigo-500/20 p-2 rounded-lg">
            <TrendingUp className="w-5 h-5 text-indigo-400" />
          </div>
          <h2 className="text-lg font-semibold text-indigo-100">AI Crop Rerouting Suggestions</h2>
        </div>
        <p className="text-indigo-200/80 mb-4 text-sm leading-relaxed relative z-10">
          Based on live market data and telemetry from Multan, a severe surplus in Wheat is predicted. Delaying intervention will lead to a 15% market crash.
        </p>
        <div className="bg-black/40 border border-indigo-500/30 rounded-lg p-4 relative z-10">
          <p className="text-white font-medium text-sm">
            Recommendation: <span className="text-indigo-400">Divert 15% Wheat acreage to Soybeans/Legumes</span> in the Multan district to protect regional market price.
          </p>
          <button
            type="button"
            onClick={() => alert('Policy shift initiated. Routing directives to regional hubs...')}
            className="mt-4 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium rounded-lg transition-colors w-full sm:w-auto"
          >
            Execute Policy Shift
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-gradient-to-br border rounded-xl p-6 backdrop-blur-sm relative overflow-hidden ${
      isSurplus
        ? 'from-red-500/10 to-orange-500/10 border-red-500/20'
        : isDeficit
          ? 'from-emerald-500/10 to-teal-500/10 border-emerald-500/20'
          : 'from-indigo-500/10 to-purple-500/10 border-indigo-500/20'
    }`}>
      <div className={`absolute -right-10 -top-10 w-40 h-40 blur-3xl rounded-full ${
        isSurplus ? 'bg-red-500/20' : isDeficit ? 'bg-emerald-500/20' : 'bg-indigo-500/20'
      }`}></div>
      <div className="flex items-center gap-3 mb-4">
        <div className={`p-2 rounded-lg ${
          isSurplus ? 'bg-red-500/20' : isDeficit ? 'bg-emerald-500/20' : 'bg-indigo-500/20'
        }`}>
          <TrendingUp className={`w-5 h-5 ${
            isSurplus ? 'text-red-400' : isDeficit ? 'text-emerald-400' : 'text-indigo-400'
          }`} />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-white">
            {active.crop_type} — {active.forecast_season}
          </h2>
          <p className="text-xs text-gray-400">
            {active.surplus_pct > 0 ? 'Surplus' : 'Deficit'}: {Math.abs(active.surplus_pct)}%
            {forecasts.length > 1 && (
              <span className="ml-2 text-gray-500">
                ({activeIdx + 1}/{forecasts.length})
              </span>
            )}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-black/30 rounded-lg p-3">
          <p className="text-xs text-gray-400">Predicted Yield</p>
          <p className="text-lg font-bold text-white">{(active.total_predicted_yield_tonnes / 1_000_000).toFixed(1)}M tonnes</p>
        </div>
        <div className="bg-black/30 rounded-lg p-3">
          <p className="text-xs text-gray-400">National Demand</p>
          <p className="text-lg font-bold text-white">{(active.national_demand_tonnes / 1_000_000).toFixed(1)}M tonnes</p>
        </div>
      </div>

      <div className={`bg-black/40 border rounded-lg p-4 relative z-10 ${
        isSurplus ? 'border-red-500/30' : isDeficit ? 'border-emerald-500/30' : 'border-indigo-500/30'
      }`}>
        <p className={`font-medium text-sm ${
          isSurplus ? 'text-red-300' : isDeficit ? 'text-emerald-300' : 'text-indigo-300'
        }`}>
          {active.recommendation}
        </p>
        <button
          type="button"
          onClick={() => alert(`Policy shift initiated for ${active.crop_type}. Routing directives to regional hubs...`)}
          className={`mt-4 px-4 py-2 text-white text-sm font-medium rounded-lg transition-colors w-full sm:w-auto ${
            isSurplus
              ? 'bg-red-500 hover:bg-red-600'
              : isDeficit
                ? 'bg-emerald-500 hover:bg-emerald-600'
                : 'bg-indigo-500 hover:bg-indigo-600'
          }`}
        >
          Execute Policy Shift
        </button>
      </div>
    </div>
  );
}
