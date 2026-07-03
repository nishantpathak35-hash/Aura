import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

async function getClinicId(request: Request): Promise<string | null> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) return null;
  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  return user.app_metadata?.clinic_id || null;
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const clinic_id = await getClinicId(request);
  if (!clinic_id) {
    return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Missing JWT' } }, { status: 401 });
  }

  const { id } = await params;

  if (clinic_id !== id) {
    return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Cannot access other clinic settings' } }, { status: 403 });
  }

  const { data, error } = await supabase
    .from('clinics')
    .select('settings')
    .eq('id', id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Clinic not found' } }, { status: 404 });
  }

  return NextResponse.json(data.settings);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const clinic_id = await getClinicId(request);
  if (!clinic_id) {
    return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Missing JWT' } }, { status: 401 });
  }

  const { id } = await params;

  if (clinic_id !== id) {
    return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Cannot access other clinic settings' } }, { status: 403 });
  }

  try {
    const body = await request.json();

    const { data: current, error: fetchError } = await supabase
      .from('clinics')
      .select('settings')
      .eq('id', id)
      .single();

    if (fetchError || !current) {
      return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Clinic not found' } }, { status: 404 });
    }

    const updatedSettings = { ...current.settings, ...body };

    const { data, error } = await supabase
      .from('clinics')
      .update({ settings: updatedSettings })
      .eq('id', id)
      .select('settings')
      .single();

    if (error) {
      return NextResponse.json({ error: { code: 'SERVER_ERROR', message: error.message } }, { status: 500 });
    }

    return NextResponse.json(data.settings);
  } catch (e) {
    return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid JSON' } }, { status: 422 });
  }
}
