create table if not exists journeys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  objective text not null,
  duration_days integer not null,
  lessons jsonb not null default '[]',
  completed_days integer[] not null default '{}',
  created_at timestamptz default now() not null
);

alter table journeys enable row level security;

create policy "Users can manage their own journeys"
  on journeys for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists journeys_user_id_idx on journeys(user_id);
