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

  const { data: conversation, error: convError } = await supabase
    .from('conversations')
    .select('*, conversation_messages(*)')
    .eq('id', id)
    .eq('clinic_id', clinic_id)
    .single();

  if (convError || !conversation) {
    return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Conversation not found' } }, { status: 404 });
  }

  // Sort messages by created_at
  if (conversation.conversation_messages) {
    conversation.conversation_messages.sort((a: any, b: any) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
  }

  return NextResponse.json(conversation);
}
