import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function GET() {
  if (!supabase) {
    // Mock data fallback
    return NextResponse.json([
      {
        crop_type: 'Wheat', forecast_season: 'Rabi 2026',
        total_predicted_yield_tonnes: 28500000, national_demand_tonnes: 25000000,
        surplus_deficit_tonnes: 3500000, status: 'projected',
        surplus_pct: 14.0,
        recommendation: 'CRITICAL: 14.0% surplus projected. Recommend redirecting farmers to alternative crops.',
      },
      {
        crop_type: 'Cotton', forecast_season: 'Kharif 2026',
        total_predicted_yield_tonnes: 8200000, national_demand_tonnes: 9500000,
        surplus_deficit_tonnes: -1300000, status: 'projected',
        surplus_pct: -13.7,
        recommendation: 'Demand exceeds supply by 13.7%. Market conditions favorable for cotton expansion.',
      },
    ]);
  }

  const { data, error } = await supabase
    .from('crop_demand_forecast')
    .select('*')
    .order('generated_at', { ascending: false });

  if (error) {
    console.error('Forecast error:', error);
    return NextResponse.json({ error: 'Failed to fetch forecast' }, { status: 500 });
  }

  // Enrich with surplus percentage and recommendation
  const enriched = (data ?? []).map((row) => {
    const surplusPct = row.national_demand_tonnes > 0
      ? ((row.total_predicted_yield_tonnes - row.national_demand_tonnes) / row.national_demand_tonnes) * 100
      : 0;

    let recommendation: string;
    if (surplusPct > 10) {
      recommendation = `CRITICAL: ${surplusPct.toFixed(1)}% surplus projected. Recommend redirecting farmers to alternative crops.`;
    } else if (surplusPct > 0) {
      recommendation = `Mild surplus of ${surplusPct.toFixed(1)}%. Monitor closely as harvest approaches.`;
    } else {
      recommendation = `Demand exceeds supply by ${Math.abs(surplusPct).toFixed(1)}%. Market conditions favorable.`;
    }

    return { ...row, surplus_pct: Math.round(surplusPct * 10) / 10, recommendation };
  });

  return NextResponse.json(enriched);
}
