-- AI-PCP Database Schema
-- All tables prefixed with pcp_

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- pcp_profiles: user profiles linked to auth.users
create table pcp_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  organization text,
  country text,
  role text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- pcp_projects: project metadata
create table pcp_projects (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references pcp_profiles(id) on delete cascade not null,
  title text not null,
  country text not null,
  sector text not null,
  status text not null default 'draft' check (status in ('draft', 'generating', 'generated', 'reviewed', 'final')),
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- pcp_documents: PCP document content (JSON)
create table pcp_documents (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid references pcp_projects(id) on delete cascade not null,
  version integer not null default 1,
  content jsonb not null default '{}',
  raw_output text,
  tokens_used integer default 0,
  generation_time_ms integer default 0,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  unique (project_id, version)
);

-- Indexes
create index idx_pcp_projects_user_id on pcp_projects(user_id);
create index idx_pcp_projects_status on pcp_projects(status);
create index idx_pcp_documents_project_id on pcp_documents(project_id);

-- Updated_at trigger function
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger pcp_profiles_updated_at before update on pcp_profiles
  for each row execute function update_updated_at();
create trigger pcp_projects_updated_at before update on pcp_projects
  for each row execute function update_updated_at();
create trigger pcp_documents_updated_at before update on pcp_documents
  for each row execute function update_updated_at();

-- Row Level Security
alter table pcp_profiles enable row level security;
alter table pcp_projects enable row level security;
alter table pcp_documents enable row level security;

-- Profiles: users can only access their own profile
create policy "Users can view own profile"
  on pcp_profiles for select using (auth.uid() = id);
create policy "Users can update own profile"
  on pcp_profiles for update using (auth.uid() = id);
create policy "Users can insert own profile"
  on pcp_profiles for insert with check (auth.uid() = id);

-- Projects: users can only access their own projects
create policy "Users can view own projects"
  on pcp_projects for select using (auth.uid() = user_id);
create policy "Users can create own projects"
  on pcp_projects for insert with check (auth.uid() = user_id);
create policy "Users can update own projects"
  on pcp_projects for update using (auth.uid() = user_id);
create policy "Users can delete own projects"
  on pcp_projects for delete using (auth.uid() = user_id);

-- Documents: users can access documents of their own projects
create policy "Users can view own documents"
  on pcp_documents for select using (
    exists (select 1 from pcp_projects where id = pcp_documents.project_id and user_id = auth.uid())
  );
create policy "Users can create own documents"
  on pcp_documents for insert with check (
    exists (select 1 from pcp_projects where id = pcp_documents.project_id and user_id = auth.uid())
  );
create policy "Users can update own documents"
  on pcp_documents for update using (
    exists (select 1 from pcp_projects where id = pcp_documents.project_id and user_id = auth.uid())
  );
create policy "Users can delete own documents"
  on pcp_documents for delete using (
    exists (select 1 from pcp_projects where id = pcp_documents.project_id and user_id = auth.uid())
  );

-- Function to auto-create profile on signup
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into pcp_profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
