import { supabase } from '@/lib/supabaseClient';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface TelemetryEvent {
  node_id: string;
  region: string;
  disease_detected: string;
  confidence: number;
  execution_time_ms: number;
  timestamp: string;
}

type RealtimeChannel = ReturnType<SupabaseClient['channel']>;

class RealtimeManager {
  private listeners: Map<string, Set<(data: TelemetryEvent) => void>>;
  private supabaseChannels: Map<string, RealtimeChannel>;
  private isConnected: boolean;

  constructor() {
    this.listeners = new Map();
    this.supabaseChannels = new Map();
    this.isConnected = false;
  }

  /**
   * Initialize Supabase Realtime subscriptions.
   * Call this once when the app mounts.
   */
  initialize(): void {
    if (!supabase || this.isConnected) return;

    // Subscribe to crop_telemetry for live edge sync events
    const telemetryChannel = supabase
      .channel('telemetry-stream')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'crop_telemetry' },
        (payload: { new: Record<string, unknown> }) => {
          const row = payload.new;
          const event: TelemetryEvent = {
            node_id: (row.edge_node_id as string) ?? 'unknown',
            region: (row.region as string) ?? 'Unknown',
            disease_detected: (row.health_status as string) ?? 'Unknown',
            confidence: (row.confidence as number) ?? 0,
            execution_time_ms: (row.inference_time_ms as number) ?? 0,
            timestamp: (row.recorded_at as string) ?? new Date().toISOString(),
          };
          this.publishAll(event);
        }
      )
      .subscribe();

    this.supabaseChannels.set('telemetry', telemetryChannel);
    this.isConnected = true;
  }

  /**
   * Tear down all Supabase Realtime subscriptions.
   */
  teardown(): void {
    this.supabaseChannels.forEach((channel) => {
      if (supabase) {
        supabase.removeChannel(channel);
      }
    });
    this.supabaseChannels.clear();
    this.isConnected = false;
  }

  subscribe(channel: string, callback: (data: TelemetryEvent) => void): () => void {
    if (!this.listeners.has(channel)) {
      this.listeners.set(channel, new Set());
    }
    const channelListeners = this.listeners.get(channel)!;
    channelListeners.add(callback);

    return () => {
      channelListeners.delete(callback);
      if (channelListeners.size === 0) {
        this.listeners.delete(channel);
      }
    };
  }

  publish(channel: string, data: TelemetryEvent): void {
    const channelListeners = this.listeners.get(channel);
    if (channelListeners) {
      channelListeners.forEach(callback => callback(data));
    }
  }

  publishAll(data: TelemetryEvent): void {
    this.listeners.forEach(channelListeners => {
      channelListeners.forEach(callback => callback(data));
    });
  }

  getChannels(): string[] {
    return Array.from(this.listeners.keys());
  }

  getConnectionStatus(): boolean {
    return this.isConnected;
  }
}

export const realtimeManager = new RealtimeManager();
