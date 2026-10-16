# Migration Gestion-OP : Firebase → Supabase

État de la branche `essai-supabase`. **Éprouvé contre un vrai Supabase :
24 vérifications bout en bout, toutes au vert.**

---

## Ce qui est fait

| | |
|---|---|
| Fichiers migrés | **17 / 17** |
| Firebase dans le code | **aucune ligne** (dépendance retirée) |
| Tests de logique métier | **418 verts**, aucune assertion modifiée |
| Vérifications de droits | **119**, zéro écart avec `firestore.rules` |
| **Essai bout en bout, vrai Supabase** | **24 / 24** |

L'essai bout en bout a tourné contre un Supabase complet — PostgreSQL 17,
PostgREST, authentification, temps réel — avec de vrais comptes et le vrai
code de l'application, par le réseau. Il a vérifié la connexion,
l'alternative `or()` du chargement, la fusion de `updateDoc`, un lot à
cheval sur deux tables, son annulation complète quand un OP manque, les
transactions sous 20 écritures simultanées, les six règles d'accès, et le
temps réel.

## Ce qui reste

1. **La création de comptes** si les inscriptions sont fermées dans le
   projet Supabase — voir « Le seul point qui peut exiger un serveur ».
2. **L'essai par les utilisatrices**, sur écran, avec de vraies saisies.
   Aucun script ne remplace ça.

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
| `scripts/essai-bout-en-bout.mjs` | **épreuve contre un vrai Supabase** |
| `scripts/preparer-supabase-local.mjs` | comptes + données pour l'essai |

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

### 3. ⚠️ Activer le temps réel, table par table

**C'est le piège le plus dangereux de toute la migration.**

Chez Supabase, aucune table n'émet d'événement par défaut : la publication
`supabase_realtime` est **vide** à la création du projet. Sans activation,
`onSnapshot` livre bien la liste au chargement — donc **tout a l'air de
fonctionner** — mais ne la relivre jamais ensuite.

L'application paraîtrait correcte jusqu'au jour où deux personnes
travaillent en même temps et ne verraient pas les saisies l'une de
l'autre.

`schema.sql` inscrit `ops` et `bordereaux` (les deux tables écoutées).
**Après cela, le service Realtime doit redémarrer pour en tenir compte** —
sur Supabase hébergé, l'activation depuis le tableau de bord le fait
d'elle-même ; appliquée en SQL, il faut relancer le service ou patienter.

Ce défaut a été trouvé par l'essai bout en bout. Aucun autre test ne
pouvait le voir.

### 4. Vérifier les droits et le dialogue

Avant toute donnée réelle, remplir avec les données fictives et éprouver :

```bash
node scripts/cloner-vers-postgres.mjs --fictif --vider
node scripts/essai-securite.mjs       # doit afficher 0 fuite, 0 panne
node scripts/essai-concurrence.mjs    # doit afficher 20/20
node scripts/essai-bout-en-bout.mjs   # doit afficher 24/24
```

Le dernier exerce le vrai code de l'application contre le vrai serveur.
C'est celui qui compte le plus : il éprouve ce qu'aucune doublure ne peut
éprouver.

### 5. Les variables d'environnement

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

### 6. Les comptes

Les mots de passe ne se migrent pas : ils sont chez le service
d'authentification, sous forme non réversible. Chaque personne recevra un
courriel de réinitialisation.

Les profils (`users`), eux, se clonent — mais **l'identifiant de chaque
profil doit être celui du nouveau compte Supabase**, pas l'ancien
identifiant Firebase. C'est le seul endroit du clonage où les
identifiants changent, et il faut le traiter à part.

### 7. Les données

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
