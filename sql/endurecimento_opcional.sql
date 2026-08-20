-- ===========================================================================
-- ENDURECIMENTO OPCIONAL DA BASE — resultado_final_unidades
--
-- Nada aqui é necessário para a ferramenta funcionar, e NENHUM destes
-- comandos exige mudança no código da página: a ferramenta continua usando a
-- mesma URL, a mesma chave publicável e a mesma tabela.
--
-- O contexto: a chave publicável (`sb_publishable_...`) fica no código da
-- página, e isso é normal — é para isso que ela existe. Quem protege a base
-- NÃO é a chave, são as policies de RLS. Hoje elas liberam select, insert,
-- update e delete para `anon`, ou seja, para qualquer pessoa que abra a
-- página e leia o código-fonte. Num repositório público isso fica mais fácil
-- de encontrar, então vale fechar o que dá para fechar sem atrapalhar o uso.
--
-- Rodar no SQL Editor do projeto Supabase. Cada bloco é independente —
-- aplicar só os que fizerem sentido.
-- ===========================================================================


-- ---------------------------------------------------------------------------
-- 1) TIRAR O DELETE DA MÃO DE QUALQUER UM   (recomendado)
--
-- Hoje um DELETE pela API apaga qualquer registro, sem senha. O PIN da área
-- administrativa não protege nada disso: ele roda no navegador e está no
-- código-fonte — evita clique acidental, não impede quem tem má intenção.
--
-- Removendo a policy, o botão "Excluir" da área administrativa deixa de
-- funcionar (a ferramenta avisa que nada foi apagado, porque confere quantas
-- linhas voltaram) e a exclusão passa a ser feita no painel do Supabase.
-- Se preferir manter o botão funcionando, pule este bloco.
-- ---------------------------------------------------------------------------

-- drop policy if exists "resultado_final delete" on public.resultado_final_unidades;


-- ---------------------------------------------------------------------------
-- 2) O ID GRAVADO TEM QUE SER O SEI DO PRÓPRIO REGISTRO   (recomendado)
--
-- Impede que se grave um registro sob um id inventado, sem relação com o
-- conteúdo — e, de quebra, impede o uso da tabela como depósito de dados
-- soltos. A ferramenta já grava exatamente assim (id = só os dígitos do SEI),
-- então nada muda no uso normal.
-- ---------------------------------------------------------------------------

drop policy if exists "resultado_final insert" on public.resultado_final_unidades;
create policy "resultado_final insert" on public.resultado_final_unidades
  for insert to anon
  with check (id = regexp_replace(coalesce(data->>'sei',''), '\D', '', 'g'));

drop policy if exists "resultado_final update" on public.resultado_final_unidades;
create policy "resultado_final update" on public.resultado_final_unidades
  for update to anon
  using (true)
  with check (id = regexp_replace(coalesce(data->>'sei',''), '\D', '', 'g'));


-- ---------------------------------------------------------------------------
-- 3) LIMITE DE TAMANHO DO REGISTRO   (recomendado)
--
-- Um preenchimento grande, com uma centena de candidatos, não passa de uns
-- poucos KB. O limite abaixo é folgado e serve só para que ninguém use a
-- tabela como hospedagem de arquivo.
-- ---------------------------------------------------------------------------

alter table public.resultado_final_unidades
  drop constraint if exists resultado_final_tamanho;
alter table public.resultado_final_unidades
  add constraint resultado_final_tamanho
  check (octet_length(data::text) <= 500000);


-- ---------------------------------------------------------------------------
-- 4) HISTÓRICO DE VERSÕES — desfazer uma sobrescrita   (recomendado)
--
-- Salvar de novo com o mesmo SEI substitui o registro: é o mecanismo de
-- correção, e também o jeito mais fácil de perder um preenchimento por
-- engano. O gatilho abaixo guarda uma cópia da versão anterior a cada
-- gravação, numa tabela que a chave publicável NÃO enxerga (sem policy de
-- select para `anon`) — só o painel do Supabase lê.
-- ---------------------------------------------------------------------------

create table if not exists public.resultado_final_historico (
  seq         bigserial primary key,
  id          text not null,
  data        jsonb not null,
  updated_at  timestamptz not null,
  arquivado_em timestamptz not null default now()
);

alter table public.resultado_final_historico enable row level security;
-- (sem policies: nenhuma leitura ou escrita pela API pública)

create or replace function public.resultado_final_arquivar()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.resultado_final_historico (id, data, updated_at)
  values (old.id, old.data, old.updated_at);
  return new;
end;
$$;

drop trigger if exists resultado_final_arquivar_trg on public.resultado_final_unidades;
create trigger resultado_final_arquivar_trg
  before update or delete on public.resultado_final_unidades
  for each row execute function public.resultado_final_arquivar();

-- Para ver as versões anteriores de um processo:
--   select seq, updated_at, arquivado_em, data->>'unidade' as unidade
--     from public.resultado_final_historico
--    where id = '00000000000000000000'
--    order by seq desc;
--
-- Para restaurar uma versão:
--   update public.resultado_final_unidades u
--      set data = h.data
--     from public.resultado_final_historico h
--    where h.seq = 123 and u.id = h.id;


-- ---------------------------------------------------------------------------
-- 5) FORA DO SQL — no painel do Supabase
--
-- - Settings > API > "Max rows": limitar quantas linhas uma requisição pode
--   devolver. A busca da área administrativa pede até 10.000; um teto de
--   1.000 já corta a raspagem em massa da base sem atrapalhar o uso real
--   enquanto houver menos de mil processos gravados.
-- - Database > Backups: conferir a retenção do plano e, se disponível,
--   ligar o Point-in-Time Recovery.
-- - Baixar periodicamente o backup .json pela própria ferramenta (área
--   administrativa). É a única cópia sob controle direto da equipe.
-- - Trocar o PIN da área administrativa (hoje 000000, em
--   resultado_final_logic.js) por algo menos óbvio — lembrando que ele evita
--   clique acidental, não protege a base.
-- ---------------------------------------------------------------------------
