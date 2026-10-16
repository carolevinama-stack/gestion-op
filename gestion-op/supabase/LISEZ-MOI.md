# Migration Gestion-OP : Firebase → Supabase

État de la branche `essai-supabase`. Tout est fait côté code ; il reste
une mise au point contre une vraie instance Supabase.

---

## Ce qui est fait

| | |
|---|---|
| Fichiers migrés | **17 / 17** |
| Firebase dans le code | **aucune ligne** (dépendance retirée) |
| Tests | **418 verts**, aucune assertion modifiée |
| Vérifications de droits | **119**, zéro écart avec `firestore.rules` |

## Ce qui reste

1. **Mise au point contre une vraie instance Supabase.** Tout a été
   éprouvé contre un vrai PostgreSQL, mais l'aller-retour par le réseau
   (PostgREST, temps réel, authentification) n'a pas pu l'être : le
   service Docker n'était pas disponible. Compter une journée.
2. **La création de comptes** si les inscriptions sont fermées dans le
   projet Supabase — voir « Le seul point qui peut exiger un serveur ».

---

## Les fichiers

| Fichier | Rôle |
|---|---|
| `supabase/schema.sql` | les 11 tables |
| `supabase/fonctions.sql` | numérotation, lots, transactions |
| `supabase/securite.sql` | **les règles d'accès — indispensables** |
| `supabase/essai-stub-auth.sql` | ⚠️ essai local uniquement |
| `src/db.js` | interprète Firestore → Supabase |
| `src/auth.js` | interprète Firebase Auth → Supabase Auth |
| `src/supabase.js` | connexion |
| `scripts/cloner-vers-postgres.mjs` | clonage des données |
| `scripts/donnees-fictives.mjs` | base de démonstration |
| `scripts/essai-concurrence.mjs` | épreuve des transactions |
| `scripts/essai-securite.mjs` | épreuve des droits |

---

## Le principe de conception

**Les documents restent des documents.** Chaque document part entier dans
une colonne `jsonb`, et seuls les champs sur lesquels l'application filtre
ou trie sont exposés en colonnes calculées, donc indexables.

Deux conséquences voulues :

- **aucun champ ne peut être perdu**, même un champ non inventorié ;
- l'application retrouve ses documents dans la forme exacte qu'elle
  connaît, donc **la logique métier n'est pas touchée**.

Et une règle tenue d'un bout à l'autre : **aucun calcul métier n'est
descendu en SQL.** PostgreSQL ne fournit que l'atomicité et les droits. Le
calcul du budget, le circuit CF/AC, le format des numéros, la règle du
statut après paiement restent dans `src/utils/` et dans les pages — là où
les 418 tests les vérifient.

---

## Marche à suivre pour la vraie migration

### 1. Créer le projet Supabase

⚠️ **La région se choisit à la création et ne se change plus.** Un
transfert entre organisations ne la change pas non plus.

Créer une **organisation dédiée** (par exemple « PIF2 ») : le jour du
transfert de propriété, il suffira d'ajouter le compte du projet comme
propriétaire de l'organisation et de se retirer.

### 2. Appliquer le schéma, dans cet ordre

```
supabase/schema.sql
supabase/fonctions.sql
supabase/securite.sql      ← ne pas l'oublier
```

**Ne jamais appliquer `essai-stub-auth.sql`** : il écraserait la vraie
fonction `auth.uid()` et casserait toute la sécurité.

### 3. Vérifier les droits

Avant toute donnée réelle, remplir avec les données fictives et éprouver :

```bash
node scripts/cloner-vers-postgres.mjs --fictif --vider
node scripts/essai-securite.mjs       # doit afficher 0 fuite, 0 panne
node scripts/essai-concurrence.mjs    # doit afficher 20/20
```

### 4. Les variables d'environnement

| Variable | Où la trouver |
|---|---|
| `REACT_APP_SUPABASE_URL` | Supabase → Settings → API |
| `REACT_APP_SUPABASE_ANON_KEY` | idem |

La clé « anon » est publique par construction : elle est dans le code
envoyé à chaque navigateur. **Ce ne sont pas les clés qui protègent les
données, ce sont les règles de `securite.sql`.**

⚠️ **La clé de service (`service_role`) ne doit JAMAIS se trouver dans le
navigateur, ni dans une variable `REACT_APP_*`** : elle contourne toutes
les règles.

### 5. Les comptes

Les mots de passe ne se migrent pas : ils sont chez le service
d'authentification, sous forme non réversible. Chaque personne recevra un
courriel de réinitialisation.

Les profils (`users`), eux, se clonent — mais **l'identifiant de chaque
profil doit être celui du nouveau compte Supabase**, pas l'ancien
identifiant Firebase. C'est le seul endroit du clonage où les
identifiants changent, et il faut le traiter à part.

### 6. Les données

```bash
# 1. Exporter depuis Firestore vers un dossier de fichiers JSON
# 2. Puis :
PG_URL="<url de la base Supabase>" \
  node scripts/cloner-vers-postgres.mjs --export <dossier> --vider
```

Le script recompte à la fin, collection par collection. Il distingue les
documents **perdus** (grave) des lignes préexistantes.

---

## Le seul point qui peut exiger un serveur

`PageAdmin` crée des comptes. Pour ne pas déconnecter l'administrateur en
place, `src/auth.js` utilise un second client dont la session n'est
mémorisée nulle part — l'équivalent exact de l'« application Firebase
secondaire » d'avant.

**Cela suppose que les inscriptions soient autorisées** (Authentication →
Sign Ups). Si elles sont fermées — ce qui est plus sûr pour une
application interne — la création devra passer par une fonction côté
serveur (Edge Function) vérifiant que l'appelant est bien ADMIN.

C'est le seul endroit de toute la migration où un morceau côté serveur
peut devenir nécessaire.

---

## Ce que la migration apporte en plus

**Le quota de lectures disparaît.** C'était la seule vraie limite de
longévité : le 9 septembre 2026, 65 000 lectures avaient bloqué les
saisies jusqu'au lendemain. PostgreSQL ne facture pas les lectures.

Mesures sur 20 230 OP — l'échelle attendue vers 2029 :

| | |
|---|---:|
| requête des engagements (source + exercice + ligne) | 1,2 ms |
| chargement au démarrage | 9,4 ms |
| agrégation du suivi budgétaire | 13,6 ms |

À noter pour plus tard, hors migration : l'agrégation du suivi budgétaire
peut renvoyer 39 lignes au lieu des 20 210 OP que `AppContext` charge
aujourd'hui. C'est la piste qui lèverait définitivement le plafond, mais
elle touche au chargement et sort d'une reprise fidèle.
