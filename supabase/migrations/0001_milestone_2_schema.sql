-- Knowledge Base Table
create table public.knowledge_base (
    id uuid default uuid_generate_v4() primary key,
    clinic_id uuid references public.clinics(id) on delete cascade not null,
    topic text not null,
    answer_text text not null,
    created_at timestamptz default now() not null,
    updated_at timestamptz default now() not null
);

-- Conversations Table
create table public.conversations (
    id uuid default uuid_generate_v4() primary key,
    clinic_id uuid references public.clinics(id) on delete cascade not null,
    patient_id uuid references public.patients(id) on delete set null,
    channel text check (channel in ('web_chat', 'web_voice', 'phone_call')),
    caller_identifier text,
    telephony_call_sid text,
    flagged boolean default false,
    created_at timestamptz default now() not null,
    
    constraint unique_call_sid unique (telephony_call_sid)
);

-- Conversation Messages Table
create table public.conversation_messages (
    id uuid default uuid_generate_v4() primary key,
    conversation_id uuid references public.conversations(id) on delete cascade not null,
    role text check (role in ('patient', 'staff', 'ai')),
    content text not null,
    content_type text check (content_type in ('text', 'transcribed_speech')),
    intent text,
    safety_triggered boolean default false,
    created_at timestamptz default now() not null
);

-- Audit Log Table
create table public.audit_log (
    id uuid default uuid_generate_v4() primary key,
    clinic_id uuid references public.clinics(id) on delete cascade not null,
    action text not null,
    details jsonb default '{}'::jsonb,
    created_at timestamptz default now() not null
);

-- RLS Setup
alter table public.knowledge_base enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_messages enable row level security;
alter table public.audit_log enable row level security;

-- Policies
create policy "Knowledge base isolated by clinic_id."
    on public.knowledge_base for all
    using ( clinic_id = (auth.jwt() -> 'app_metadata' ->> 'clinic_id')::uuid );

create policy "Conversations isolated by clinic_id."
    on public.conversations for all
    using ( clinic_id = (auth.jwt() -> 'app_metadata' ->> 'clinic_id')::uuid );

create policy "Conversation messages viewable via conversation."
    on public.conversation_messages for all
    using ( conversation_id in (select id from public.conversations where clinic_id = (auth.jwt() -> 'app_metadata' ->> 'clinic_id')::uuid) );

create policy "Audit log isolated by clinic_id."
    on public.audit_log for all
    using ( clinic_id = (auth.jwt() -> 'app_metadata' ->> 'clinic_id')::uuid );
