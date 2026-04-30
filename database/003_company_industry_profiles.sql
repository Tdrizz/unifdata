alter table public.companies
add column if not exists business_sector text not null default 'general',
add column if not exists brand_color text not null default '#0f172a',
add column if not exists accent_color text not null default '#2563eb';

drop function if exists public.create_company(text, text);
drop function if exists public.create_company(text, text, text);

create or replace function public.create_company(
  p_name text,
  p_industry text default null,
  p_business_sector text default 'general'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_company_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  insert into public.companies (
    name,
    industry,
    business_sector
  )
  values (
    p_name,
    p_industry,
    coalesce(nullif(p_business_sector, ''), 'general')
  )
  returning id into new_company_id;

  insert into public.company_members (
    company_id,
    user_id,
    role
  )
  values (
    new_company_id,
    auth.uid(),
    'owner'
  );

  return new_company_id;
end;
$$;

grant execute on function public.create_company(text, text, text) to authenticated;