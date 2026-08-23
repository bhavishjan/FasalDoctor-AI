'use client';
import { Send, AlertTriangle } from "lucide-react";
import { useState } from "react";

const REGIONS = [
  { id: 'multan', name: 'Multan' },
  { id: 'faisalabad', name: 'Faisalabad' },
  { id: 'sukkur', name: 'Sukkur' },
  { id: 'peshawar', name: 'Peshawar' },
  { id: 'dgkhan', name: 'Dera Ghazi Khan' },
  { id: 'sahiwal', name: 'Sahiwal' },
];

export default function DisasterBroadcastModal({ onBroadcast }: { onBroadcast: (msg: string) => void }) {
  const [message, setMessage] = useState('');
  const [title, setTitle] = useState('');
  const [region, setRegion] = useState('multan');
  const [severity, setSeverity] = useState<'low' | 'medium' | 'high' | 'critical'>('high');
  const [isSending, setIsSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !title.trim()) return;

    setIsSending(true);

    const targetRegions = region === 'all'
      ? REGIONS.map(r => r.name)
      : [REGIONS.find(r => r.id === region)?.name ?? region];

    try {
      const res = await fetch('/api/disaster', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          broadcast_type: 'general',
          title: title.trim(),
          message: message.trim(),
          target_regions: targetRegions,
          severity,
        }),
      });

      if (res.ok) {
        onBroadcast(`BROADCAST [${severity.toUpperCase()}] to ${targetRegions.join(', ')}: ${title.trim()} — ${message.trim()}`);
        setMessage('');
        setTitle('');
      } else {
        onBroadcast(`BROADCAST (local) to ${targetRegions.join(', ')}: ${title.trim()} — ${message.trim()}`);
        setMessage('');
        setTitle('');
      }
    } catch {
      // Offline fallback — still show the broadcast locally
      onBroadcast(`BROADCAST (offline) to ${region.toUpperCase()}: ${title.trim()} — ${message.trim()}`);
      setMessage('');
      setTitle('');
    } finally {
      setIsSending(false);
    }
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
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Alert title (e.g. Wheat Rust Outbreak)"
          className="bg-black/40 border border-white/10 text-white text-sm rounded-lg p-2.5 focus:ring-red-500 focus:border-red-500 outline-none"
        />
        <div className="flex flex-col sm:flex-row gap-4">
          <select 
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            className="bg-black/40 border border-white/10 text-white text-sm rounded-lg p-2.5 focus:ring-red-500 focus:border-red-500 outline-none"
          >
            {REGIONS.map(r => (
              <option key={r.id} value={r.id} className="bg-zinc-900 text-white">
                {r.name}
              </option>
            ))}
            <option value="all" className="bg-zinc-900 text-white">ALL REGIONS</option>
          </select>
          <select
            value={severity}
            onChange={(e) => setSeverity(e.target.value as typeof severity)}
            className="bg-black/40 border border-white/10 text-white text-sm rounded-lg p-2.5 focus:ring-red-500 focus:border-red-500 outline-none"
          >
            <option value="low" className="bg-zinc-900">Low</option>
            <option value="medium" className="bg-zinc-900">Medium</option>
            <option value="high" className="bg-zinc-900">High</option>
            <option value="critical" className="bg-zinc-900">Critical</option>
          </select>
        </div>
        <input 
          type="text" 
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="E.g. Distribute Triazole Fungicide..."
          className="bg-black/40 border border-white/10 text-white text-sm rounded-lg p-2.5 focus:ring-red-500 focus:border-red-500 outline-none flex-1"
        />
        <button 
          type="submit" 
          disabled={isSending || !message.trim() || !title.trim()}
          className="flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2.5 rounded-lg transition-colors font-medium text-sm"
        >
          <Send className="w-4 h-4" />
          {isSending ? 'Broadcasting...' : 'Broadcast to Edge Nodes'}
        </button>
      </form>
    </div>
  );
}
