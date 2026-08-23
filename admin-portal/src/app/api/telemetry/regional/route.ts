import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function GET() {
  if (!supabase) {
    // Return mock data when Supabase is not configured
    return NextResponse.json([
      { region: 'Multan', total_scans: 342, disease_count: 85, dominant_crop: 'Wheat', dominant_disease: 'Wheat Rust', avg_confidence: 0.91, active_farmers: 4500, risk_level: 'High' },
      { region: 'Faisalabad', total_scans: 289, disease_count: 40, dominant_crop: 'Cotton', dominant_disease: 'Cotton Curl Virus', avg_confidence: 0.88, active_farmers: 6200, risk_level: 'Medium' },
      { region: 'Sukkur', total_scans: 198, disease_count: 20, dominant_crop: 'Sugarcane', dominant_disease: 'Sugarcane Red Rot', avg_confidence: 0.92, active_farmers: 3100, risk_level: 'Low' },
      { region: 'Peshawar', total_scans: 156, disease_count: 15, dominant_crop: 'Maize', dominant_disease: 'Corn Blight', avg_confidence: 0.87, active_farmers: 2800, risk_level: 'Low' },
    ]);
  }

  const { data, error } = await supabase.rpc('get_regional_telemetry');

  if (error) {
    console.error('Regional telemetry error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch regional telemetry' },
      { status: 500 }
    );
  }

  return NextResponse.json(data ?? []);
}
