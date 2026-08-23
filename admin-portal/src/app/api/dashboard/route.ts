import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function GET() {
  if (!supabase) {
    // Return mock data when Supabase is not configured
    return NextResponse.json({
      total_farmers: 16600,
      active_seasons: 8420,
      total_scans_today: 1247,
      disease_detection_rate: 12.3,
      active_edge_nodes: 1420,
      active_threats: 3,
      marketplace_active_listings: 342,
      national_health_index: 88.4,
    });
  }

  const { data, error } = await supabase.rpc('get_dashboard_stats');

  if (error) {
    console.error('Dashboard stats error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard stats' },
      { status: 500 }
    );
  }

  return NextResponse.json(data?.[0] ?? {});
}
