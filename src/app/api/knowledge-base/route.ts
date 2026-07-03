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
  const topic = searchParams.get('topic');

  let dbQuery = supabase.from('knowledge_base').select('*').eq('clinic_id', clinic_id);

  if (topic) {
    dbQuery = dbQuery.ilike('topic', `%${topic}%`);
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
    const { topic, answer_text } = body;

    if (!topic || !answer_text) {
      return NextResponse.json({ 
        error: { code: 'VALIDATION_ERROR', message: 'Topic and answer_text are required', field: 'topic' } 
      }, { status: 422 });
    }

    const { data, error } = await supabase
      .from('knowledge_base')
      .insert([
        { clinic_id, topic, answer_text }
      ])
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: { code: 'SERVER_ERROR', message: error.message } }, { status: 500 });
    }

    // Write audit log
    await supabase.from('audit_log').insert([
      { clinic_id, action: 'kb_edit', details: { kb_id: data.id, topic, type: 'create' } }
    ]);

    return NextResponse.json(data, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid JSON' } }, { status: 422 });
  }
}

export async function PATCH(request: Request) {
  const clinic_id = await getClinicId(request);
  if (!clinic_id) {
    return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Missing JWT' } }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { id, topic, answer_text } = body;

    if (!id) {
      return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'ID is required', field: 'id' } }, { status: 422 });
    }

    const { data: existing, error: checkError } = await supabase
      .from('knowledge_base')
      .select('id')
      .eq('id', id)
      .eq('clinic_id', clinic_id)
      .single();

    if (checkError || !existing) {
      return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Knowledge base entry not found' } }, { status: 404 });
    }

    const { data, error } = await supabase
      .from('knowledge_base')
      .update({ topic, answer_text, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: { code: 'SERVER_ERROR', message: error.message } }, { status: 500 });
    }

    // Write audit log
    await supabase.from('audit_log').insert([
      { clinic_id, action: 'kb_edit', details: { kb_id: data.id, topic: data.topic, type: 'update' } }
    ]);

    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid JSON' } }, { status: 422 });
  }
}
