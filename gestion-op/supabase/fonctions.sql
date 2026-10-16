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
  insert into compteurs (id, data)
  values (
    p_compteur_id,
    jsonb_build_object(
      'count', p_init + 1, 'type', p_type,
      'sourceId', p_source, 'exerciceId', p_exercice,
      'updatedAt', to_char(now() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
    )
  )
  on conflict (id) do update
    set data = compteurs.data || jsonb_build_object(
          'count', coalesce((compteurs.data->>'count')::int, 0) + 1,
          'updatedAt', to_char(now() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
        )
  returning (data->>'count')::int into v_count;

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
--  ecrire_lot — remplace writeBatch de Firestore
-- ============================================================
--
--  writeBatch accumule des écritures puis les valide d'un bloc. Chez
--  Firestore le lot est atomique MÊME À CHEVAL SUR PLUSIEURS COLLECTIONS,
--  et l'application s'appuie là-dessus : créer un bordereau écrit dans
--  bordereaux ET dans ops. Séparé, on obtiendrait un bordereau transmis
--  dont les OP n'ont pas changé de statut.
--
--  Une fonction PostgreSQL est transactionnelle par nature : tout ce
--  qu'elle fait est validé d'un bloc, ou annulé d'un bloc. Elle rend donc
--  exactement la garantie de writeBatch, pour n'importe quel mélange de
--  tables.
--
--  C'est volontairement une fonction GÉNÉRIQUE et non une fonction par
--  opération métier (« transmettre un bordereau », « solder un OP »...).
--  Une fonction par opération recopierait les règles métier en SQL, où
--  elles dériveraient de celles du JavaScript. Ici, c'est l'application
--  qui décide QUOI écrire ; PostgreSQL ne fournit que l'atomicité.
--
--  p_operations : un tableau de { table, id, genre, data }
--    genre = 'set'        remplace le document (ou le crée)
--            'set_merge'  complète le document (ou le crée)   → setDoc(..., { merge: true })
--            'update'     complète un document EXISTANT       → updateDoc
--            'delete'     supprime le document
--
--  'update' échoue si le document n'existe pas, comme updateDoc chez
--  Firestore. Un lot qui visait un document disparu est ainsi refusé en
--  entier, au lieu d'être partiellement appliqué.
-- ============================================================

create or replace function ecrire_lot(p_operations jsonb) returns void
language plpgsql
as $$
declare
  op       jsonb;
  v_table  text;
  v_id     text;
  v_genre  text;
  v_data   jsonb;
  v_lignes int;
begin
  for op in select value from jsonb_array_elements(p_operations)
  loop
    v_table := op->>'table';
    v_id    := op->>'id';
    v_genre := op->>'genre';
    v_data  := coalesce(op->'data', '{}'::jsonb);

    if v_table not in ('sources','exercices','lignes_budgetaires','beneficiaires',
                       'budgets','ops','bordereaux','journal','users','compteurs') then
      raise exception 'Table non autorisée : %', v_table;
    end if;
    if v_id is null or v_id = '' then
      raise exception 'Opération sans identifiant (table %)', v_table;
    end if;

    if v_genre = 'set' then
      execute format(
        'insert into %I (id, data) values ($1, $2)
           on conflict (id) do update set data = excluded.data', v_table)
        using v_id, v_data;

    elsif v_genre = 'set_merge' then
      execute format(
        'insert into %I (id, data) values ($1, $2)
           on conflict (id) do update set data = %I.data || $2', v_table, v_table)
        using v_id, v_data;

    elsif v_genre = 'update' then
      execute format('update %I set data = data || $2 where id = $1', v_table)
        using v_id, v_data;
      get diagnostics v_lignes = row_count;
      if v_lignes = 0 then
        raise exception 'Document introuvable : %.% — le lot est annulé', v_table, v_id;
      end if;

    elsif v_genre = 'delete' then
      execute format('delete from %I where id = $1', v_table) using v_id;

    else
      raise exception 'Genre d''opération inconnu : %', v_genre;
    end if;
  end loop;
end
$$;

-- ============================================================
--  ecrire_lot_si_inchange — remplace runTransaction de Firestore
-- ============================================================
--
--  runTransaction lit des documents, calcule, puis écrit — et recommence
--  si l'un des documents lus a changé entre-temps. C'est ce qui garantit
--  qu'un paiement concurrent n'écrase pas l'autre, et qu'un numéro d'OP
--  n'est pas attribué deux fois.
--
--  Cette fonction en est l'exact équivalent, en une seule transaction :
--
--    1. elle verrouille les documents lus et vérifie leur empreinte ;
--    2. si l'une a changé, elle n'écrit RIEN et renvoie false — à charge
--       de l'interprète de rejouer le calcul ;
--    3. sinon elle applique le lot et renvoie true.
--
--  Aucune règle métier ici : le calcul reste en JavaScript, dans les
--  pages et dans utils/. PostgreSQL ne fournit que la garantie.
--
--  p_lectures : [{ table, id, empreinte }]  — empreinte null = le document
--               n'existait pas au moment de la lecture.
-- ============================================================

create or replace function ecrire_lot_si_inchange(
  p_lectures   jsonb,
  p_operations jsonb
) returns boolean
language plpgsql
as $$
declare
  lec        jsonb;
  v_table    text;
  v_id       text;
  v_attendue text;
  v_actuelle text;
begin
  for lec in select value from jsonb_array_elements(coalesce(p_lectures, '[]'::jsonb))
  loop
    v_table    := lec->>'table';
    v_id       := lec->>'id';
    v_attendue := lec->>'empreinte';

    if v_table not in ('sources','exercices','lignes_budgetaires','beneficiaires',
                       'budgets','ops','bordereaux','journal','users','compteurs') then
      raise exception 'Table non autorisée : %', v_table;
    end if;

    -- for update : le document est verrouillé jusqu'à la fin de la
    -- transaction, donc personne ne peut le modifier entre la
    -- vérification et l'écriture.
    execute format('select empreinte from %I where id = $1 for update', v_table)
      into v_actuelle using v_id;

    if coalesce(v_actuelle, '') <> coalesce(v_attendue, '') then
      return false;   -- quelqu'un est passé avant : rien n'est écrit
    end if;
  end loop;

  perform ecrire_lot(p_operations);
  return true;
end
$$;
