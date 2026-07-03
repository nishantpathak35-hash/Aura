-- Patient Memory Facts Table
create table public.patient_memory_facts (
    id uuid default uuid_generate_v4() primary key,
    clinic_id uuid references public.clinics(id) on delete cascade not null,
    patient_id uuid references public.patients(id) on delete cascade not null,
    fact_type text not null,
    fact_text text not null,
    source_conversation_id uuid references public.conversations(id) on delete set null,
    confirmed boolean default false,
    created_at timestamptz default now() not null
);

-- RLS Setup
alter table public.patient_memory_facts enable row level security;

-- Policies
create policy "Patient memory facts isolated by clinic_id."
    on public.patient_memory_facts for all
    using ( clinic_id = (auth.jwt() -> 'app_metadata' ->> 'clinic_id')::uuid );
