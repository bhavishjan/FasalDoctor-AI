export interface TelemetryEvent {
  node_id: string;
  region: string;
  disease_detected: string;
  confidence: number;
  execution_time_ms: number;
  timestamp: string;
}

class RealtimeManager {
  private listeners: Map<string, Set<(data: TelemetryEvent) => void>>;

  constructor() {
    this.listeners = new Map();
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
}

export const realtimeManager = new RealtimeManager();
