# INF 5114 — Assistant de planification de réunions pour PME

> Projet en cours : données fictives et squelette en place, IA à venir.

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

- `Documentations/` — livrables du cours et `journal-de-bord.md`
- `Projet/src/` — code source (Node.js, TypeScript)
- `Projet/donnees/` — données fictives (boîte de réception et calendriers)

## Démarrage

Prérequis : Node.js 20 ou plus récent.

```
cd Projet
npm install
npm run verifier-donnees
```
