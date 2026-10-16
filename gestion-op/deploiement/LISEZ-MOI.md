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

## À quoi sert le fichier de configuration

L'application n'a qu'une seule page réelle : `index.html`. Les écrans
sont affichés par le navigateur, pas par le serveur.

**Correction de ce que j'avais écrit ici d'abord** : je disais que sans
configuration, F5 renverrait une erreur 404. C'est faux pour cette
application — je l'ai vérifié. Elle n'utilise **aucun routeur** : les
écrans changent par l'état interne de React et l'adresse ne quitte jamais
la racine. F5 recharge donc toujours la racine, configuration ou non.

Le fichier reste utile comme **filet de sécurité** — adresse mal tapée,
favori périmé — et pour rester aligné sur la section `rewrites` de
`vercel.json`. Mais ce n'est pas lui qui empêche l'application de
tomber en panne.

### Les deux configurations sont éprouvées

Elles ont été testées contre de vrais serveurs, pas seulement écrites :

| | nginx | Apache |
|---|---|---|
| `/budget`, `/circuitCF` servent l'application | ✅ | ✅ |
| Script compilé mis en cache un an | ✅ | ✅ |
| `index.html` jamais mis en cache | ✅ | ✅ |
| Dépôt dans un sous-dossier | ✅ | variante documentée |

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

Le cas du sous-dossier a été vérifié : avec `"homepage": "."` et la
variante de configuration documentée en bas de `nginx.conf` ou de
`.htaccess`, tout répond correctement.

Et `"homepage": "."` est sans danger ici précisément parce que
l'application n'a pas de routeur : l'adresse reste toujours la racine du
dossier, donc les chemins relatifs ne peuvent pas se perdre.

---

## ⚠️ Un défaut à corriger, indépendant de l'hébergement

`public/index.html` et `public/manifest.json` réclament trois fichiers
qui **n'existent pas** dans le dépôt :

```
favicon.ico      logo192.png      logo512.png
```

Seul `logo-pif2.jpg` est présent.

Conséquences, déjà visibles en production : l'onglet du navigateur
n'affiche aucune icône, « ajouter à l'écran d'accueil » sur un téléphone
n'en afficherait pas non plus, et chaque ouverture fait une requête
inutile pour `/favicon.ico` qui renvoie la page entière.

C'est sans gravité, mais à régler un jour : soit en produisant les trois
icônes à partir de `logo-pif2.jpg`, soit en retirant les références
mortes.
