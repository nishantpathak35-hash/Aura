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

export async function GET(request: Request) {
  const clinic_id = await getClinicId(request);
  if (!clinic_id) {
    return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Missing JWT' } }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const doctor_id = searchParams.get('doctor_id');
  const date_from = searchParams.get('date_from');
  const date_to = searchParams.get('date_to');
  const status = searchParams.get('status');

  let dbQuery = supabase.from('appointments').select('*').eq('clinic_id', clinic_id);

  if (doctor_id) dbQuery = dbQuery.eq('doctor_id', doctor_id);
  if (status) dbQuery = dbQuery.eq('status', status);
  if (date_from) dbQuery = dbQuery.gte('start_time', date_from);
  if (date_to) dbQuery = dbQuery.lte('start_time', date_to);

  const { data, error } = await dbQuery;

  if (error) {
    return NextResponse.json({ error: { code: 'SERVER_ERROR', message: error.message } }, { status: 500 });
  }

  return NextResponse.json({ data });
}

export async function POST(request: Request) {
  const clinic_id = await getClinicId(request);
  if (!clinic_id) {
    return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Missing JWT' } }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { doctor_id, patient_id, service_id, start_time, booked_by } = body;

    const { data, error } = await supabase
      .from('appointments')
      .insert([
        { clinic_id, doctor_id, patient_id, service_id, start_time, booked_by, status: 'scheduled' }
      ])
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: { code: 'SLOT_CONFLICT', message: 'Appointment slot is no longer available' } }, { status: 409 });
      }
      return NextResponse.json({ error: { code: 'SERVER_ERROR', message: error.message } }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid JSON' } }, { status: 422 });
  }
}
