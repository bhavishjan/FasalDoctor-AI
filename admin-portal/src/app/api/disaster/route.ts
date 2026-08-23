import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { supabaseAdmin } from '@/lib/supabaseServer';

// GET: Fetch active disaster broadcasts
export async function GET() {
  const client = supabaseAdmin ?? supabase;
  if (!client) {
    return NextResponse.json([]);
  }

  const { data, error } = await client
    .from('disaster_broadcasts')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Disaster broadcasts error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch broadcasts' },
      { status: 500 }
    );
  }

  return NextResponse.json(data ?? []);
}

// POST: Create a new disaster broadcast (admin/researcher only)
export async function POST(request: NextRequest) {
  // Use admin client to bypass RLS (server-side only)
  const client = supabaseAdmin ?? supabase;
  if (!client) {
    return NextResponse.json(
      { error: 'Supabase not configured' },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();

    const { broadcast_type, title, message, target_regions, severity, action_required } = body;

    if (!title || !message || !target_regions) {
      return NextResponse.json(
        { error: 'Missing required fields: title, message, target_regions' },
        { status: 400 }
      );
    }

    const { data, error } = await client
      .from('disaster_broadcasts')
      .insert({
        broadcast_type: broadcast_type ?? 'general',
        title,
        message,
        target_regions,
        severity: severity ?? 'medium',
        action_required: action_required ?? null,
      })
      .select()
      .single();

    if (error) {
      console.error('Disaster broadcast insert error:', error);
      return NextResponse.json(
        { error: 'Failed to create broadcast' },
        { status: 500 }
      );
    }

    return NextResponse.json(data, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON payload' },
      { status: 400 }
    );
  }
}
