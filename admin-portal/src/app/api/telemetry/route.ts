import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

interface TelemetryPayload {
  node_id: string;
  crop_type: string;
  disease_detected: string;
  confidence: number;
  execution_time_ms: number;
  region?: string;
}

const recommendations: Record<string, string> = {
  'Wheat Rust': 'Market Warning: 12% Wheat Yield Loss Predicted in Multan. Divert to Legumes.',
  'Corn Blight': 'Advisory: Northern Corn Blight spreading in Peshawar corridor. Initiate resistant hybrid deployment.',
  'Cotton Curl Virus': 'Alert: Cotton Leaf Curl Virus detected in Faisalabad. Immediate whitefly control protocol required.',
  'Sugarcane Red Rot': 'Warning: Red Rot pathogen confirmed in Sukkur. Quarantine affected fields and apply Carbendazim.',
  'Healthy': 'Status Optimal: No intervention required. Continue standard nutrient cycle.',
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const processPayload = async (payload: TelemetryPayload) => {
      const recommendation = recommendations[payload.disease_detected]
        ?? `Unknown pathogen "${payload.disease_detected}". Manual lab analysis recommended.`;

      // Normalize confidence: EdgeSimulator sends 0-100 (%), Swarm sends 0-1
      const rawConfidence = payload.confidence ?? null;
      const normalizedConfidence = rawConfidence !== null && rawConfidence > 1
        ? rawConfidence / 100
        : rawConfidence;

      if (supabase) {
        // Resolve edge node by node_code
        let edgeNodeId: string | null = null;
        if (payload.node_id) {
          const { data: node } = await supabase
            .from('edge_nodes')
            .select('id')
            .eq('node_code', payload.node_id)
            .single();

          if (node) {
            edgeNodeId = node.id;
            // Increment scan counter and update heartbeat
            await supabase.rpc('increment_node_scans', { p_node_id: node.id });
            await supabase
              .from('edge_nodes')
              .update({ last_heartbeat_at: new Date().toISOString(), status: 'online' })
              .eq('id', node.id);
          }
        }

        // Insert telemetry record with full schema
        const { error } = await supabase.from('crop_telemetry').insert({
          edge_node_id: edgeNodeId,
          crop_type: payload.crop_type ?? 'Unknown',
          health_status: payload.disease_detected,
          confidence: normalizedConfidence,
          inference_time_ms: payload.execution_time_ms ?? null,
          region: payload.region ?? null,
          ai_recommendation: recommendation,
        });

        if (error) {
          console.error('Supabase insert error:', error);
        }

        // Log the sync
        if (edgeNodeId) {
          await supabase.from('telemetry_sync_log').insert({
            edge_node_id: edgeNodeId,
            records_synced: 1,
            diseases_detected: payload.disease_detected !== 'Healthy' ? 1 : 0,
            avg_confidence: normalizedConfidence,
            avg_inference_ms: payload.execution_time_ms ?? null,
          });
        }
      }

      return {
        status: 'synced',
        node_id: payload.node_id,
        disease_detected: payload.disease_detected,
        confidence: payload.confidence,
        execution_time_ms: payload.execution_time_ms,
        ai_recommendation: recommendation,
        synced_at: new Date().toISOString(),
      };
    };

    if (Array.isArray(body)) {
      const batch_id = crypto.randomUUID();
      const results = await Promise.all(body.map(processPayload));

      return NextResponse.json({
        status: 'accepted',
        batch_id,
        count: body.length,
        results
      }, { status: 202 });
    } else {
      const payload: TelemetryPayload = body;

      if (!payload.node_id || !payload.disease_detected) {
        return NextResponse.json(
          { error: 'Missing required fields: node_id, disease_detected' },
          { status: 400 }
        );
      }

      const result = await processPayload(payload);
      return NextResponse.json(result);
    }
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON payload' },
      { status: 400 }
    );
  }
}
