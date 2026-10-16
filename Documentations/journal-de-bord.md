# Journal de bord — INF 5114, assistant de planification de réunions

Ce journal garde la trace de tout ce qui servira au rapport de mi-parcours (semaine 7) et au rapport final (semaine 11) : le besoin, ce que l'application règle, les décisions, les problèmes rencontrés et leurs solutions, les prompts et les résultats de tests.

## 1. Besoin comblé

Dans une PME de 4 à 5 employés sans adjoint administratif, les demandes de réunion arrivent par courriel, mêlées au reste du courrier. Chacun doit les repérer, comparer les agendas à la main et envoyer les invitations. C'est lent et source d'erreurs : demandes oubliées, conflits d'horaire, participants omis.

## 2. Ce que l'application règle

| Problème | Ce que fait l'assistant | État |
|---|---|---|
| Demandes de réunion perdues dans les courriels | Surveille la boîte de réception et détecte les demandes (Gemini) | Codé, testé avec l'IA simulée; Gemini à évaluer |
| Relecture manuelle pour trouver qui, quoi, quand | Extrait sujet, participants, durée et contraintes de date (Gemini, JSON) | Codé (prompt v1 et validation); Gemini à évaluer |
| Comparaison manuelle des agendas | Trouve le premier créneau commun libre (code déterministe) | Fait, testé |
| Envoi manuel des invitations | Ajoute le rendez-vous et envoie l'invitation après confirmation | Fait, testé (connecteur fictif) |
| Suivi des réponses et replanification | Suivi automatique ou manuel, choisi à la confirmation et modifiable après un refus | Fait, testé avec l'IA simulée |
| Créneaux en double et demandes sans place | Choix de la prioritaire; date à confirmer avec suggestion | Fait, testé |

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
| 2026-10-09 | Plage de recherche configurable par utilisateur (14 jours dans les données fictives) | Chaque utilisateur décide jusqu'où l'assistant peut chercher |
| 2026-10-09 | Aucune place disponible : l'assistant ne place rien et demande à l'utilisateur de vérifier et de confirmer une date, avec une suggestion prise dans sa plage de recherche | L'assistant ne choisit jamais seul une date hors de ce qui a été demandé |
| 2026-10-09 | Si un participant refuse ou propose un autre créneau, l'utilisateur choisit : l'IA passe en mode automatique, ou il continue de choisir lui-même les créneaux | L'utilisateur garde le contrôle au moment où la planification se complique |
| 2026-10-16 | Architecture : application web + serveur Node.js qui accède aux courriels et calendriers par les API officielles (OAuth), plutôt qu'une extension de navigateur ou un module Gmail/Outlook | Seule option qui surveille la boîte en arrière-plan, garde une seule pile TypeScript et ne dépend pas du HTML des pages (comparaison dans `architecture.md`) |
| 2026-10-16 | Interface `Connecteur` entre l'assistant et les courriels/calendriers; seul le connecteur fictif est réalisé | Le cours exige des données fictives; un connecteur Google ou Microsoft reste possible sans changer l'assistant |
| 2026-10-16 | IA simulée (résultats attendus des données) quand aucune clé Gemini n'est configurée | Permet de développer et tester tout le reste avant d'avoir la clé |
| 2026-10-16 | La sortie de l'IA est toujours validée avant usage (`validation.ts`) | Une erreur du modèle (adresse inventée, date illisible) ne doit jamais atteindre les calendriers |
| 2026-10-16 | Propositions stables : un créneau proposé est réservé jusqu'à la confirmation | L'écran ne doit pas changer pendant que l'utilisateur confirme une autre réunion |
| 2026-10-16 | Après une replanification, tous les participants doivent accepter de nouveau; une réponse à une ancienne invitation est ignorée | Une acceptation ne vaut que pour le moment accepté |
| 2026-10-16 | En passant au suivi automatique pendant une intervention, le compteur de replanifications repart à zéro | L'utilisateur délègue de nouveau la suite à l'assistant |
| 2026-10-16 | Réunions gardées en mémoire, sans base de données | Suffisant pour une démonstration avec des données fictives; garde le projet léger |
| 2026-10-16 | Serveur Express, API REST | Bibliothèque simple et connue, cohérente avec mes autres projets Node.js |

## 4. Problèmes rencontrés et solutions

| Date | Problème | Solution | État |
|---|---|---|---|
| 2026-10-08 | Portée initiale trop large (« assistant de planification ») | Portée réduite à 6 fonctionnalités précises, avec une liste de limites | Réglé |
| 2026-10-08 | Risque de chevauchement avec INF1430 | Projet limité à l'avant-réunion; aucune transcription ni historique | Réglé |
| 2026-10-08 | Le suivi automatique alourdit le projet | Borné à 3 types de réponse et 2 replanifications; développé en dernier (semaines 8-9) | Réglé |
| 2026-10-08 | Plusieurs créneaux tombent sur l'heure du dîner (12 h) | Préférence par utilisateur : chacun accepte ou non les réunions sur l'heure du dîner (12 h à 13 h) | Réglé |
| 2026-10-08 | Trois demandes obtiennent le même créneau (M08, M14, M17), car chaque demande est testée seule | Détection des groupes de créneaux en double, choix d'une réunion prioritaire, puis replacement des autres (logique faite; l'écran de confirmation reste à faire) | Réglé en partie |
| 2026-10-16 | Pas encore de clé d'API Gemini | IA simulée pour tester tout le reste; client Gemini testé contre un faux serveur (requête, reprise après erreur 429, lecture de la réponse, validation) | Contourné; évaluation réelle à faire |
| 2026-10-16 | Les propositions changeaient à chaque confirmation (recalcul de tout le lot), ce qui créait de nouveaux conflits | Réservation des créneaux proposés; un conflit n'est détecté qu'à l'arrivée d'une nouvelle demande | Réglé |
| 2026-10-16 | Incohérence dans les données : M14 (« d'ici jeudi », reçu mardi 16 h 10) commençait mercredi | Fenêtre attendue corrigée pour commencer mardi, comme la règle du prompt | Réglé |
| 2026-10-16 | Risque de fausser l'évaluation si les exemples du prompt reprennent des phrases des courriels de test | Exemples du prompt choisis différents des données de test (« une heure et quart », « dès que possible ») | Réglé |
| 2026-10-16 | Comparer les dates extraites au caractère près est trop sévère (9 h ou heure de réception donnent le même résultat) | Dates jugées correctes si elles mènent au même créneau que les dates attendues | Réglé |
| 2026-10-16 | Un refus n'exclut que le créneau refusé; si le moment proposé par un participant est complet, le suivi automatique revient aux dates d'origine (M04 replanifiée mardi alors que Mathieu demandait mercredi matin) | Limite documentée dans `architecture.md`; à discuter dans le rapport | Ouvert |
| 2026-10-09 | Après replacement, une demande n'a plus aucun créneau dans sa fenêtre (M12 : toute l'équipe, 1 heure, lundi ou mardi) | L'assistant demande à l'utilisateur de vérifier et de confirmer une date, et suggère le premier créneau libre de sa plage de recherche (logique faite; l'écran reste à faire) | Réglé en partie |

## 5. Prompts

Les prompts sont dans `Projet/src/prompts.ts`. Chaque changement augmente `VERSION_PROMPTS` et est noté ici avec les résultats de `npm run evaluer-ia`.

| Version | Date | Contenu | Résultats |
|---|---|---|---|
| v1 | 2026-10-16 | Analyse : rôle, liste des employés, heures de bureau et 6 règles (quoi est une demande, participants obligatoires, sujet court, durée seulement si précisée, conversion des expressions de temps en dates, valeurs nulles). Réponse : 3 types (acceptation, refus, déplacement) et fenêtre si un moment est proposé. Sortie JSON imposée par un schéma, température 0 | À mesurer quand la clé sera disponible |

## 6. Résultats de tests

| Date | Test | Résultat |
|---|---|---|
| 2026-10-08 | Validation des données fictives (`npm run verifier-donnees`) | 5 utilisateurs, 40 événements, 30 courriels (20 demandes, 10 sans rapport) : données valides |

| 2026-10-08 | Recherche de créneaux sur les 20 demandes, à partir des résultats attendus (`npm run tester-creneaux`) | 20 créneaux trouvés sur 20, aucun conflit |
| 2026-10-09 | Même test avec les préférences par utilisateur et la résolution des créneaux en double (choix de la prioritaire simulé) | 4 groupes de créneaux en double détectés; 19 réunions placées sur 20; aucun conflit avec les calendriers, aucun conflit entre réunions, toutes les préférences respectées |
| 2026-10-09 | Même test avec la plage de recherche et la demande de confirmation de date | 19 réunions placées sur 20; 1 date à confirmer (M12, suggestion : mercredi 28 octobre, 14 h 30); aucun conflit; toutes les préférences respectées |
| 2026-10-16 | Scénario complet avec l'IA simulée (`npm run simuler`) : 30 courriels, 5 groupes en double, 20 confirmations, 10 réponses, 2 interventions de l'utilisateur | 20 réunions envoyées (20 invitations, 5 mises à jour), 2 planifiées; aucun chevauchement dans les calendriers; calendriers et invitations cohérents |
| 2026-10-16 | Mesure avec l'IA simulée (`npm run evaluer-ia`) | 100 % partout, comme attendu : la mesure fonctionne |
| 2026-10-16 | Client Gemini contre un faux serveur | Reprise après une erreur 429; adresses inconnues retirées, durée en texte et date illisible ignorées par la validation |
| 2026-10-16 | Routes de l'API testées une à une | Réponses correctes, y compris les erreurs (statut invalide, créneau occupé, mode invalide, JSON mal formé, route inconnue) |

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
- Plage de recherche par utilisateur et demande de confirmation de date quand aucune place n'est disponible.
- Test refait sur les 20 demandes.
- À faire ensuite : premier prompt Gemini (détection et extraction), l'écran de confirmation, puis les réponses des participants (semaines 8-9).

### 2026-10-16

- Choix d'architecture comparé et documenté (`Documentations/architecture.md`).
- Backend complet : connecteur fictif, analyseurs IA (Gemini et simulé), prompts v1, validation, assistant (cycle de vie des réunions), serveur Express.
- 10 réponses fictives de participants ajoutées (`donnees/reponses.json`).
- Scripts `simuler` et `evaluer-ia` écrits et exécutés.
- À faire ensuite : obtenir la clé Gemini et lancer `npm run evaluer-ia`; construire le tableau de bord; rédiger le rapport de mi-parcours.
