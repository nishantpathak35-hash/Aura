import { makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
// @ts-ignore
import qrcode from 'qrcode-terminal';
import { createClient } from '@supabase/supabase-js';
import Groq from 'groq-sdk';
import * as dotenv from 'dotenv';
import pino from 'pino';

// Load .env.local
dotenv.config({ path: '.env.local' });

// Ensure we have keys
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}
if (!process.env.GROQ_API_KEY) {
  console.error("Missing GROQ_API_KEY in .env.local");
  process.exit(1);
}

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function startBot() {
  const { data: clinicData } = await supabaseAdmin.from('clinics').select('id, name, settings').limit(1).single();
  
  if (!clinicData) {
    console.error("❌ No clinics found in the database. Please create a clinic row first.");
    process.exit(1);
  }

  const clinic_id = clinicData.id;
  console.log(`🏥 Bound to clinic: ${clinicData.name}`);

  // Fetch latest version
  const { version } = await fetchLatestBaileysVersion();

  // Setup Auth State for Baileys
  const { state, saveCreds } = await useMultiFileAuthState('baileys_auth_info');

  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false, // We will handle QR printing ourselves for clarity
    logger: pino({ level: 'silent' }) // suppress verbose logs
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;
    if (qr) {
      console.log('SCAN THIS QR CODE WITH YOUR PHONE:');
      qrcode.generate(qr, { small: true });
    }
    if (connection === 'close') {
      const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log('Connection closed due to ', lastDisconnect?.error, ', reconnecting ', shouldReconnect);
      if (shouldReconnect) {
        startBot(); // Reconnect
      }
    } else if (connection === 'open') {
      console.log('🤖 WhatsApp Bot is online and listening!');
    }
  });

  sock.ev.on('messages.upsert', async (m) => {
    const msg = m.messages[0];
    // Ignore outgoing messages
    if (!msg.message || msg.key.fromMe) return;
    if (msg.key.remoteJid?.includes('@g.us')) return; // Ignore groups

    const textBody = msg.message.conversation || msg.message.extendedTextMessage?.text;
    if (!textBody) return;

    const senderJid = msg.key.remoteJid!;
    const phoneNumber = senderJid.split('@')[0];
    
    console.log(`📩 Received message from ${phoneNumber}: ${textBody}`);

    try {
      // 1. Identify patient by phone
      let patient_id = null;
      const { data: patient } = await supabaseAdmin
        .from('patients')
        .select('id, name')
        .eq('clinic_id', clinic_id)
        .eq('phone', phoneNumber)
        .single();
        
      if (patient) {
        patient_id = patient.id;
      }

      // 2. Find or create conversation
      let { data: existingConv } = await supabaseAdmin
        .from('conversations')
        .select('id')
        .eq('caller_identifier', phoneNumber)
        .eq('clinic_id', clinic_id)
        .eq('channel', 'web_chat')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (!existingConv) {
        const { data: newConv } = await supabaseAdmin
          .from('conversations')
          .insert([{
            clinic_id,
            patient_id,
            channel: 'web_chat',
            caller_identifier: phoneNumber,
          }])
          .select('id')
          .single();
        existingConv = newConv;
      }

      const convId = existingConv!.id;

      // 3. Record user message
      await supabaseAdmin.from('conversation_messages').insert([{
        conversation_id: convId,
        role: 'patient',
        content: textBody,
        content_type: 'text'
      }]);

      // 4. Check Safety Escalation
      const lowerBody = textBody.toLowerCase();
      const safetyTriggers = ['emergency', 'suicide', 'chest pain', 'bleeding', 'marne ka mann', 'dil ka daura'];
      if (safetyTriggers.some(t => lowerBody.includes(t))) {
        const fallback = "This sounds like an emergency. Please call local emergency services immediately.";
        await sock.sendMessage(senderJid, { text: fallback });
        return;
      }

      // 5. Build context & generate AI reply
      const { data: history } = await supabaseAdmin
        .from('conversation_messages')
        .select('role, content')
        .eq('conversation_id', convId)
        .order('created_at', { ascending: true })
        .limit(10);
      
      const { data: kb_entries } = await supabaseAdmin
        .from('knowledge_base')
        .select('topic, answer_text')
        .eq('clinic_id', clinic_id);
      
      const kbContext = kb_entries?.map((kb: any) => `Q: ${kb.topic} A: ${kb.answer_text}`).join('\n') || 'none';
      const clinicPolicies = clinicData.settings ? JSON.stringify(clinicData.settings) : 'none';

      const retrievedContextBlock = `
Matching knowledge base entries:
${kbContext}
Clinic policies: ${clinicPolicies}
`;

      const aiMessages = [
        {
          role: 'system',
          content: `You are the AI receptionist for ${clinicData.name}, chatting on WhatsApp. Keep answers extremely short, friendly, and plain English. Use emojis sparingly. NEVER invent facts. RETRIEVED CONTEXT:\n${retrievedContextBlock}`
        },
        ...(history || []).map((h: any) => ({ role: h.role === 'ai' ? 'assistant' : 'user', content: h.content })),
        { role: 'user', content: textBody }
      ];

      const replyCompletion = await groq.chat.completions.create({
        messages: aiMessages as any,
        model: 'llama-3.1-8b-instant',
        temperature: 0.2,
      });

      const aiReply = replyCompletion.choices[0]?.message?.content?.trim() || "I'm sorry, I couldn't process that.";

      // Append Voice Call Link
      const voiceLinkMsg = `\n\n🎙️ Prefer to talk? Click here to start a free live voice call: http://localhost:3000/call/${phoneNumber}`;
      const finalMessage = aiReply + voiceLinkMsg;

      // 6. Record AI message
      await supabaseAdmin.from('conversation_messages').insert([{
        conversation_id: convId,
        role: 'ai',
        content: finalMessage,
        intent: 'faq'
      }]);

      // 7. Send back to WhatsApp
      await sock.sendMessage(senderJid, { text: finalMessage });

    } catch (error) {
      console.error("Error processing message:", error);
    }
  });
}

startBot();
