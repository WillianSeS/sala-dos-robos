-- chat da sala (histórico); mensagens ao vivo vão pelo canal em tempo real
create table public.chat_messages (
  id text primary key check (char_length(id) between 4 and 40),
  name text not null check (char_length(name) between 1 and 24),
  body text not null check (char_length(body) between 1 and 200),
  created_at timestamptz not null default now()
);
create index chat_messages_created_idx on public.chat_messages (created_at desc);
alter table public.chat_messages enable row level security;
create policy "chat leitura publica" on public.chat_messages for select to anon, authenticated using (true);
create policy "chat envio publico" on public.chat_messages for insert to anon, authenticated
  with check (char_length(body) between 1 and 200 and char_length(name) between 1 and 24);

-- limpeza: guarda só os últimos 7 dias
create or replace function public.prune_chat() returns trigger language plpgsql security definer set search_path = public as $$
begin
  delete from public.chat_messages where created_at < now() - interval '7 days';
  return null;
end $$;
create trigger chat_prune after insert on public.chat_messages for each statement execute function public.prune_chat();

-- ranking da sinuca: leitura pública, escrita só pela função (soma +1 por partida)
create table public.pool_ranking (
  slug text primary key check (slug ~ '^[a-z0-9-]{1,40}$'),
  name text not null check (char_length(name) between 1 and 24),
  wins int not null default 0 check (wins >= 0),
  losses int not null default 0 check (losses >= 0),
  draws int not null default 0 check (draws >= 0),
  updated_at timestamptz not null default now()
);
alter table public.pool_ranking enable row level security;
create policy "ranking leitura publica" on public.pool_ranking for select to anon, authenticated using (true);

create or replace function public.record_pool_result(p_name text, p_result text)
returns void language plpgsql security definer set search_path = public as $$
declare v_name text := left(btrim(coalesce(p_name, '')), 24); v_slug text;
begin
  if v_name = '' or p_result not in ('win', 'loss', 'draw') then return; end if;
  v_slug := left(btrim(regexp_replace(lower(v_name), '[^a-z0-9]+', '-', 'g'), '-'), 40);
  if v_slug = '' then v_slug := 'visitante'; end if;
  insert into public.pool_ranking (slug, name, wins, losses, draws)
  values (v_slug, v_name, (p_result = 'win')::int, (p_result = 'loss')::int, (p_result = 'draw')::int)
  on conflict (slug) do update set name = excluded.name,
    wins = pool_ranking.wins + excluded.wins, losses = pool_ranking.losses + excluded.losses,
    draws = pool_ranking.draws + excluded.draws, updated_at = now();
end $$;
revoke all on function public.record_pool_result(text, text) from public;
grant execute on function public.record_pool_result(text, text) to anon, authenticated;
revoke all on function public.prune_chat() from public, anon, authenticated;
