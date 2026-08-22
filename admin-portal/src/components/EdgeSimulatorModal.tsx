'use client';

import { useState, useRef } from 'react';
import { Cpu, Upload, Zap, Cloud, X, CheckCircle, Loader2 } from 'lucide-react';

interface SyncResult {
  node_id: string;
  disease_detected: string;
  confidence: number;
  execution_time_ms: number;
  ai_recommendation: string;
}

interface EdgeSimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSyncComplete: (result: SyncResult) => void;
}

const DISEASE_CLASSES = ['Healthy', 'Wheat Rust', 'Corn Blight', 'Cotton Curl Virus', 'Sugarcane Red Rot'];

export default function EdgeSimulatorModal({ isOpen, onClose, onSyncComplete }: EdgeSimulatorModalProps) {
  const [stage, setStage] = useState<'idle' | 'loaded' | 'inferring' | 'inferred' | 'syncing' | 'synced'>('idle');
  const [fileName, setFileName] = useState('');
  const [terminalLines, setTerminalLines] = useState<string[]>([]);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = () => {
    setStage('idle');
    setFileName('');
    setTerminalLines([]);
    setSyncResult(null);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      setStage('loaded');
      setTerminalLines([`> Loaded image: ${file.name}`, `> Resolution: 4032x3024 (scaled to 224x224)`, `> Color space: BGR → RGB converted`]);
    }
  };

  const runInference = async () => {
    setStage('inferring');
    setTerminalLines(prev => [...prev, '', '> Initializing TFLite FlatBufferModel...', '> Allocating tensors (1x224x224x3 float32)...']);

    await new Promise(r => setTimeout(r, 800));
    setTerminalLines(prev => [...prev, '> Quantizing input to UINT8 (scale=0.0039, zp=0)...']);

    await new Promise(r => setTimeout(r, 600));

    const diseaseIdx = Math.floor(Math.random() * DISEASE_CLASSES.length);
    const disease = DISEASE_CLASSES[diseaseIdx];
    const confidence = disease === 'Healthy' ? 97.2 : 88 + Math.random() * 10;
    const execTime = 6 + Math.random() * 5;
    const memUsage = 5.5 + Math.random() * 2;

    setTerminalLines(prev => [
      ...prev,
      '',
      `> ─── TFLite Edge CPU Inference ───`,
      `> Status: ✓ SUCCESS`,
      `> Result: ${confidence.toFixed(1)}% ${disease}`,
      `> Execution Time: ${execTime.toFixed(1)}ms`,
      `> Peak Memory: ${memUsage.toFixed(1)}MB`,
      `> Model: plant_disease_quantized.tflite`,
      `> ─────────────────────────────────`,
    ]);

    setSyncResult({
      node_id: `node_${100 + Math.floor(Math.random() * 200)}_multan`,
      disease_detected: disease,
      confidence: parseFloat(confidence.toFixed(1)),
      execution_time_ms: parseFloat(execTime.toFixed(1)),
      ai_recommendation: '',
    });
    setStage('inferred');
  };

  const syncToCloud = async () => {
    if (!syncResult) return;
    setStage('syncing');
    setTerminalLines(prev => [...prev, '', '> Packaging sync_payload.json...', '> POST /api/telemetry ...']);

    try {
      const res = await fetch('/api/telemetry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          node_id: syncResult.node_id,
          crop_type: 'Wheat',
          disease_detected: syncResult.disease_detected,
          confidence: syncResult.confidence,
          execution_time_ms: syncResult.execution_time_ms,
        }),
      });

      const data = await res.json();

      setTerminalLines(prev => [
        ...prev,
        `> Response: 200 OK`,
        `> AI Recommendation: ${data.ai_recommendation}`,
        `> Synced at: ${data.synced_at}`,
        '> ✓ CLOUD SYNC COMPLETE',
      ]);

      setSyncResult({ ...syncResult, ai_recommendation: data.ai_recommendation });
      setStage('synced');

      // Trigger dashboard update after a brief pause to show the success state
      setTimeout(() => {
        onSyncComplete({
          ...syncResult,
          ai_recommendation: data.ai_recommendation,
        });
        handleClose();
      }, 2000);
    } catch {
      setTerminalLines(prev => [...prev, '> ERROR: Cloud sync failed. Payload queued for retry.']);
      setStage('inferred');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={handleClose} />

      {/* Modal */}
      <div className="relative w-full max-w-2xl bg-[#0c0c0f] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-gradient-to-r from-cyan-500/10 to-blue-500/10">
          <div className="flex items-center gap-3">
            <div className="bg-cyan-500/20 p-2 rounded-lg">
              <Cpu className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Edge Node Scanner</h2>
              <p className="text-xs text-gray-400">TFLite Offline Inference Simulator</p>
            </div>
          </div>
          <button onClick={handleClose} className="text-gray-400 hover:text-white transition-colors p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* File Picker */}
          <div>
            <input type="file" ref={fileInputRef} accept="image/*" className="hidden" onChange={handleFileSelect} />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-3 border-2 border-dashed border-white/10 hover:border-cyan-500/40 rounded-xl p-6 transition-all group"
            >
              <Upload className="w-6 h-6 text-gray-500 group-hover:text-cyan-400 transition-colors" />
              <span className="text-gray-400 group-hover:text-cyan-300 transition-colors text-sm">
                {fileName || 'Select a leaf image to diagnose...'}
              </span>
            </button>
          </div>

          {/* Terminal Output */}
          {terminalLines.length > 0 && (
            <div className="bg-black/80 border border-white/5 rounded-lg p-4 max-h-64 overflow-y-auto font-mono text-xs space-y-0.5">
              {terminalLines.map((line, i) => (
                <div
                  key={i}
                  className={
                    line.includes('SUCCESS') || line.includes('COMPLETE')
                      ? 'text-emerald-400'
                      : line.includes('ERROR')
                        ? 'text-red-400'
                        : line.includes('Result:')
                          ? 'text-amber-400'
                          : line.includes('Recommendation')
                            ? 'text-indigo-400'
                            : 'text-gray-400'
                  }
                >
                  {line || '\u00A0'}
                </div>
              ))}
              {(stage === 'inferring' || stage === 'syncing') && (
                <div className="flex items-center gap-2 text-cyan-400 mt-1">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>{stage === 'inferring' ? 'Running inference...' : 'Syncing to cloud...'}</span>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={runInference}
              disabled={stage !== 'loaded'}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium text-sm transition-all disabled:opacity-30 disabled:cursor-not-allowed bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white shadow-lg shadow-cyan-500/20"
            >
              <Zap className="w-4 h-4" />
              Run TFLite Offline Inference
            </button>
            <button
              onClick={syncToCloud}
              disabled={stage !== 'inferred'}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium text-sm transition-all disabled:opacity-30 disabled:cursor-not-allowed bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white shadow-lg shadow-emerald-500/20"
            >
              {stage === 'synced' ? <CheckCircle className="w-4 h-4" /> : <Cloud className="w-4 h-4" />}
              {stage === 'synced' ? 'Synced!' : 'Sync to National Cloud'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
