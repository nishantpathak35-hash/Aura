import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import twilio from 'twilio';

// Twilio/Exotel Webhook for Inbound Calls
export async function POST(request: Request) {
  try {
    const twilioSignature = request.headers.get('x-twilio-signature');
    const url = new URL(request.url);
    const clinic_id = url.searchParams.get('clinic_id');
    
    if (!clinic_id) {
      return new NextResponse('Missing clinic_id', { status: 401 });
    }

    const formData = await request.formData();
    const body: Record<string, any> = {};
    formData.forEach((value, key) => {
      body[key] = value;
    });

    // Validate Twilio Signature
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    if (authToken && twilioSignature) {
      const isValid = twilio.validateRequest(
        authToken,
        twilioSignature,
        url.toString(),
        body
      );
      if (!isValid) {
        return new NextResponse('Invalid signature', { status: 403 });
      }
    }

    const { CallSid, From } = body;
    
    if (!CallSid) {
      return new NextResponse('CallSid missing', { status: 422 });
    }

    // Idempotency check: see if conversation already exists for this CallSid
    let { data: existingConv } = await supabaseAdmin
      .from('conversations')
      .select('id')
      .eq('telephony_call_sid', CallSid)
      .eq('clinic_id', clinic_id)
      .single();

    const VoiceResponse = twilio.twiml.VoiceResponse;
    const twiml = new VoiceResponse();

    if (!existingConv) {
      // 1. Identify step
      let patient_id = null;
      let greeting = "Hello! How can I help you today?";

      if (From) {
        const { data: patient } = await supabaseAdmin
          .from('patients')
          .select('id, name')
          .eq('clinic_id', clinic_id)
          .eq('phone', From)
          .single();

        if (patient) {
          patient_id = patient.id;
          greeting = `Hello, ${patient.name}. How can I help you today?`;
        }
      }

      // 2. Create conversation
      const { data: conv, error: convError } = await supabaseAdmin
        .from('conversations')
        .insert([{
          clinic_id,
          patient_id,
          channel: 'phone_call',
          caller_identifier: From,
          telephony_call_sid: CallSid
        }])
        .select('id')
        .single();

      if (convError) {
        twiml.say("Please hold, connecting you to the clinic.");
        return new NextResponse(twiml.toString(), { headers: { 'Content-Type': 'text/xml' } });
      }
      
      existingConv = conv;

      // Save greeting to messages
      await supabaseAdmin.from('conversation_messages').insert([{
        conversation_id: existingConv.id,
        role: 'ai',
        content: greeting,
        content_type: 'text'
      }]);

      twiml.say(greeting);
      return new NextResponse(twiml.toString(), { headers: { 'Content-Type': 'text/xml' } });
    } else {
      twiml.say("Hello again.");
      return new NextResponse(twiml.toString(), { headers: { 'Content-Type': 'text/xml' } });
    }

  } catch (e) {
    const VoiceResponse = twilio.twiml.VoiceResponse;
    const twiml = new VoiceResponse();
    twiml.say("Please hold, connecting you to the clinic.");
    return new NextResponse(twiml.toString(), { status: 502, headers: { 'Content-Type': 'text/xml' } });
  }
}
