-- ============================================================
--  RÈGLES DE SÉCURITÉ (Row Level Security)
--  Traduction de firestore.rules
-- ============================================================
--
--  ⚠️ CE FICHIER N'EST PAS UNE FINITION.
--
--  Sans lui, la base Supabase est OUVERTE : la clé « anon » est publique
--  par construction — elle est dans le code envoyé à chaque navigateur —
--  et n'importe qui pourrait lire et écrire. Ce sont ces règles, et elles
--  seules, qui protègent les données. Exactement comme firestore.rules
--  aujourd'hui.
--
--  PRINCIPE REPRIS DE firestore.rules : être authentifié NE SUFFIT PAS.
--  L'inscription étant ouverte, n'importe qui peut créer un compte de
--  connexion. L'accès aux données exige un profil créé par un
--  administrateur ET encore actif.
-- ============================================================


-- ============================================================
--  FONCTIONS D'ACCÈS
-- ============================================================
--
--  SECURITY DEFINER est indispensable : ces fonctions lisent la table
--  users, qui est elle-même protégée par ces règles. Sans cela, vérifier
--  un droit déclencherait la vérification du droit de vérifier, à
--  l'infini — PostgreSQL rejette la requête.
--
--  search_path est figé : sans cela, quelqu'un pourrait créer une table
--  « users » dans un autre schéma et la faire consulter à sa place.
-- ============================================================

-- Le champ `actif` peut être absent des comptes créés avant son
-- introduction, ou créés directement dans la console. Absent vaut ACTIF ;
-- seul un false explicite retire l'accès. Même règle que la version
-- Firestore, où get('actif', true) levait la même ambiguïté.
create or replace function est_connecte() returns boolean
language sql stable security definer set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.users u
     where u.id = auth.uid()::text
       and coalesce((u.data->>'actif')::boolean, true) <> false
  );
$$;

create or replace function role_utilisateur() returns text
language sql stable security definer set search_path = public, pg_temp
as $$
  select u.data->>'role' from public.users u where u.id = auth.uid()::text;
$$;

create or replace function est_admin() returns boolean
language sql stable security definer set search_path = public, pg_temp
as $$
  select est_connecte() and role_utilisateur() = 'ADMIN';
$$;

create or replace function est_operateur() returns boolean
language sql stable security definer set search_path = public, pg_temp
as $$
  select est_connecte()
     and role_utilisateur() in ('ADMIN', 'OPERATEUR', 'SAISIE', 'CF', 'AC');
$$;


-- ============================================================
--  DROITS DE BASE
-- ============================================================
--
--  Deux niveaux, à ne pas confondre :
--    GRANT dit qui peut s'adresser à la table ;
--    les règles ci-dessous disent quelles LIGNES il voit.
--
--  Rien n'est accordé à `anon` — le visiteur non connecté. Les règles
--  Firestore exigeaient l'authentification partout : on fait pareil, et
--  dès le premier niveau.
-- ============================================================

grant usage on schema public to authenticated;

grant select, insert, update, delete on
  sources, exercices, lignes_budgetaires, beneficiaires, budgets,
  ops, bordereaux, journal, users, compteurs, parametres
  to authenticated;

grant execute on function est_connecte, role_utilisateur, est_admin, est_operateur
  to authenticated;
grant execute on function maj_document, ecrire_lot, ecrire_lot_si_inchange,
                          attribuer_numero
  to authenticated;

revoke all on
  sources, exercices, lignes_budgetaires, beneficiaires, budgets,
  ops, bordereaux, journal, users, compteurs, parametres
  from anon;


-- ============================================================
--  ACTIVATION
-- ============================================================
--  Tant que RLS n'est pas activé sur une table, elle est entièrement
--  ouverte à qui a le GRANT. L'oubli d'une seule table suffit à exposer
--  la base.

alter table sources            enable row level security;
alter table exercices          enable row level security;
alter table lignes_budgetaires enable row level security;
alter table beneficiaires      enable row level security;
alter table budgets            enable row level security;
alter table ops                enable row level security;
alter table bordereaux         enable row level security;
alter table journal            enable row level security;
alter table users              enable row level security;
alter table compteurs          enable row level security;
alter table parametres         enable row level security;


-- ============================================================
--  users — gestion des comptes
-- ============================================================
--  Chacun lit son propre profil ; l'ADMIN lit tout l'annuaire.
--  Seul un ADMIN crée un profil : plus personne ne peut se fabriquer un
--  rôle en contournant l'application.
-- ============================================================

drop policy if exists users_lecture on users;
-- Volontairement fondée sur auth.uid() et non sur est_connecte() : lire
-- son propre profil est justement l'étape qui permet d'évaluer les autres
-- règles. Même raison que dans firestore.rules.
create policy users_lecture on users for select to authenticated
  using (auth.uid()::text = id or est_admin());

drop policy if exists users_creation on users;
create policy users_creation on users for insert to authenticated
  with check (est_admin());

drop policy if exists users_modification on users;
-- Un utilisateur peut corriger son propre profil. Qu'il ne puisse pas
-- changer son rôle ni se réactiver est garanti par le déclencheur plus
-- bas : une règle ne peut pas comparer l'avant et l'après dans une même
-- expression.
create policy users_modification on users for update to authenticated
  using (est_admin() or auth.uid()::text = id)
  with check (est_admin() or auth.uid()::text = id);

drop policy if exists users_suppression on users;
create policy users_suppression on users for delete to authenticated
  using (est_admin());


-- ============================================================
--  Interdire l'auto-promotion
-- ============================================================
--  Sans ceci, un utilisateur modifiant son propre profil pourrait se
--  donner le rôle ADMIN, ou se réactiver après avoir été désactivé.
--  Une règle RLS ne voit pas l'ancienne et la nouvelle valeur dans la
--  même expression : il faut un déclencheur.

create or replace function interdire_auto_promotion() returns trigger
language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  if est_admin() then
    return new;   -- un administrateur a le droit de tout changer
  end if;

  if coalesce(new.data->>'role', '') is distinct from coalesce(old.data->>'role', '') then
    raise exception 'Vous ne pouvez pas changer votre propre rôle.';
  end if;

  if coalesce(new.data->>'actif', '') is distinct from coalesce(old.data->>'actif', '') then
    raise exception 'Vous ne pouvez pas changer votre propre statut.';
  end if;

  return new;
end
$$;

drop trigger if exists users_pas_d_auto_promotion on users;
create trigger users_pas_d_auto_promotion
  before update on users
  for each row execute function interdire_auto_promotion();


-- ============================================================
--  parametres — configuration du projet
--  Tout utilisateur autorisé lit ; seul un ADMIN modifie.
-- ============================================================

drop policy if exists parametres_lecture on parametres;
create policy parametres_lecture on parametres for select to authenticated
  using (est_connecte());

drop policy if exists parametres_ecriture on parametres;
create policy parametres_ecriture on parametres for all to authenticated
  using (est_admin()) with check (est_admin());


-- ============================================================
--  Configuration budgétaire et données métier
--  Lecture : tout utilisateur autorisé. Écriture : opérateur et au-delà.
-- ============================================================

drop policy if exists sources_lecture on sources;
create policy sources_lecture on sources for select to authenticated using (est_connecte());
drop policy if exists sources_ecriture on sources;
create policy sources_ecriture on sources for all to authenticated
  using (est_operateur()) with check (est_operateur());

drop policy if exists exercices_lecture on exercices;
create policy exercices_lecture on exercices for select to authenticated using (est_connecte());
drop policy if exists exercices_ecriture on exercices;
create policy exercices_ecriture on exercices for all to authenticated
  using (est_operateur()) with check (est_operateur());

drop policy if exists lignes_lecture on lignes_budgetaires;
create policy lignes_lecture on lignes_budgetaires for select to authenticated using (est_connecte());
drop policy if exists lignes_ecriture on lignes_budgetaires;
create policy lignes_ecriture on lignes_budgetaires for all to authenticated
  using (est_operateur()) with check (est_operateur());

drop policy if exists beneficiaires_lecture on beneficiaires;
create policy beneficiaires_lecture on beneficiaires for select to authenticated using (est_connecte());
drop policy if exists beneficiaires_ecriture on beneficiaires;
create policy beneficiaires_ecriture on beneficiaires for all to authenticated
  using (est_operateur()) with check (est_operateur());

drop policy if exists budgets_lecture on budgets;
create policy budgets_lecture on budgets for select to authenticated using (est_connecte());
drop policy if exists budgets_ecriture on budgets;
create policy budgets_ecriture on budgets for all to authenticated
  using (est_operateur()) with check (est_operateur());

drop policy if exists bordereaux_lecture on bordereaux;
create policy bordereaux_lecture on bordereaux for select to authenticated using (est_connecte());
drop policy if exists bordereaux_ecriture on bordereaux;
-- La suppression reste autorisée : les circuits CF et AC s'en servent pour
-- annuler un bordereau non transmis.
create policy bordereaux_ecriture on bordereaux for all to authenticated
  using (est_operateur()) with check (est_operateur());

drop policy if exists compteurs_lecture on compteurs;
create policy compteurs_lecture on compteurs for select to authenticated using (est_connecte());
drop policy if exists compteurs_ecriture on compteurs;
create policy compteurs_ecriture on compteurs for all to authenticated
  using (est_operateur()) with check (est_operateur());


-- ============================================================
--  ops — ordres de paiement
-- ============================================================
--  ⚠️ LA SUPPRESSION DÉFINITIVE EST INTERDITE.
--
--  L'application n'efface jamais un OP : elle le passe au statut SUPPRIME
--  (corbeille). Ne créer AUCUNE règle de suppression interdit donc
--  d'effacer un OP, même à un administrateur, même en passant hors de
--  l'application. C'est ce qui garantit que la corbeille et le journal ne
--  peuvent pas être contournés.
--
--  Noter que c'est l'ABSENCE de règle qui protège : sous RLS, ce qui n'est
--  pas autorisé est refusé. Ajouter une règle de suppression « au cas où »
--  romprait cette garantie.
-- ============================================================

drop policy if exists ops_lecture on ops;
create policy ops_lecture on ops for select to authenticated using (est_connecte());

drop policy if exists ops_creation on ops;
create policy ops_creation on ops for insert to authenticated with check (est_operateur());

drop policy if exists ops_modification on ops;
create policy ops_modification on ops for update to authenticated
  using (est_operateur()) with check (est_operateur());

-- Aucune règle de suppression : volontaire. Voir ci-dessus.


-- ============================================================
--  journal — historique des actions
-- ============================================================
--  Seul un ADMIN consulte. ADMIN et OPERATEUR ajoutent une entrée.
--  Personne ne modifie ni ne supprime : un journal modifiable ne prouve
--  rien. Là encore, c'est l'absence de règle qui protège.
-- ============================================================

drop policy if exists journal_lecture on journal;
create policy journal_lecture on journal for select to authenticated using (est_admin());

drop policy if exists journal_ajout on journal;
create policy journal_ajout on journal for insert to authenticated with check (est_operateur());

-- Aucune règle de modification ni de suppression : volontaire.
