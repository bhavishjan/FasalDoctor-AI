import { TrendingUp } from "lucide-react";

export default function MacroEconomicAdvisor() {
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
