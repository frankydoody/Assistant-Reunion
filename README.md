# INF 5114 — Assistant de planification de réunions pour PME

> Projet en cours : application complète en mode démo; connecteurs Google et Microsoft à venir.

Projet universitaire (INF 5114), 100 % autonome : l'assistant surveille les courriels entrants d'un utilisateur, détecte avec Gemini ceux qui demandent une réunion, trouve un créneau libre dans les calendriers de la PME, ajoute le rendez-vous et envoie l'invitation à tous les participants.

## Règle no 1 : rester petit

- Produit final à remettre à la semaine 11.
- Toute fonctionnalité qui n'est pas dans la portée ci-dessous est refusée par défaut.

## Portée

1. Voir les courriels entrants d'un utilisateur et lire chaque nouveau courriel.
2. Détecter si le courriel demande une réunion (Gemini).
3. Extraire sujet, participants, durée et contraintes de date (Gemini, sortie JSON).
4. Trouver le premier créneau commun libre (4 à 5 utilisateurs, code déterministe).
5. Après confirmation, ajouter le rendez-vous au calendrier et envoyer l'invitation à tous les participants.
6. À la confirmation, l'utilisateur choisit le suivi automatique ou manuel pour cette réunion. En automatique, l'assistant traite les réponses (acceptation, refus, demande de déplacement) et replanifie au besoin, deux fois au maximum.

Hors portée : vraies boîtes de réception et vrais calendriers (facultatifs, possibles plus tard), réunions récurrentes, pièces jointes, voix, images, tout ce qui se passe après la réunion.

## Données

Tout est fictif : une boîte de réception de 30 courriels (20 demandes de réunion, 10 sans rapport), 10 réponses de participants et les calendriers de 5 employés inventés. Aucune donnée réelle n'est envoyée à Gemini.

## Métriques de succès (sur les 30 courriels)

- Au moins 90 % des courriels bien classés (réunion ou non)
- Au moins 85 % des champs extraits correctement
- Au moins 90 % des réponses de participants bien interprétées
- 100 % des créneaux retenus sans conflit
- Moins de 30 secondes par courriel

## Échéances

| Semaine | Livrable |
|---|---|
| 4 | Plan de projet documenté (Travail 1) |
| 7 | Rapport de mi-parcours |
| 11 | Produit final |

## Structure

- `Documentations/` — livrables du cours, `journal-de-bord.md` et `architecture.md`
- `Projet/src/` — serveur (Node.js, TypeScript)
- `Projet/web/` — tableau de bord (React, TypeScript), construit dans `Projet/public/`
- `Projet/donnees/` — données fictives : boîte de réception, calendriers et réponses de participants
- `Projet/resultats/` — résultats des évaluations de Gemini

## Démarrage

Prérequis : Node.js 20 ou plus récent.

```
cd Projet
npm install
copy .env.example .env      (puis mettre la clé Gemini dans .env)
npm run demarrer
```

Le navigateur s'ouvre sur http://localhost:3100. Choisir **Essayer la démo, sans compte** : l'assistant lit aussitôt les 30 courriels de la PME fictive et propose les réunions. Les connexions Google et Microsoft sont prévues, mais pas encore réalisées.

**Installer l'application :** dans Chrome ou Edge, menu ⋮, puis « Installer l'application ». Elle s'ouvre ensuite dans sa propre fenêtre, comme un logiciel (le serveur doit être démarré).

Sans clé Gemini, l'application utilise une **IA simulée** qui renvoie les résultats attendus des données fictives. Elle sert à tester le reste de l'application, pas à mesurer Gemini.

| Commande | Rôle |
|---|---|
| `npm run demarrer` | Construit le tableau de bord et démarre le serveur (ouvre le navigateur) |
| `npm run serveur` | Démarre le serveur seulement |
| `npm run dev` et `npm run dev:web` | Développement : serveur (port 3100) et tableau de bord avec rechargement (port 5174), dans deux terminaux |
| `npm run simuler` | Scénario complet en console, avec l'IA simulée |
| `npm run evaluer-ia` | Mesure Gemini sur les 30 courriels et les 10 réponses (détection, extraction, temps) |
| `npm run verifier-donnees` | Vérifie la cohérence des données fictives |
| `npm run tester-creneaux` | Teste la recherche de créneaux seule |
| `npm run typecheck` | Vérifie les types TypeScript (serveur et tableau de bord) |

L'architecture, le cycle de vie d'une réunion et l'API sont décrits dans `Documentations/architecture.md`.
