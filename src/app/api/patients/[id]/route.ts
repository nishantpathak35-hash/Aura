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

  const { data, error } = await supabase
    .from('patients')
    .select('*')
    .eq('id', id)
    .eq('clinic_id', clinic_id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Patient not found' } }, { status: 404 });
  }

  return NextResponse.json(data);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const clinic_id = await getClinicId(request);
  if (!clinic_id) {
    return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Missing JWT' } }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await request.json();
    
    // Ensure patient belongs to clinic first
    const { data: patient, error: checkError } = await supabase
      .from('patients')
      .select('id')
      .eq('id', id)
      .eq('clinic_id', clinic_id)
      .single();

    if (checkError || !patient) {
      return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Patient not found' } }, { status: 404 });
    }

    const { data, error } = await supabase
      .from('patients')
      .update(body)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: { code: 'SERVER_ERROR', message: error.message } }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid JSON' } }, { status: 422 });
  }
}
