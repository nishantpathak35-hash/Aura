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

export async function POST(request: Request) {
  const clinic_id = await getClinicId(request);
  
  // Note: PRD says "except /api/conversations from an unauthenticated patient widget",
  // so for web_chat, we might not require a JWT if there's a public clinic key,
  // but for simplicity in this milestone, we'll assume clinic_id is provided in body or auth.
  
  try {
    const body = await request.json();
    const { channel, caller_identifier, telephony_call_sid } = body;
    
    // Fallback to body clinic_id if no auth (for public widgets)
    const effective_clinic_id = clinic_id || body.clinic_id;

    if (!effective_clinic_id) {
      return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Missing clinic context' } }, { status: 401 });
    }

    let patient_id = null;
    let greeting = "Hello! How can I help you today?";

    // 1. Identify step
    if (caller_identifier) {
      const { data: patient } = await supabase
        .from('patients')
        .select('id, name')
        .eq('clinic_id', effective_clinic_id)
        .or(`phone.eq.${caller_identifier},email.eq.${caller_identifier}`)
        .single();

      if (patient) {
        patient_id = patient.id;
        // Basic personalized greeting; memory facts integration happens in M3
        greeting = `Hello, ${patient.name}. How can I help you today?`;
      }
    }

    // 2. Create conversation
    const { data: conv, error: convError } = await supabase
      .from('conversations')
      .insert([{
        clinic_id: effective_clinic_id,
        patient_id,
        channel,
        caller_identifier,
        telephony_call_sid
      }])
      .select('id')
      .single();

    if (convError) {
      return NextResponse.json({ error: { code: 'SERVER_ERROR', message: convError.message } }, { status: 500 });
    }

    // Save greeting to messages
    await supabase.from('conversation_messages').insert([{
      conversation_id: conv.id,
      role: 'ai',
      content: greeting,
      content_type: 'text'
    }]);

    return NextResponse.json({
      conversation_id: conv.id,
      patient_id,
      greeting
    }, { status: 201 });

  } catch (e) {
    return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid JSON' } }, { status: 422 });
  }
}
