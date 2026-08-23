import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function GET(request: NextRequest) {
  if (!supabase) {
    // Mock fallback
    return NextResponse.json([
      { id: '1', health_status: 'Wheat Rust', crop_type: 'Wheat', region: 'Multan', confidence: 0.94, inference_time_ms: 12, recorded_at: new Date(Date.now() - 60000).toISOString(), ai_recommendation: 'Market Warning: 12% Wheat Yield Loss Predicted in Multan.' },
      { id: '2', health_status: 'Healthy', crop_type: 'Cotton', region: 'Faisalabad', confidence: 0.97, inference_time_ms: 8, recorded_at: new Date(Date.now() - 120000).toISOString(), ai_recommendation: 'Status Optimal: No intervention required.' },
      { id: '3', health_status: 'Cotton Curl Virus', crop_type: 'Cotton', region: 'Faisalabad', confidence: 0.89, inference_time_ms: 15, recorded_at: new Date(Date.now() - 180000).toISOString(), ai_recommendation: 'Alert: Cotton Leaf Curl Virus detected. Immediate whitefly control protocol required.' },
    ]);
  }

  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') ?? '20', 10);
  const region = searchParams.get('region');

  let query = supabase
    .from('crop_telemetry')
    .select('id, health_status, crop_type, region, confidence, inference_time_ms, recorded_at, ai_recommendation')
    .order('recorded_at', { ascending: false })
    .limit(Math.min(limit, 100));

  if (region) {
    query = query.eq('region', region);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Telemetry history error:', error);
    return NextResponse.json({ error: 'Failed to fetch telemetry history' }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}
