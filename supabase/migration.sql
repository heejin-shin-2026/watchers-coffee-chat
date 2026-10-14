-- Watchers 커피챗 자동 매칭 — Supabase 마이그레이션
-- Supabase Dashboard > SQL Editor에서 실행하세요.

-- 1. 신청자 (전화번호 기준 1인 1행)
create table if not exists persons (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone_enc text not null,
  phone_hash text not null unique,
  phone_last4 text not null,
  school text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists idx_persons_phone_hash on persons(phone_hash);

-- 2. 회차
create table if not exists rounds (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  status text not null default 'DRAFT' check (status in ('DRAFT','OPEN','CLOSED','MATCHED','ARCHIVED')),
  open_at timestamptz,
  close_at timestamptz,
  receipt_counter int not null default 0,
  created_at timestamptz not null default now()
);

-- 3. 회차별 신청
create table if not exists applications (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references rounds(id) on delete cascade,
  person_id uuid not null references persons(id) on delete cascade,
  receipt_no text not null,
  region_1 text not null,
  region_2 text,
  interests jsonb not null default '[]',
  memo text not null default '',
  status text not null default 'APPLIED' check (status in ('APPLIED','GROUPED','WAITLIST','CANCELLED','NOSHOW')),
  applied_at timestamptz not null default now(),
  unique(round_id, person_id)
);
create index if not exists idx_applications_round on applications(round_id);

-- 4. 동의 로그 (삭제 금지)
create table if not exists consent_logs (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references persons(id),
  round_id uuid not null references rounds(id),
  agreed_at timestamptz not null default now(),
  policy_version text not null,
  ip text
);

-- 5. 조
create table if not exists groups (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references rounds(id) on delete cascade,
  group_no int not null,
  region text not null default '',
  common_interests jsonb not null default '[]',
  score int not null default 0,
  confirmed_at timestamptz,
  unique(round_id, group_no)
);

-- 6. 조 구성원 (조장 표시 포함)
create table if not exists group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id) on delete cascade,
  application_id uuid not null references applications(id) on delete cascade,
  person_id uuid not null references persons(id),
  is_leader boolean not null default false
);
create index if not exists idx_group_members_group on group_members(group_id);
create index if not exists idx_group_members_person on group_members(person_id);

-- 7. 관리자
create table if not exists admins (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  password_hash text not null,
  created_at timestamptz not null default now()
);

-- 8. 매칭 실행안 (확정 전 임시 저장)
create table if not exists match_runs (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references rounds(id) on delete cascade,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  confirmed_at timestamptz
);
create index if not exists idx_match_runs_round on match_runs(round_id);

-- 9. 로그인 시도 기록
create table if not exists login_attempts (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  ip text,
  success boolean not null,
  attempted_at timestamptz not null default now()
);
create index if not exists idx_login_attempts_email on login_attempts(email, attempted_at);

-- 10. 설정값 (지역·관심사·동의문구 — 앱 기본값 사용, 변경 시에만 저장)
create table if not exists settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

-- RLS: service_role 키로만 접근 (anon 키로는 접근 불가)
alter table persons enable row level security;
alter table rounds enable row level security;
alter table applications enable row level security;
alter table consent_logs enable row level security;
alter table groups enable row level security;
alter table group_members enable row level security;
alter table admins enable row level security;
alter table match_runs enable row level security;
alter table login_attempts enable row level security;
alter table settings enable row level security;
-- (정책을 추가하지 않음 → anon 키 접근 차단, service_role은 RLS 우회)
