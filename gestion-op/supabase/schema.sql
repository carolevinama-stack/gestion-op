-- ============================================================
--  GESTION-OP — Schéma PostgreSQL (essai de migration Supabase)
-- ============================================================
--
--  STRATÉGIE : reprise fidèle, pas refonte.
--
--  Firestore stocke des documents. PostgreSQL sait stocker des documents
--  nativement (type jsonb) ET les indexer. On garde donc la forme exacte
--  des documents dans une colonne `data`, et on expose en colonnes
--  réelles — calculées automatiquement — les seuls champs sur lesquels
--  l'application filtre ou trie.
--
--  Conséquence : aucun champ ne peut être perdu dans la migration, même
--  un champ que personne n'avait inventorié. Et l'application retrouve
--  ses documents à l'identique, donc la logique métier ne change pas.
--
--  Une normalisation complète (une colonne par champ) reste possible
--  plus tard, sans urgence : ce n'est pas un préalable.
-- ============================================================

create extension if not exists pgcrypto;

-- ---------- Référentiels ----------

create table if not exists sources (
  id    text primary key,
  data  jsonb not null,
  nom   text generated always as (data->>'nom') stored
);

create table if not exists exercices (
  id     text primary key,
  data   jsonb not null,
  annee  int  generated always as ((data->>'annee')::int) stored,
  actif  bool generated always as ((data->>'actif')::bool) stored
);
create index if not exists exercices_annee_idx on exercices (annee desc);

create table if not exists lignes_budgetaires (
  id    text primary key,
  data  jsonb not null,
  code  text generated always as (data->>'code') stored
);
create unique index if not exists lignes_code_idx on lignes_budgetaires (code);

-- `ribs` est un tableau d'objets {banque, numero} : il reste dans data.
-- L'ancien format `rib` (texte) y reste aussi, la rétrocompatibilité du
-- code continue donc de fonctionner telle quelle.
create table if not exists beneficiaires (
  id    text primary key,
  data  jsonb not null,
  nom   text generated always as (data->>'nom') stored
);
create index if not exists beneficiaires_nom_idx on beneficiaires (nom);

-- Configuration du projet : sigle, entêtes d'impression, logos.
-- Un unique document, d'identifiant 'projet'. Accédé par
-- doc(db, 'parametres', 'projet') et non via collection(), ce qui l'avait
-- fait manquer au premier inventaire des collections.
create table if not exists parametres (
  id    text primary key,
  data  jsonb not null
);

-- ---------- Budget ----------

-- `lignes` est le tableau des lignes dotées de la version : il reste dans
-- data, et garde son ordre — ce qui préserve le tri par code déjà en place.
create table if not exists budgets (
  id           text primary key,
  data         jsonb not null,
  source_id    text generated always as (data->>'sourceId') stored,
  exercice_id  text generated always as (data->>'exerciceId') stored,
  version      int  generated always as ((data->>'version')::int) stored
);
create index if not exists budgets_portee_idx on budgets (source_id, exercice_id, version desc);

-- ---------- Ordres de paiement ----------

-- `paiements` (les règlements partiels) reste dans data.
create table if not exists ops (
  id                text primary key,
  data              jsonb not null,
  numero            text generated always as (data->>'numero') stored,
  source_id         text generated always as (data->>'sourceId') stored,
  exercice_id       text generated always as (data->>'exerciceId') stored,
  statut            text generated always as (data->>'statut') stored,
  ligne_budgetaire  text generated always as (data->>'ligneBudgetaire') stored,
  beneficiaire_id   text generated always as (data->>'beneficiaireId') stored,
  cree_par          text generated always as (data->>'creePar') stored,
  supprime_par      text generated always as (data->>'supprimePar') stored
);

-- L'index qui compte : c'est exactement la requête à trois filtres de la
-- création d'OP (source + exercice + ligne), celle qui relit les
-- engagements avant d'autoriser une saisie.
create index if not exists ops_engagements_idx on ops (source_id, exercice_id, ligne_budgetaire);
create index if not exists ops_statut_idx      on ops (source_id, exercice_id, statut);
create index if not exists ops_numero_idx      on ops (numero);

create table if not exists bordereaux (
  id           text primary key,
  data         jsonb not null,
  source_id    text generated always as (data->>'sourceId') stored,
  exercice_id  text generated always as (data->>'exerciceId') stored,
  numero       text generated always as (data->>'numero') stored
);
create index if not exists bordereaux_portee_idx on bordereaux (source_id, exercice_id);

-- ---------- Journal et utilisateurs ----------

create table if not exists journal (
  id    text primary key,
  data  jsonb not null,
  date  text generated always as (data->>'date') stored,
  op_id text generated always as (data->>'opId') stored
);
create index if not exists journal_date_idx on journal (date desc);

-- `id` = l'identifiant du compte (uid Firebase aujourd'hui, uid Supabase
-- demain). Le document users n'a jamais contenu de mot de passe : ceux-ci
-- sont gérés par le service d'authentification, pas par la base.
create table if not exists users (
  id    text primary key,
  data  jsonb not null,
  email text generated always as (data->>'email') stored,
  role  text generated always as (data->>'role') stored,
  actif bool generated always as ((data->>'actif')::bool) stored
);
create unique index if not exists users_email_idx on users (email);

-- ---------- Compteurs de numérotation ----------

-- Firestore utilisait un document compteur par (type, source, exercice).
--
-- Cette table suit la MÊME règle que toutes les autres : le document part
-- entier dans `data`. C'était au départ une table à colonnes réelles, par
-- goût ; l'interprète aurait alors eu besoin d'une exception pour elle
-- seule — exactement le genre d'exception qu'on finit par oublier. Une
-- seule règle pour toute la base.
--
-- L'atomicité de la numérotation ne vient pas de la forme de la table mais
-- du verrou de ligne posé par ON CONFLICT dans attribuer_numero().
create table if not exists compteurs (
  id    text primary key,
  data  jsonb not null default '{}'::jsonb,
  count int generated always as ((data->>'count')::int) stored
);

-- Ajouté après inventaire des filtres : l'application interroge aussi
-- importAnterieur (les OP rattachés à un exercice antérieur).
alter table ops add column if not exists import_anterieur bool
  generated always as ((data->>'importAnterieur')::bool) stored;
create index if not exists ops_import_anterieur_idx on ops (import_anterieur) where import_anterieur;

-- ============================================================
--  Empreintes — pour les transactions optimistes
-- ============================================================
--
--  runTransaction de Firestore relit les documents qu'il a lus au moment
--  de valider : si l'un a changé entre-temps, la transaction recommence.
--  C'est ce qui empêche deux paiements simultanés de s'écraser.
--
--  Pour rendre la même garantie, l'interprète a besoin de savoir si un
--  document a changé. Cette colonne calculée le dit : elle est recalculée
--  par PostgreSQL à chaque écriture, et la représentation texte d'un jsonb
--  est normalisée (clés triées), donc l'empreinte est stable.
--
--  Elle n'est jamais écrite ni lue par les pages : seul src/db.js s'en
--  sert, à l'intérieur d'une transaction.
-- ============================================================

alter table sources            add column if not exists empreinte text generated always as (md5(data::text)) stored;
alter table exercices          add column if not exists empreinte text generated always as (md5(data::text)) stored;
alter table lignes_budgetaires add column if not exists empreinte text generated always as (md5(data::text)) stored;
alter table beneficiaires      add column if not exists empreinte text generated always as (md5(data::text)) stored;
alter table budgets            add column if not exists empreinte text generated always as (md5(data::text)) stored;
alter table ops                add column if not exists empreinte text generated always as (md5(data::text)) stored;
alter table bordereaux         add column if not exists empreinte text generated always as (md5(data::text)) stored;
alter table journal            add column if not exists empreinte text generated always as (md5(data::text)) stored;
alter table users              add column if not exists empreinte text generated always as (md5(data::text)) stored;
alter table compteurs          add column if not exists empreinte text generated always as (md5(data::text)) stored;
alter table parametres         add column if not exists empreinte text generated always as (md5(data::text)) stored;

-- ============================================================
--  TEMPS RÉEL — à activer table par table
-- ============================================================
--
--  ⚠️ CECI N'EST PAS OPTIONNEL, et c'est un piège silencieux.
--
--  Chez Supabase, aucune table n'émet d'événement par défaut : la
--  publication supabase_realtime est VIDE à la création du projet. Sans
--  les lignes ci-dessous, onSnapshot livre bien la liste au chargement —
--  donc tout a l'air de fonctionner — mais ne la relivre JAMAIS ensuite.
--
--  L'application semblerait correcte jusqu'au jour où deux personnes
--  travaillent en même temps et ne verraient pas les saisies l'une de
--  l'autre. Défaut trouvé par l'essai bout en bout, invisible autrement.
--
--  Seules les deux tables écoutées par AppContext sont inscrites. Les
--  inscrire toutes ferait diffuser chaque écriture à tous les
--  navigateurs connectés, sans que personne l'écoute.
-- ============================================================

do $$
declare
  t text;
begin
  -- La publication n'existe que dans un vrai Supabase ; sur un PostgreSQL
  -- ordinaire (base d'essai locale), il n'y a rien à faire.
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    raise notice 'Publication supabase_realtime absente : temps réel non applicable ici.';
    return;
  end if;

  foreach t in array array['ops', 'bordereaux']
  loop
    if not exists (
      select 1 from pg_publication_tables
       where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
      raise notice 'Temps réel activé sur %', t;
    end if;
  end loop;
end
$$;
