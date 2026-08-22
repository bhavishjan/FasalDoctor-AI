'use client';
import { Activity } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { initialEdgeLogs } from "../lib/mockData";

export default function LiveEdgeFeed({ incomingLogs }: { incomingLogs: string[] }) {
  const [logs, setLogs] = useState(initialEdgeLogs);
  const idCounter = useRef(100);
  const prevLogsLength = useRef(incomingLogs.length);

  useEffect(() => {
    if (incomingLogs.length > prevLogsLength.current) {
      const newItems = incomingLogs.slice(prevLogsLength.current);
      prevLogsLength.current = incomingLogs.length;
      
      const newLogsFormatted = newItems.map(msg => ({
        id: idCounter.current++,
        time: new Date().toLocaleTimeString('en-US', { hour12: false }),
        message: msg
      })).reverse();
      
      setLogs(prev => [...newLogsFormatted, ...prev].slice(0, 50));
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
        {logs.map((log) => (
          <div key={log.id} className="flex gap-3 text-gray-400 transition-all">
            <span className="text-emerald-500/70 shrink-0">[{log.time}]</span>
            <span className={log.message.includes('BROADCAST') || log.message.includes('Detected') ? 'text-amber-400/90' : 'text-gray-300'}>
              {log.message}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
