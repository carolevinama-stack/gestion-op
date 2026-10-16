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
