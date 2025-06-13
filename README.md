# Better Booking Plugin

Un plugin complet de réservation pour Better Auth qui permet de gérer des réservations de services avec gestion des paiements Stripe, interface REST complète, et webhooks.

## Table des Matières

- [Fonctionnalités](#fonctionnalités)
- [Installation](#installation)
- [Configuration](#configuration)
  - [Configuration de base](#configuration-de-base-sans-paiement)
  - [Configuration avec Stripe](#configuration-avec-stripe)
  - [Variables d'environnement Stripe](#variables-denvironnement-stripe)
  - [Configuration du Webhook Stripe](#configuration-du-webhook-stripe)
  - [Gestion des services dynamiques](#gestion-des-services-dynamiques)
- [Utilisation avec Stripe](#utilisation-avec-stripe)
  - [Flux de paiement complet](#flux-de-paiement-complet)
  - [Événements automatiques via Webhooks](#événements-automatiques-via-webhooks)
  - [États de réservation avec paiement](#états-de-réservation-avec-paiement)
- [Types de Réservations Supportés](#types-de-réservations-supportés)
  - [🏥 Secteur Médical](#-secteur-médical)
  - [🍽️ Restauration & Hôtellerie](#️-restauration--hôtellerie)
  - [🎯 Services & Coaching](#-services--coaching)
  - [🏋️ Sport & Loisirs](#️-sport--loisirs)
  - [🚗 Location & Équipements](#-location--équipements)
  - [🎪 Événements & Spectacles](#-événements--spectacles)
  - [🎓 Éducation & Formation](#-éducation--formation)
  - [🏥 Exemples Spécialisés](#-exemples-spécialisés)
- [Schéma de Base de Données Détaillé](#schéma-de-base-de-données-détaillé)
  - [Schéma SQL](#schéma-sql-postgresqlmysqlsqlite)
  - [Schéma Drizzle ORM](#schéma-drizzle-orm-typescript)
  - [Schéma Prisma](#schéma-prisma)
  - [Schéma Mongoose](#schéma-mongoose-mongodb)
  - [Migration SQL](#migration-sql-pour-bases-existantes)
- [Exemples d'Utilisation Complète](#exemples-dutilisation-complète)
  - [Configuration complète avec Stripe](#configuration-complète-avec-stripe)
  - [Système de réservation médical](#système-de-réservation-médical-complet)
  - [Système de réservation restaurant](#système-de-réservation-restaurant)
  - [API Frontend avec React](#api-frontend-avec-react)
- [Déploiement et Production](#déploiement-et-production)
  - [Checklist de déploiement](#checklist-de-déploiement)
  - [Sécurité en production](#sécurité-en-production)
  - [Tests en production](#tests-en-production)
  - [Analytics et Business Intelligence](#analytics-et-business-intelligence)
  - [Maintenance et évolution](#maintenance-et-évolution)
- [API Reference](#api-reference)
- [Licence](#licence)

## Fonctionnalités

- ✅ **Gestion complète des réservations** - Créer, lire, modifier, annuler
- ✅ **Services dynamiques en base de données** - Gestion complète via API
- ✅ **Intégration Stripe complète** - Paiements, webhooks, remboursements
- ✅ **Types de services multiples** - Rendez-vous, événements, locations, cours, tables, etc.
- ✅ **Réservations récurrentes** - Quotidiennes, hebdomadaires, mensuelles
- ✅ **Gestion des ressources** - Salles, équipements, véhicules
- ✅ **Assignation du personnel** - Avec compétences spécifiques
- ✅ **Tarification dynamique** - Prix variables selon conditions
- ✅ **Politiques d'annulation** - Flexibles et configurables
- ✅ **Champs personnalisés** - Pour chaque type de service
- ✅ **Multi-localisation** - Physique, virtuelle, hybride
- ✅ **Liste d'attente** - Gestion automatique des places libérées
- ✅ **Multi-participants** - Avec détails individuels
- ✅ **Codes promo** - Système de remises intégré
- ✅ **Statuts avancés** - pending, confirmed, cancelled, completed, no-show, rescheduled, waitlisted
- ✅ **Webhooks Stripe** - Traitement automatique des événements de paiement
- ✅ **Notifications** - Confirmations et rappels automatiques
- ✅ **Métadonnées flexibles** - Stockage d'informations personnalisées
- ✅ **Hooks personnalisables** - Événements pour logique métier
- ✅ **Client TypeScript** - API typée pour le frontend

## Installation

```bash
npm install @armelgeek/better-auth-booking stripe
```

## Configuration

### Configuration de base (sans paiement)

```typescript
import { betterAuth } from "better-auth";
import { booking } from "@armelgeek/better-auth-booking";

const auth = betterAuth({
  database: yourDatabase,
  plugins: [
    booking({
      enableNotifications: true,
      timeZone: "Europe/Paris",
      defaultCurrency: "EUR",
      maxBookingAdvanceDays: 30,
      
      rules: {
        minAdvanceTime: 60, // 1 heure minimum
        maxAdvanceDays: 30,
        allowCancellation: true,
        cancellationDeadlineHours: 24,
        requireApproval: false,
      },
      
      callbacks: {
        onBookingCreated: async (booking, user) => {
          console.log(`Nouvelle réservation: ${booking.id}`);
          // Envoi email de confirmation
        },
        onBookingConfirmed: async (booking, user) => {
          console.log(`Réservation confirmée: ${booking.id}`);
          // Envoi email de rappel
        },
        onBookingCancelled: async (booking, user) => {
          console.log(`Réservation annulée: ${booking.id}`);
          // Notification d'annulation
        },
      },
    }),
  ],
});
```

### Configuration avec Stripe

```typescript
import { betterAuth } from "better-auth";
import { booking } from "@armelgeek/better-auth-booking";

const auth = betterAuth({
  database: yourDatabase,
  plugins: [
    booking({
      enableNotifications: true,
      timeZone: "Europe/Paris",
      defaultCurrency: "EUR",
      maxBookingAdvanceDays: 30,
      
      // Configuration Stripe
      payment: {
        enabled: true,
        provider: "stripe",
        stripe: {
          secretKey: process.env.STRIPE_SECRET_KEY!,
          publishableKey: process.env.STRIPE_PUBLISHABLE_KEY!,
          webhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
          currency: "eur",
          automatic_payment_methods: {
            enabled: true,
          },
        },
      },
      
      rules: {
        minAdvanceTime: 60,
        maxAdvanceDays: 30,
        allowCancellation: true,
        cancellationDeadlineHours: 24,
        requireApproval: false,
      },
      
      callbacks: {
        onBookingCreated: async (booking, user) => {
          console.log(`Nouvelle réservation: ${booking.id}`);
        },
        onBookingConfirmed: async (booking, user) => {
          console.log(`Réservation confirmée: ${booking.id}`);
        },
        onBookingCancelled: async (booking, user) => {
          console.log(`Réservation annulée: ${booking.id}`);
        },
        onPaymentCompleted: async (booking, paymentData) => {
          console.log(`Paiement réussi pour: ${booking.id}`);
          // Logique après paiement réussi
        },
      },
    }),
  ],
});
```

## Utilisation

### 1. Gestion des Services

#### Créer un service

```typescript
// POST /api/booking/services
const response = await fetch("/api/booking/services", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`,
  },
  body: JSON.stringify({
    name: "Consultation Médicale",
    description: "Consultation générale avec le médecin",
    type: "appointment",
    duration: 30, // minutes
    price: 5000, // en centimes (50€)
    currency: "EUR",
    maxParticipants: 1,
    category: "medical",
    
    // Fenêtre de réservation
    bookingWindow: {
      minAdvanceHours: 2,
      maxAdvanceDays: 30,
    },
    
    // Politique d'annulation
    cancellationPolicy: {
      allowCancellation: true,
      cutoffHours: 24,
      refundPolicy: "full",
    },
    
    // Créneaux disponibles
    availableSlots: [
      { dayOfWeek: 1, startTime: "09:00", endTime: "12:00" }, // Lundi matin
      { dayOfWeek: 1, startTime: "14:00", endTime: "17:00" }, // Lundi après-midi
      { dayOfWeek: 2, startTime: "09:00", endTime: "12:00" }, // Mardi matin
    ],
    
    // Champs personnalisés
    customFields: [
      {
        id: "symptoms",
        name: "Symptômes",
        type: "text",
        required: true,
      },
      {
        id: "emergency",
        name: "Urgence",
        type: "select",
        required: true,
        options: ["Faible", "Moyenne", "Élevée"],
      },
    ],
    
    // Localisation
    location: {
      type: "physical",
      address: "123 Rue de la Santé, 75000 Paris",
      room: "Cabinet 1",
    },
  }),
});
```

#### Lister les services

```typescript
// GET /api/booking/services
const services = await fetch("/api/booking/services", {
  headers: {
    "Authorization": `Bearer ${token}`,
  },
}).then(res => res.json());
```

### 2. Réservations

#### Créer une réservation (sans paiement)

```typescript
// POST /api/booking/create
const response = await fetch("/api/booking/create", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`,
  },
  body: JSON.stringify({
    serviceId: "service_123",
    startDate: "2024-12-20T10:00:00.000Z",
    endDate: "2024-12-20T10:30:00.000Z",
    participants: 1,
    notes: "Première consultation",
    contactEmail: "patient@example.com",
    contactPhone: "0123456789",
    metadata: {
      symptoms: "Mal de tête persistant",
      emergency: "Moyenne",
    },
  }),
});

const booking = await response.json();
console.log("Réservation créée:", booking);
```

#### Créer une réservation avec paiement Stripe

```typescript
// POST /api/booking/create
const response = await fetch("/api/booking/create", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`,
  },
  body: JSON.stringify({
    serviceId: "service_123",
    startDate: "2024-12-20T10:00:00.000Z",
    endDate: "2024-12-20T10:30:00.000Z",
    participants: 1,
    notes: "Première consultation",
    contactEmail: "patient@example.com",
    contactPhone: "0123456789",
  }),
});

const bookingData = await response.json();

// Si le paiement est activé, vous recevrez un clientSecret
if (bookingData.payment?.clientSecret) {
  // Utiliser Stripe Elements pour le paiement
  const stripe = Stripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
  
  const { error } = await stripe.confirmPayment({
    elements,
    clientSecret: bookingData.payment.clientSecret,
    redirect: "if_required",
  });
  
  if (error) {
    console.error("Erreur de paiement:", error);
  } else {
    console.log("Paiement réussi!");
  }
}
```

#### Utiliser Stripe Checkout

```typescript
// POST /api/booking/stripe/checkout
const response = await fetch("/api/booking/stripe/checkout", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`,
  },
  body: JSON.stringify({
    bookingId: "booking_123",
    successUrl: "https://yoursite.com/success",
    cancelUrl: "https://yoursite.com/cancel",
  }),
});

const { url } = await response.json();
// Rediriger vers Stripe Checkout
window.location.href = url;
```

### 3. Client TypeScript

```typescript
import { bookingClient } from "@armelgeek/better-auth-booking/client";

const client = bookingClient({
  baseURL: "https://yourapi.com",
  token: userToken,
});

// Utilisation du client
const services = await client.getServices();
const booking = await client.createBooking({
  serviceId: "service_123",
  startDate: new Date("2024-12-20T10:00:00.000Z"),
  endDate: new Date("2024-12-20T10:30:00.000Z"),
  participants: 1,
});

const bookings = await client.getBookings({
  status: "confirmed",
  from: new Date("2024-12-01"),
  to: new Date("2024-12-31"),
});
```

## Webhooks Stripe

Le plugin gère automatiquement les webhooks Stripe. Configurez votre endpoint webhook dans le dashboard Stripe :

**URL du webhook**: `https://yourapi.com/api/booking/stripe/webhook`

**Événements à écouter**:
- `payment_intent.succeeded`
- `payment_intent.payment_failed`
- `charge.dispute.created`
- `invoice.payment_succeeded`
- `invoice.payment_failed`
- `customer.subscription.deleted`
- `refund.created`

Le plugin met automatiquement à jour le statut des réservations selon les événements reçus.

## Types de Réservations Supportés

Ce plugin peut gérer une grande variété de cas d'usage grâce à sa flexibilité. Voici tous les types supportés avec des exemples complets :

### 🏥 Secteur Médical

#### Consultation Médicale
```typescript
{
  name: "Consultation Généraliste",
  description: "Consultation médicale générale avec le médecin",
  type: "appointment",
  duration: 30,
  price: 5000, // 50€
  currency: "EUR",
  maxParticipants: 1,
  category: "medical",
  bookingWindow: {
    minAdvanceHours: 2,
    maxAdvanceDays: 30,
  },
  cancellationPolicy: {
    allowCancellation: true,
    cutoffHours: 24,
    refundPolicy: "partial",
    refundPercentage: 80,
  },
  availableSlots: [
    { dayOfWeek: 1, startTime: "09:00", endTime: "12:00" },
    { dayOfWeek: 1, startTime: "14:00", endTime: "17:00" },
    { dayOfWeek: 2, startTime: "09:00", endTime: "12:00" },
    { dayOfWeek: 3, startTime: "09:00", endTime: "12:00" },
    { dayOfWeek: 4, startTime: "09:00", endTime: "12:00" },
    { dayOfWeek: 5, startTime: "09:00", endTime: "12:00" },
  ],
  customFields: [
    {
      id: "symptoms",
      name: "Symptômes principaux",
      type: "text",
      required: true,
    },
    {
      id: "urgency",
      name: "Niveau d'urgence",
      type: "select",
      required: true,
      options: ["Faible", "Moyenne", "Élevée", "Critique"],
    },
    {
      id: "insurance",
      name: "Numéro d'assurance",
      type: "text",
      required: false,
    },
  ],
  location: {
    type: "physical",
    address: "123 Rue de la Santé, 75000 Paris",
    room: "Cabinet 2A",
  },
  requiredStaff: [
    {
      role: "doctor",
      count: 1,
      specificStaffIds: ["dr-martin", "dr-dupont"],
    },
  ],
}
```

#### Séance de Kinésithérapie
```typescript
{
  name: "Séance de Kinésithérapie",
  description: "Séance de rééducation avec kinésithérapeute",
  type: "appointment",
  duration: 45,
  price: 4500, // 45€
  currency: "EUR",
  maxParticipants: 1,
  category: "medical",
  recurring: {
    enabled: true,
    intervals: ["weekly"],
    maxOccurrences: 12,
  },
  bookingWindow: {
    minAdvanceHours: 4,
    maxAdvanceDays: 21,
  },
  cancellationPolicy: {
    allowCancellation: true,
    cutoffHours: 12,
    refundPolicy: "full",
  },
  customFields: [
    {
      id: "prescription",
      name: "Prescription médicale",
      type: "text",
      required: true,
    },
    {
      id: "injury_type",
      name: "Type de blessure",
      type: "select",
      required: true,
      options: ["Dos", "Genou", "Épaule", "Cheville", "Autre"],
    },
  ],
  requiredResources: [
    { id: "table-kine-1", name: "Table de kinésithérapie", type: "equipment" },
  ],
}
```

### 🍽️ Restauration & Hôtellerie

#### Réservation de Table
```typescript
{
  name: "Table Restaurant",
  description: "Réservation de table au restaurant",
  type: "table",
  duration: 120, // 2 heures
  price: 0, // Gratuit (le CA se fait sur les consommations)
  currency: "EUR",
  maxParticipants: 8,
  minParticipants: 1,
  category: "restaurant",
  bookingWindow: {
    minAdvanceHours: 2,
    maxAdvanceDays: 60,
  },
  cancellationPolicy: {
    allowCancellation: true,
    cutoffHours: 2,
    refundPolicy: "full",
  },
  availableSlots: [
    { dayOfWeek: 1, startTime: "12:00", endTime: "14:30" }, // Déjeuner
    { dayOfWeek: 1, startTime: "19:00", endTime: "22:30" }, // Dîner
    { dayOfWeek: 2, startTime: "12:00", endTime: "14:30" },
    { dayOfWeek: 2, startTime: "19:00", endTime: "22:30" },
    { dayOfWeek: 3, startTime: "12:00", endTime: "14:30" },
    { dayOfWeek: 3, startTime: "19:00", endTime: "22:30" },
    { dayOfWeek: 4, startTime: "12:00", endTime: "14:30" },
    { dayOfWeek: 4, startTime: "19:00", endTime: "22:30" },
    { dayOfWeek: 5, startTime: "12:00", endTime: "14:30" },
    { dayOfWeek: 5, startTime: "19:00", endTime: "22:30" },
    { dayOfWeek: 6, startTime: "12:00", endTime: "14:30" },
    { dayOfWeek: 6, startTime: "19:00", endTime: "22:30" },
    { dayOfWeek: 0, startTime: "12:00", endTime: "14:30" }, // Dimanche
    { dayOfWeek: 0, startTime: "19:00", endTime: "22:30" },
  ],
  customFields: [
    {
      id: "allergies",
      name: "Allergies alimentaires",
      type: "text",
      required: false,
    },
    {
      id: "occasion",
      name: "Occasion spéciale",
      type: "select",
      required: false,
      options: ["Anniversaire", "Rendez-vous d'affaires", "Romantique", "Famille", "Autre"],
    },
    {
      id: "preferences",
      name: "Préférences de placement",
      type: "select",
      required: false,
      options: ["Terrasse", "Près de la fenêtre", "Coin tranquille", "Pas de préférence"],
    },
  ],
  location: {
    type: "physical",
    address: "456 Avenue Gastronomique, 75000 Paris",
  },
  pricingTiers: [
    {
      name: "Menu dégustation obligatoire",
      condition: "participants >= 6",
      price: 8500, // 85€ par personne
      description: "Menu dégustation obligatoire pour les groupes de 6+",
    },
  ],
}
```

#### Chambre d'Hôtel
```typescript
{
  name: "Chambre Double Standard",
  description: "Chambre double avec salle de bain privée",
  type: "room",
  duration: 1440, // 24 heures en minutes
  price: 12000, // 120€ par nuit
  currency: "EUR",
  maxParticipants: 2,
  category: "hotel",
  bookingWindow: {
    minAdvanceHours: 24,
    maxAdvanceDays: 365,
  },
  cancellationPolicy: {
    allowCancellation: true,
    cutoffHours: 48,
    refundPolicy: "partial",
    refundPercentage: 90,
  },
  customFields: [
    {
      id: "checkin_time",
      name: "Heure d'arrivée prévue",
      type: "text",
      required: true,
    },
    {
      id: "special_requests",
      name: "Demandes spéciales",
      type: "text",
      required: false,
    },
    {
      id: "bed_type",
      name: "Type de lit",
      type: "select",
      required: true,
      options: ["Lit double", "Deux lits simples"],
    },
  ],
  requiredResources: [
    { id: "room-201", name: "Chambre 201", type: "room" },
    { id: "room-202", name: "Chambre 202", type: "room" },
    { id: "room-203", name: "Chambre 203", type: "room" },
  ],
  location: {
    type: "physical",
    address: "789 Boulevard Hôtelier, 75000 Paris",
  },
}
```

### 🎯 Services & Coaching

#### Coaching Personnel
```typescript
{
  name: "Séance de Coaching Personnel",
  description: "Séance individuelle de coaching professionnel",
  type: "appointment",
  duration: 60,
  price: 8000, // 80€
  currency: "EUR",
  maxParticipants: 1,
  category: "coaching",
  bookingWindow: {
    minAdvanceHours: 24,
    maxAdvanceDays: 30,
  },
  cancellationPolicy: {
    allowCancellation: true,
    cutoffHours: 24,
    refundPolicy: "full",
  },
  availableSlots: [
    { dayOfWeek: 1, startTime: "09:00", endTime: "18:00" },
    { dayOfWeek: 2, startTime: "09:00", endTime: "18:00" },
    { dayOfWeek: 3, startTime: "09:00", endTime: "18:00" },
    { dayOfWeek: 4, startTime: "09:00", endTime: "18:00" },
    { dayOfWeek: 5, startTime: "09:00", endTime: "18:00" },
  ],
  location: {
    type: "hybrid",
    address: "321 Rue du Développement, 75000 Paris",
    virtualLink: "https://meet.google.com/coaching-session",
  },
  customFields: [
    {
      id: "goals",
      name: "Objectifs principaux",
      type: "text",
      required: true,
    },
    {
      id: "session_type",
      name: "Type de séance",
      type: "select",
      required: true,
      options: ["Présentiel", "Visioconférence", "Téléphone"],
    },
    {
      id: "experience_level",
      name: "Expérience en coaching",
      type: "select",
      required: true,
      options: ["Première fois", "Quelques séances", "Expérimenté"],
    },
  ],
}
```

#### Cours Particulier
```typescript
{
  name: "Cours Particulier de Mathématiques",
  description: "Cours particulier de mathématiques niveau lycée",
  type: "appointment",
  duration: 90,
  price: 4500, // 45€
  currency: "EUR",
  maxParticipants: 1,
  category: "education",
  recurring: {
    enabled: true,
    intervals: ["weekly"],
    maxOccurrences: 20,
  },
  bookingWindow: {
    minAdvanceHours: 12,
    maxAdvanceDays: 14,
  },
  cancellationPolicy: {
    allowCancellation: true,
    cutoffHours: 12,
    refundPolicy: "full",
  },
  customFields: [
    {
      id: "level",
      name: "Niveau scolaire",
      type: "select",
      required: true,
      options: ["Seconde", "Première", "Terminale", "Prépa", "Université"],
    },
    {
      id: "subjects",
      name: "Matières à travailler",
      type: "multiselect",
      required: true,
      options: ["Algèbre", "Géométrie", "Analyse", "Probabilités", "Statistiques"],
    },
    {
      id: "difficulties",
      name: "Difficultés rencontrées",
      type: "text",
      required: false,
    },
  ],
  location: {
    type: "hybrid",
    address: "654 Avenue de l'Éducation, 75000 Paris",
    virtualLink: "https://meet.google.com/math-tutoring",
  },
}
```

### 🏋️ Sport & Loisirs

#### Cours de Fitness
```typescript
{
  name: "Cours de Yoga Vinyasa",
  description: "Cours de yoga dynamique en petit groupe",
  type: "event",
  duration: 75,
  price: 2500, // 25€
  currency: "EUR",
  maxParticipants: 15,
  minParticipants: 3,
  category: "fitness",
  recurring: {
    enabled: true,
    intervals: ["weekly"],
    maxOccurrences: 52,
  },
  bookingWindow: {
    minAdvanceHours: 2,
    maxAdvanceDays: 30,
  },
  cancellationPolicy: {
    allowCancellation: true,
    cutoffHours: 2,
    refundPolicy: "partial",
    refundPercentage: 80,
  },
  availableSlots: [
    { dayOfWeek: 1, startTime: "18:30", endTime: "19:45" },
    { dayOfWeek: 3, startTime: "18:30", endTime: "19:45" },
    { dayOfWeek: 6, startTime: "10:00", endTime: "11:15" },
  ],
  customFields: [
    {
      id: "experience",
      name: "Niveau d'expérience",
      type: "select",
      required: true,
      options: ["Débutant", "Intermédiaire", "Avancé"],
    },
    {
      id: "injuries",
      name: "Blessures ou limitations",
      type: "text",
      required: false,
    },
    {
      id: "mat_needed",
      name: "Besoin d'un tapis",
      type: "checkbox",
      required: false,
    },
  ],
  location: {
    type: "physical",
    address: "987 Rue du Bien-être, 75000 Paris",
    room: "Studio A",
  },
  requiredResources: [
    { id: "yoga-mats", name: "Tapis de yoga", type: "equipment", quantity: 15 },
    { id: "sound-system", name: "Système audio", type: "equipment" },
  ],
}
```

#### Terrain de Tennis
```typescript
{
  name: "Court de Tennis Extérieur",
  description: "Réservation d'un court de tennis extérieur",
  type: "rental",
  duration: 60,
  price: 3000, // 30€/heure
  currency: "EUR",
  maxParticipants: 4,
  category: "sport",
  bookingWindow: {
    minAdvanceHours: 1,
    maxAdvanceDays: 14,
  },
  cancellationPolicy: {
    allowCancellation: true,
    cutoffHours: 2,
    refundPolicy: "full",
  },
  availableSlots: [
    { dayOfWeek: 1, startTime: "08:00", endTime: "22:00" },
    { dayOfWeek: 2, startTime: "08:00", endTime: "22:00" },
    { dayOfWeek: 3, startTime: "08:00", endTime: "22:00" },
    { dayOfWeek: 4, startTime: "08:00", endTime: "22:00" },
    { dayOfWeek: 5, startTime: "08:00", endTime: "22:00" },
    { dayOfWeek: 6, startTime: "08:00", endTime: "22:00" },
    { dayOfWeek: 0, startTime: "08:00", endTime: "22:00" },
  ],
  specialAvailability: [
    {
      date: "2024-07-14", // Jour férié
      slots: [
        { startTime: "10:00", endTime: "18:00", available: true },
      ],
    },
  ],
  customFields: [
    {
      id: "level",
      name: "Niveau de jeu",
      type: "select",
      required: false,
      options: ["Débutant", "Intermédiaire", "Avancé", "Compétition"],
    },
    {
      id: "equipment_rental",
      name: "Location de matériel",
      type: "multiselect",
      required: false,
      options: ["Raquettes", "Balles", "Filet portable"],
    },
  ],
  requiredResources: [
    { id: "court-1", name: "Court 1", type: "facility" },
    { id: "court-2", name: "Court 2", type: "facility" },
    { id: "court-3", name: "Court 3", type: "facility" },
  ],
  location: {
    type: "physical",
    address: "123 Avenue du Sport, 75000 Paris",
    coordinates: { lat: 48.8566, lng: 2.3522 },
  },
  pricingTiers: [
    {
      name: "Tarif membre",
      condition: "user.membership === 'premium'",
      price: 2000, // 20€ au lieu de 30€
      description: "Tarif préférentiel pour les membres premium",
    },
    {
      name: "Tarif weekend",
      condition: "dayOfWeek >= 6",
      price: 4000, // 40€ le weekend
      description: "Supplément weekend",
    },
  ],
}
```

### 🚗 Location & Équipements

#### Location de Véhicule
```typescript
{
  name: "Citadine Électrique",
  description: "Petite voiture électrique pour la ville",
  type: "rental",
  duration: 60, // Minimum 1 heure
  price: 1500, // 15€/heure
  currency: "EUR",
  maxParticipants: 4,
  category: "vehicle",
  bookingWindow: {
    minAdvanceHours: 2,
    maxAdvanceDays: 30,
  },
  cancellationPolicy: {
    allowCancellation: true,
    cutoffHours: 4,
    refundPolicy: "partial",
    refundPercentage: 90,
  },
  customFields: [
    {
      id: "license_number",
      name: "Numéro de permis",
      type: "text",
      required: true,
      validation: "^[0-9]{12}$",
    },
    {
      id: "pickup_location",
      name: "Lieu de récupération",
      type: "select",
      required: true,
      options: ["Gare du Nord", "Châtelet", "République", "Bastille"],
    },
    {
      id: "return_location",
      name: "Lieu de retour",
      type: "select",
      required: true,
      options: ["Gare du Nord", "Châtelet", "République", "Bastille"],
    },
    {
      id: "insurance",
      name: "Assurance complémentaire",
      type: "checkbox",
      required: false,
    },
  ],
  requiredResources: [
    { id: "car-001", name: "Peugeot e-208", type: "vehicle" },
    { id: "car-002", name: "Renault Zoe", type: "vehicle" },
    { id: "car-003", name: "Citroën ë-C3", type: "vehicle" },
  ],
  pricingTiers: [
    {
      name: "Tarif journée",
      condition: "duration >= 480", // 8 heures
      price: 8000, // 80€ la journée
      description: "Tarif dégressif à partir de 8h",
    },
    {
      name: "Tarif hebdomadaire",
      condition: "duration >= 10080", // 1 semaine
      price: 35000, // 350€ la semaine
      description: "Tarif hebdomadaire",
    },
  ],
}
```

#### Salle de Réunion
```typescript
{
  name: "Salle de Réunion Premium",
  description: "Salle de réunion équipée pour 12 personnes",
  type: "room",
  duration: 60, // Minimum 1 heure
  price: 5000, // 50€/heure
  currency: "EUR",
  maxParticipants: 12,
  category: "business",
  bookingWindow: {
    minAdvanceHours: 2,
    maxAdvanceDays: 90,
  },
  cancellationPolicy: {
    allowCancellation: true,
    cutoffHours: 4,
    refundPolicy: "partial",
    refundPercentage: 85,
  },
  availableSlots: [
    { dayOfWeek: 1, startTime: "08:00", endTime: "19:00" },
    { dayOfWeek: 2, startTime: "08:00", endTime: "19:00" },
    { dayOfWeek: 3, startTime: "08:00", endTime: "19:00" },
    { dayOfWeek: 4, startTime: "08:00", endTime: "19:00" },
    { dayOfWeek: 5, startTime: "08:00", endTime: "19:00" },
  ],
  customFields: [
    {
      id: "meeting_type",
      name: "Type de réunion",
      type: "select",
      required: true,
      options: ["Réunion d'équipe", "Présentation client", "Formation", "Conférence", "Autre"],
    },
    {
      id: "catering",
      name: "Service traiteur",
      type: "select",
      required: false,
      options: ["Pas de restauration", "Café/thé", "Collation", "Déjeuner", "Cocktail"],
    },
    {
      id: "equipment_needed",
      name: "Équipements nécessaires",
      type: "multiselect",
      required: false,
      options: ["Projecteur", "Tableau blanc", "Flipchart", "Système audio", "Webcam"],
    },
    {
      id: "company_name",
      name: "Nom de l'entreprise",
      type: "text",
      required: true,
    },
  ],
  requiredResources: [
    { id: "projector-hd", name: "Projecteur HD", type: "equipment" },
    { id: "whiteboard-large", name: "Tableau blanc", type: "equipment" },
    { id: "conference-table", name: "Table de conférence", type: "furniture" },
  ],
  location: {
    type: "physical",
    address: "456 Avenue Business, 75000 Paris",
    room: "Salle Atlantique - 3ème étage",
  },
  pricingTiers: [
    {
      name: "Tarif demi-journée",
      condition: "duration >= 240", // 4 heures
      price: 18000, // 180€ au lieu de 200€
      description: "Tarif préférentiel demi-journée",
    },
    {
      name: "Tarif journée complète",
      condition: "duration >= 480", // 8 heures
      price: 35000, // 350€ au lieu de 400€
      description: "Tarif journée complète",
    },
  ],
}
```

### 🎪 Événements & Spectacles

#### Concert
```typescript
{
  name: "Concert Jazz Trio",
  description: "Concert intimiste avec un trio de jazz",
  type: "event",
  duration: 120, // 2 heures
  price: 3500, // 35€
  currency: "EUR",
  maxParticipants: 80,
  minParticipants: 20,
  category: "entertainment",
  bookingWindow: {
    minAdvanceHours: 24,
    maxAdvanceDays: 60,
  },
  cancellationPolicy: {
    allowCancellation: true,
    cutoffHours: 48,
    refundPolicy: "partial",
    refundPercentage: 75,
  },
  customFields: [
    {
      id: "seat_preference",
      name: "Préférence de placement",
      type: "select",
      required: false,
      options: ["Première rangée", "Centre", "Côté", "Fond", "Pas de préférence"],
    },
    {
      id: "dietary_restrictions",
      name: "Restrictions alimentaires (si cocktail)",
      type: "text",
      required: false,
    },
  ],
  specialAvailability: [
    {
      date: "2024-12-31", // Réveillon
      slots: [
        { startTime: "20:00", endTime: "22:00", available: true },
      ],
    },
  ],
  location: {
    type: "physical",
    address: "789 Rue de la Musique, 75000 Paris",
    room: "Salle de concert",
  },
  pricingTiers: [
    {
      name: "Tarif étudiant",
      condition: "user.student === true",
      price: 2000, // 20€
      description: "Tarif préférentiel étudiant (sur justificatif)",
    },
    {
      name: "Tarif groupe",
      condition: "participants >= 10",
      price: 3000, // 30€ par personne
      description: "Tarif groupe à partir de 10 personnes",
    },
  ],
}
```

#### Atelier Créatif
```typescript
{
  name: "Atelier Poterie",
  description: "Initiation à la poterie pour tous niveaux",
  type: "course",
  duration: 180, // 3 heures
  price: 6500, // 65€
  currency: "EUR",
  maxParticipants: 8,
  minParticipants: 3,
  category: "creative",
  recurring: {
    enabled: true,
    intervals: ["weekly"],
    maxOccurrences: 8,
  },
  bookingWindow: {
    minAdvanceHours: 48,
    maxAdvanceDays: 30,
  },
  cancellationPolicy: {
    allowCancellation: true,
    cutoffHours: 48,
    refundPolicy: "partial",
    refundPercentage: 80,
  },
  availableSlots: [
    { dayOfWeek: 3, startTime: "14:00", endTime: "17:00" }, // Mercredi après-midi
    { dayOfWeek: 6, startTime: "10:00", endTime: "13:00" }, // Samedi matin
  ],
  customFields: [
    {
      id: "experience_level",
      name: "Niveau d'expérience",
      type: "select",
      required: true,
      options: ["Jamais fait", "Débutant", "Quelques bases", "Intermédiaire"],
    },
    {
      id: "project_interest",
      name: "Type de création souhaitée",
      type: "select",
      required: false,
      options: ["Bol", "Vase", "Assiette", "Sculpture", "Je découvre"],
    },
    {
      id: "allergies",
      name: "Allergies (argile, produits)",
      type: "text",
      required: false,
    },
  ],
  requiredResources: [
    { id: "pottery-wheels", name: "Tours de potier", type: "equipment", quantity: 8 },
    { id: "kiln", name: "Four à céramique", type: "equipment" },
    { id: "clay", name: "Argile", type: "material" },
  ],
  location: {
    type: "physical",
    address: "321 Rue de l'Art, 75000 Paris",
    room: "Atelier principal",
  },
  requiredStaff: [
    {
      role: "instructor",
      count: 1,
      specificStaffIds: ["marie-potter", "jean-ceramist"],
    },
  ],
}
```

### 🎓 Éducation & Formation

#### Formation Professionnelle
```typescript
{
  name: "Formation React Avancé",
  description: "Formation intensive React avec TypeScript",
  type: "course",
  duration: 480, // 8 heures (1 journée)
  price: 59900, // 599€
  currency: "EUR",
  maxParticipants: 12,
  minParticipants: 6,
  category: "training",
  bookingWindow: {
    minAdvanceHours: 168, // 1 semaine
    maxAdvanceDays: 90,
  },
  cancellationPolicy: {
    allowCancellation: true,
    cutoffHours: 168, // 1 semaine
    refundPolicy: "partial",
    refundPercentage: 85,
  },
  customFields: [
    {
      id: "experience_level",
      name: "Niveau en React",
      type: "select",
      required: true,
      options: ["Débutant", "Bases solides", "Intermédiaire", "Avancé"],
    },
    {
      id: "typescript_experience",
      name: "Expérience TypeScript",
      type: "select",
      required: true,
      options: ["Aucune", "Notions", "Intermédiaire", "Avancé"],
    },
    {
      id: "company_name",
      name: "Entreprise",
      type: "text",
      required: false,
    },
    {
      id: "specific_goals",
      name: "Objectifs spécifiques",
      type: "text",
      required: false,
    },
    {
      id: "laptop_needed",
      name: "Besoin d'un ordinateur portable",
      type: "checkbox",
      required: false,
    },
  ],
  location: {
    type: "hybrid",
    address: "654 Avenue Tech, 75000 Paris",
    room: "Salle de formation B",
    virtualLink: "https://meet.google.com/react-training",
  },
  requiredResources: [
    { id: "projector-4k", name: "Projecteur 4K", type: "equipment" },
    { id: "wifi-pro", name: "WiFi professionnel", type: "service" },
    { id: "laptops-backup", name: "Ordinateurs de secours", type: "equipment", quantity: 3 },
  ],
  requiredStaff: [
    {
      role: "lead_instructor",
      count: 1,
      specificStaffIds: ["dev-senior-1", "dev-senior-2"],
    },
    {
      role: "assistant",
      count: 1,
    },
  ],
  pricingTiers: [
    {
      name: "Tarif entreprise",
      condition: "participants >= 8",
      price: 49900, // 499€ par personne
      description: "Tarif groupe entreprise",
    },
    {
      name: "Early bird",
      condition: "booking_date < event_date - 30", // 30 jours à l'avance
      price: 49900, // 499€
      description: "Inscription anticipée",
    },
  ],
}
```

#### Examen de Certification
```typescript
{
  name: "Examen TOEIC",
  description: "Test officiel d'anglais TOEIC",
  type: "appointment",
  duration: 120, // 2 heures
  price: 13200, // 132€
  currency: "EUR",
  maxParticipants: 1, // Examen individuel
  category: "certification",
  bookingWindow: {
    minAdvanceHours: 336, // 2 semaines minimum
    maxAdvanceDays: 90,
  },
  cancellationPolicy: {
    allowCancellation: true,
    cutoffHours: 168, // 1 semaine
    refundPolicy: "partial",
    refundPercentage: 50, // Frais d'annulation élevés
  },
  availableSlots: [
    { dayOfWeek: 6, startTime: "09:00", endTime: "11:00" }, // Samedi matin
    { dayOfWeek: 6, startTime: "14:00", endTime: "16:00" }, // Samedi après-midi
  ],
  specialAvailability: [
    {
      date: "2024-12-15", // Session spéciale
      slots: [
        { startTime: "09:00", endTime: "11:00", available: true },
        { startTime: "14:00", endTime: "16:00", available: true },
      ],
    },
  ],
  customFields: [
    {
      id: "identity_document",
      name: "Type de pièce d'identité",
      type: "select",
      required: true,
      options: ["Carte d'identité", "Passeport", "Permis de conduire"],
    },
    {
      id: "document_number",
      name: "Numéro de la pièce d'identité",
      type: "text",
      required: true,
    },
    {
      id: "birth_date",
      name: "Date de naissance",
      type: "date",
      required: true,
    },
    {
      id: "special_needs",
      name: "Besoins spéciaux (handicap, etc.)",
      type: "text",
      required: false,
    },
    {
      id: "previous_score",
      name: "Score TOEIC précédent (si applicable)",
      type: "number",
      required: false,
    },
  ],
  location: {
    type: "physical",
    address: "123 Centre d'Examen, 75000 Paris",
    room: "Salle d'examen A",
  },
  requiredResources: [
    { id: "exam-computer", name: "Ordinateur d'examen", type: "equipment" },
    { id: "headphones", name: "Casque audio", type: "equipment" },
  ],
  requiredStaff: [
    {
      role: "examiner",
      count: 1,
      specificStaffIds: ["examiner-certified-1"],
    },
    {
      role: "supervisor",
      count: 1,
    },
  ],
}
```

### 🏥 Exemples Spécialisés

#### Téléconsultation Médicale
```typescript
{
  name: "Téléconsultation Pédiatre",
  description: "Consultation pédiatrique en visioconférence",
  type: "appointment",
  duration: 20,
  price: 3500, // 35€
  currency: "EUR",
  maxParticipants: 3, // Enfant + 2 parents max
  category: "medical",
  bookingWindow: {
    minAdvanceHours: 1,
    maxAdvanceDays: 15,
  },
  cancellationPolicy: {
    allowCancellation: true,
    cutoffHours: 2,
    refundPolicy: "full",
  },
  availableSlots: [
    { dayOfWeek: 1, startTime: "08:00", endTime: "19:00" },
    { dayOfWeek: 2, startTime: "08:00", endTime: "19:00" },
    { dayOfWeek: 3, startTime: "08:00", endTime: "19:00" },
    { dayOfWeek: 4, startTime: "08:00", endTime: "19:00" },
    { dayOfWeek: 5, startTime: "08:00", endTime: "19:00" },
    { dayOfWeek: 6, startTime: "09:00", endTime: "12:00" }, // Samedi matin
  ],
  location: {
    type: "virtual",
    virtualLink: "https://telemedicine.example.com/pediatrie",
  },
  customFields: [
    {
      id: "child_age",
      name: "Âge de l'enfant",
      type: "number",
      required: true,
    },
    {
      id: "child_weight",
      name: "Poids approximatif (kg)",
      type: "number",
      required: false,
    },
    {
      id: "symptoms",
      name: "Symptômes observés",
      type: "text",
      required: true,
    },
    {
      id: "urgency",
      name: "Niveau d'urgence",
      type: "select",
      required: true,
      options: ["Consultation de routine", "Symptômes récents", "Inquiétude importante", "Urgence"],
    },
    {
      id: "medical_history",
      name: "Antécédents médicaux pertinents",
      type: "text",
      required: false,
    },
    {
      id: "current_medications",
      name: "Médicaments actuels",
      type: "text",
      required: false,
    },
  ],
  requiredStaff: [
    {
      role: "pediatrician",
      count: 1,
      specificStaffIds: ["dr-pediatre-1", "dr-pediatre-2"],
    },
  ],
}
```

#### Service de Livraison à Domicile
```typescript
{
  name: "Livraison Courses Bio",
  description: "Livraison de courses biologiques à domicile",
  type: "custom",
  duration: 30, // Créneau de 30 minutes
  price: 500, // 5€ de frais de livraison
  currency: "EUR",
  maxParticipants: 1,
  category: "delivery",
  bookingWindow: {
    minAdvanceHours: 4,
    maxAdvanceDays: 7,
  },
  cancellationPolicy: {
    allowCancellation: true,
    cutoffHours: 2,
    refundPolicy: "full",
  },
  availableSlots: [
    { dayOfWeek: 1, startTime: "08:00", endTime: "20:00" },
    { dayOfWeek: 2, startTime: "08:00", endTime: "20:00" },
    { dayOfWeek: 3, startTime: "08:00", endTime: "20:00" },
    { dayOfWeek: 4, startTime: "08:00", endTime: "20:00" },
    { dayOfWeek: 5, startTime: "08:00", endTime: "20:00" },
    { dayOfWeek: 6, startTime: "09:00", endTime: "18:00" },
  ],
  customFields: [
    {
      id: "delivery_address",
      name: "Adresse de livraison",
      type: "text",
      required: true,
    },
    {
      id: "phone_number",
      name: "Numéro de téléphone",
      type: "phone",
      required: true,
    },
    {
      id: "access_code",
      name: "Code d'accès immeuble",
      type: "text",
      required: false,
    },
    {
      id: "floor",
      name: "Étage",
      type: "text",
      required: false,
    },
    {
      id: "special_instructions",
      name: "Instructions spéciales",
      type: "text",
      required: false,
    },
    {
      id: "contactless_delivery",
      name: "Livraison sans contact",
      type: "checkbox",
      required: false,
    },
  ],
  location: {
    type: "physical",
    address: "Zone de livraison Paris intra-muros",
  },
  requiredResources: [
    { id: "delivery-bike-1", name: "Vélo de livraison 1", type: "vehicle" },
    { id: "delivery-bike-2", name: "Vélo de livraison 2", type: "vehicle" },
  ],
  requiredStaff: [
    {
      role: "delivery_person",
      count: 1,
    },
  ],
  pricingTiers: [
    {
      name: "Livraison gratuite",
      condition: "order_total >= 5000", // Commande > 50€
      price: 0,
      description: "Livraison gratuite à partir de 50€ d'achat",
    },
  ],
}
```
## API Endpoints

### Services
- `GET /api/booking/services` - Lister les services
- `POST /api/booking/services` - Créer un service
- `PUT /api/booking/services/:id` - Modifier un service
- `DELETE /api/booking/services/:id` - Supprimer un service

### Réservations
- `POST /api/booking/create` - Créer une réservation
- `GET /api/booking/list` - Lister les réservations
- `POST /api/booking/cancel` - Annuler une réservation

### Paiements Stripe
- `POST /api/booking/stripe/webhook` - Webhook Stripe
- `POST /api/booking/stripe/checkout` - Créer une session Checkout
- `GET /api/booking/payment/status` - Statut du paiement
- `POST /api/booking/refund` - Effectuer un remboursement

## Variables d'environnement

```env
# Stripe (obligatoire si payment.enabled = true)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Base de données
DATABASE_URL=postgresql://...

# Autres configurations
BOOKING_TIMEZONE=Europe/Paris
BOOKING_DEFAULT_CURRENCY=EUR
```

## Schéma de Base de Données Détaillé

Ce plugin ajoute deux tables principales à votre base de données. Voici les schémas complets pour différents ORM :

### Tables principales

#### Table `booking_service`
Stocke les services de réservation configurables dynamiquement.

#### Table `booking`
Stocke les réservations effectuées par les utilisateurs.

### Schéma SQL (PostgreSQL/MySQL/SQLite)

```sql
-- Table des services de réservation
CREATE TABLE booking_service (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(50) DEFAULT 'appointment',
  duration INTEGER NOT NULL, -- en minutes
  price INTEGER NOT NULL, -- en centimes
  currency VARCHAR(3) DEFAULT 'USD',
  max_participants INTEGER,
  min_participants INTEGER,
  category VARCHAR(100),
  
  -- Configuration JSON (stockées en TEXT)
  booking_window TEXT, -- JSON: {minAdvanceHours, maxAdvanceDays}
  cancellation_policy TEXT, -- JSON: {allowCancellation, cutoffHours, refundPolicy, refundPercentage}
  recurring TEXT, -- JSON: {enabled, intervals, maxOccurrences}
  available_slots TEXT, -- JSON: [{dayOfWeek, startTime, endTime}]
  special_availability TEXT, -- JSON: [{date, slots}]
  required_resources TEXT, -- JSON: [{id, name, type, quantity}]
  required_staff TEXT, -- JSON: [{role, count, specificStaffIds}]
  location TEXT, -- JSON: {type, address, room, virtualLink, coordinates}
  pricing_tiers TEXT, -- JSON: [{name, condition, price, description}]
  custom_fields TEXT, -- JSON: [{id, name, type, required, options, validation}]
  
  is_active BOOLEAN DEFAULT TRUE,
  metadata TEXT, -- JSON libre
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des réservations
CREATE TABLE booking (
  id VARCHAR(255) PRIMARY KEY,
  service_id VARCHAR(255) NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  parent_booking_id VARCHAR(255), -- Pour les réservations récurrentes
  
  -- Dates et statut
  start_date TIMESTAMP NOT NULL,
  end_date TIMESTAMP NOT NULL,
  status VARCHAR(50) DEFAULT 'pending', -- pending, confirmed, cancelled, completed, no-show, rescheduled, waitlisted
  
  -- Participants
  participants INTEGER DEFAULT 1,
  participant_details TEXT, -- JSON: [{name, email, phone, age, notes}]
  
  -- Prix et paiement
  total_price INTEGER NOT NULL, -- en centimes
  currency VARCHAR(3) DEFAULT 'USD',
  discounts TEXT, -- JSON: [{type, value, code, description}]
  payment_status VARCHAR(50), -- pending, paid, failed, refunded, partially_refunded
  payment_method VARCHAR(100),
  payment_transaction_id VARCHAR(255),
  
  -- Stripe
  stripe_payment_intent_id VARCHAR(255),
  stripe_customer_id VARCHAR(255),
  stripe_checkout_session_id VARCHAR(255),
  
  -- Contact et notes
  notes TEXT,
  contact_email VARCHAR(255),
  contact_phone VARCHAR(50),
  reference_id VARCHAR(255),
  
  -- Ressources et personnel
  assigned_resources TEXT, -- JSON: [{resourceId, resourceName, quantity}]
  assigned_staff TEXT, -- JSON: [{staffId, staffName, role}]
  
  -- Check-in/out (pour locations, chambres)
  check_in TIMESTAMP,
  check_out TIMESTAMP,
  
  -- Données personnalisées
  custom_field_values TEXT, -- JSON: {fieldId: value}
  
  -- Réservations récurrentes
  recurring_config TEXT, -- JSON: {frequency, interval, endDate, occurrencesCount, completedOccurrences}
  
  -- Liste d'attente
  waitlist_info TEXT, -- JSON: {position, notifiedAt, expiresAt}
  
  -- Métadonnées
  source VARCHAR(50), -- web, mobile, api, admin, phone, walk-in
  internal_notes TEXT, -- Notes internes (staff uniquement)
  metadata TEXT, -- JSON libre
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Index et contraintes
  FOREIGN KEY (service_id) REFERENCES booking_service(id),
  FOREIGN KEY (user_id) REFERENCES user(id),
  FOREIGN KEY (parent_booking_id) REFERENCES booking(id)
);

-- Index pour performance
CREATE INDEX idx_booking_service_id ON booking(service_id);
CREATE INDEX idx_booking_user_id ON booking(user_id);
CREATE INDEX idx_booking_start_date ON booking(start_date);
CREATE INDEX idx_booking_status ON booking(status);
CREATE INDEX idx_booking_payment_status ON booking(payment_status);
CREATE INDEX idx_booking_stripe_payment_intent ON booking(stripe_payment_intent_id);
```

### Schéma Drizzle ORM (TypeScript)

```typescript
import { pgTable, varchar, text, integer, boolean, timestamp, index } from 'drizzle-orm/pg-core';

// Table des services
export const bookingService = pgTable('booking_service', {
  id: varchar('id', { length: 255 }).primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  type: varchar('type', { length: 50 }).default('appointment'),
  duration: integer('duration').notNull(),
  price: integer('price').notNull(),
  currency: varchar('currency', { length: 3 }).default('USD'),
  maxParticipants: integer('max_participants'),
  minParticipants: integer('min_participants'),
  category: varchar('category', { length: 100 }),
  
  // Configuration JSON
  bookingWindow: text('booking_window'),
  cancellationPolicy: text('cancellation_policy'),
  recurring: text('recurring'),
  availableSlots: text('available_slots'),
  specialAvailability: text('special_availability'),
  requiredResources: text('required_resources'),
  requiredStaff: text('required_staff'),
  location: text('location'),
  pricingTiers: text('pricing_tiers'),
  customFields: text('custom_fields'),
  
  isActive: boolean('is_active').default(true),
  metadata: text('metadata'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Table des réservations
export const booking = pgTable('booking', {
  id: varchar('id', { length: 255 }).primaryKey(),
  serviceId: varchar('service_id', { length: 255 }).notNull(),
  userId: varchar('user_id', { length: 255 }).notNull(),
  parentBookingId: varchar('parent_booking_id', { length: 255 }),
  
  startDate: timestamp('start_date').notNull(),
  endDate: timestamp('end_date').notNull(),
  status: varchar('status', { length: 50 }).default('pending'),
  
  participants: integer('participants').default(1),
  participantDetails: text('participant_details'),
  
  totalPrice: integer('total_price').notNull(),
  currency: varchar('currency', { length: 3 }).default('USD'),
  discounts: text('discounts'),
  paymentStatus: varchar('payment_status', { length: 50 }),
  paymentMethod: varchar('payment_method', { length: 100 }),
  paymentTransactionId: varchar('payment_transaction_id', { length: 255 }),
  
  stripePaymentIntentId: varchar('stripe_payment_intent_id', { length: 255 }),
  stripeCustomerId: varchar('stripe_customer_id', { length: 255 }),
  stripeCheckoutSessionId: varchar('stripe_checkout_session_id', { length: 255 }),
  
  notes: text('notes'),
  contactEmail: varchar('contact_email', { length: 255 }),
  contactPhone: varchar('contact_phone', { length: 50 }),
  referenceId: varchar('reference_id', { length: 255 }),
  
  assignedResources: text('assigned_resources'),
  assignedStaff: text('assigned_staff'),
  
  checkIn: timestamp('check_in'),
  checkOut: timestamp('check_out'),
  
  customFieldValues: text('custom_field_values'),
  recurringConfig: text('recurring_config'),
  waitlistInfo: text('waitlist_info'),
  
  source: varchar('source', { length: 50 }),
  internalNotes: text('internal_notes'),
  metadata: text('metadata'),
}, (table) => ({
  serviceIdIdx: index('idx_booking_service_id').on(table.serviceId),
  userIdIdx: index('idx_booking_user_id').on(table.userId),
  startDateIdx: index('idx_booking_start_date').on(table.startDate),
  statusIdx: index('idx_booking_status').on(table.status),
  paymentStatusIdx: index('idx_booking_payment_status').on(table.paymentStatus),
  stripePaymentIntentIdx: index('idx_booking_stripe_payment_intent').on(table.stripePaymentIntentId),
}));
```

### Schéma Prisma

```prisma
// prisma/schema.prisma

model BookingService {
  id          String  @id @default(cuid())
  name        String
  description String?
  type        String  @default("appointment")
  duration    Int     // en minutes
  price       Int     // en centimes
  currency    String  @default("USD")
  maxParticipants Int?
  minParticipants Int?
  category    String?
  
  // Configuration JSON (stockées en String)
  bookingWindow       String? // JSON
  cancellationPolicy  String? // JSON
  recurring          String? // JSON
  availableSlots     String? // JSON
  specialAvailability String? // JSON
  requiredResources  String? // JSON
  requiredStaff      String? // JSON
  location           String? // JSON
  pricingTiers       String? // JSON
  customFields       String? // JSON
  
  isActive    Boolean   @default(true)
  metadata    String?   // JSON
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  
  // Relations
  bookings    Booking[]
  
  @@map("booking_service")
}

model Booking {
  id                String    @id @default(cuid())
  serviceId         String
  userId            String
  parentBookingId   String?
  
  // Dates et statut
  startDate         DateTime
  endDate           DateTime
  status            String    @default("pending")
  
  // Participants
  participants      Int       @default(1)
  participantDetails String?  // JSON
  
  // Prix et paiement
  totalPrice        Int       // en centimes
  currency          String    @default("USD")
  discounts         String?   // JSON
  paymentStatus     String?
  paymentMethod     String?
  paymentTransactionId String?
  
  // Stripe
  stripePaymentIntentId    String?
  stripeCustomerId         String?
  stripeCheckoutSessionId  String?
  
  // Contact et notes
  notes             String?
  contactEmail      String?
  contactPhone      String?
  referenceId       String?
  
  // Ressources et personnel
  assignedResources String?   // JSON
  assignedStaff     String?   // JSON
  
  // Check-in/out
  checkIn           DateTime?
  checkOut          DateTime?
  
  // Données personnalisées
  customFieldValues String?   // JSON
  recurringConfig   String?   // JSON
  waitlistInfo      String?   // JSON
  
  // Métadonnées
  source            String?
  internalNotes     String?
  metadata          String?   // JSON
  
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
  
  // Relations
  service           BookingService @relation(fields: [serviceId], references: [id])
  user              User           @relation(fields: [userId], references: [id])
  parentBooking     Booking?       @relation("BookingRecurrence", fields: [parentBookingId], references: [id])
  childBookings     Booking[]      @relation("BookingRecurrence")
  
  // Index
  @@index([serviceId])
  @@index([userId])
  @@index([startDate])
  @@index([status])
  @@index([paymentStatus])
  @@index([stripePaymentIntentId])
  
  @@map("booking")
}

// Extension du modèle User existant
model User {
  // ... champs existants de Better Auth
  
  // Relations avec le booking
  bookings          Booking[]
  bookingPreferences String?   // JSON: préférences de réservation
}
```

### Schéma Mongoose (MongoDB)

```javascript
// models/BookingService.js
const mongoose = require('mongoose');

const bookingServiceSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  type: { type: String, default: 'appointment' },
  duration: { type: Number, required: true }, // minutes
  price: { type: Number, required: true }, // centimes
  currency: { type: String, default: 'USD' },
  maxParticipants: Number,
  minParticipants: Number,
  category: String,
  
  // Configuration comme objets MongoDB
  bookingWindow: {
    minAdvanceHours: Number,
    maxAdvanceDays: Number,
  },
  cancellationPolicy: {
    allowCancellation: Boolean,
    cutoffHours: Number,
    refundPolicy: String,
    refundPercentage: Number,
  },
  recurring: {
    enabled: Boolean,
    intervals: [String],
    maxOccurrences: Number,
  },
  availableSlots: [{
    dayOfWeek: Number,
    startTime: String,
    endTime: String,
  }],
  specialAvailability: [{
    date: String,
    slots: [{
      startTime: String,
      endTime: String,
      available: Boolean,
    }],
  }],
  requiredResources: [{
    id: String,
    name: String,
    type: String,
    quantity: Number,
  }],
  requiredStaff: [{
    role: String,
    count: Number,
    specificStaffIds: [String],
  }],
  location: {
    type: String,
    address: String,
    room: String,
    virtualLink: String,
    coordinates: {
      lat: Number,
      lng: Number,
    },
  },
  pricingTiers: [{
    name: String,
    condition: String,
    price: Number,
    description: String,
  }],
  customFields: [{
    id: String,
    name: String,
    type: String,
    required: Boolean,
    options: [String],
    validation: String,
  }],
  
  isActive: { type: Boolean, default: true },
  metadata: mongoose.Schema.Types.Mixed,
}, {
  timestamps: true,
});

// models/Booking.js
const bookingSchema = new mongoose.Schema({
  serviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'BookingService', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  parentBookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
  
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  status: { type: String, default: 'pending' },
  
  participants: { type: Number, default: 1 },
  participantDetails: [{
    name: String,
    email: String,
    phone: String,
    age: Number,
    notes: String,
  }],
  
  totalPrice: { type: Number, required: true },
  currency: { type: String, default: 'USD' },
  discounts: [{
    type: String,
    value: Number,
    code: String,
    description: String,
  }],
  paymentStatus: String,
  paymentMethod: String,
  paymentTransactionId: String,
  
  stripePaymentIntentId: String,
  stripeCustomerId: String,
  stripeCheckoutSessionId: String,
  
  notes: String,
  contactEmail: String,
  contactPhone: String,
  referenceId: String,
  
  assignedResources: [{
    resourceId: String,
    resourceName: String,
    quantity: Number,
  }],
  assignedStaff: [{
    staffId: String,
    staffName: String,
    role: String,
  }],
  
  checkIn: Date,
  checkOut: Date,
  
  customFieldValues: mongoose.Schema.Types.Mixed,
  recurringConfig: {
    frequency: String,
    interval: Number,
    endDate: Date,
    occurrencesCount: Number,
    completedOccurrences: Number,
  },
  waitlistInfo: {
    position: Number,
    notifiedAt: Date,
    expiresAt: Date,
  },
  
  source: String,
  internalNotes: String,
  metadata: mongoose.Schema.Types.Mixed,
}, {
  timestamps: true,
});

// Index pour performance
bookingSchema.index({ serviceId: 1 });
bookingSchema.index({ userId: 1 });
bookingSchema.index({ startDate: 1 });
bookingSchema.index({ status: 1 });
bookingSchema.index({ paymentStatus: 1 });
bookingSchema.index({ stripePaymentIntentId: 1 });

module.exports = {
  BookingService: mongoose.model('BookingService', bookingServiceSchema),
  Booking: mongoose.model('Booking', bookingSchema),
};
```

### Migration SQL pour bases existantes

Si vous avez déjà une base de données, voici les scripts de migration :

```sql
-- Migration 001: Ajouter les tables de base
-- PostgreSQL
CREATE TABLE IF NOT EXISTS booking_service (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(50) DEFAULT 'appointment',
  duration INTEGER NOT NULL,
  price INTEGER NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  max_participants INTEGER,
  min_participants INTEGER,
  category VARCHAR(100),
  booking_window TEXT,
  cancellation_policy TEXT,
  recurring TEXT,
  available_slots TEXT,
  special_availability TEXT,
  required_resources TEXT,
  required_staff TEXT,
  location TEXT,
  pricing_tiers TEXT,
  custom_fields TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  metadata TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS booking (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id VARCHAR(255) NOT NULL REFERENCES booking_service(id),
  user_id VARCHAR(255) NOT NULL REFERENCES "user"(id),
  parent_booking_id VARCHAR(255) REFERENCES booking(id),
  start_date TIMESTAMP NOT NULL,
  end_date TIMESTAMP NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  participants INTEGER DEFAULT 1,
  participant_details TEXT,
  total_price INTEGER NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  discounts TEXT,
  payment_status VARCHAR(50),
  payment_method VARCHAR(100),
  payment_transaction_id VARCHAR(255),
  stripe_payment_intent_id VARCHAR(255),
  stripe_customer_id VARCHAR(255),
  stripe_checkout_session_id VARCHAR(255),
  notes TEXT,
  contact_email VARCHAR(255),
  contact_phone VARCHAR(50),
  reference_id VARCHAR(255),
  assigned_resources TEXT,
  assigned_staff TEXT,
  check_in TIMESTAMP,
  check_out TIMESTAMP,
  custom_field_values TEXT,
  recurring_config TEXT,
  waitlist_info TEXT,
  source VARCHAR(50),
  internal_notes TEXT,
  metadata TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Migration 002: Ajouter les index
CREATE INDEX IF NOT EXISTS idx_booking_service_id ON booking(service_id);
CREATE INDEX IF NOT EXISTS idx_booking_user_id ON booking(user_id);
CREATE INDEX IF NOT EXISTS idx_booking_start_date ON booking(start_date);
CREATE INDEX IF NOT EXISTS idx_booking_status ON booking(status);
CREATE INDEX IF NOT EXISTS idx_booking_payment_status ON booking(payment_status);
CREATE INDEX IF NOT EXISTS idx_booking_stripe_payment_intent ON booking(stripe_payment_intent_id);

-- Migration 003: Ajouter les champs Stripe (si pas déjà présents)
ALTER TABLE booking ADD COLUMN IF NOT EXISTS stripe_payment_intent_id VARCHAR(255);
ALTER TABLE booking ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255);
ALTER TABLE booking ADD COLUMN IF NOT EXISTS stripe_checkout_session_id VARCHAR(255);

-- MySQL équivalent
-- Remplacer gen_random_uuid() par UUID() pour MySQL
-- Remplacer "user" par `user` (backticks) pour MySQL
```

### Notes importantes sur le schéma

1. **Champs JSON** : Les configurations complexes sont stockées en JSON/TEXT pour flexibilité
2. **Prix en centimes** : Tous les prix sont stockés en centimes pour éviter les problèmes de précision
3. **Index** : Index optimisés pour les requêtes fréquentes (recherche par service, utilisateur, dates)
4. **Clés étrangères** : Relations avec la table `user` de Better Auth
5. **Stripe** : Champs dédiés pour l'intégration Stripe complète
6. **Flexibilité** : Métadonnées JSON pour extensions futures

Ce schéma supporte tous les cas d'usage présentés dans les exemples précédents et est optimisé pour les performances avec les index appropriés.

## Exemples d'Utilisation Complète

### Configuration complète avec Stripe

```typescript
// auth.ts - Configuration Better Auth avec Booking
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { booking } from "@armelgeek/better-auth-booking";
import { db } from "./db"; // Votre configuration DB

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "sqlite", // ou "postgresql", "mysql"
  }),
  emailAndPassword: {
    enabled: true,
  },
  plugins: [
    booking({
      // Configuration générale
      enableNotifications: true,
      timeZone: "Europe/Paris",
      defaultCurrency: "EUR",
      maxBookingAdvanceDays: 60,

      // Configuration Stripe
      payment: {
        enabled: true,
        provider: "stripe",
        stripe: {
          secretKey: process.env.STRIPE_SECRET_KEY!,
          publishableKey: process.env.STRIPE_PUBLISHABLE_KEY!,
          webhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
          currency: "eur",
          automatic_payment_methods: { enabled: true },
        },
      },

      // Règles de réservation
      rules: {
        minAdvanceTime: 120, // 2 heures minimum
        maxAdvanceDays: 60,
        allowCancellation: true,
        cancellationDeadlineHours: 24,
        requireApproval: false,
      },

      // Notifications
      notifications: {
        sendConfirmation: true,
        sendReminder: true,
        reminderHours: 24,
        templates: {
          confirmation: "booking-confirmation",
          reminder: "booking-reminder",
          cancellation: "booking-cancellation",
        },
      },

      // // Callbacks personnalisés
      callbacks: {
        onBookingCreated: async (booking, user) => {
          console.log(`📅 Nouvelle réservation ${booking.id} par ${user.email}`);
          
          // Envoi email de confirmation personnalisé
          await sendEmail({
            to: user.email,
            template: "booking-created",
            data: { booking, user },
          });

          // Intégration avec calendrier externe
          await addToGoogleCalendar(booking);
          
          // Notification Slack pour l'équipe
          await notifySlack(`Nouvelle réservation: ${booking.id}`);
        },

        onBookingConfirmed: async (booking, user) => {
          console.log(`✅ Réservation confirmée ${booking.id}`);
          
          // Génération de QR code pour check-in
          const qrCode = await generateQRCode(booking.id);
          
          // Envoi email avec QR code
          await sendEmail({
            to: user.email,
            template: "booking-confirmed",
            data: { booking, user, qrCode },
          });
        },

        onBookingCancelled: async (booking, user) => {
          console.log(`❌ Réservation annulée ${booking.id}`);
          
          // Remboursement automatique si applicable
          if (booking.paymentStatus === "paid") {
            await processAutomaticRefund(booking);
          }
          
          // Notification à l'équipe
          await notifyTeam(`Annulation: ${booking.id}`);
        },

        onPaymentCompleted: async (booking, paymentData) => {
          console.log(`💳 Paiement réussi pour ${booking.id}`);
          
          // Génération de facture
          const invoice = await generateInvoice(booking, paymentData);
          
          // Envoi de la facture par email
          await sendEmail({
            to: booking.contactEmail,
            template: "payment-receipt",
            data: { booking, invoice },
          });
          
          // Mise à jour du CRM
          await updateCRM(booking, { status: "paid" });
        },
      },

      // Autorisation personnalisée
      authorizeBooking: async ({ user, serviceId, startDate, endDate }, request) => {
        // Vérifier les permissions utilisateur
        if (user.role === "banned") return false;
        
        // Vérifier les limites par utilisateur
        const userBookings = await getUserActiveBookings(user.id);
        if (userBookings.length >= 5) return false;
        
        // Vérifier la disponibilité métier
        const isBusinessHours = isWithinBusinessHours(startDate, endDate);
        if (!isBusinessHours && user.role !== "vip") return false;
        
        return true;
      },

      // Vérification de disponibilité personnalisée
      checkAvailability: async (serviceId, startDate, endDate) => {
        // Intégration avec calendrier Google
        const isGoogleCalendarFree = await checkGoogleCalendar(serviceId, startDate, endDate);
        
        // Vérification des ressources externes
        const areResourcesAvailable = await checkExternalResources(serviceId, startDate, endDate);
        
        // Vérification du personnel
        const isStaffAvailable = await checkStaffAvailability(serviceId, startDate, endDate);
        
        return isGoogleCalendarFree && areResourcesAvailable && isStaffAvailable;
      },
    }),
  ],
});
```

### Création d'un système de réservation médical complet

```typescript
// medical-booking.ts - Système de réservation médicale
import { auth } from "./auth";

// 1. Créer les services médicaux
export async function setupMedicalServices() {
  const services = [
    {
      name: "Consultation Généraliste",
      type: "appointment",
      duration: 30,
      price: 2500, // 25€
      category: "medical",
      availableSlots: [
        { dayOfWeek: 1, startTime: "08:30", endTime: "12:00" },
        { dayOfWeek: 1, startTime: "14:00", endTime: "18:30" },
        { dayOfWeek: 2, startTime: "08:30", endTime: "12:00" },
        { dayOfWeek: 3, startTime: "08:30", endTime: "12:00" },
        { dayOfWeek: 4, startTime: "08:30", endTime: "12:00" },
        { dayOfWeek: 5, startTime: "08:30", endTime: "12:00" },
      ],
      customFields: [
        {
          id: "symptoms",
          name: "Motif de consultation",
          type: "text",
          required: true,
        },
        {
          id: "urgency",
          name: "Urgence",
          type: "select",
          required: true,
          options: ["Routine", "Urgent", "Très urgent"],
        },
        {
          id: "insurance_number",
          name: "N° Sécurité Sociale",
          type: "text",
          required: true,
          validation: "^[12][0-9]{14}$",
        },
      ],
      requiredStaff: [{ role: "doctor", count: 1 }],
    },
    {
      name: "Téléconsultation",
      type: "appointment",
      duration: 20,
      price: 2000, // 20€
      category: "telemedicine",
      location: {
        type: "virtual",
        virtualLink: "https://meet.jitsi.si/doctor-consultation",
      },
      availableSlots: [
        { dayOfWeek: 1, startTime: "19:00", endTime: "21:00" },
        { dayOfWeek: 2, startTime: "19:00", endTime: "21:00" },
        { dayOfWeek: 3, startTime: "19:00", endTime: "21:00" },
        { dayOfWeek: 6, startTime: "09:00", endTime: "12:00" }, // Samedi matin
      ],
      customFields: [
        {
          id: "tech_check",
          name: "Test technique effectué",
          type: "checkbox",
          required: true,
        },
        {
          id: "symptoms",
          name: "Symptômes",
          type: "text",
          required: true,
        },
      ],
    },
  ];

  for (const service of services) {
    await createService(service);
  }
}

// 2. Interface patient pour réservation
export async function patientBookingFlow(userId: string, serviceId: string) {
  try {
    // Récupérer le service
    const service = await getService(serviceId);
    if (!service) throw new Error("Service non trouvé");

    // Afficher les créneaux disponibles
    const availableSlots = await getAvailableSlots(serviceId, {
      from: new Date(),
      to: addDays(new Date(), 30),
    });

    console.log("Créneaux disponibles:", availableSlots);

    // Créer la réservation
    const booking = await createBooking({
      serviceId,
      startDate: "2024-12-20T10:00:00.000Z",
      endDate: "2024-12-20T10:30:00.000Z",
      participants: 1,
      customFieldValues: {
        symptoms: "Migraine persistante depuis 3 jours",
        urgency: "Urgent",
        insurance_number: "123456789012345",
      },
      contactEmail: "patient@example.com",
      contactPhone: "+33123456789",
    });

    // Si paiement activé, traiter le paiement
    if (booking.payment?.clientSecret) {
      // Frontend: traitement Stripe
      const paymentResult = await processStripePayment(booking.payment.clientSecret);
      
      if (paymentResult.success) {
        console.log("Paiement réussi, réservation confirmée");
      }
    }

    return booking;
  } catch (error) {
    console.error("Erreur lors de la réservation:", error);
    throw error;
  }
}

// 3. Interface médecin pour gestion des rendez-vous
export async function doctorDashboard(doctorId: string) {
  // Rendez-vous du jour
  const todayBookings = await getBookings({
    staffId: doctorId,
    date: new Date(),
    status: ["confirmed", "pending"],
  });

  // Prochains rendez-vous
  const upcomingBookings = await getBookings({
    staffId: doctorId,
    from: new Date(),
    to: addDays(new Date(), 7),
    status: ["confirmed"],
  });

  // Statistiques
  const stats = {
    totalBookings: todayBookings.length,
    confirmedBookings: todayBookings.filter(b => b.status === "confirmed").length,
    pendingBookings: todayBookings.filter(b => b.status === "pending").length,
    revenue: todayBookings.reduce((sum, b) => sum + (b.totalPrice || 0), 0) / 100,
  };

  return {
    todayBookings,
    upcomingBookings,
    stats,
  };
}

// 4. Gestion des urgences
export async function handleEmergencyBooking(patientData: any) {
  // Rechercher le prochain créneau disponible
  const nextAvailableSlot = await findNextAvailableSlot("consultation", {
    maxWaitHours: 2, // Maximum 2h d'attente
    urgency: "high",
  });

  if (!nextAvailableSlot) {
    // Ajouter à la liste d'attente
    return await addToWaitlist("consultation", patientData);
  }

  // Créer réservation urgente
  return await createBooking({
    serviceId: nextAvailableSlot.serviceId,
    startDate: nextAvailableSlot.startDate,
    endDate: nextAvailableSlot.endDate,
    participants: 1,
    customFieldValues: {
      symptoms: patientData.symptoms,
      urgency: "Très urgent",
      insurance_number: patientData.insuranceNumber,
    },
    notes: "URGENCE - Traiter en priorité",
    source: "emergency",
  });
}
```

### Système de réservation restaurant

```typescript
// restaurant-booking.ts - Système de réservation restaurant
export async function setupRestaurantServices() {
  const tableServices = [
    {
      name: "Table 2 personnes",
      type: "table",
      duration: 90, // 1h30
      price: 0, // Pas de frais de réservation
      maxParticipants: 2,
      category: "restaurant",
      availableSlots: generateRestaurantSlots(),
      customFields: [
        {
          id: "allergies",
          name: "Allergies alimentaires",
          type: "text",
          required: false,
        },
        {
          id: "occasion",
          name: "Occasion spéciale",
          type: "select",
          required: false,
          options: ["Anniversaire", "Romantique", "Affaires", "Famille"],
        },
        {
          id: "menu_preference",
          name: "Préférence menu",
          type: "select",
          required: false,
          options: ["Carte", "Menu dégustation", "Menu végétarien"],
        },
      ],
      requiredResources: [
        { id: "table-2p-1", name: "Table 2p #1", type: "table" },
        { id: "table-2p-2", name: "Table 2p #2", type: "table" },
      ],
      location: {
        type: "physical",
        address: "123 Rue Gastronomique, 75001 Paris",
      },
    },
    // Tables 4, 6, 8 personnes...
  ];

  return Promise.all(tableServices.map(createService));
}

function generateRestaurantSlots() {
  const slots = [];
  for (let day = 1; day <= 7; day++) {
    // Service déjeuner
    slots.push({ dayOfWeek: day, startTime: "12:00", endTime: "14:30" });
    // Service dîner
    slots.push({ dayOfWeek: day, startTime: "19:00", endTime: "22:30" });
  }
  return slots;
}

// Gestion automatique de la liste d'attente
export async function handleWaitlist() {
  const waitlistedBookings = await getBookings({ status: "waitlisted" });
  
  for (const booking of waitlistedBookings) {
    const availableSlot = await findAvailableSlot(
      booking.serviceId,
      booking.startDate,
      booking.endDate
    );
    
    if (availableSlot) {
      // Notifier le client
      await notifyWaitlistCustomer(booking);
      
      // Donner 30 minutes pour confirmer
      setTimeout(async () => {
        const updatedBooking = await getBooking(booking.id);
        if (updatedBooking.status === "waitlisted") {
          // Passer au suivant
          await moveToNextWaitlistCustomer(booking);
        }
      }, 30 * 60 * 1000); // 30 minutes
    }
  }
}
```

### API Frontend avec React

```typescript
// hooks/useBooking.ts - Hooks React pour le booking
import { useState, useEffect } from 'react';
import { authClient } from './auth-client';

export function useBookingServices() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      const response = await authClient.booking.getServices();
      setServices(response.data);
    } catch (error) {
      console.error('Erreur chargement services:', error);
    } finally {
      setLoading(false);
    }
  };

  return { services, loading, refetch: fetchServices };
}

export function useCreateBooking() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const createBooking = async (bookingData) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await authClient.booking.create(bookingData);
      
      // Si paiement requis, rediriger vers Stripe
      if (response.data.payment?.clientSecret) {
        return await handleStripePayment(response.data.payment.clientSecret);
      }
      
      return response.data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { createBooking, loading, error };
}

async function handleStripePayment(paymentData) {
  const stripe = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
  
  // Méthode 1: Stripe Elements
  const { error } = await stripe.confirmPayment({
    elements, // Vos éléments Stripe
    confirmParams: {
      return_url: `${window.location.origin}/booking/success`,
    },
  });

  // Méthode 2: Checkout Session
  // const checkoutSession = await authClient.booking.createCheckoutSession({
  //   bookingId: paymentData.bookingId,
  //   successUrl: `${window.location.origin}/booking/success`,
  //   cancelUrl: `${window.location.origin}/booking/cancel`,
  // });
  // window.location.href = checkoutSession.url;

  if (error) {
    throw new Error(`Erreur paiement: ${error.message}`);
  }
}

// components/BookingForm.tsx - Composant de réservation
export function BookingForm({ serviceId }) {
  const { createBooking, loading } = useCreateBooking();
  const [formData, setFormData] = useState({
    startDate: '',
    endDate: '',
    participants: 1,
    notes: '',
    customFieldValues: {},
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const booking = await createBooking({
        serviceId,
        ...formData,
        startDate: new Date(formData.startDate).toISOString(),
        endDate: new Date(formData.endDate).toISOString(),
      });
      
      // Redirection vers page de succès
      router.push(`/booking/success/${booking.id}`);
    } catch (error) {
      alert(`Erreur: ${error.message}`);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label>Date de début</label>
        <input
          type="datetime-local"
          value={formData.startDate}
          onChange={(e) => setFormData({...formData, startDate: e.target.value})}
          required
        />
      </div>
      
      <div>
        <label>Nombre de participants</label>
        <input
          type="number"
          min="1"
          value={formData.participants}
          onChange={(e) => setFormData({...formData, participants: parseInt(e.target.value)})}
          required
        />
      </div>
      
      <div>
        <label>Notes</label>
        <textarea
          value={formData.notes}
          onChange={(e) => setFormData({...formData, notes: e.target.value})}
        />
      </div>
      
      <button type="submit" disabled={loading}>
        {loading ? 'Réservation...' : 'Réserver'}
      </button>
    </form>
  );
}
```

### Variables d'environnement complètes

```bash
# .env - Configuration complète
# Base de données
DATABASE_URL="postgresql://user:pass@localhost:5432/booking_db"
# ou
DATABASE_URL="mysql://user:pass@localhost:3306/booking_db"
# ou
DATABASE_URL="file:./booking.db" # SQLite

# Better Auth
BETTER_AUTH_SECRET="your-secret-key-here"
BETTER_AUTH_URL="http://localhost:3000"

# Stripe
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# Email (optionnel)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"

# Notifications (optionnel)
SLACK_WEBHOOK_URL="https://hooks.slack.com/services/..."
TEAMS_WEBHOOK_URL="https://outlook.office.com/webhook/..."

# Calendrier externe (optionnel)
GOOGLE_CALENDAR_API_KEY="your-google-api-key"
GOOGLE_CALENDAR_ID="your-calendar-id@group.calendar.google.com"

# SMS (optionnel)
TWILIO_ACCOUNT_SID="your-twilio-sid"
TWILIO_AUTH_TOKEN="your-twilio-token"
TWILIO_PHONE_NUMBER="+1234567890"
```

Ces exemples montrent comment implémenter des systèmes de réservation complets pour différents secteurs, avec toutes les fonctionnalités avancées du plugin.

## Déploiement et Production

### Checklist de déploiement

#### 1. Configuration de l'environnement

```bash
# Production environment variables
NODE_ENV=production
BETTER_AUTH_SECRET="your-production-secret-very-long-and-secure"
BETTER_AUTH_URL="https://your-domain.com"

# Base de données production
DATABASE_URL="postgresql://user:pass@prod-db:5432/booking_prod"

# Stripe production
STRIPE_SECRET_KEY="sk_live_..."
STRIPE_PUBLISHABLE_KEY="pk_live_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# Notifications production
SMTP_HOST="your-production-smtp.com"
SMTP_USER="noreply@your-domain.com"
SMTP_PASS="your-secure-password"
```

#### 2. Configuration Stripe en production

```typescript
// Webhook URL de production
const webhookUrl = "https://your-domain.com/api/booking/stripe/webhook";

// Événements à configurer dans Stripe Dashboard:
const requiredEvents = [
  "payment_intent.succeeded",
  "payment_intent.payment_failed", 
  "payment_intent.canceled",
  "charge.dispute.created",
  "invoice.payment_succeeded",
  "invoice.payment_failed",
  "customer.subscription.deleted",
  "refund.created",
];
```

#### 3. Optimisations de performance

```typescript
// Configuration optimisée pour production
export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "postgresql",
    // Pool de connexions optimisé
    pool: {
      min: 2,
      max: 10,
      acquireTimeoutMillis: 30000,
      idleTimeoutMillis: 30000,
    },
  }),
  plugins: [
    booking({
      // Cache pour les services
      cache: {
        enabled: true,
        ttl: 300, // 5 minutes
        redis: process.env.REDIS_URL,
      },
      
      // Limitation de taux
      rateLimit: {
        enabled: true,
        max: 100, // 100 requêtes par minute
        windowMs: 60000,
      },
      
      // Monitoring
      monitoring: {
        enabled: true,
        metrics: ["bookings_created", "payments_processed", "errors"],
      },
    }),
  ],
});
```

#### 4. Surveillance et monitoring

```typescript
// monitoring.ts - Système de monitoring
export class BookingMonitor {
  static async trackBookingCreated(booking: Booking) {
    // Métriques personnalisées
    await analytics.track("booking_created", {
      serviceId: booking.serviceId,
      amount: booking.totalPrice,
      currency: booking.currency,
      userId: booking.userId,
    });
    
    // Alertes business
    if (booking.totalPrice > 50000) { // > 500€
      await alert.send("high_value_booking", { booking });
    }
  }
  
  static async trackPaymentIssue(error: any, booking: Booking) {
    await logger.error("payment_failed", {
      bookingId: booking.id,
      error: error.message,
      userId: booking.userId,
    });
    
    // Alerte immédiate pour les échecs de paiement
    await alert.send("payment_failure", { booking, error });
  }
}
```

#### 5. Sauvegardes et récupération

```sql
-- Sauvegarde quotidienne
-- PostgreSQL
pg_dump -h localhost -U user -d booking_prod > backup_$(date +%Y%m%d).sql

-- MySQL
mysqldump -h localhost -u user -p booking_prod > backup_$(date +%Y%m%d).sql

-- Stratégie de rétention: 7 jours quotidiens, 4 semaines, 12 mois
```

### Sécurité en production

#### 1. Validation stricte des données

```typescript
// Validation avancée des réservations
export const productionBookingValidation = {
  async validateBookingRequest(data: any, user: User) {
    // Vérification anti-spam
    const recentBookings = await getRecentBookings(user.id, { hours: 1 });
    if (recentBookings.length > 5) {
      throw new Error("Trop de réservations récentes");
    }
    
    // Validation métier stricte
    if (data.totalPrice > 100000) { // > 1000€
      await requireAdminApproval(data);
    }
    
    // Vérification géolocalisation (si applicable)
    if (data.location && !await isValidLocation(data.location)) {
      throw new Error("Localisation invalide");
    }
    
    return true;
  },
  
  async sanitizeUserInput(input: any) {
    // Nettoyage des données utilisateur
    return {
      ...input,
      notes: sanitizeHtml(input.notes),
      contactEmail: normalizeEmail(input.contactEmail),
      customFieldValues: sanitizeCustomFields(input.customFieldValues),
    };
  }
};
```

#### 2. Chiffrement des données sensibles

```typescript
// Chiffrement des données sensibles
import crypto from 'crypto';

export class DataEncryption {
  private static key = process.env.ENCRYPTION_KEY!;
  
  static encrypt(text: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher('aes-256-gcm', this.key);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  }
  
  static decrypt(encryptedText: string): string {
    const [ivHex, encrypted] = encryptedText.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipher('aes-256-gcm', this.key);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }
}

// Utilisation pour les données sensibles
const encryptedPhone = DataEncryption.encrypt(booking.contactPhone);
```

### Tests en production

#### 1. Tests d'intégration

```typescript
// tests/integration/booking.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { auth } from '../src/auth';

describe('Booking Integration Tests', () => {
  beforeAll(async () => {
    // Setup test environment
    await setupTestDatabase();
    await createTestServices();
  });
  
  afterAll(async () => {
    await cleanupTestDatabase();
  });
  
  it('should create booking with payment', async () => {
    const user = await createTestUser();
    const service = await getTestService('consultation');
    
    const booking = await auth.api.createBooking({
      serviceId: service.id,
      userId: user.id,
      startDate: new Date('2024-12-20T10:00:00.000Z'),
      endDate: new Date('2024-12-20T10:30:00.000Z'),
    });
    
    expect(booking.status).toBe('pending');
    expect(booking.paymentStatus).toBe('pending');
  });
  
  it('should handle Stripe webhook correctly', async () => {
    const booking = await createTestBooking();
    const webhookEvent = createTestStripeEvent('payment_intent.succeeded', {
      metadata: { bookingId: booking.id }
    });
    
    const response = await auth.api.handleStripeWebhook(webhookEvent);
    
    expect(response.status).toBe(200);
    
    const updatedBooking = await getBooking(booking.id);
    expect(updatedBooking.status).toBe('confirmed');
    expect(updatedBooking.paymentStatus).toBe('paid');
  });
});
```

#### 2. Tests de charge

```typescript
// tests/load/booking-load.test.ts
import { test } from '@playwright/test';

test.describe('Booking Load Tests', () => {
  test('should handle 100 concurrent bookings', async ({ page }) => {
    const promises = Array.from({ length: 100 }, async (_, i) => {
      return createBooking({
        serviceId: 'test-service',
        startDate: new Date(Date.now() + i * 60000), // Décalage de 1 minute
        endDate: new Date(Date.now() + i * 60000 + 1800000), // 30 minutes
      });
    });
    
    const results = await Promise.allSettled(promises);
    const successful = results.filter(r => r.status === 'fulfilled').length;
    
    expect(successful).toBeGreaterThan(95); // 95% de succès minimum
  });
});
```

### Analytics et Business Intelligence

```typescript
// analytics/booking-analytics.ts
export class BookingAnalytics {
  static async getBusinessMetrics(period: 'day' | 'week' | 'month') {
    const metrics = await db.query(`
      SELECT 
        COUNT(*) as total_bookings,
        COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as confirmed_bookings,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_bookings,
        SUM(CASE WHEN payment_status = 'paid' THEN total_price ELSE 0 END) as revenue,
        AVG(total_price) as average_booking_value,
        COUNT(DISTINCT user_id) as unique_customers
      FROM booking 
      WHERE created_at >= NOW() - INTERVAL '1 ${period}'
    `);
    
    return metrics[0];
  }
  
  static async getServicePerformance() {
    return db.query(`
      SELECT 
        bs.name,
        bs.category,
        COUNT(b.id) as bookings_count,
        SUM(b.total_price) as revenue,
        AVG(b.total_price) as avg_price,
        COUNT(CASE WHEN b.status = 'cancelled' THEN 1 END) * 100.0 / COUNT(b.id) as cancellation_rate
      FROM booking_service bs
      LEFT JOIN booking b ON bs.id = b.service_id
      WHERE b.created_at >= NOW() - INTERVAL '30 days'
      GROUP BY bs.id, bs.name, bs.category
      ORDER BY revenue DESC
    `);
  }
  
  static async getPeakHours() {
    return db.query(`
      SELECT 
        EXTRACT(HOUR FROM start_date) as hour,
        COUNT(*) as booking_count
      FROM booking
      WHERE created_at >= NOW() - INTERVAL '30 days'
        AND status IN ('confirmed', 'completed')
      GROUP BY EXTRACT(HOUR FROM start_date)
      ORDER BY hour
    `);
  }
}
```

### Maintenance et évolution

#### 1. Migration de données

```typescript
// migrations/add-new-fields.ts
export async function migrateBookingFields() {
  // Ajouter de nouveaux champs sans interruption
  await db.execute(`
    ALTER TABLE booking 
    ADD COLUMN IF NOT EXISTS rating INTEGER,
    ADD COLUMN IF NOT EXISTS feedback TEXT,
    ADD COLUMN IF NOT EXISTS referral_source VARCHAR(100)
  `);
  
  // Migrer les données existantes
  await db.execute(`
    UPDATE booking 
    SET referral_source = 'legacy'
    WHERE referral_source IS NULL
      AND created_at < '2024-01-01'
  `);
}
```

#### 2. Évolution des API

```typescript
// Versioning des API pour éviter les breaking changes
export const bookingV2 = {
  // Nouvelle version avec champs additionnels
  async createBooking(data: BookingV2Input) {
    // Conversion vers format V1 pour compatibilité
    const v1Data = convertV2ToV1(data);
    return auth.api.booking.create(v1Data);
  },
  
  // Support des anciennes versions
  async createBookingLegacy(data: BookingV1Input) {
    console.warn('API V1 déprécié, migrer vers V2');
    return auth.api.booking.create(data);
  }
};
```

Cette documentation complète couvre tous les aspects nécessaires pour déployer et maintenir le plugin de réservation en production, avec une attention particulière à la sécurité, les performances et la scalabilité.
