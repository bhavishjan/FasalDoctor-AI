import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

// GET: Fetch market prices, optionally filtered by product_type and district
export async function GET(request: NextRequest) {
  if (!supabase) {
    return NextResponse.json([]);
  }

  const { searchParams } = new URL(request.url);
  const productType = searchParams.get('product_type');
  const district = searchParams.get('district');

  let query = supabase
    .from('market_prices')
    .select('*')
    .eq('is_available', true)
    .order('price_pkr', { ascending: true });

  if (productType) {
    query = query.eq('product_type', productType);
  }
  if (district) {
    query = query.eq('district', district);
  }

  const { data, error } = await query.limit(50);

  if (error) {
    console.error('Market prices error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch market prices' },
      { status: 500 }
    );
  }

  return NextResponse.json(data ?? []);
}
