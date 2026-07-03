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

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const clinic_id = await getClinicId(request);
  if (!clinic_id) {
    return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Missing JWT' } }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await request.json();
    
    // Ensure appointment belongs to clinic
    const { data: appointment, error: checkError } = await supabase
      .from('appointments')
      .select('id, doctor_id, start_time')
      .eq('id', id)
      .eq('clinic_id', clinic_id)
      .single();

    if (checkError || !appointment) {
      return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Appointment not found' } }, { status: 404 });
    }

    // If rescheduling, check for conflicts
    if (body.start_time && body.start_time !== appointment.start_time) {
      const doctorIdToCheck = body.doctor_id || appointment.doctor_id;
      
      const { data: conflictingAppointments } = await supabase
        .from('appointments')
        .select('id')
        .eq('doctor_id', doctorIdToCheck)
        .eq('start_time', body.start_time)
        .eq('status', 'scheduled')
        .neq('id', id); // Exclude current appointment

      if (conflictingAppointments && conflictingAppointments.length > 0) {
        return NextResponse.json({ error: { code: 'SLOT_CONFLICT', message: 'Appointment slot is no longer available' } }, { status: 409 });
      }
    }

    const { data, error } = await supabase
      .from('appointments')
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

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const clinic_id = await getClinicId(request);
  if (!clinic_id) {
    return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Missing JWT' } }, { status: 401 });
  }

  const { id } = await params;

  // Soft delete: status = "cancelled"
  const { data, error } = await supabase
    .from('appointments')
    .update({ status: 'cancelled' })
    .eq('id', id)
    .eq('clinic_id', clinic_id)
    .select()
    .single();

  if (error || !data) {
    return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Appointment not found' } }, { status: 404 });
  }

  return NextResponse.json(data);
}
