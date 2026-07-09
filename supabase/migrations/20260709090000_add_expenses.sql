-- voga.ind balance - Owner expenses

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references public.profiles(id),
  category text not null,
  description text not null,
  amount integer not null,
  spent_at timestamptz not null default now(),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint expenses_category_not_empty check (length(trim(category)) > 0),
  constraint expenses_description_not_empty check (length(trim(description)) > 0),
  constraint expenses_amount_positive check (amount > 0)
);

create index if not exists expenses_created_by_idx on public.expenses(created_by);
create index if not exists expenses_spent_at_idx on public.expenses(spent_at desc);
create index if not exists expenses_category_idx on public.expenses(category);

drop trigger if exists set_expenses_updated_at on public.expenses;
create trigger set_expenses_updated_at
before update on public.expenses
for each row
execute function public.set_updated_at();

alter table public.expenses enable row level security;

-- No direct client policies are created. Expense access goes through the
-- Express API using service role and owner-only authorization.
