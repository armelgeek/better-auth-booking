# 🚀 Guide de Publication NPM

## Prérequis

1. **Compte NPM** : Assurez-vous d'avoir un compte sur [npmjs.com](https://www.npmjs.com)
2. **Authentification** : Connectez-vous via `npm login`
3. **Organisation** : Le package sera publié sous `@armelgeek/better-auth-booking`

## 📋 Checklist avant publication

- [x] Package.json configuré avec toutes les métadonnées
- [x] LICENSE ajouté
- [x] README.md complet
- [x] .npmignore configuré
- [x] Build réussi
- [x] Types TypeScript générés
- [x] Contenu du package vérifié

## 🎯 Publication

### Option 1: Publication directe stable

```bash
# Vérifier l'authentification NPM
npm whoami

# Publier en version stable
npm publish
```

### Option 2: Publication beta d'abord (recommandé)

```bash
# Publier en version beta
npm run publish:beta

# Tester l'installation
npm install @armelgeek/better-auth-booking@beta

# Si tout fonctionne, publier en stable
npm publish
```

### Option 3: Script automatisé

```bash
# Utiliser le script de préparation
node scripts/prepare-publish.js

# Puis publier
npm publish
```

## 📦 Après publication

1. **Vérifier** : Allez sur https://www.npmjs.com/package/@armelgeek/better-auth-booking
2. **Tester** : Installez dans un projet test
3. **Documentation** : Mettre à jour les liens dans le README si nécessaire

## 🔄 Mises à jour futures

```bash
# Version patch (1.0.0 -> 1.0.1)
npm version patch && npm publish

# Version mineure (1.0.0 -> 1.1.0)
npm version minor && npm publish

# Version majeure (1.0.0 -> 2.0.0)
npm version major && npm publish
```

## 📊 Commandes utiles

```bash
# Voir les versions publiées
npm view @armelgeek/better-auth-booking versions --json

# Voir les informations du package
npm view @armelgeek/better-auth-booking

# Rétracter une version (si erreur)
npm unpublish @armelgeek/better-auth-booking@1.0.0
```

## 🎉 Le package est prêt !

Votre plugin Better Auth Booking est maintenant prêt à être publié sur NPM avec :
- Configuration complète
- Documentation exhaustive  
- Types TypeScript
- Build optimisé
- Scripts automatisés
