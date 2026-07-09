-- voga.ind balance - Initial Supabase schema
-- This migration creates the database model, integrity constraints, indexes,
-- business RPC functions, analytics views, RLS baseline, and product photos bucket.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type public.user_role as enum ('owner', 'seller');
create type public.product_status as enum ('available', 'sold');
create type public.product_category as enum ('upper', 'lower', 'lingerie');
create type public.payment_status as enum ('paid', 'partial', 'unpaid', 'overdue');
create type public.sale_admin_status as enum ('active', 'voided');
create type public.return_status as enum ('return_window', 'confirmed', 'with_return');
create type public.payment_kind as enum ('initial', 'later');
create type public.sale_item_status as enum ('sold', 'returned', 'voided');

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.user_role not null,
  full_name text not null,
  color text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint profiles_full_name_not_empty check (length(trim(full_name)) > 0),
  constraint profiles_color_format check (color is null or color ~ '^#[0-9A-Fa-f]{6}$')
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  photo_path text,
  size text not null,
  description text,
  category public.product_category not null,
  subcategory text,
  purchase_price integer not null,
  sale_price integer not null,
  status public.product_status not null default 'available',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint products_name_not_empty check (length(trim(name)) > 0),
  constraint products_size_not_empty check (length(trim(size)) > 0),
  constraint products_purchase_price_non_negative check (purchase_price >= 0),
  constraint products_sale_price_non_negative check (sale_price >= 0),
  constraint products_sale_price_not_below_purchase check (sale_price >= purchase_price)
);

create table public.sales (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles(id),
  buyer_full_name text not null,
  buyer_phone text not null,
  sale_date timestamptz not null default now(),
  due_date date not null,
  return_deadline date not null,
  total_amount integer not null default 0,
  total_purchase_cost integer not null default 0,
  paid_amount integer not null default 0,
  pending_amount integer not null default 0,
  payment_status public.payment_status not null default 'unpaid',
  return_status public.return_status not null default 'return_window',
  admin_status public.sale_admin_status not null default 'active',
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint sales_buyer_full_name_not_empty check (length(trim(buyer_full_name)) > 0),
  constraint sales_buyer_phone_not_empty check (length(trim(buyer_phone)) > 0),
  constraint sales_total_amount_non_negative check (total_amount >= 0),
  constraint sales_total_purchase_cost_non_negative check (total_purchase_cost >= 0),
  constraint sales_paid_amount_non_negative check (paid_amount >= 0),
  constraint sales_pending_amount_non_negative check (pending_amount >= 0),
  constraint sales_paid_amount_not_over_total check (paid_amount <= total_amount),
  constraint sales_pending_matches_total check (pending_amount = total_amount - paid_amount)
);

create table public.sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales(id) on delete cascade,
  product_id uuid not null references public.products(id),
  product_name text not null,
  product_size text not null,
  product_category public.product_category not null,
  product_subcategory text,
  purchase_price integer not null,
  sale_price integer not null,
  status public.sale_item_status not null default 'sold',
  returned_at timestamptz,
  created_at timestamptz not null default now(),

  constraint sale_items_purchase_price_non_negative check (purchase_price >= 0),
  constraint sale_items_sale_price_non_negative check (sale_price >= 0),
  constraint sale_items_returned_at_required check (
    (status = 'returned' and returned_at is not null)
    or (status <> 'returned' and returned_at is null)
  )
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales(id) on delete cascade,
  registered_by uuid not null references public.profiles(id),
  amount integer not null,
  kind public.payment_kind not null,
  paid_at timestamptz not null default now(),
  note text,
  created_at timestamptz not null default now(),

  constraint payments_amount_positive check (amount > 0)
);

create table public.returns (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales(id) on delete cascade,
  registered_by uuid not null references public.profiles(id),
  refund_amount integer not null default 0,
  reason text,
  returned_at timestamptz not null default now(),
  created_at timestamptz not null default now(),

  constraint returns_refund_amount_non_negative check (refund_amount >= 0)
);

create table public.return_items (
  id uuid primary key default gen_random_uuid(),
  return_id uuid not null references public.returns(id) on delete cascade,
  sale_item_id uuid not null references public.sale_items(id),
  product_id uuid not null references public.products(id),
  sale_price integer not null,
  purchase_price integer not null,
  created_at timestamptz not null default now(),

  constraint return_items_sale_price_non_negative check (sale_price >= 0),
  constraint return_items_purchase_price_non_negative check (purchase_price >= 0)
);

create table public.price_adjustments (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references public.profiles(id),
  percentage numeric(6, 2) not null,
  note text,
  created_at timestamptz not null default now(),

  constraint price_adjustments_percentage_positive check (percentage > 0)
);

create table public.price_adjustment_items (
  id uuid primary key default gen_random_uuid(),
  price_adjustment_id uuid not null references public.price_adjustments(id) on delete cascade,
  product_id uuid not null references public.products(id),
  old_sale_price integer not null,
  new_sale_price integer not null,
  created_at timestamptz not null default now(),

  constraint price_adjustment_items_old_price_non_negative check (old_sale_price >= 0),
  constraint price_adjustment_items_new_price_non_negative check (new_sale_price >= 0),
  constraint price_adjustment_items_new_price_greater check (new_sale_price > old_sale_price)
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

create index profiles_role_idx on public.profiles(role);
create index profiles_active_idx on public.profiles(active);

create index products_status_idx on public.products(status);
create index products_category_idx on public.products(category);
create index products_size_idx on public.products(size);
create index products_created_at_idx on public.products(created_at desc);

create index sales_seller_id_idx on public.sales(seller_id);
create index sales_sale_date_idx on public.sales(sale_date desc);
create index sales_due_date_idx on public.sales(due_date);
create index sales_payment_status_idx on public.sales(payment_status);
create index sales_return_status_idx on public.sales(return_status);
create index sales_admin_status_idx on public.sales(admin_status);

create unique index sale_items_one_active_sale_per_product_idx
on public.sale_items(product_id)
where status = 'sold';

create index sale_items_sale_id_idx on public.sale_items(sale_id);
create index sale_items_product_id_idx on public.sale_items(product_id);
create index sale_items_category_idx on public.sale_items(product_category);
create index sale_items_status_idx on public.sale_items(status);

create index payments_sale_id_idx on public.payments(sale_id);
create index payments_paid_at_idx on public.payments(paid_at desc);
create index payments_registered_by_idx on public.payments(registered_by);

create index returns_sale_id_idx on public.returns(sale_id);
create index returns_registered_by_idx on public.returns(registered_by);
create index returns_returned_at_idx on public.returns(returned_at desc);

create unique index return_items_sale_item_id_unique_idx on public.return_items(sale_item_id);
create index return_items_return_id_idx on public.return_items(return_id);
create index return_items_product_id_idx on public.return_items(product_id);

create index price_adjustment_items_adjustment_id_idx
on public.price_adjustment_items(price_adjustment_id);

create index price_adjustment_items_product_id_idx
on public.price_adjustment_items(product_id);

-- ---------------------------------------------------------------------------
-- Generic helpers
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger products_set_updated_at
before update on public.products
for each row execute function public.set_updated_at();

create trigger sales_set_updated_at
before update on public.sales
for each row execute function public.set_updated_at();

create or replace function public.calculate_payment_status(
  p_paid_amount integer,
  p_total_amount integer,
  p_due_date date
)
returns public.payment_status
language sql
stable
as $$
  select case
    when p_paid_amount >= p_total_amount then 'paid'::public.payment_status
    when p_paid_amount = 0 and p_due_date < current_date then 'overdue'::public.payment_status
    when p_paid_amount > 0 and p_due_date < current_date then 'overdue'::public.payment_status
    when p_paid_amount > 0 then 'partial'::public.payment_status
    else 'unpaid'::public.payment_status
  end;
$$;

create or replace function public.recalculate_sale_totals(p_sale_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total_amount integer;
  v_total_purchase_cost integer;
  v_paid_amount integer;
  v_due_date date;
begin
  select
    coalesce(sum(si.sale_price) filter (where si.status = 'sold'), 0)::integer,
    coalesce(sum(si.purchase_price) filter (where si.status = 'sold'), 0)::integer
  into v_total_amount, v_total_purchase_cost
  from public.sale_items si
  where si.sale_id = p_sale_id;

  select coalesce(sum(p.amount), 0)::integer
  into v_paid_amount
  from public.payments p
  where p.sale_id = p_sale_id;

  select greatest(v_paid_amount - coalesce(sum(r.refund_amount), 0)::integer, 0)
  into v_paid_amount
  from public.returns r
  where r.sale_id = p_sale_id;

  if v_paid_amount > v_total_amount then
    v_paid_amount := v_total_amount;
  end if;

  select due_date
  into v_due_date
  from public.sales
  where id = p_sale_id;

  update public.sales
  set
    total_amount = v_total_amount,
    total_purchase_cost = v_total_purchase_cost,
    paid_amount = v_paid_amount,
    pending_amount = v_total_amount - v_paid_amount,
    payment_status = public.calculate_payment_status(v_paid_amount, v_total_amount, v_due_date),
    return_status = case
      when exists (
        select 1 from public.sale_items si
        where si.sale_id = p_sale_id and si.status = 'returned'
      ) then 'with_return'::public.return_status
      when return_deadline < current_date then 'confirmed'::public.return_status
      else 'return_window'::public.return_status
    end
  where id = p_sale_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Business RPC functions used by the Edge Function API
-- ---------------------------------------------------------------------------

create or replace function public.create_sale_atomic(
  p_seller_id uuid,
  p_created_by uuid,
  p_buyer_full_name text,
  p_buyer_phone text,
  p_product_ids uuid[],
  p_initial_payment_amount integer default 0,
  p_sale_date timestamptz default now()
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sale_id uuid;
  v_products_count integer;
  v_updated_count integer;
  v_total_amount integer;
  v_total_purchase_cost integer;
  v_due_date date := (p_sale_date + interval '30 days')::date;
  v_return_deadline date := (p_sale_date + interval '7 days')::date;
  v_seller_active boolean;
  v_created_by_active boolean;
  v_created_by_role public.user_role;
begin
  if p_product_ids is null or cardinality(p_product_ids) = 0 then
    raise exception 'sale must contain at least one product';
  end if;

  if p_initial_payment_amount < 0 then
    raise exception 'initial payment cannot be negative';
  end if;

  select active into v_seller_active
  from public.profiles
  where id = p_seller_id;

  select active, role into v_created_by_active, v_created_by_role
  from public.profiles
  where id = p_created_by;

  if coalesce(v_seller_active, false) = false or coalesce(v_created_by_active, false) = false then
    raise exception 'inactive user cannot create sale';
  end if;

  if v_created_by_role = 'seller' and p_created_by <> p_seller_id then
    raise exception 'seller can only create own sales';
  end if;

  select count(*)
  into v_products_count
  from unnest(p_product_ids) as product_id;

  with updated_products as (
    update public.products
    set status = 'sold'
    where id = any(p_product_ids)
      and status = 'available'
    returning id, purchase_price, sale_price
  )
  select
    count(*)::integer,
    coalesce(sum(sale_price), 0)::integer,
    coalesce(sum(purchase_price), 0)::integer
  into v_updated_count, v_total_amount, v_total_purchase_cost
  from updated_products;

  if v_updated_count <> v_products_count then
    raise exception 'one or more products are no longer available';
  end if;

  if p_initial_payment_amount > v_total_amount then
    raise exception 'initial payment cannot exceed sale total';
  end if;

  insert into public.sales (
    seller_id,
    buyer_full_name,
    buyer_phone,
    sale_date,
    due_date,
    return_deadline,
    total_amount,
    total_purchase_cost,
    paid_amount,
    pending_amount,
    payment_status,
    return_status,
    admin_status,
    created_by
  )
  values (
    p_seller_id,
    trim(p_buyer_full_name),
    trim(p_buyer_phone),
    p_sale_date,
    v_due_date,
    v_return_deadline,
    v_total_amount,
    v_total_purchase_cost,
    p_initial_payment_amount,
    v_total_amount - p_initial_payment_amount,
    public.calculate_payment_status(p_initial_payment_amount, v_total_amount, v_due_date),
    case
      when v_return_deadline < current_date then 'confirmed'::public.return_status
      else 'return_window'::public.return_status
    end,
    'active',
    p_created_by
  )
  returning id into v_sale_id;

  insert into public.sale_items (
    sale_id,
    product_id,
    product_name,
    product_size,
    product_category,
    product_subcategory,
    purchase_price,
    sale_price
  )
  select
    v_sale_id,
    p.id,
    p.name,
    p.size,
    p.category,
    p.subcategory,
    p.purchase_price,
    p.sale_price
  from public.products p
  where p.id = any(p_product_ids);

  if p_initial_payment_amount > 0 then
    insert into public.payments (sale_id, registered_by, amount, kind, paid_at)
    values (v_sale_id, p_created_by, p_initial_payment_amount, 'initial', p_sale_date);
  end if;

  return v_sale_id;
end;
$$;

create or replace function public.register_payment(
  p_sale_id uuid,
  p_registered_by uuid,
  p_amount integer,
  p_paid_at timestamptz default now(),
  p_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payment_id uuid;
  v_sale record;
  v_profile record;
begin
  if p_amount <= 0 then
    raise exception 'payment amount must be positive';
  end if;

  select *
  into v_sale
  from public.sales
  where id = p_sale_id
  for update;

  if not found then
    raise exception 'sale not found';
  end if;

  if v_sale.admin_status <> 'active' then
    raise exception 'cannot register payment on voided sale';
  end if;

  select id, role, active
  into v_profile
  from public.profiles
  where id = p_registered_by;

  if not found or v_profile.active = false then
    raise exception 'inactive or missing user cannot register payment';
  end if;

  if v_profile.role = 'seller' and v_sale.seller_id <> p_registered_by then
    raise exception 'seller can only register payments for own sales';
  end if;

  if v_sale.paid_amount + p_amount > v_sale.total_amount then
    raise exception 'payment exceeds pending amount';
  end if;

  insert into public.payments (sale_id, registered_by, amount, kind, paid_at, note)
  values (p_sale_id, p_registered_by, p_amount, 'later', p_paid_at, p_note)
  returning id into v_payment_id;

  perform public.recalculate_sale_totals(p_sale_id);

  return v_payment_id;
end;
$$;

create or replace function public.void_sale(
  p_sale_id uuid,
  p_voided_by uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor record;
begin
  select id, role, active
  into v_actor
  from public.profiles
  where id = p_voided_by;

  if not found or v_actor.active = false or v_actor.role <> 'owner' then
    raise exception 'only active owner can void sales';
  end if;

  update public.sales
  set admin_status = 'voided'
  where id = p_sale_id
    and admin_status = 'active';

  if not found then
    raise exception 'active sale not found';
  end if;

  update public.products p
  set status = 'available'
  from public.sale_items si
  where si.sale_id = p_sale_id
    and si.status = 'sold'
    and si.product_id = p.id;

  update public.sale_items
  set status = 'voided'
  where sale_id = p_sale_id
    and status = 'sold';
end;
$$;

create or replace function public.register_return(
  p_sale_id uuid,
  p_registered_by uuid,
  p_sale_item_ids uuid[],
  p_refund_amount integer default 0,
  p_reason text default null,
  p_returned_at timestamptz default now()
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_return_id uuid;
  v_sale record;
  v_profile record;
  v_items_count integer;
  v_updated_count integer;
  v_refundable_amount integer;
begin
  if p_sale_item_ids is null or cardinality(p_sale_item_ids) = 0 then
    raise exception 'return must contain at least one sale item';
  end if;

  if p_refund_amount < 0 then
    raise exception 'refund amount cannot be negative';
  end if;

  select *
  into v_sale
  from public.sales
  where id = p_sale_id
  for update;

  if not found then
    raise exception 'sale not found';
  end if;

  if v_sale.admin_status <> 'active' then
    raise exception 'cannot return items from voided sale';
  end if;

  if p_returned_at::date > v_sale.return_deadline then
    raise exception 'return deadline has expired';
  end if;

  select id, role, active
  into v_profile
  from public.profiles
  where id = p_registered_by;

  if not found or v_profile.active = false then
    raise exception 'inactive or missing user cannot register return';
  end if;

  if v_profile.role = 'seller' and v_sale.seller_id <> p_registered_by then
    raise exception 'seller can only return own sale items';
  end if;

  select greatest(
    coalesce((select sum(amount) from public.payments where sale_id = p_sale_id), 0)
    - coalesce((select sum(refund_amount) from public.returns where sale_id = p_sale_id), 0),
    0
  )::integer
  into v_refundable_amount;

  if p_refund_amount > v_refundable_amount then
    raise exception 'refund amount exceeds collected amount';
  end if;

  select count(*)
  into v_items_count
  from unnest(p_sale_item_ids) as sale_item_id;

  insert into public.returns (sale_id, registered_by, refund_amount, reason, returned_at)
  values (p_sale_id, p_registered_by, p_refund_amount, p_reason, p_returned_at)
  returning id into v_return_id;

  with updated_items as (
    update public.sale_items
    set status = 'returned',
        returned_at = p_returned_at
    where id = any(p_sale_item_ids)
      and sale_id = p_sale_id
      and status = 'sold'
    returning id, product_id, sale_price, purchase_price
  )
  insert into public.return_items (
    return_id,
    sale_item_id,
    product_id,
    sale_price,
    purchase_price
  )
  select
    v_return_id,
    id,
    product_id,
    sale_price,
    purchase_price
  from updated_items;

  get diagnostics v_updated_count = row_count;

  if v_updated_count <> v_items_count then
    raise exception 'one or more sale items cannot be returned';
  end if;

  update public.products p
  set status = 'available'
  from public.return_items ri
  where ri.return_id = v_return_id
    and ri.product_id = p.id;

  perform public.recalculate_sale_totals(p_sale_id);

  return v_return_id;
end;
$$;

create or replace function public.apply_price_adjustment(
  p_created_by uuid,
  p_product_ids uuid[],
  p_percentage numeric,
  p_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor record;
  v_adjustment_id uuid;
begin
  if p_product_ids is null or cardinality(p_product_ids) = 0 then
    raise exception 'price adjustment must contain at least one product';
  end if;

  if p_percentage <= 0 then
    raise exception 'percentage must be positive';
  end if;

  select id, role, active
  into v_actor
  from public.profiles
  where id = p_created_by;

  if not found or v_actor.active = false or v_actor.role <> 'owner' then
    raise exception 'only active owner can apply price adjustments';
  end if;

  insert into public.price_adjustments (created_by, percentage, note)
  values (p_created_by, p_percentage, p_note)
  returning id into v_adjustment_id;

  insert into public.price_adjustment_items (
    price_adjustment_id,
    product_id,
    old_sale_price,
    new_sale_price
  )
  select
    v_adjustment_id,
    id,
    sale_price,
    round(sale_price * (1 + p_percentage / 100.0))::integer
  from public.products
  where id = any(p_product_ids)
    and status = 'available';

  update public.products p
  set sale_price = pai.new_sale_price
  from public.price_adjustment_items pai
  where pai.price_adjustment_id = v_adjustment_id
    and pai.product_id = p.id;

  return v_adjustment_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Views for Home and Analytics
-- ---------------------------------------------------------------------------

create or replace view public.confirmed_sale_items_view as
select
  s.id as sale_id,
  s.seller_id,
  s.sale_date,
  si.product_id,
  si.product_name,
  si.product_size,
  si.product_category,
  si.product_subcategory,
  si.purchase_price,
  si.sale_price
from public.sales s
join public.sale_items si on si.sale_id = s.id
where s.admin_status = 'active'
  and s.return_status = 'confirmed'
  and si.status = 'sold';

create or replace view public.cash_movements_view as
select
  p.sale_id,
  p.registered_by,
  p.paid_at as occurred_at,
  p.amount as amount,
  'payment'::text as movement_type
from public.payments p
union all
select
  r.sale_id,
  r.registered_by,
  r.returned_at as occurred_at,
  -r.refund_amount as amount,
  'refund'::text as movement_type
from public.returns r
where r.refund_amount > 0;

create or replace view public.monthly_payments_view as
select
  date_trunc('month', cm.occurred_at)::date as month,
  s.seller_id,
  pr.role as seller_role,
  sum(cm.amount)::integer as collected_amount,
  case
    when pr.role = 'seller' then round(sum(cm.amount) * 0.15)::integer
    else 0
  end as commission_amount
from public.cash_movements_view cm
join public.sales s on s.id = cm.sale_id
join public.profiles pr on pr.id = s.seller_id
where s.admin_status = 'active'
group by date_trunc('month', cm.occurred_at)::date, s.seller_id, pr.role;

create or replace view public.sales_with_dynamic_status_view as
select
  s.*,
  public.calculate_payment_status(s.paid_amount, s.total_amount, s.due_date) as dynamic_payment_status,
  case
    when exists (
      select 1 from public.sale_items si
      where si.sale_id = s.id and si.status = 'returned'
    ) then 'with_return'::public.return_status
    when s.return_deadline < current_date then 'confirmed'::public.return_status
    else 'return_window'::public.return_status
  end as dynamic_return_status
from public.sales s;

-- ---------------------------------------------------------------------------
-- RLS baseline
-- Business writes should go through the Edge Function API using service role.
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.sales enable row level security;
alter table public.sale_items enable row level security;
alter table public.payments enable row level security;
alter table public.returns enable row level security;
alter table public.return_items enable row level security;
alter table public.price_adjustments enable row level security;
alter table public.price_adjustment_items enable row level security;

create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using (id = auth.uid());

-- No direct client insert/update/delete policies are created for business data.
-- No direct client select policy is created for products because sellers must
-- never read purchase_price. Catalog reads should go through the API.
-- The Supabase service role used by Edge Functions bypasses RLS.

revoke execute on function public.create_sale_atomic(
  uuid,
  uuid,
  text,
  text,
  uuid[],
  integer,
  timestamptz
) from public, anon, authenticated;

revoke execute on function public.register_payment(
  uuid,
  uuid,
  integer,
  timestamptz,
  text
) from public, anon, authenticated;

revoke execute on function public.void_sale(uuid, uuid)
from public, anon, authenticated;

revoke execute on function public.register_return(
  uuid,
  uuid,
  uuid[],
  integer,
  text,
  timestamptz
) from public, anon, authenticated;

revoke execute on function public.apply_price_adjustment(
  uuid,
  uuid[],
  numeric,
  text
) from public, anon, authenticated;

grant execute on function public.create_sale_atomic(
  uuid,
  uuid,
  text,
  text,
  uuid[],
  integer,
  timestamptz
) to service_role;

grant execute on function public.register_payment(
  uuid,
  uuid,
  integer,
  timestamptz,
  text
) to service_role;

grant execute on function public.void_sale(uuid, uuid)
to service_role;

grant execute on function public.register_return(
  uuid,
  uuid,
  uuid[],
  integer,
  text,
  timestamptz
) to service_role;

grant execute on function public.apply_price_adjustment(
  uuid,
  uuid[],
  numeric,
  text
) to service_role;

-- ---------------------------------------------------------------------------
-- Storage bucket for product photos
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-photos',
  'product-photos',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "product_photos_select_authenticated"
on storage.objects
for select
to authenticated
using (bucket_id = 'product-photos');

create policy "product_photos_insert_owner"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'product-photos'
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'owner'
      and p.active = true
  )
);

create policy "product_photos_update_owner"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'product-photos'
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'owner'
      and p.active = true
  )
)
with check (
  bucket_id = 'product-photos'
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'owner'
      and p.active = true
  )
);

create policy "product_photos_delete_owner"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'product-photos'
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'owner'
      and p.active = true
  )
);
