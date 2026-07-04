import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import os from 'os';

export const maxDuration = 60; // Allow long running for STT + LLM

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const audioFile = formData.get('audio') as File;
    const phone = formData.get('phone') as string;

    if (!audioFile || !phone) {
      return NextResponse.json({ error: 'Missing audio or phone' }, { status: 400 });
    }

    // 1. Save buffer to temp file for Groq STT
    const buffer = Buffer.from(await audioFile.arrayBuffer());
    const tempDir = os.tmpdir();
    const inputAudioPath = path.join(tempDir, `input-${Date.now()}.webm`);
    fs.writeFileSync(inputAudioPath, buffer);

    // 2. Groq Whisper STT
    const transcription = await groq.audio.transcriptions.create({
      file: fs.createReadStream(inputAudioPath),
      model: 'whisper-large-v3-turbo',
    });
    
    fs.unlinkSync(inputAudioPath); // cleanup

    const userText = transcription.text.trim();
    if (!userText) {
      return NextResponse.json({ text: "I'm sorry, I couldn't hear you clearly." });
    }
    console.log(`🗣️ [Voice] ${phone}: ${userText}`);

    // 3. Prepare Context and Tools
    const { data: clinicData } = await supabaseAdmin.from('clinics').select('*').limit(1).single();
    const clinic_id = clinicData?.id;

    let patient_id = null;
    const { data: patient } = await supabaseAdmin
      .from('patients')
      .select('id')
      .eq('clinic_id', clinic_id)
      .eq('phone', phone)
      .single();

    if (patient) {
      patient_id = patient.id;
    } else {
      const { data: newPat } = await supabaseAdmin
        .from('patients')
        .insert([{ clinic_id, phone, name: 'Unknown Web Caller' }])
        .select('id')
        .single();
      patient_id = newPat?.id;
    }

    const { data: kb_entries } = await supabaseAdmin
      .from('knowledge_base')
      .select('topic, answer_text')
      .eq('clinic_id', clinic_id);
    
    const kbContext = kb_entries?.map((kb) => `Q: ${kb.topic} A: ${kb.answer_text}`).join('\n') || 'none';
    const clinicPolicies = clinicData?.settings ? JSON.stringify(clinicData.settings) : 'none';

    const tools = [
      {
        type: 'function',
        function: {
          name: 'book_appointment',
          description: 'Book a clinic appointment for the caller.',
          parameters: {
            type: 'object',
            properties: {
              date_time: {
                type: 'string',
                description: 'The ISO date and time of the appointment. Example: 2026-07-04T14:00:00Z',
              },
            },
            required: ['date_time'],
          },
        },
      }
    ];

    const messages = [
      {
        role: 'system',
        content: `You are the AI Voice Receptionist for ${clinicData?.name}. 
IMPORTANT RULES:
- Speak in very short, concise, spoken conversational sentences. 
- You MUST respond in the EXACT SAME LANGUAGE the user speaks to you (e.g., if they speak Hindi, respond in Hindi. If English, respond in English).
- Be polite, warm, and natural. No emojis. Do not output markdown.
- If the user asks to book an appointment, use the book_appointment tool!

Knowledge Base:
${kbContext}

Policies:
${clinicPolicies}`
      },
      { role: 'user', content: userText }
    ];

    // 4. Groq Llama 3 LLM
    const chatCompletion = await groq.chat.completions.create({
      messages: messages as any,
      model: 'llama-3.1-8b-instant',
      temperature: 0.3,
      tools: tools as any,
      tool_choice: 'auto'
    });

    const responseMessage = chatCompletion.choices[0].message;
    let aiReplyText = responseMessage.content || "";

    // 5. Handle Tool Calls
    if (responseMessage.tool_calls) {
      for (const toolCall of responseMessage.tool_calls) {
        if (toolCall.function.name === 'book_appointment') {
          const args = JSON.parse(toolCall.function.arguments);
          
          const { data: doctor } = await supabaseAdmin.from('doctors').select('id').eq('clinic_id', clinic_id).limit(1).single();
          
          if (doctor && patient_id) {
            await supabaseAdmin.from('appointments').insert([{
              clinic_id,
              doctor_id: doctor.id,
              patient_id,
              start_time: args.date_time,
              status: 'scheduled',
              booked_by: 'ai'
            }]);
            
            aiReplyText = "I have successfully booked your appointment. You are all set! Is there anything else I can help you with?";
          } else {
            aiReplyText = "I'm sorry, I couldn't book the appointment right now because of a system issue.";
          }
        }
      }
    }

    if (!aiReplyText) {
      aiReplyText = "I'm sorry, I didn't catch that.";
    }
    
    console.log(`🤖 [Voice] AI: ${aiReplyText}`);

    // Log the voice conversation to db
    let { data: existingConv } = await supabaseAdmin
      .from('conversations')
      .select('id')
      .eq('caller_identifier', phone)
      .eq('channel', 'web_voice')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!existingConv) {
      const { data: newConv } = await supabaseAdmin
        .from('conversations')
        .insert([{ clinic_id, patient_id, channel: 'web_voice', caller_identifier: phone }])
        .select('id')
        .single();
      existingConv = newConv;
    }
    
    if (existingConv) {
      await supabaseAdmin.from('conversation_messages').insert([
        { conversation_id: existingConv.id, role: 'patient', content: userText, content_type: 'text' },
        { conversation_id: existingConv.id, role: 'ai', content: aiReplyText, intent: 'faq' }
      ]);
    }

    // 6. Return JSON for Free Native Browser TTS (since ElevenLabs is blocking us)
    return NextResponse.json({ text: aiReplyText });

  } catch (error) {
    console.error("Voice API Error:", error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
