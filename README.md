15/10/2025
START

Lien de campagne
http://localhost:5173/presence?site=guillaumefebwin.com&email=guillaume%40exemple.com&lock_email=1&lock_site=1
🎯 Objectif
Le lien de campagne permet de :
tracker l’origine de chaque lead (UTM)
préremplir le formulaire /presence
sécuriser le parcours (verrouillage des champs)
enrichir automatiquement la table lead_submissions

1️⃣ Structure générale
https://yesin.media/presence
?utm_source=...
&utm_medium=...
&utm_campaign=...
&utm_content=...
&utm_term=...
&site=...
&email=...
&lock_site=1
&lock_email=1

2️⃣ Paramètres disponibles
A. Tracking marketing (UTM)
Paramètre Obligatoire Description Exemple
utm_source recommandé Source du trafic sendpulse
utm_medium recommandé Canal email
utm_campaign recommandé Nom de la campagne presence_launch_jan2026
utm_content optionnel Variante / bouton cta_main
utm_term optionnel Mot-clé / segmentation pros_lille

➡️ Ces champs sont stockés dans :
lead_submissions.utm (jsonb)

B. Préremplissage formulaire
Paramètre Obligatoire Description
site optionnel Préremplit le champ “Votre activité”
email optionnel Préremplit le champ “Votre email”
