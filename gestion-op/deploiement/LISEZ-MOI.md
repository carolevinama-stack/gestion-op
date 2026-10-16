# Déposer Gestion-OP sur l'hébergement du projet

Ce dossier contient ce qu'il faut pour installer l'application sur un
hébergement fourni par le projet, quel qu'il soit.

---

## Ce qu'on dépose

**Pas le code source** — le contenu du dossier `build/`.

L'application est écrite en React : le navigateur ne sait pas lire ce
code tel quel, il faut d'abord le *compiler*. La compilation produit le
dossier `build/`, qui contient un `index.html` et des fichiers de script.
**C'est ce dossier, et lui seul, qui est déposé sur le serveur.**

```
npm run build        →  build/   →  à déposer à la racine du site
```

---

## ⚠️ Le point qu'on oublie toujours : les clés

Les clés Firebase ne sont **pas** lues au moment où un collègue ouvre
l'application. Elles sont **inscrites dans les fichiers au moment de la
compilation**.

Conséquence : il faut compiler avec les bonnes clés *avant* de déposer.
Déposer un `build/` compilé sans clés donne une application qui s'ouvre
et ne se connecte à rien.

Un hébergement mutualisé ne sait pas compiler. La compilation se fait
donc ailleurs — sur un poste, ou ici — et c'est le résultat qu'on envoie.

---

## Quel fichier de configuration utiliser

Cela dépend de l'accès que le projet fournit. Inutile de demander : les
identifiants reçus suffisent à trancher.

| Ce que le projet envoie | Type d'hébergement | Fichier à utiliser |
|---|---|---|
| Identifiants **FTP**, lien **cPanel** ou **Plesk** | mutualisé | `.htaccess` |
| **Clé SSH**, une **adresse IP**, « votre VM est prête » | serveur Linux | `nginx.conf` |

Dans le doute, déposer `.htaccess` : sur un serveur qui ne s'en sert pas,
il est simplement ignoré. Il ne casse rien.

---

## Pourquoi un fichier de configuration est obligatoire

L'application n'a qu'une seule page réelle : `index.html`. Les écrans
sont affichés par le navigateur, pas par le serveur.

Sans configuration, **appuyer sur F5 renvoie une erreur 404** : le
serveur cherche un fichier « budget » ou « rapport » qui n'existe pas.
Les deux fichiers de ce dossier corrigent cela, chacun dans sa langue.
C'est exactement ce que fait déjà la section `rewrites` de `vercel.json`.

---

## Et la base de données ?

**Elle ne bouge pas.** Elle reste là où elle est, et l'application
continue de s'y connecter depuis le serveur du projet — comme elle le
fait aujourd'hui depuis Vercel.

Héberger le site et héberger les données sont deux choses distinctes.
Si le projet demande aussi que les données soient sur ses machines,
c'est un autre chantier : voir la branche `essai-supabase`.

---

## ⚠️ Le piège du sous-dossier

Vérifié sur le build actuel : les fichiers sont appelés depuis la racine
du domaine.

```html
<script src="/static/js/main.a5b5f705.js">
```

Donc :

| Adresse fournie par le projet | Résultat |
|---|---|
| `https://apps.projet.org/` | ✅ fonctionne tel quel |
| `https://apps.projet.org/gestion-op/` | 🚫 **page blanche** |

Dans le second cas, le navigateur cherche les scripts à la racine du
domaine, où il n'y a rien. L'application s'ouvre vide, sans message
d'erreur — ce qui rend la panne difficile à comprendre.

**La correction**, avant de compiler : ajouter une ligne dans
`package.json`

```json
"homepage": ".",
```

puis recompiler. Les chemins deviennent relatifs et fonctionnent dans
n'importe quel sous-dossier. Cette ligne est sans effet sur Vercel, où le
site est déjà à la racine : elle ne casse donc pas le déploiement actuel.

**À demander, et c'est une question anodine :** « à quelle adresse exacte
le site sera-t-il visible ? » Cette seule réponse suffit à savoir s'il
faut ajouter la ligne.
