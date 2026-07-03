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
    .from('patient_memory_facts')
    .select('id, fact_type, fact_text, source_conversation_id, confirmed')
    .eq('patient_id', id)
    .eq('clinic_id', clinic_id)
    .eq('confirmed', true);

  if (error) {
    return NextResponse.json({ error: { code: 'SERVER_ERROR', message: error.message } }, { status: 500 });
  }

  return NextResponse.json({ facts: data });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const clinic_id = await getClinicId(request);
  if (!clinic_id) {
    return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Missing JWT' } }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const { fact_type, fact_text, confirmed } = body;
    
    if (!fact_type || !fact_text) {
      return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'fact_type and fact_text required', field: 'fact_text' } }, { status: 422 });
    }

    // Verify patient belongs to clinic
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
      .from('patient_memory_facts')
      .insert([{
        clinic_id,
        patient_id: id,
        fact_type,
        fact_text,
        confirmed: confirmed === true
      }])
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: { code: 'SERVER_ERROR', message: error.message } }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid JSON' } }, { status: 422 });
  }
}
