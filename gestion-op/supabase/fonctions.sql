-- ============================================================
--  Numérotation des OP — remplace runTransaction de Firestore
-- ============================================================
--
--  Ce que faisait Firestore : lire le compteur, l'incrémenter, l'écrire,
--  le tout dans une transaction qui recommence en cas de conflit.
--
--  Ici, une seule instruction fait tout : INSERT ... ON CONFLICT DO UPDATE
--  pose un verrou sur la ligne du compteur. Deux saisies simultanées sont
--  servies l'une après l'autre, jamais en même temps. Aucun numéro ne peut
--  sortir deux fois, et aucune ne peut échouer faute de place.
--
--  IMPORTANT — ce que cette fonction ne fait PAS :
--  elle ne vérifie pas le budget. Le contrôle de disponibilité reste en
--  JavaScript, dans utils/opCalculs.js, là où il est testé. Dupliquer ce
--  calcul en SQL serait le meilleur moyen de le voir dériver entre les
--  deux. La garantie est donc exactement celle d'aujourd'hui : compteur
--  atomique, contrôle budgétaire relu juste avant.
--
--  p_init : la valeur de départ si le compteur n'existe pas encore,
--  calculée par maxNumeroExistant() côté application, comme aujourd'hui.
-- ============================================================

create or replace function attribuer_numero(
  p_compteur_id  text,
  p_type         text,
  p_source       text,
  p_exercice     text,
  p_init         int default 0
) returns int
language plpgsql
as $$
declare
  v_count int;
begin
  insert into compteurs (id, count, type, source_id, exercice_id, updated_at)
  values (p_compteur_id, p_init + 1, p_type, p_source, p_exercice, now())
  on conflict (id) do update
    set count      = compteurs.count + 1,
        updated_at = now()
  returning count into v_count;

  return v_count;
end
$$;

-- ============================================================
--  maj_document — remplace updateDoc de Firestore
-- ============================================================
--
--  updateDoc FUSIONNE les champs fournis avec le document existant : il
--  ne le remplace pas. L'opérateur || de jsonb fait exactement cela, et
--  en une seule instruction — donc sans relire le document avant, donc
--  sans risque qu'une modification simultanée soit écrasée.
--
--  La liste des tables est fermée : une table non prévue est refusée,
--  pas devinée.
-- ============================================================

create or replace function maj_document(
  p_table  text,
  p_id     text,
  p_patch  jsonb
) returns void
language plpgsql
as $$
begin
  if p_table not in ('sources','exercices','lignes_budgetaires','beneficiaires',
                     'budgets','ops','bordereaux','journal','users') then
    raise exception 'Table non autorisée : %', p_table;
  end if;

  execute format('update %I set data = data || $2 where id = $1', p_table)
    using p_id, p_patch;
end
$$;

-- ============================================================
--  transmettre_bordereau — remplace le writeBatch de PageCircuitCF/AC
-- ============================================================
--
--  Ce lot écrit dans DEUX tables à la fois : le bordereau est créé et les
--  OP qu'il contient changent de statut. Les deux doivent réussir ou
--  échouer ensemble, sinon on obtient un bordereau transmis dont les OP
--  n'ont pas bougé — ou l'inverse.
--
--  Une fonction PostgreSQL est transactionnelle par nature : tout ce
--  qu'elle fait est validé d'un bloc, ou annulé d'un bloc.
-- ============================================================

create or replace function transmettre_bordereau(
  p_bordereau_id    text,
  p_bordereau_data  jsonb,
  p_op_ids          text[],
  p_patch_ops       jsonb
) returns void
language plpgsql
as $$
begin
  insert into bordereaux (id, data)
  values (p_bordereau_id, p_bordereau_data)
  on conflict (id) do update set data = excluded.data;

  update ops
     set data = data || p_patch_ops
   where id = any(p_op_ids);

  -- Garde-fou : si un OP du bordereau n'existe pas, on annule tout.
  if (select count(*) from ops where id = any(p_op_ids)) <> array_length(p_op_ids, 1) then
    raise exception 'Bordereau %: un ou plusieurs OP sont introuvables', p_bordereau_id;
  end if;
end
$$;
