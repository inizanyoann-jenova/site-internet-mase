# Design — SEO HomePage

**Date :** 2026-06-02  
**Scope :** Balises SEO + Open Graph + Twitter Card sur la page `/` (HomePage)  
**Approche retenue :** Balises statiques dans `index.html` (pas de dépendance supplémentaire)

---

## Contexte

Site SPA (Vite + React 19 + BrowserRouter). Une seule page marketing publique (`/`).  
L'outil (`/outil`) est derrière auth/paiement — pas besoin de SEO spécifique.  
Les crawlers sociaux (LinkedIn, WhatsApp, Facebook) ne font pas tourner le JS : les balises OG doivent être dans le HTML statique.

---

## Fichiers modifiés

| Fichier | Action |
|---|---|
| `index.html` | Ajouter toutes les balises `<meta>` dans `<head>` |
| `public/og-image.png` | Créer et ajouter l'image OG (fournie par l'utilisateur) |

---

## Balises `<head>` à ajouter dans `index.html`

### Title
```html
<title>Politique SSE MASE en 10 min — Conforme Exigence 1.2 | MASE Tools</title>
```
(remplace le titre actuel "Générateur de Politique SSE — MASE")

### Meta description
```html
<meta name="description" content="Générez une Politique SSE conforme MASE V2024 en 10 minutes. Document Word + PDF prêt à signer. Pour PME du BTP et de l'industrie. 29 € paiement unique." />
```

### Robots + Canonical
```html
<meta name="robots" content="index, follow" />
<link rel="canonical" href="https://site-internet-mase.vercel.app/" />
```

### Open Graph
```html
<meta property="og:type"         content="website" />
<meta property="og:url"          content="https://site-internet-mase.vercel.app/" />
<meta property="og:locale"       content="fr_FR" />
<meta property="og:site_name"    content="MASE Tools" />
<meta property="og:title"        content="Politique SSE MASE en 10 min — Conforme Exigence 1.2" />
<meta property="og:description"  content="Générez une Politique SSE conforme MASE V2024 en 10 minutes. Document Word + PDF prêt à signer. Pour PME du BTP et de l'industrie. 29 € paiement unique." />
<meta property="og:image"        content="https://site-internet-mase.vercel.app/og-image.png" />
<meta property="og:image:width"  content="1200" />
<meta property="og:image:height" content="630" />
```

### Twitter Card
```html
<meta name="twitter:card"        content="summary_large_image" />
<meta name="twitter:title"       content="Politique SSE MASE en 10 min — Conforme Exigence 1.2" />
<meta name="twitter:description" content="Générez une Politique SSE conforme MASE V2024 en 10 minutes. Document Word + PDF prêt à signer. Pour PME du BTP et de l'industrie. 29 € paiement unique." />
<meta name="twitter:image"       content="https://site-internet-mase.vercel.app/og-image.png" />
```

---

## Image OG (`public/og-image.png`)

**Format :** PNG, 1200×630 px  
**Poids cible :** < 500 Ko  
**Chemin dans le projet :** `public/og-image.png`  
**URL publique après déploiement :** `https://site-internet-mase.vercel.app/og-image.png`

**Contenu de l'image :**
- Fond : bleu MASE (`#1e3a5f`)
- Titre principal : **"MASE toute la documentation facile"**
- Sous-titre : **"Politique SSE conforme Exigence 1.2 · Word + PDF · 29 €"**
- Badge : **"En 10 minutes"**
- Nom **"MASE Tools"** discret (haut ou bas)

L'image est créée par l'utilisateur (Canva recommandé, template "LinkedIn post" 1200×627).  
Elle doit être exportée en PNG et placée dans `public/og-image.png` avant le déploiement.

---

## Ordre d'implémentation

1. Mettre à jour `index.html` avec toutes les balises (fait par Claude)
2. Créer l'image OG sur Canva (fait par l'utilisateur)
3. Placer l'image dans `public/og-image.png`
4. Déployer sur Vercel (`git push`)
5. Vérifier avec les outils de validation :
   - Google : https://search.google.com/test/rich-results
   - OG (LinkedIn/FB) : https://www.opengraph.xyz/
   - Twitter : https://cards-dev.twitter.com/validator

---

## Ce qui n'est PAS dans ce scope

- react-helmet-async (pas nécessaire pour une seule page marketing)
- Sitemap XML (peut être ajouté plus tard si nécessaire)
- Schema.org / JSON-LD (optionnel, valeur ajoutée faible pour ce type de service)
- Prerendering SSG (overkill, Google gère les SPAs)
