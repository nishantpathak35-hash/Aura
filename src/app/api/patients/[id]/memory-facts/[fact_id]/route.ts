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

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string, fact_id: string }> }) {
  const clinic_id = await getClinicId(request);
  if (!clinic_id) {
    return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Missing JWT' } }, { status: 401 });
  }

  const { id, fact_id } = await params;

  const { data, error } = await supabase
    .from('patient_memory_facts')
    .delete()
    .eq('id', fact_id)
    .eq('patient_id', id)
    .eq('clinic_id', clinic_id)
    .select()
    .single();

  if (error || !data) {
    return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Memory fact not found' } }, { status: 404 });
  }

  return NextResponse.json(data);
}
