-- Supabase SQL Editor에서 이 파일 전체를 실행하세요.

-- 가계(부부 공유 단위)
create table if not exists households (
  id uuid primary key default gen_random_uuid(),
  name text not null default '우리집',
  invite_code text unique not null,
  created_at timestamptz not null default now()
);

-- 가계 멤버
create table if not exists household_members (
  household_id uuid not null references households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (household_id, user_id)
);

-- 카드 사용 내역
create table if not exists expenses (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  card_id text not null check (card_id in ('card1', 'card2', 'card3', 'card4')),
  amount integer not null check (amount > 0),
  date date not null,
  description text not null,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index if not exists expenses_household_id_idx on expenses (household_id);
create index if not exists expenses_date_idx on expenses (date desc);

-- RLS
alter table households enable row level security;
alter table household_members enable row level security;
alter table expenses enable row level security;

create or replace function user_household_ids()
returns setof uuid
language sql
security definer
stable
set search_path = public
as $$
  select household_id from household_members where user_id = auth.uid()
$$;

-- households: 내 가계만 조회
drop policy if exists "members read households" on households;
create policy "members read households"
  on households for select
  to authenticated
  using (id in (select user_household_ids()));

-- household_members: 같은 가계 멤버만 조회
drop policy if exists "members read household_members" on household_members;
create policy "members read household_members"
  on household_members for select
  to authenticated
  using (household_id in (select user_household_ids()));

-- expenses: CRUD
drop policy if exists "members read expenses" on expenses;
create policy "members read expenses"
  on expenses for select
  to authenticated
  using (household_id in (select user_household_ids()));

drop policy if exists "members insert expenses" on expenses;
create policy "members insert expenses"
  on expenses for insert
  to authenticated
  with check (household_id in (select user_household_ids()));

drop policy if exists "members delete expenses" on expenses;
create policy "members delete expenses"
  on expenses for delete
  to authenticated
  using (household_id in (select user_household_ids()));

-- 가계 생성 (첫 사용자)
create or replace function create_household(p_name text default '우리집')
returns table(household_id uuid, invite_code text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_household_id uuid;
  v_invite_code text;
begin
  if auth.uid() is null then
    raise exception '로그인이 필요합니다';
  end if;

  if exists (select 1 from household_members where user_id = auth.uid()) then
    raise exception '이미 가계에 속해 있습니다';
  end if;

  loop
    v_invite_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
    exit when not exists (select 1 from households where households.invite_code = v_invite_code);
  end loop;

  insert into households (name, invite_code)
  values (coalesce(nullif(trim(p_name), ''), '우리집'), v_invite_code)
  returning id into v_household_id;

  insert into household_members (household_id, user_id)
  values (v_household_id, auth.uid());

  return query select v_household_id, v_invite_code;
end;
$$;

-- 초대 코드로 가계 참여 (배우자)
create or replace function join_household_by_code(p_invite_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_household_id uuid;
begin
  if auth.uid() is null then
    raise exception '로그인이 필요합니다';
  end if;

  if exists (select 1 from household_members where user_id = auth.uid()) then
    raise exception '이미 가계에 속해 있습니다';
  end if;

  select id into v_household_id
  from households
  where upper(invite_code) = upper(trim(p_invite_code));

  if v_household_id is null then
    raise exception '초대 코드가 올바르지 않습니다';
  end if;

  insert into household_members (household_id, user_id)
  values (v_household_id, auth.uid());

  return v_household_id;
end;
$$;

-- 내 가계 정보 조회
create or replace function get_my_household()
returns table(household_id uuid, household_name text, invite_code text)
language sql
security definer
stable
set search_path = public
as $$
  select h.id, h.name, h.invite_code
  from household_members hm
  join households h on h.id = hm.household_id
  where hm.user_id = auth.uid()
  limit 1;
$$;

-- 실시간 동기화 (한쪽에서 입력하면 다른 쪽에도 반영)
alter publication supabase_realtime add table expenses;
