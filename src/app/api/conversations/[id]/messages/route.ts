import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import Groq from 'groq-sdk';
import { checkSafetyEscalation } from '@/lib/safety-escalation';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || 'placeholder' });

async function getClinicId(request: Request): Promise<string | null> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) return null;
  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  return user.app_metadata?.clinic_id || null;
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const clinic_id = await getClinicId(request);
  const { id } = await params;
  
  try {
    const body = await request.json();
    const { role, content, content_type } = body;
    
    if (!content) {
      return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'Content required', field: 'content' } }, { status: 422 });
    }

    // 1. Verify conversation
    const { data: conv, error: convError } = await supabase
      .from('conversations')
      .select('clinic_id, patient_id, channel')
      .eq('id', id)
      .single();
      
    if (convError || !conv) {
      return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Conversation not found' } }, { status: 404 });
    }

    const effective_clinic_id = conv.clinic_id;
    const patient_id = conv.patient_id;

    // 2. Record patient message
    await supabase.from('conversation_messages').insert([{
      conversation_id: id,
      role: role || 'patient',
      content,
      content_type: content_type || 'text'
    }]);

    // 3. Safety check
    const isSafetyTriggered = checkSafetyEscalation(content);
    
    if (isSafetyTriggered) {
      const fallbackReply = conv.channel === 'phone_call' 
        ? "This sounds like it may be a medical emergency. Please hang up and call emergency services right away, or I can connect you to clinic staff immediately — which would you like?"
        : "This sounds urgent. Please call emergency services if this is a medical emergency. I'm connecting you to clinic staff right now.";
      
      await supabase.from('conversations').update({ flagged: true }).eq('id', id);
      await supabase.from('conversation_messages').insert([{
        conversation_id: id,
        role: 'ai',
        content: fallbackReply,
        intent: 'safety_escalation',
        safety_triggered: true
      }]);
      return NextResponse.json({
        reply: fallbackReply,
        intent: 'safety_escalation',
        safety_triggered: true,
        proposed_memory_facts: []
      });
    }

    // 4. Retrieve Context
    let confirmedFacts = 'none — new or unidentified patient';
    if (patient_id) {
      const { data: factsData } = await supabase
        .from('patient_memory_facts')
        .select('fact_text')
        .eq('patient_id', patient_id)
        .eq('confirmed', true);
      
      if (factsData && factsData.length > 0) {
        confirmedFacts = factsData.map((f: any) => f.fact_text).join(', ');
      }
    }

    const { data: kb_entries } = await supabase
      .from('knowledge_base')
      .select('topic, answer_text')
      .eq('clinic_id', effective_clinic_id);
    
    const kbContext = kb_entries?.map((kb: any) => `Q: ${kb.topic} A: ${kb.answer_text}`).join('\n') || 'none';

    // Fetch dynamic clinic settings
    const { data: clinicSettings } = await supabase
      .from('clinics')
      .select('settings')
      .eq('id', effective_clinic_id)
      .single();
    
    const clinicPolicies = clinicSettings?.settings ? JSON.stringify(clinicSettings.settings) : 'none';

    const retrievedContextBlock = `
Confirmed patient facts: ${confirmedFacts}
Upcoming appointments: none
Matching knowledge base entries:
${kbContext}
Clinic hours/policies: ${clinicPolicies}
`;

    const { data: history } = await supabase
      .from('conversation_messages')
      .select('role, content')
      .eq('conversation_id', id)
      .order('created_at', { ascending: true })
      .limit(10);
      
    const formattedHistory = history?.map((h: any) => `${h.role}: ${h.content}`).join('\n') || '';

    // 5. Intent Classification
    let intent = 'faq';
    if (process.env.GROQ_API_KEY) {
      try {
        const intentCompletion = await groq.chat.completions.create({
          messages: [
            {
              role: 'system',
              content: `Classify the patient's latest message into exactly one of: faq | booking | reschedule | cancellation | human_handoff\n\nRespond with only the label, nothing else.`
            },
            {
              role: 'user',
              content: `Conversation context:\n${formattedHistory}\n\nMessage: ${content}`
            }
          ],
          model: 'llama3-8b-8192',
          temperature: 0,
        });
        intent = intentCompletion.choices[0]?.message?.content?.trim().toLowerCase() || 'faq';
      } catch (e) {
        console.error("Groq intent error", e);
      }
    }

    // 6. Generate Reply
    let aiReply = "I am an AI assistant. Please configure GROQ_API_KEY to enable smart responses.";
    
    if (process.env.GROQ_API_KEY) {
      try {
        const replyCompletion = await groq.chat.completions.create({
          messages: [
            {
              role: 'system',
              content: `You are the AI front-desk assistant for a medical clinic, speaking with a patient over ${conv.channel}.

You must:
- Answer only using the facts provided below in RETRIEVED CONTEXT. Never invent a price, doctor availability, insurance detail, or medical fact that is not present there.
- If the answer isn't in RETRIEVED CONTEXT, say you're not sure and offer to connect the patient to staff. Do not guess.
- Speak in plain English, in short natural sentences.
- Never provide medical advice or diagnosis.

RETRIEVED CONTEXT:
${retrievedContextBlock}`
            },
            ...history!.map((h: any) => ({ role: h.role === 'ai' ? 'assistant' as const : 'user' as const, content: h.content })),
            { role: 'user', content }
          ],
          model: 'qwen-2.5-32b',
          temperature: 0.2,
        });
        
        aiReply = replyCompletion.choices[0]?.message?.content?.trim() || "I'm sorry, I'm having trouble connecting right now.";
      } catch (e) {
        console.error("Groq reply error", e);
        aiReply = "I'm currently experiencing technical difficulties. Let me connect you with the staff.";
      }
    }

    await supabase.from('conversation_messages').insert([{
      conversation_id: id,
      role: 'ai',
      content: aiReply,
      intent
    }]);

    // 7. Extract Memory Facts
    let proposedFacts: string[] = [];
    if (process.env.GROQ_API_KEY && patient_id) {
      try {
        const factCompletion = await groq.chat.completions.create({
          messages: [
            {
              role: 'system',
              content: `Extract key medical or personal facts from the patient's message. 
Return ONLY a valid JSON array of strings (e.g. ["Allergic to penicillin", "Prefers morning appointments"]). 
If no facts are present, return an empty array []. Do not include conversational filler.`
            },
            {
              role: 'user',
              content: `Patient message: ${content}`
            }
          ],
          model: 'llama3-8b-8192',
          temperature: 0,
        });
        
        const responseText = factCompletion.choices[0]?.message?.content?.trim();
        if (responseText) {
          // Parse JSON, ignoring surrounding text if any
          const jsonMatch = responseText.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            proposedFacts = JSON.parse(jsonMatch[0]);
          }
        }

        // Insert proposed facts into db with confirmed = false
        if (proposedFacts.length > 0) {
          const factInserts = proposedFacts.map(fact => ({
            clinic_id: effective_clinic_id,
            patient_id,
            fact_text: fact,
            confirmed: false
          }));
          await supabase.from('patient_memory_facts').insert(factInserts);
        }

      } catch (e) {
        console.error("Groq memory extraction error", e);
      }
    }

    return NextResponse.json({
      reply: aiReply,
      reply_audio_url: null,
      intent,
      confidence: 'high',
      safety_triggered: false,
      proposed_memory_facts: proposedFacts 
    });

  } catch (e) {
    return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid JSON' } }, { status: 422 });
  }
}
