create table if not exists public.diagnosis_leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  problem text not null,
  ai_experience text not null,
  automation_interest text not null,
  consultation_interest text not null,
  diagnosis_type text not null,
  created_at timestamptz not null default now()
);
