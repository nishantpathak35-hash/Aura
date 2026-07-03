-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Clinics Table
create table public.clinics (
    id uuid default uuid_generate_v4() primary key,
    name text not null,
    settings jsonb default '{}'::jsonb,
    created_at timestamptz default now() not null
);

-- Doctors Table
create table public.doctors (
    id uuid default uuid_generate_v4() primary key,
    clinic_id uuid references public.clinics(id) on delete cascade not null,
    name text not null,
    working_hours jsonb default '{}'::jsonb,
    created_at timestamptz default now() not null
);

-- Patients Table
create table public.patients (
    id uuid default uuid_generate_v4() primary key,
    clinic_id uuid references public.clinics(id) on delete cascade not null,
    name text not null,
    phone text,
    email text,
    preferred_language text default 'English',
    created_at timestamptz default now() not null,
    
    constraint patient_contact_check check (phone is not null or email is not null)
);

-- Appointments Table
create table public.appointments (
    id uuid default uuid_generate_v4() primary key,
    clinic_id uuid references public.clinics(id) on delete cascade not null,
    doctor_id uuid references public.doctors(id) on delete cascade not null,
    patient_id uuid references public.patients(id) on delete cascade not null,
    service_id uuid, -- Reference to a services table, optional for now
    start_time timestamptz not null,
    status text default 'scheduled' check (status in ('scheduled', 'cancelled', 'completed')),
    booked_by text check (booked_by in ('ai', 'staff', 'patient')),
    created_at timestamptz default now() not null
);

-- RLS Setup
alter table public.clinics enable row level security;
alter table public.doctors enable row level security;
alter table public.patients enable row level security;
alter table public.appointments enable row level security;

-- Policies (assuming auth.jwt() -> 'app_metadata' -> 'clinic_id' is set)
create policy "Clinics are viewable by their own users."
    on public.clinics for select
    using ( id = (auth.jwt() -> 'app_metadata' ->> 'clinic_id')::uuid );

create policy "Doctors are isolated by clinic_id."
    on public.doctors for all
    using ( clinic_id = (auth.jwt() -> 'app_metadata' ->> 'clinic_id')::uuid );

create policy "Patients are isolated by clinic_id."
    on public.patients for all
    using ( clinic_id = (auth.jwt() -> 'app_metadata' ->> 'clinic_id')::uuid );

create policy "Appointments are isolated by clinic_id."
    on public.appointments for all
    using ( clinic_id = (auth.jwt() -> 'app_metadata' ->> 'clinic_id')::uuid );
