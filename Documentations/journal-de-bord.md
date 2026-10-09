# Journal de bord — INF 5114, assistant de planification de réunions

Ce journal garde la trace de tout ce qui servira au rapport de mi-parcours (semaine 7) et au rapport final (semaine 11) : le besoin, ce que l'application règle, les décisions, les problèmes rencontrés et leurs solutions, les prompts et les résultats de tests.

## 1. Besoin comblé

Dans une PME de 4 à 5 employés sans adjoint administratif, les demandes de réunion arrivent par courriel, mêlées au reste du courrier. Chacun doit les repérer, comparer les agendas à la main et envoyer les invitations. C'est lent et source d'erreurs : demandes oubliées, conflits d'horaire, participants omis.

## 2. Ce que l'application règle

| Problème | Ce que fait l'assistant | État |
|---|---|---|
| Demandes de réunion perdues dans les courriels | Surveille la boîte de réception et détecte les demandes (Gemini) | À faire |
| Relecture manuelle pour trouver qui, quoi, quand | Extrait sujet, participants, durée et contraintes de date (Gemini, JSON) | À faire |
| Comparaison manuelle des agendas | Trouve le premier créneau commun libre (code déterministe) | Fait, testé |
| Envoi manuel des invitations | Ajoute le rendez-vous et envoie l'invitation après confirmation | À faire |
| Suivi des réponses et replanification | Suivi automatique facultatif, choisi à la confirmation | À faire |

## 3. Décisions

| Date | Décision | Raison |
|---|---|---|
| 2026-10-08 | Projet 100 % autonome, sans lien avec le projet d'INF1430 | Autre cours, autre projet; évite le chevauchement signalé par le professeur |
| 2026-10-08 | Données entièrement fictives (PME « Atelier Boréal ») | Confidentialité; aucune donnée réelle envoyée à Gemini |
| 2026-10-08 | Gemini, niveau gratuit | Suffisant pour le projet, sans coût |
| 2026-10-08 | Gemini fait la compréhension, le code fait la recherche de créneau | Résultat vérifiable et testable |
| 2026-10-08 | Confirmation de l'utilisateur avant tout envoi | Une erreur du modèle ne doit pas partir sans contrôle |
| 2026-10-08 | Suivi automatique des réponses choisi réunion par réunion | L'utilisateur garde le contrôle; jamais activé par défaut |
| 2026-10-08 | Node.js avec TypeScript, version légère | Même type de codage que mes projets précédents |
| 2026-10-08 | Dépôt Git public, une seule branche | Garder le projet simple |
| 2026-10-08 | Créneaux par pas de 15 minutes, jours ouvrables, heures de bureau (9 h à 17 h) | Règles simples et prévisibles |
| 2026-10-08 | Durée par défaut de 30 minutes et fenêtre par défaut de 7 jours quand le courriel ne les précise pas | Permet de proposer un créneau même pour une demande incomplète |
| 2026-10-08 | Jamais de créneau avant la réception du courriel | Une demande « aujourd'hui » reçue à 10 h ne doit pas donner 9 h |
| 2026-10-09 | Configuration de l'assistant par utilisateur : réunions sur l'heure du dîner (oui ou non) et réunions hors des heures de bureau (oui ou non); d'autres réglages pourront s'ajouter | Chaque employé a ses propres habitudes; un seul réglage pour toute la PME serait trop rigide |
| 2026-10-09 | Un créneau doit respecter les préférences de tous les participants (le plus restrictif l'emporte) | Personne ne se fait imposer une réunion sur son dîner ou hors de ses heures |
| 2026-10-09 | Créneaux en double : l'utilisateur reçoit une seule demande de confirmation pour tout le groupe et choisit la réunion prioritaire; les autres sont replacées jusqu'à ce que toutes soient acceptées | L'utilisateur décide de ce qui passe en premier, l'assistant s'occupe du reste |
| 2026-10-09 | Si un participant refuse ou propose un autre créneau, l'utilisateur choisit : l'IA passe en mode automatique, ou il continue de choisir lui-même les créneaux | L'utilisateur garde le contrôle au moment où la planification se complique |

## 4. Problèmes rencontrés et solutions

| Date | Problème | Solution | État |
|---|---|---|---|
| 2026-10-08 | Portée initiale trop large (« assistant de planification ») | Portée réduite à 6 fonctionnalités précises, avec une liste de limites | Réglé |
| 2026-10-08 | Risque de chevauchement avec INF1430 | Projet limité à l'avant-réunion; aucune transcription ni historique | Réglé |
| 2026-10-08 | Le suivi automatique alourdit le projet | Borné à 3 types de réponse et 2 replanifications; développé en dernier (semaines 8-9) | Réglé |
| 2026-10-08 | Plusieurs créneaux tombent sur l'heure du dîner (12 h) | Préférence par utilisateur : chacun accepte ou non les réunions sur l'heure du dîner (12 h à 13 h) | Réglé |
| 2026-10-08 | Trois demandes obtiennent le même créneau (M08, M14, M17), car chaque demande est testée seule | Détection des groupes de créneaux en double, choix d'une réunion prioritaire, puis replacement des autres (logique faite; l'écran de confirmation reste à faire) | Réglé en partie |
| 2026-10-09 | Après replacement, une demande n'a plus aucun créneau dans sa fenêtre (M12 : toute l'équipe, 1 heure, lundi ou mardi) | À décider : proposer à l'utilisateur d'élargir la fenêtre ou de changer la réunion prioritaire | Ouvert |

## 5. Prompts

À remplir à partir de la semaine 6 : chaque version de prompt, ce qui a changé et pourquoi.

## 6. Résultats de tests

| Date | Test | Résultat |
|---|---|---|
| 2026-10-08 | Validation des données fictives (`npm run verifier-donnees`) | 5 utilisateurs, 40 événements, 30 courriels (20 demandes, 10 sans rapport) : données valides |

| 2026-10-08 | Recherche de créneaux sur les 20 demandes, à partir des résultats attendus (`npm run tester-creneaux`) | 20 créneaux trouvés sur 20, aucun conflit |
| 2026-10-09 | Même test avec les préférences par utilisateur et la résolution des créneaux en double (choix de la prioritaire simulé) | 4 groupes de créneaux en double détectés; 19 réunions placées sur 20; aucun conflit avec les calendriers, aucun conflit entre réunions, toutes les préférences respectées |

À ajouter : pour chaque essai avec Gemini, la version du prompt et les métriques (détection, extraction, créneaux, temps).

## 7. Séances de travail

### 2026-10-08

- Plan de projet rédigé (Travail 1).
- Squelette Node.js/TypeScript créé dans `Projet/`.
- Données fictives créées : 5 utilisateurs, 40 événements de calendrier, 30 courriels, chacun avec son résultat attendu.
- Script de validation des données écrit et exécuté sans erreur.
- Dépôt Git public créé et envoyé sur GitHub (branche `main` seulement).
- Recherche de créneaux écrite (`src/creneaux.ts`) et testée sur les 20 demandes.
- À faire ensuite : premier prompt Gemini (détection et extraction), puis les 10 réponses fictives de participants.

### 2026-10-09

- Préférences par utilisateur ajoutées aux données fictives et à la recherche de créneaux (heure du dîner, hors bureau).
- Détection des créneaux en double et replacement autour de la réunion prioritaire (`detecterGroupesEnConflit`, `planifierLot` dans `src/creneaux.ts`).
- Test refait sur les 20 demandes.
- À faire ensuite : premier prompt Gemini (détection et extraction), l'écran de confirmation, puis les réponses des participants (semaines 8-9).
