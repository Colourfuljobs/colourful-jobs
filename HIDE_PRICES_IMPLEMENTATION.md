# Implementatie: Prijzen verbergen bij voldoende credits

**Datum:** 17 februari 2026
**Status:** ✅ Geïmplementeerd

---

## Overzicht

Wanneer een werkgever genoeg credits heeft om het volledige vacaturepakket (pakket + upsells) te betalen, worden **nergens in de wizard eurobedragen getoond**. De beleving is: "Ik heb credits, ik kies wat ik wil, klaar." Prijzen zijn alleen relevant wanneer er bijbetaald moet worden.

---

## Geïmplementeerde wijzigingen

### Bestanden gewijzigd:
1. ✅ VacancyWizard.tsx
2. ✅ PackageSelector.tsx  
3. ✅ CostSidebar.tsx
4. ✅ WeDoItForYouBanner.tsx
5. ✅ SubmitStep.tsx (verificatie - geen wijzigingen nodig)
6. ✅ ExtensionCard.tsx (verificatie - geen wijzigingen nodig)

---

### 1. VacancyWizard.tsx

**Imports aangepast (regel 3):**
```typescript
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
```

**Centrale logica toegevoegd (regel 105-111):**
```typescript
// Calculate if we should hide all prices in PackageSelector (step 1)
// Hide prices only if user can afford the most expensive package with credits
const hideAllPrices = useMemo(() => {
  if (packages.length === 0) return false;
  const maxPackageCredits = Math.max(...packages.map(pkg => pkg.credits));
  return availableCredits >= maxPackageCredits;
}, [packages, availableCredits]);
```

**Beslissing:** Globale check op het duurste pakket
- Als je 22 credits hebt en Premium kost 23 → overal prijzen zichtbaar
- Als je 23+ credits hebt → nergens prijzen in de hele wizard
- Dit voorkomt inconsistente mix van wel/geen prijzen per kaart

**PackageSelector prop toegevoegd (regel 1041):**
```typescript
hideAllPrices={hideAllPrices}
```

**Sticky footer aangepast (regel 1426-1453):**
- Europrijs wordt alleen getoond als `!hasEnoughCredits`
- Bij voldoende credits: alleen "X credits" (geen euro-deel)
- We do it for you tekst: europrijs alleen bij onvoldoende credits

### 2. PackageSelector.tsx

**Nieuwe prop toegevoegd (regel 11-17):**
```typescript
interface PackageSelectorProps {
  // ... bestaande props
  hideAllPrices?: boolean;  // ← nieuw
  onBuyCredits?: () => void;
}
```

**Europrijs conditioneel verborgen (regel 183-191):**
```typescript
<div className="flex items-baseline gap-2">
  <span className="text-2xl font-bold text-[#1F2D58]">
    {pkg.credits} credits
  </span>
  {!hideAllPrices && (
    <span className="text-sm text-[#1F2D58]/50">
      €{pkg.price...}
    </span>
  )}
</div>
```

### 3. CostSidebar.tsx

**Alle bedragen aangepast naar "X credits" formaat (regel 109-139):**
- Pakketregel: `{selectedPackage.display_name} — {packageCredits} credits`
- Extra's regel: `Extra's (X) — +{extraCredits} credits`
- Totaal regel: `Totaal — {totalCredits} credits`
- Beschikbare credits: `{availableCredits} credits`

**"Te betalen" sectie:**
- Volledig verborgen bij `hasEnoughCredits` (regel 175-219)
- Blijft zichtbaar met eurobedragen bij shortage

**"Over na plaatsing" sectie:**
- Alleen zichtbaar bij `hasEnoughCredits` (regel 141-171)
- Toont `{creditsRemaining} credits`

### 4. SubmitStep.tsx & ExtensionCard.tsx

**Verificatie uitgevoerd:** ✅
- Beide componenten tonen alleen credits (geen eurobedragen)
- Geen wijzigingen nodig

### 5. WeDoItForYouBanner.tsx

**Nieuwe prop toegevoegd (regel 7-12):**
```typescript
interface WeDoItForYouBannerProps {
  product: ProductRecord;
  onSelect: () => void;
  hasEnoughCredits?: boolean;  // ← nieuw
}
```

**Europrijs conditioneel verborgen (regel 25-27):**
```typescript
<p className="text-sm font-medium text-[#1F2D58] mb-4">
  +{product.credits} credits{!hasEnoughCredits && <span>...</span>}
</p>
```

**In VacancyWizard.tsx (regel 1285-1295):**
- Berekent `hasEnoughCredits` voor pakket + huidige upsells + WDIFY upsell
- Geeft deze door aan WeDoItForYouBanner component

**"We do it for you" selected state (regel 1297-1313):**
- Europrijs ook conditioneel verborgen wanneer al geselecteerd
- Gebruikt dezelfde logica: `hasEnoughCredits` check

---

## Gedrag per component

### Stap 1 – PackageSelector
| Scenario | Gedrag |
|----------|---------|
| ≥23 credits (meest dure pakket) | Nergens prijzen |
| <23 credits | Overal prijzen |

### Stap 2-4 – CostSidebar
| Scenario | Gedrag |
|----------|---------|
| Voldoende credits voor pakket + upsells | Alleen credits, geen euro's |
| Onvoldoende credits | Credits + eurobedragen + "Te betalen" sectie |

### Sticky footer
| Scenario | Gedrag |
|----------|---------|
| Voldoende credits | `Compleet | 23 credits` |
| Onvoldoende credits | `Compleet | 23 credits | €525` |

---

## Edge cases

### ✅ Gebruiker selecteert upsells waardoor credits niet meer toereikend zijn
- De prijzen verschijnen automatisch (reactieve state)
- `hasEnoughCredits` flipt naar `false` → euro's worden getoond

### ✅ "We Do It For You" upsell
- Credits worden meegeteld in `selectedUpsells`
- Europrijs in footer alleen bij onvoldoende credits

### ✅ Credits bijkopen tijdens wizard (CreditsCheckoutModal)
- Na aankoop: `refetchCredits()` → `availableCredits` update
- Prijzen verdwijnen automatisch als saldo toereikend is
- `isPendingUpdate` voorkomt flicker

### ✅ PackageSelector: globale check op duurste pakket
- Consistent: alle prijzen tonen of geen prijzen tonen
- Geen per-pakket logica (voorkomt visuele inconsistentie)

---

## Niet in scope

- **BoostModal** (`BoostModal.tsx`): Apart flow buiten wizard
- **CreditsCheckoutModal**: Aankoopscherm moet altijd prijzen tonen
- **Orders/transactie-overzicht**: Historische data blijft volledig

---

## Testing checklist

- [ ] Test met 15 credits (Basic pakket): prijzen zichtbaar
- [ ] Test met 20 credits (Compleet pakket): prijzen zichtbaar (Premium nog te duur)
- [ ] Test met 23+ credits: nergens prijzen in stap 1
- [ ] Test upsell toggle: prijzen verschijnen als shortage ontstaat
- [ ] Test credits bijkopen: prijzen verdwijnen bij voldoende saldo
- [ ] Test sticky footer: euro-deel verdwijnt bij voldoende credits
- [ ] Test CostSidebar: "Over na plaatsing" zichtbaar bij voldoende credits

---

## Samenvatting voor QA

**Kernregel:** `hasEnoughCredits === true` → **geen eurobedragen tonen**

**Test scenario's:**
1. Start met weinig credits → prijzen overal zichtbaar
2. Koop credits bij tijdens wizard → prijzen verdwijnen automatisch
3. Selecteer dure upsells → prijzen verschijnen als shortage ontstaat
4. Submit met voldoende credits → bevestiging zonder prijzen

**Visuele verificatie:**
- Stap 1 (PackageSelector): geen "€425" onder credits
- Stap 2-4 (CostSidebar): alleen "X credits", geen "€X"
- Sticky footer: geen "| €525" na credits
- Stap 4 (SubmitStep): factuurgegevens volledig verborgen
