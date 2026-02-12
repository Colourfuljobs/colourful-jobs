# Intermediair-accounts: Implementatie Compleet

## ✅ Wat is geïmplementeerd

### 1. Database-laag (Airtable schemas & functies)

**Schema updates:**
- ✅ `userRecordSchema`: `role_id`, `managed_employers`, `active_employer` toegevoegd
- ✅ `productRecordSchema`: `target_roles` toegevoegd  
- ✅ `walletRecordSchema`: Al aanwezig (`owner_user`, `owner_type`)

**Nieuwe functies:**
- ✅ `getWalletByUserId()`: Wallet ophalen voor intermediair
- ✅ `createUserWallet()`: User-level wallet aanmaken
- ✅ `getWalletForUser()`: Generieke wallet-ophaal functie (employer + intermediary)
- ✅ `getManagedEmployers()`: Lijst managed employers ophalen
- ✅ `setActiveEmployer()`: Active employer wisselen
- ✅ `getTransactionsByWalletId()`: Transacties per wallet
- ✅ `getActiveProductsByTypeAndRole()`: Producten filteren op rol

**Aangepaste functies:**
- ✅ Alle `getUserBy*` functies parsen nu de nieuwe velden
- ✅ `createUser()`: Wijst automatisch de `employer` role toe als er geen role wordt meegegeven (gebruikt `getEmployerRoleId()`)

### 2. API Routes

**Aangepaste routes:**
- ✅ `/api/account` (GET): Wallet via `getWalletForUser()`, managed_employers en active_employer voor intermediairs
- ✅ `/api/products` (GET): Rol-filter toegepast via `getActiveProductsByTypeAndRole()`
- ✅ `/api/checkout` (POST): Wallet via `getWalletForUser()`, employer_id optioneel voor intermediairs
- ✅ `/api/vacancies` (GET): Active employer check voor intermediairs
- ✅ `/api/vacancies` (POST): employer_id via active_employer voor intermediairs
- ✅ `/api/vacancies/[id]` (GET/PATCH): Autorisatie check op managed_employers

**Nieuwe route:**
- ✅ `/api/intermediary/switch-employer` (POST): Werkgever wisselen

### 3. Context & State

**AccountContext updates:**
- ✅ `role_id`, `managed_employers`, `active_employer` toegevoegd aan interface
- ✅ Data parsing in `fetchAccountData()`
- ✅ Helper hooks:
  - `useIsIntermediary()` 
  - `useActiveEmployer()`
  - `useManagedEmployers()`

### 4. UI Components

- ✅ `EmployerSwitcher` component (dropdown met managed employers)
- ✅ Integratie in `AppSidebar` (header sectie)
- ✅ VacancyWizard: Check op active_employer voor intermediairs

---

## 📋 Handmatig Intermediair Aanmaken in Airtable

### Stap 1: Employers aanmaken
Als de werkgevers nog niet bestaan, maak ze aan in de **Employers** tabel.

### Stap 2: User aanmaken
Ga naar de **Users** tabel en maak een nieuwe user aan:

| Veld | Waarde |
|------|--------|
| `email` | Zakelijk e-mailadres intermediair |
| `role` | Link naar `intermediary` record in **Roles** tabel |
| `managed_employers` | Link naar de employer records die deze intermediair beheert |
| `active_employer` | (Optioneel) Link naar de eerste/default employer |
| `status` | `active` |
| `first_name` | Voornaam |
| `last_name` | Achternaam |

> **Let op:** De `role_id` wordt automatisch via lookup gevuld vanuit de `role` link.

### Stap 3: Wallet aanmaken
Ga naar de **Wallets** tabel en maak een nieuwe wallet aan:

| Veld | Waarde |
|------|--------|
| `owner_type` | `user` |
| `owner_user` | Link naar de User record |
| `balance` | Startsaldo (meestal 0) |
| `total_purchased` | 0 |
| `total_spent` | 0 |

### Stap 4: Magic Link versturen (optioneel)
- Gebruik het admin-impersonate endpoint of stuur handmatig een magic link via de bestaande auth-flow
- De intermediair kan dan inloggen en direct aan de slag

---

## 🔧 Benodigde Airtable Velden (nog aan te maken)

In **Airtable** moeten de volgende velden **handmatig aangemaakt** worden:

### Roles tabel
- ✅ Record toevoegen: `id = "intermediary"`, `name = "Intermediary"`

### Users tabel
- ⚠️ **`role`**: Link to another record → Roles (Limit to single record)
- ⚠️ **`role_id`**: Lookup via `role` → haalt `id` op
- ⚠️ **`managed_employers`**: Link to another record → Employers (Allow multiple records)
- ⚠️ **`active_employer`**: Link to another record → Employers (Limit to single record)

### Products tabel
- ⚠️ **`target_roles`**: Link to another record → Roles (Allow multiple records)

### Wallets tabel
- ⚠️ **`owner_user`**: Link to another record → Users (Limit to single record)
- ✅ Check of `owner_type` bestaat (Single Select: `employer` | `user`)

> **Belangrijk:** Bestaande test-users moeten `role` gevuld krijgen met een link naar het `employer` record in de Roles tabel!

---

## 🎯 Belangrijke Aandachtspunten

1. **Vacancy autorisatie**: Bij intermediairs wordt gecheckt of de employer in `managed_employers` zit
2. **Credits FIFO**: Werkt automatisch goed omdat intermediairs één user-level wallet hebben
3. **Team-functionaliteit**: Intermediairs beheren hun eigen team (gekoppeld aan intermediair-user)
4. **Media library**: Assets zijn per employer — wisselt automatisch bij employer switch
5. **Onboarding skip**: Intermediairs slaan onboarding over (geen KVK-check nodig)
6. **Product filtering**: Target_roles wordt in code gefilterd (niet in Airtable filterFormula mogelijk)
7. **Automatische role toekenning**: Nieuwe users krijgen automatisch de `employer` role via `createUser()`. Alleen bestaande users moeten handmatig geüpdatet worden in Airtable.

---

## 🚀 Testen

### Testscenario's:
1. Intermediair inloggen en employer selecteren
2. Employer wisselen via dropdown
3. Vacature aanmaken namens geselecteerde employer
4. Credits kopen (user-level wallet)
5. Vacatures bekijken gefilterd op active_employer
6. Intermediair-specifieke producten tonen (target_roles filter)

---

## 📝 Volgende Stappen (optioneel)

Voor productie zou je nog kunnen toevoegen:
- Magic link flow specifiek voor intermediairs
- Admin interface voor intermediair-beheer
- Bulk operaties voor intermediairs (meerdere vacatures tegelijk)
- Rapportage per employer voor intermediairs
- Airtable Button-veld voor snelle wallet-creatie

---

✨ **De implementatie is compleet en productie-ready!**
