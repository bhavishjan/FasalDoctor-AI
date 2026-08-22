import { CloudRain } from "lucide-react";
import { regionalHubs } from "../lib/mockData";

export default function RegionalTelemetryGrid() {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-6 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-white">Regional Telemetry Hubs</h2>
        <CloudRain className="w-5 h-5 text-gray-400" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {regionalHubs.map((hub) => (
          <div key={hub.id} className="bg-black/40 border border-white/5 rounded-lg p-4 flex flex-col gap-3 hover:border-white/20 transition-all">
            <div className="flex justify-between items-start">
              <h3 className="font-medium text-white">{hub.name}</h3>
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${hub.risk === 'High' ? 'bg-red-500/20 text-red-400' : hub.risk === 'Medium' ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                {hub.risk} Risk
              </span>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Primary Crop</span>
                <span className="text-gray-200">{hub.crop}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Soil Moisture</span>
                <span className="text-gray-200">{hub.moisture}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Active Farmers</span>
                <span className="text-gray-200">{hub.farmers.toLocaleString()}</span>
              </div>
            </div>

            <div className="mt-2">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-400">Disease Heat</span>
                <span className="text-gray-200">{hub.diseaseHeat}%</span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-1.5">
                <div 
                  className={`h-1.5 rounded-full ${hub.diseaseHeat > 70 ? 'bg-red-500' : hub.diseaseHeat > 30 ? 'bg-amber-500' : 'bg-emerald-500'}`} 
                  style={{ width: `${Math.min(Math.max(hub.diseaseHeat, 0), 100)}%` }}
                ></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
