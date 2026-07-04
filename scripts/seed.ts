import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: '.env.local' });

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function seed() {
  console.log("🌱 Seeding initial dummy clinic...");
  
  // Create Clinic
  const { data: clinic, error } = await supabaseAdmin.from('clinics').insert([{
    name: 'AURA Test Clinic',
    settings: { language: 'en', auto_book: true }
  }]).select('id').single();

  if (error) {
    console.error("Failed to seed clinic:", error);
    process.exit(1);
  }

  // Create Doctor
  const { data: doctor } = await supabaseAdmin.from('doctors').insert([{
    clinic_id: clinic.id,
    name: 'Dr. Jane Smith'
  }]).select('id').single();

  // Create Knowledge Base
  await supabaseAdmin.from('knowledge_base').insert([
    { clinic_id: clinic.id, topic: 'Location', answer_text: 'We are located at 123 Health Ave.' },
    { clinic_id: clinic.id, topic: 'Hours', answer_text: 'We are open 9AM to 5PM Monday through Friday.' }
  ]);

  console.log("✅ Successfully seeded the database!");
}

seed();
