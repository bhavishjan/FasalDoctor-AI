'use client';

import { useState, useRef, useEffect } from 'react';
import { Zap, Activity, Timer, Cpu } from 'lucide-react';

interface SwarmSimulatorProps {
  onTelemetryBurst: (logs: string[]) => void;
}

const REGIONS = ['Multan', 'Faisalabad', 'Sukkur', 'Peshawar', 'Dera Ghazi Khan', 'Sahiwal'];
const CROPS_BY_REGION: Record<string, string> = {
  'Multan': 'Wheat',
  'Faisalabad': 'Cotton',
  'Sukkur': 'Sugarcane',
  'Peshawar': 'Maize',
  'Dera Ghazi Khan': 'Wheat',
  'Sahiwal': 'Cotton',
};

export default function SwarmSimulator({ onTelemetryBurst }: SwarmSimulatorProps) {
  const [activeNodes, setActiveNodes] = useState(50);
  const [syncFreq, setSyncFreq] = useState(200);
  const [isRunning, setIsRunning] = useState(false);
  const [metrics, setMetrics] = useState({
    totalIngested: 0,
    throughput: 0,
    avgLatency: 0,
    activeThreads: 0
  });

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastMetricsUpdate = useRef<number>(Date.now());
  const requestCountRef = useRef(0);
  const totalLatencyRef = useRef(0);
  const totalRequestsRef = useRef(0);

  const startTest = () => {
    setIsRunning(true);
    lastMetricsUpdate.current = Date.now();
    requestCountRef.current = 0;
    
    intervalRef.current = setInterval(async () => {
      const diseases = ['Healthy', 'Wheat Rust', 'Corn Blight', 'Cotton Curl Virus', 'Sugarcane Red Rot'];
      const payloads = Array.from({ length: activeNodes }).map(() => {
        const region = REGIONS[Math.floor(Math.random() * REGIONS.length)];
        return {
          node_id: `swarm-${Math.random().toString(36).substring(7)}`,
          crop_type: CROPS_BY_REGION[region] ?? 'Unknown',
          disease_detected: diseases[Math.floor(Math.random() * diseases.length)],
          confidence: 0.7 + (Math.random() * 0.29),
          execution_time_ms: Math.floor(Math.random() * 100) + 10,
          region,
        };
      });

      const startTime = Date.now();
      try {
        const res = await fetch('/api/telemetry', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payloads)
        });
        
        if (res.ok) {
          const latency = Date.now() - startTime;
          const data = await res.json();
          
          requestCountRef.current += payloads.length;
          totalRequestsRef.current += payloads.length;
          totalLatencyRef.current += latency;

          const logs = (data.results ?? []).map((r: {
            node_id: string;
            disease_detected: string;
            confidence: number;
            execution_time_ms: number;
            ai_recommendation: string;
          }) => 
            `[SWARM] ${r.node_id}: ${r.disease_detected} (${(r.confidence * 100).toFixed(1)}% conf) — ${r.execution_time_ms}ms | ${r.ai_recommendation}`
          );
          onTelemetryBurst(logs);
        }
      } catch (err) {
        console.error('Swarm error:', err);
      }
    }, syncFreq);
  };

  const stopTest = () => {
    setIsRunning(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  };

  useEffect(() => {
    const metricsInterval = setInterval(() => {
      if (isRunning) {
        const now = Date.now();
        const elapsed = (now - lastMetricsUpdate.current) / 1000;
        
        const throughput = elapsed > 0 ? requestCountRef.current / elapsed : 0;
        const avgLat = totalRequestsRef.current > 0 ? totalLatencyRef.current / (totalRequestsRef.current / activeNodes) : 0;

        setMetrics({
          totalIngested: totalRequestsRef.current,
          throughput: Math.round(throughput),
          avgLatency: Math.round(avgLat),
          activeThreads: Math.ceil(activeNodes / 10)
        });

        lastMetricsUpdate.current = now;
        requestCountRef.current = 0;
      }
    }, 1000);

    return () => clearInterval(metricsInterval);
  }, [isRunning, activeNodes]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-6 shadow-2xl mb-8 transition-all duration-300">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Zap className="w-5 h-5 text-emerald-400" />
            Swarm Stress-Test Simulator
          </h2>
          <p className="text-sm text-gray-400">
            Status: {isRunning ? <span className="text-emerald-400">Running</span> : <span className="text-gray-500">Stopped</span>}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-6 w-full md:w-auto">
          <div className="flex flex-col gap-2">
            <label className="text-xs text-gray-400">Simultaneous Active Edge Nodes: {activeNodes}</label>
            <input 
              type="range" 
              min="10" 
              max="500" 
              value={activeNodes} 
              onChange={(e) => setActiveNodes(Number(e.target.value))}
              disabled={isRunning}
              className="accent-emerald-500"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-xs text-gray-400">Sync Frequency: {syncFreq}ms</label>
            <input 
              type="range" 
              min="50" 
              max="2000" 
              step="50"
              value={syncFreq} 
              onChange={(e) => setSyncFreq(Number(e.target.value))}
              disabled={isRunning}
              className="accent-emerald-500"
            />
          </div>
          <div className="flex items-end">
            {isRunning ? (
              <button 
                onClick={stopTest}
                className="px-6 py-2 rounded-lg font-medium bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors border border-red-500/50"
              >
                Stop Test
              </button>
            ) : (
              <button 
                onClick={startTest}
                className="px-6 py-2 rounded-lg font-medium bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-400 hover:to-teal-400 transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)]"
              >
                Trigger National Stress Test
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-black/20 rounded-lg p-4 border border-white/5">
          <div className="flex items-center gap-2 text-gray-400 mb-2">
            <Activity className="w-4 h-4" />
            <span className="text-sm">Total Requests Ingested</span>
          </div>
          <div className="text-2xl font-mono text-white transition-all">
            {metrics.totalIngested.toLocaleString()}
          </div>
        </div>
        <div className="bg-black/20 rounded-lg p-4 border border-white/5">
          <div className="flex items-center gap-2 text-gray-400 mb-2">
            <Zap className="w-4 h-4" />
            <span className="text-sm">Throughput</span>
          </div>
          <div className="text-2xl font-mono text-emerald-400 transition-all">
            {metrics.throughput.toLocaleString()} <span className="text-sm text-gray-500">req/s</span>
          </div>
        </div>
        <div className="bg-black/20 rounded-lg p-4 border border-white/5">
          <div className="flex items-center gap-2 text-gray-400 mb-2">
            <Timer className="w-4 h-4" />
            <span className="text-sm">Average Latency</span>
          </div>
          <div className="text-2xl font-mono text-amber-400 transition-all">
            {metrics.avgLatency} <span className="text-sm text-gray-500">ms</span>
          </div>
        </div>
        <div className="bg-black/20 rounded-lg p-4 border border-white/5">
          <div className="flex items-center gap-2 text-gray-400 mb-2">
            <Cpu className="w-4 h-4" />
            <span className="text-sm">Active Threads (Sim)</span>
          </div>
          <div className="text-2xl font-mono text-blue-400 transition-all">
            {metrics.activeThreads}
          </div>
        </div>
      </div>
    </div>
  );
}
