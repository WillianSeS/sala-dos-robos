create or replace function public.record_pool_result(p_name text, p_result text)
returns void language plpgsql security definer set search_path = public as $$
declare v_name text := left(btrim(coalesce(p_name, '')), 24); v_slug text;
begin
  if v_name = '' or p_result not in ('win', 'loss', 'draw') then return; end if;
  v_slug := translate(lower(v_name), 'áàâãäéèêëíìîïóòôõöúùûüçñ', 'aaaaaeeeeiiiiooooouuuucn');
  v_slug := left(btrim(regexp_replace(v_slug, '[^a-z0-9]+', '-', 'g'), '-'), 40);
  if v_slug = '' then v_slug := 'visitante'; end if;
  insert into public.pool_ranking (slug, name, wins, losses, draws)
  values (v_slug, v_name, (p_result = 'win')::int, (p_result = 'loss')::int, (p_result = 'draw')::int)
  on conflict (slug) do update set name = excluded.name,
    wins = pool_ranking.wins + excluded.wins, losses = pool_ranking.losses + excluded.losses,
    draws = pool_ranking.draws + excluded.draws, updated_at = now();
end $$;
revoke all on function public.record_pool_result(text, text) from public;
grant execute on function public.record_pool_result(text, text) to anon, authenticated;
