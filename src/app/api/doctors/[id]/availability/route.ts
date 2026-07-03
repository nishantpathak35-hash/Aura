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

  const { searchParams } = new URL(request.url);
  const dateStr = searchParams.get('date');

  if (!dateStr) {
    return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'Missing date parameter', field: 'date' } }, { status: 422 });
  }

  // 1. Fetch doctor working hours (simplified for Milestone 1)
  const { data: doctor, error: doctorError } = await supabase
    .from('doctors')
    .select('working_hours')
    .eq('id', id)
    .eq('clinic_id', clinic_id)
    .single();

  if (doctorError || !doctor) {
    return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Doctor not found' } }, { status: 404 });
  }

  // 2. Fetch existing appointments for this doctor on this date
  const startOfDay = new Date(dateStr);
  startOfDay.setUTCHours(0, 0, 0, 0);
  const endOfDay = new Date(dateStr);
  endOfDay.setUTCHours(23, 59, 59, 999);

  const { data: appointments, error: aptError } = await supabase
    .from('appointments')
    .select('start_time')
    .eq('doctor_id', id)
    .eq('status', 'scheduled')
    .gte('start_time', startOfDay.toISOString())
    .lte('start_time', endOfDay.toISOString());

  if (aptError) {
    return NextResponse.json({ error: { code: 'SERVER_ERROR', message: aptError.message } }, { status: 500 });
  }

  // 3. Compute available slots based on doctor.working_hours minus appointments
  // For this initial implementation, we'll return a mock list of slots from 9 AM to 5 PM
  // minus any times already booked.
  
  const slots = [];
  let currentTime = new Date(dateStr);
  currentTime.setUTCHours(9, 0, 0, 0); // Start at 9 AM UTC

  const endTime = new Date(dateStr);
  endTime.setUTCHours(17, 0, 0, 0); // End at 5 PM UTC

  const bookedTimes = appointments?.map((a: any) => new Date(a.start_time).getTime()) || [];

  while (currentTime < endTime) {
    const slotTime = currentTime.getTime();
    if (!bookedTimes.includes(slotTime)) {
      const slotEnd = new Date(slotTime + 30 * 60000); // 30 min slot
      slots.push({
        start_time: currentTime.toISOString(),
        end_time: slotEnd.toISOString()
      });
    }
    currentTime = new Date(slotTime + 30 * 60000); // Increment by 30 mins
  }

  return NextResponse.json({ slots });
}
