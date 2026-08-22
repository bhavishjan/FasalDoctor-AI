'use client';
import { Send, AlertTriangle } from "lucide-react";
import { useState } from "react";
import { regionalHubs } from "@/lib/mockData";

export default function DisasterBroadcastModal({ onBroadcast }: { onBroadcast: (msg: string) => void }) {
  const [message, setMessage] = useState('');
  const [region, setRegion] = useState('multan');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    onBroadcast(`BROADCAST to ${region.toUpperCase()}: ${message.trim()}`);
    setMessage('');
  };

  return (
    <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-6 backdrop-blur-sm">
      <div className="flex items-center gap-3 mb-4">
        <div className="bg-red-500/20 p-2 rounded-lg">
          <AlertTriangle className="w-5 h-5 text-red-400" />
        </div>
        <h2 className="text-lg font-semibold text-red-100">Disaster & Treatment Broadcast</h2>
      </div>
      
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <select 
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            className="bg-black/40 border border-white/10 text-white text-sm rounded-lg p-2.5 focus:ring-red-500 focus:border-red-500 outline-none"
          >
            {regionalHubs.map(hub => (
              <option key={hub.id} value={hub.id} className="bg-zinc-900 text-white">
                {hub.name}
              </option>
            ))}
            <option value="all" className="bg-zinc-900 text-white">ALL REGIONS</option>
          </select>
          <input 
            type="text" 
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="E.g. Distribute Triazole Fungicide..."
            className="bg-black/40 border border-white/10 text-white text-sm rounded-lg p-2.5 focus:ring-red-500 focus:border-red-500 outline-none flex-1"
          />
        </div>
        <button 
          type="submit" 
          className="flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2.5 rounded-lg transition-colors font-medium text-sm"
        >
          <Send className="w-4 h-4" />
          Broadcast to Edge Nodes
        </button>
      </form>
    </div>
  );
}
