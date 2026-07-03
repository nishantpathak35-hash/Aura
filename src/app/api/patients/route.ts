import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Mock auth helper for milestone 1
// In a real app, you would use @supabase/auth-helpers-nextjs or extract clinic_id from JWT
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
  const query = searchParams.get('query');

  let dbQuery = supabase.from('patients').select('*').eq('clinic_id', clinic_id);

  if (query) {
    dbQuery = dbQuery.or(`name.ilike.%${query}%,phone.ilike.%${query}%,email.ilike.%${query}%`);
  }

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
    const { name, phone, email, preferred_language } = body;

    if (!phone && !email) {
      return NextResponse.json({ 
        error: { code: 'VALIDATION_ERROR', message: 'Phone or email is required', field: 'phone' } 
      }, { status: 422 });
    }

    const { data, error } = await supabase
      .from('patients')
      .insert([
        { clinic_id, name, phone, email, preferred_language: preferred_language || 'English' }
      ])
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
