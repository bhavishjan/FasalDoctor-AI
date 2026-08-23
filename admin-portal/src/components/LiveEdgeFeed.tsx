'use client';
import { Activity } from "lucide-react";
import { useEffect, useState, useRef } from "react";

interface FeedLog {
  id: number;
  time: string;
  message: string;
}

export default function LiveEdgeFeed({ incomingLogs }: { incomingLogs: string[] }) {
  const [logs, setLogs] = useState<FeedLog[]>([]);
  const idCounter = useRef(1);
  const prevLogsLength = useRef(incomingLogs.length);
  const hasLoadedHistory = useRef(false);

  // Load recent telemetry history on mount
  useEffect(() => {
    if (hasLoadedHistory.current) return;
    hasLoadedHistory.current = true;

    const fetchHistory = async () => {
      try {
        const res = await fetch('/api/telemetry/history?limit=15');
        if (res.ok) {
          const data = await res.json();
          if (data.length > 0) {
            const historyLogs: FeedLog[] = data.map((row: {
              health_status: string;
              crop_type: string;
              region: string;
              confidence: number;
              inference_time_ms: number;
              recorded_at: string;
              ai_recommendation: string;
            }) => ({
              id: idCounter.current++,
              time: new Date(row.recorded_at).toLocaleTimeString('en-US', { hour12: false }),
              message: `${row.region} | ${row.health_status} (${(Math.min(row.confidence, 1) * 100).toFixed(0)}% conf) — ${row.inference_time_ms}ms | AI: ${row.ai_recommendation ?? 'N/A'}`,
            }));
            setLogs(historyLogs);
          }
        }
      } catch {
        // Silently fail — mock data will show via incomingLogs
      }
    };
    fetchHistory();
  }, []);

  // Append new incoming logs (from realtime, simulator, or broadcasts)
  useEffect(() => {
    if (incomingLogs.length > prevLogsLength.current) {
      const newItems = incomingLogs.slice(prevLogsLength.current);
      prevLogsLength.current = incomingLogs.length;

      const newLogs: FeedLog[] = newItems.map(msg => ({
        id: idCounter.current++,
        time: new Date().toLocaleTimeString('en-US', { hour12: false }),
        message: msg,
      }));

      setLogs(prev => [...newLogs.reverse(), ...prev].slice(0, 50));
    }
  }, [incomingLogs]);

  return (
    <div className="bg-black/60 border border-white/10 rounded-xl p-0 backdrop-blur-sm flex flex-col h-full overflow-hidden min-h-[400px]">
      <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/5">
        <h2 className="text-sm font-semibold text-gray-200 flex items-center gap-2">
          <Activity className="w-4 h-4 text-emerald-400" />
          Live Edge Sync Feed
        </h2>
        <span className="flex h-2 w-2 relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
      </div>
      <div className="p-4 flex-1 overflow-y-auto space-y-3 font-mono text-xs">
        {logs.length === 0 && (
          <div className="text-gray-500 text-center py-8">
            Waiting for telemetry data...
          </div>
        )}
        {logs.map((log) => (
          <div key={log.id} className="flex gap-3 text-gray-400 transition-all">
            <span className="text-emerald-500/70 shrink-0">[{log.time}]</span>
            <span className={
              log.message.includes('BROADCAST') || log.message.includes('CRITICAL')
                ? 'text-red-400/90'
                : log.message.includes('Detected') || log.message.includes('Rust') || log.message.includes('Blight') || log.message.includes('Virus') || log.message.includes('Rot')
                  ? 'text-amber-400/90'
                  : log.message.includes('Healthy') || log.message.includes('Optimal')
                    ? 'text-emerald-400/90'
                    : 'text-gray-300'
            }>
              {log.message}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
