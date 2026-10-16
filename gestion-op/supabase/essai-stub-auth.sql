-- ============================================================
--  ⚠️  RÉSERVÉ À L'ESSAI LOCAL — NE JAMAIS APPLIQUER EN PRODUCTION
-- ============================================================
--
--  Dans un vrai projet Supabase, le schéma `auth` et la fonction
--  auth.uid() existent déjà, et les rôles `anon` et `authenticated` sont
--  créés par la plateforme. auth.uid() y lit l'identifiant contenu dans
--  le jeton de session du navigateur.
--
--  Ce fichier reconstitue le strict minimum pour pouvoir ÉPROUVER les
--  règles de securite.sql sur un PostgreSQL ordinaire : auth.uid() lit
--  ici un paramètre de session que le script d'épreuve fixe lui-même.
--
--  Il n'a aucune autre raison d'exister. Appliqué sur un vrai projet, il
--  écraserait la vraie fonction auth.uid() et casserait toute la
--  sécurité.
-- ============================================================

create schema if not exists auth;

create or replace function auth.uid() returns uuid
language sql stable
as $$
  select nullif(current_setting('essai.uid', true), '')::uuid;
$$;

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
end
$$;
