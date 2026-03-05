# PRD: Colourful Jobs — n8n Automatiseringen

## Vision

Colourful Jobs is een Nederlands vacatureplatform dat werkgevers verbindt met werkzoekenden die op zoek zijn naar diversiteit en inclusie. Dit document beschrijft alle n8n-automatiseringen: datasync van Airtable naar Webflow (met AI-gegenereerde SEO-content), transactionele e-mails via MailerSend, facturatie via WeFact, en centrale error monitoring via Slack.

---

## Architectuur Overzicht

```
┌─────────────┐     webhook / schedule      ┌─────────┐     Webflow API     ┌─────────────┐
│  Airtable   │ ──────────────────────────▶ │  n8n    │ ──────────────────▶ │  Webflow    │
│  (Source of │                             │ work-   │                     │  CMS        │
│   Truth)    │ ◀── status updates ──────── │ flows   │ ── AI (Anthropic) ──│  (Public    │
└─────────────┘                             │         │                     │   Website)  │
                                            │         │  MailerSend API     └─────────────┘
      Next.js app ──── webhooks ──────────▶ │         │ ──────────────────▶ Werkgever e-mail
                                            │         │
                                            │         │  WeFact API
                                            │         │ ──────────────────▶ Facturen
                                            └─────────┘
```

**Eenrichtingsverkeer**: Data stroomt altijd van Airtable → Webflow. Webflow is read-only vanuit sync-perspectief. Airtable is de enige bron van waarheid.

---

## Webflow Site

| Property | Value |
|---|---|
| Site ID | `69845709ef5e7bf2a18e422c` |
| Display Name | Colourful Jobs |
| Timezone | Europe/Amsterdam |
| Primary Locale | Dutch (Netherlands) — `nl-NL` |
| CMS Locale ID | `698f296387bf2d0fb84575be` |

---

## Data Architecture

### Airtable Tables (Source of Truth)

| Table | Airtable Const | Doel |
|---|---|---|
| Vacancies | `VACANCIES_TABLE` | Alle vacaturedata inclusief status, content, contactinfo, media |
| Employers | `EMPLOYERS_TABLE` | Werkgeversprofiel, logo, header, gallery, FAQ, video |
| Sectors | `SECTORS_TABLE` | Sector lookup (bijv. "Financiën", "IT") |
| Regions | `REGIONS_TABLE` | Regio lookup (bijv. "Noord-Holland", "Utrecht") |
| Fields | `FIELDS_TABLE` | Vakgebied lookup (bijv. "Marketing", "Engineering") |
| FunctionTypes | `FUNCTION_TYPES_TABLE` | Functietype lookup (bijv. "Fulltime", "Interim") |
| EducationLevels | `EDUCATION_LEVELS_TABLE` | Opleidingsniveau lookup (bijv. "HBO", "WO") |
| Products | `PRODUCTS_TABLE` | Pakketten en creditbundels |
| Features | `FEATURES_TABLE` | Features per product (bijv. "Social media boost") |
| Media Assets | `MEDIA_ASSETS_TABLE` | Afbeeldingen (logo's, sfeerbeelden) |
| FAQ | `FAQ_TABLE` | Veelgestelde vragen per werkgever |

### Webflow CMS Collections

| Collection | Collection ID | Slug | Type |
|---|---|---|---|
| **● Vacancies** | `698f2d230f76d5421abc1c25` | `vacancies` | Hoofdcollectie |
| **● Employers** | `698f2cf671770f147a7aca51` | `employers` | Hoofdcollectie |
| └─ ○ Fields | `698f296387bf2d0fb84575ee` | `fields` | Lookup |
| └─ ○ Regions | `698f2b725f21acace3a9cb12` | `regions` | Lookup |
| └─ ○ Function Types | `698f2bea668f9bd10bfcd8ad` | `function-types` | Lookup |
| └─ ○ Education Levels | `698f2c4de7de3d57f704ecb4` | `education-levels` | Lookup |
| └─ ○ Sectors | `698f2c4ee7de3d57f704ed14` | `sectors` | Lookup |
| ○ FAQs | `698f2d8df5e04afffc19b4ea` | `faq` | Support |
| ○ Products | `698f2eeadbfebea38d2ec41f` | `products` | Support |
| ○ Features | `698f2eeaf2a6e8d393b05a8e` | `features` | Support |

---

## Field Mappings

### Vacancy: Airtable → Webflow

| Airtable Field | Type (AT) | Webflow Slug | Type (WF) | Transformatie |
|---|---|---|---|---|
| `title` | Text | `name` | PlainText (required) | Direct |
| — | — | `slug` | PlainText (required) | Genereer uit title: lowercase, kebab-case, uniek |
| `description` | RichText | `content` | RichText | Direct (HTML) |
| `intro_txt` | Text | — | — | Niet in Webflow; alleen in Next.js app |
| `location` | Text | `vacancy-location` | PlainText | Direct |
| `hrs_per_week` | Text | `vacancy-hours` | PlainText | Direct |
| `salary` | Text | `vacancy-salary` | PlainText | Direct |
| `closing_date` | Date | `closing-date` | DateTime | ISO 8601 format |
| `first-published-at` | Date | `date-added` | DateTime | ISO 8601 format |
| `contact_name` | Text | `contact-full-name` | PlainText | Direct |
| `contact_role` | Text | `contact-role` | PlainText | Direct |
| `contact_company` | Text | `contact-company` | PlainText | Direct |
| `contact_email` | Email | `contact-email` | Email | Direct |
| `contact_phone` | Phone | `contact-phone` | Phone | Direct |
| `contact_photo` | Attachment → Media Asset | `contact-photo` | File | URL van Cloudinary/Airtable attachment |
| — | — | `contact-photo---alt-tekst` | PlainText | Genereer uit contact_name |
| `apply_url` | URL | `apply-link` | Link | Direct |
| `show_apply_form` | Boolean | `apply-apply-form-visible` | Switch | Direct |
| `header_image` | Linked (Media Asset) | `hero-card-visual` | Image | Resolve attachment URL via Media Asset record |
| — | — | `hero-card-alt-text` | PlainText | Uit Media Asset `alt_text`, of genereer |
| `gallery` | Linked (Media Assets) | `images-slider` | MultiImage | Resolve attachment URLs |
| `employer_id` | Linked Record | `employer` | Reference | Map Airtable employer ID → Webflow employer item ID |
| `function_type_id` | Linked Record | `vacancy-function-types` | MultiReference | Map Airtable ID → Webflow item ID |
| `education_level_id` | Linked Record | `vacancy-education-level` | MultiReference | Map Airtable ID → Webflow item ID |
| `field_id` | Linked Record | `vacancy-fields` | MultiReference | Map Airtable ID → Webflow item ID |
| `region_id` | Linked Record | `vacancy-regions` | MultiReference | Map Airtable ID → Webflow item ID |
| `sector_id` | Linked Record | `vacancy-sectors` | MultiReference | Map Airtable ID → Webflow item ID |
| — | — | `seo-title` | PlainText | **AI-gegenereerd** (50-60 chars, NL) |
| — | — | `seo-meta-description` | PlainText | **AI-gegenereerd** (150-160 chars, NL) |
| `high_priority` | Boolean | — | — | Interne vlag voor "Vandaag online" — wordt niet naar Webflow gestuurd |
| `is_featured` | Boolean | `featured` | Switch | Direct mapping — gezet door Next.js app bij aankoop van `prod_upsell_featured`, verwijderd door n8n na X dagen (uit `duration_days` van product) |
| `is_new` | Boolean | `new` | Switch | Direct mapping — gezet door Airtable automation bij eerste publicatie, verwijderd door n8n na 3 dagen |

### Employer: Airtable → Webflow

| Airtable Field | Type (AT) | Webflow Slug | Type (WF) | Transformatie |
|---|---|---|---|---|
| `display_name` / `company_name` | Text | `name` | PlainText (required) | `display_name` als aanwezig, anders `company_name` |
| — | — | `slug` | PlainText (required) | Genereer uit name: lowercase, kebab-case, uniek |
| `short_description` | Text | `content` | RichText | Wrap in HTML als nodig |
| `location` | Text | `location` | PlainText | Direct |
| `website_url` | URL | `website` | Link | Direct |
| `logo` | Linked (Media Asset) | `logo` | Image | Resolve attachment URL |
| — | — | `logo-alt-text` | PlainText | Genereer: "{company_name} logo" |
| `header_image` | Linked (Media Asset) | `hero-visual` | Image | Resolve attachment URL |
| — | — | `hero-visual---alt-text` | PlainText | Uit Media Asset of genereer |
| `gallery` | Linked (Media Assets) | `images` | MultiImage | Resolve attachment URLs |
| `sector` | Linked Record | `sector` | Reference | Map Airtable ID → Webflow item ID |
| `faq` | Linked Records | `faq` | MultiReference | Map Airtable FAQ IDs → Webflow FAQ item IDs (volgorde behouden!) |
| — | — | `seo-title` | PlainText | **AI-gegenereerd** (50-60 chars, NL) |
| — | — | `seo-meta-description` | PlainText | **AI-gegenereerd** (150-160 chars, NL) |
| `video_url` | URL | `video-link` | Link | Direct |
| — | — | `in-the-spotlight` | Switch | Business rule: handmatig of upsell-driven |

### Lookup Collections: Airtable → Webflow

Alle lookup collections (Fields, Regions, Function Types, Education Levels, Sectors) hebben **dezelfde structuur** in Webflow:

| Airtable Field | Webflow Slug | Type | Transformatie |
|---|---|---|---|
| `name` | `name` | PlainText (required) | Direct |
| — | `slug` | PlainText (required) | Genereer uit name |
| — | `hero-intro` | PlainText | **AI-gegenereerd** (NL, korte intro voor filterpagina) |
| — | `seo-title` | PlainText | **AI-gegenereerd** (50-60 chars, NL) |
| — | `seo-meta-description` | PlainText | **AI-gegenereerd** (150-160 chars, NL) |
| — | `seo-text` | PlainText | **AI-gegenereerd** (NL, 300-500 woorden, SEO body text voor filterpagina) |
| — | `hero-visual` | Image | Niet via sync; handmatig uploaden in Webflow |
| — | `hero-alt-text` | PlainText | Genereer uit name als hero-visual aanwezig |

### FAQ: Airtable → Webflow

| Airtable Field | Webflow Slug | Type | Transformatie |
|---|---|---|---|
| `question` (name in AT) | `name` | PlainText (required) | Direct |
| — | `slug` | PlainText (required) | Genereer uit question |
| `answer` | `answer` | RichText | Direct (HTML) |
| — | `button---visibility` | Switch | Default `false` tenzij specifiek ingesteld |
| — | `button---text` | PlainText | Optioneel |
| — | `button---link` | Link | Optioneel |

### Products: Airtable → Webflow

| Airtable Field | Webflow Slug | Type | Transformatie |
|---|---|---|---|
| `display_name` | `name` | PlainText (required) | Direct |
| — | `slug` | PlainText (required) | Genereer uit name |
| `type` | `type` | Option | Map: "vacancy_package" → "Vacancy package", "credit_bundle" → "Credit bundle" |
| `credits` | `credits` | Number | Direct |
| `base_price` | `base-price` | Number | Direct (in euro's) |
| `price` | `price` | Number | Direct (in euro's) |
| `discount_percentage` | `discount-percentage` | Number | Direct |
| `sort_order` | `sort-order` | Number | Direct |
| Features (linked) | `features` | MultiReference | Map Airtable feature IDs → Webflow feature item IDs |

### Features: Airtable → Webflow

| Airtable Field | Webflow Slug | Type | Transformatie |
|---|---|---|---|
| `display_name` | `name` | PlainText (required) | Direct |
| — | `slug` | PlainText (required) | Genereer uit name |
| `duration_days` | `duration-days` | Number | Direct |
| `sort_order` | `sort-order` | Number | Direct |
| `package_category` | `categorie` | Option | Direct. Waarden in Airtable: "Altijd inbegrepen", "Extra boost", "Snel en in de spotlight", "Upsell" |

---

## ID Mapping Strategie (✅ Geïmplementeerd)

Airtable record ID's (bijv. `recABC123`) zijn anders dan Webflow item ID's (bijv. `64f...`). Voor het syncen van references en multi-references wordt de mapping bijgehouden via een `webflow_item_id` veld op elke Airtable tabel die gesynchroniseerd wordt.

**Gekozen aanpak**: Elk Airtable record heeft een eigen `webflow_item_id` text field. Geen aparte mapping table — dit voorkomt extra API calls bij elke sync.

**Hoe references resolven**: Wanneer een vacancy bijv. een `sector_id` heeft, haal je het `webflow_item_id` op uit het gekoppelde Sectors record en gebruik je dat als reference in Webflow.

---

## Workflows

### Workflow 1: Lookup Tables Sync (Sectors, Regions, Fields, FunctionTypes, EducationLevels)

**Trigger**: Schedule — 1x per dag (06:00 CET) + handmatige trigger
**Prioriteit**: Moet als EERSTE draaien want andere syncs zijn afhankelijk van lookup ID mappings

**Flow**:
1. **Itereer over alle collections**: Sectors, Regions, Fields, FunctionTypes, EducationLevels
2. **Haal alle records op** uit de betreffende Airtable tabel
3. **Haal alle items op** uit de corresponderende Webflow collection
4. **Vergelijk** op basis van `webflow_item_id` veld in Airtable:
   - Nieuw (geen `webflow_item_id`): Maak item aan in Webflow
   - Bestaand (heeft `webflow_item_id`): Update item in Webflow als data gewijzigd
   - Verwijderd (Webflow item bestaat maar Airtable record niet): Archiveer/verwijder in Webflow
5. **AI-stap**:
   - `seo-title`: max 60 chars, Nederlands, formaat: "Vacatures in {name} | Colourful Jobs" (voor Regions) of vergelijkbaar per type
   - `seo-meta-description`: max 160 chars, Nederlands, beschrijvend
   - `hero-intro`: 1-2 zinnen, Nederlands, uitnodigend
   - `seo-text`: 300-500 woorden, Nederlands, keyword-rich, naam minimaal 4x gebruiken
6. **Update Airtable**: Sla `webflow_item_id` op in het Airtable record
7. **Publish** de items in Webflow

**AI Prompt Template**:
```
Je bent een Nederlandse SEO-copywriter voor Colourful Jobs, een inclusief vacatureplatform.

Genereer voor de {collection_type} "{name}" de volgende teksten in het Nederlands:

1. seo_title (max 60 karakters): Pakkende paginatitel voor zoekmachines. Formaat: "{name} vacatures | Colourful Jobs"
2. seo_meta_description (max 160 karakters): Korte, uitnodigende beschrijving voor zoekresultaten. Benoem het type vacatures en Colourful Jobs.
3. hero_intro (max 200 karakters): Korte, wervende introductietekst voor bovenaan de filterpagina.
4. seo_text (300-500 woorden): Informatieve SEO-tekst over vacatures in deze {collection_type}. Gebruik de naam van de {collection_type} minimaal 4x. Toon: professioneel maar toegankelijk, inclusief en uitnodigend.

Antwoord in JSON formaat: { "seo_title": "...", "seo_meta_description": "...", "hero_intro": "...", "seo_text": "..." }
```

**Sync Status**: Via `webflow_item_id` veld in Airtable

---

### Workflow 2: Employer Sync

**Trigger**: Webhook (van Next.js app) + Schedule (elke 30 minuten als vangnet)
**Afhankelijkheid**: Lookup Tables Sync moet minimaal 1x gedraaid hebben

**Flow**:
1. **Ontvang webhook** met `employer_id` OF haal alle employers op met `status = "active"`
2. **Haal employer data op** uit Airtable inclusief:
   - Basis fields (name, location, website, etc.)
   - Linked records: logo (Media Asset → attachment URL), header_image, gallery, sector, FAQ
3. **Resolve references**: 
   - Sector → haal `webflow_item_id` op uit Airtable Sectors tabel
   - FAQ items → sync FAQ items naar Webflow als onderdeel van deze workflow, haal `webflow_item_id`'s op
4. **Resolve media**:
   - Logo: Haal Media Asset record op → extract `file[0].url` (Airtable attachment URL)
   - Header image: Idem
   - Gallery: Haal de Media Asset records op uit het `gallery` linked field op de Employer (de IDs die de werkgever heeft geselecteerd) → extract `file[0].url` per record
5. **AI-stap**: Genereer SEO-content:
   - `seo-title`: "{display_name} | Werken bij | Colourful Jobs" (max 60 chars)
   - `seo-meta-description`: Korte beschrijving gebaseerd op `short_description` en sector
6. **Upsert in Webflow**:
   - Als `webflow_item_id` bestaat → Update
   - Zo niet → Create
7. **Update Airtable**: Sla `webflow_item_id` op
8. **Publish** het item

**AI Prompt Template** (Employer SEO):
```
Je bent een Nederlandse SEO-copywriter voor Colourful Jobs.

Genereer SEO-teksten voor werkgever "{company_name}":
- Sector: {sector_name}
- Locatie: {location}
- Beschrijving: {short_description}

1. seo_title (max 60 karakters): "Werken bij {company_name} | Colourful Jobs"
2. seo_meta_description (max 160 karakters): Beschrijf het bedrijf en waarom kandidaten er willen werken.

Antwoord in JSON: { "seo_title": "...", "seo_meta_description": "..." }
```

---

### Workflow 3: Vacancy Publish → Webflow Create

**Trigger**: Webhook van Next.js app (via `triggerWebflowSync()`)
**Signaal**: `needs_webflow_sync = true` in Airtable + vacancy status = `"gepubliceerd"`
**Vangnet**: Schedule elke 15 minuten: zoek alle vacatures waar `needs_webflow_sync = true`

**Flow**:
1. **Ontvang webhook** met `vacancy_id`
2. **Haal vacancy op** uit Airtable met alle velden
3. **Valideer** status is `"gepubliceerd"` (Airtable waarde: `"Gepubliceerd"`)
4. **Resolve alle references**:
   - `employer_id` → haal `webflow_item_id` uit Employers tabel
   - `function_type_id` → haal `webflow_item_id` uit FunctionTypes tabel
   - `education_level_id` → haal `webflow_item_id` uit EducationLevels tabel
   - `field_id` → haal `webflow_item_id` uit Fields tabel
   - `region_id` → haal `webflow_item_id` uit Regions tabel
   - `sector_id` → haal `webflow_item_id` uit Sectors tabel
5. **Resolve media**:
   - `header_image` → Media Asset → Airtable attachment URL
   - `gallery` → Media Assets → Airtable attachment URLs
   - `contact_photo` → Media Asset → Airtable attachment URL
6. **AI-stap**: Genereer SEO-content:
   - `seo-title`: Gebaseerd op vacancy title, employer name, locatie
   - `seo-meta-description`: Gebaseerd op vacancy title, intro_txt, employer, locatie
7. **Bereken afgeleide velden**:
   - `new`: `true` als `first-published-at` < 3 dagen geleden
   - `featured`: waarde van `high_priority` uit Airtable
   - `slug`: genereer unieke slug uit title
8. **Create of Update** in Webflow:
   - Als `webflow_item_id` leeg → Create nieuw CMS item
   - Als `webflow_item_id` gevuld → Update bestaand item
9. **Publish** het item in Webflow
10. **Update Airtable**:
    - Sla `webflow_item_id` op
    - Sla `public_url` op (Webflow URL)
    - Zet `needs_webflow_sync = false`
11. **Log event** in Airtable Events tabel: `vacancy_webflow_synced` met `action: "create"`

**AI Prompt Template** (Vacancy SEO):
```
Je bent een Nederlandse SEO-copywriter voor Colourful Jobs, een inclusief vacatureplatform.

Genereer SEO-teksten voor deze vacature:
- Functie: {title}
- Werkgever: {employer_name}
- Locatie: {location}
- Samenvatting: {intro_txt}

1. seo_title (max 60 karakters): Pakkende titel met functienaam en werkgever/locatie.
2. seo_meta_description (max 160 karakters): Wervende beschrijving die aanzet tot klikken. Benoem de functie, werkgever, en wat het bijzonder maakt.

Antwoord in JSON: { "seo_title": "...", "seo_meta_description": "..." }
```

---

### Workflow 4: Vacancy Update → Webflow Update

**Trigger**: Webhook van Next.js app (via `triggerWebflowSync()`) voor bestaande vacatures
**Signaal**: `needs_webflow_sync = true` + `webflow_item_id` is al gevuld

**Flow**: Identiek aan Workflow 3, maar:
- Altijd **Update** (nooit Create)
- SEO-teksten NIET opnieuw genereren als ze al gevuld zijn in Webflow (zodat handmatige optimalisaties behouden blijven)
- `new` badge opnieuw berekenen
- Na succesvolle update: `needs_webflow_sync = false`
- **Log event**: `vacancy_webflow_synced` met `action: "update"`

---

### Workflow 5: Vacancy Depublish → Webflow Archiveren

**Trigger**: Webhook van Next.js app (bij depublish/verlopen)
**Signaal**: `needs_webflow_sync = true` + status = `"gedepubliceerd"` of `"verlopen"`

**Flow**:
1. **Ontvang webhook** met `vacancy_id`
2. **Haal vacancy op** — check status is `"gedepubliceerd"` of `"verlopen"`
3. **Haal `webflow_item_id` op** uit Airtable
4. **Archiveer** het item in Webflow: `_archived: true` (zie Beslissingen §1)
5. **Update Airtable**: Zet `needs_webflow_sync = false`
6. **Log event** in Airtable Events tabel: `vacancy_webflow_synced` met `action: "archive"`

---

### Workflow 6: Products & Features Sync

**Trigger**: Schedule — 1x per dag (06:30 CET) + handmatige trigger
**Prioriteit**: Laag — deze data wijzigt zelden

**Flow**:
1. **Haal alle Products op** uit Airtable met `is_active = true`
2. **Haal alle Features op** uit Airtable met `is_active = true`
3. **Sync Features eerst** (Products refereren naar Features):
   - Upsert in Webflow Features collection
   - Update `webflow_item_id` in Airtable
4. **Sync Products**:
   - Resolve Feature references via `webflow_item_id`
   - Upsert in Webflow Products collection
   - Update `webflow_item_id` in Airtable
5. **Publish** alle items

---

### Workflow 7: "New" Label Expiry

**Trigger**: Schedule — dagelijks (bijv. 00:15 CET)
**Doel**: Automatisch het `is_new` veld op `false` zetten voor vacatures die langer dan 3 dagen gepubliceerd zijn

**Achtergrond**: 
- Het `is_new` veld wordt op `true` gezet door een Airtable automation bij eerste publicatie van een vacature
- Deze n8n workflow zorgt ervoor dat het label na 3 dagen automatisch wordt verwijderd
- Het `is_new` veld in Airtable wordt direct gemapt naar de `new` switch in Webflow

**Flow**:
1. **Haal alle vacatures op** uit Airtable waar:
   - `is_new = true`
   - `first-published-at` is ingevuld
   - `first-published-at < now() - 3 dagen`
2. **Per vacature**:
   - Zet `is_new = false` in Airtable
   - Zet `needs_webflow_sync = true` in Airtable
3. De reguliere Vacancy Sync (Workflow 3/4) pikt de `needs_webflow_sync = true` op en synct de updated `new` switch naar Webflow

**Airtable Formula voor filtering** (optioneel, als je een view wilt maken):
```
AND(
  {is_new} = TRUE(),
  {first-published-at} != "",
  DATETIME_DIFF(NOW(), {first-published-at}, 'days') >= 3
)
```

---

### Workflow 8: Factuur Aanmaken via WeFact

**Trigger**: Webhook van Next.js app (bij aankoop met eurobedrag)
**Doel**: Automatisch een factuur aanmaken en versturen via WeFact wanneer een werkgever iets koopt met (deels) euros

**Wanneer wordt deze workflow getriggerd?**
- Bij aankoop van een **creditpakket** (betaling volledig in euros)
- Bij aankoop van een **vacaturepakket of upsell** waarbij er naast credits ook een **eurobedrag** in rekening wordt gebracht (gemengde betaling)
- Niet van toepassing als de aankoop volledig met credits betaald wordt (geen eurobedrag)

**Databronnen voor de factuur**:
- **Employer**: `company_name`, factuuradres, KVK-nummer, btw-nummer (uit Airtable Employers tabel)
- **Product**: `display_name`, `price` (in euros), `wefact_product_code` (koppeling naar WeFact artikelcatalogus), `credits` (ter informatie)
- **Transaction**: `transaction_id`, `created_at`, bedrag in euros, betaalmethode

**Product-matching met WeFact**:
Elk product in Airtable krijgt een `wefact_product_code` veld. Dit is de artikelcode zoals die in WeFact is aangemaakt. Bij het aanmaken van een factuurregel stuurt n8n deze code mee, zodat WeFact automatisch de juiste omschrijving, prijs en BTW-tarief uit de WeFact artikelcatalogus laadt. Dit zorgt voor consistente boekhouding.

Vereiste actie: voeg alle producten en upsells handmatig aan de WeFact artikelcatalogus toe (met een unieke artikelcode), en vul die codes in op het `wefact_product_code` veld in Airtable.

**Flow**:
1. **Ontvang webhook** van Next.js app met:
   - `employer_id`
   - `transaction_id`
   - `product_id`
   - `amount_euros` (het te factureren eurobedrag)
   - `amount_credits` (credits bij gemengde betaling, ter informatie op factuur)
2. **Haal employer data op** uit Airtable:
   - Bedrijfsnaam, contactpersoon, e-mailadres, factuuradres, KVK, btw-nummer
3. **Haal product data op** uit Airtable:
   - `display_name`, `price`, `wefact_product_code`
   - Als `wefact_product_code` leeg is → log een waarschuwing en val terug op vrije tekstregel met `display_name` en `amount_euros`
4. **Controleer of werkgever al bestaat in WeFact**:
   - Zoek op btw-nummer of KVK-nummer via WeFact Relaties API
   - **Bestaat nog niet** → Maak nieuwe relatie aan in WeFact
   - **Bestaat al** → Gebruik bestaand relatie-ID
5. **Maak factuur aan** in WeFact via de Facturen API:
   - Koppel aan bestaande of nieuw aangemaakte relatie
   - Factuurregels:
     - Eén regel per product: gebruik `wefact_product_code` als artikelreferentie (WeFact vult omschrijving en BTW automatisch in vanuit catalogus)
     - Bij gemengde betaling: voeg informatieve regel toe "Inbegrepen: {amount_credits} credits" (geen prijs, geen BTW)
   - Factuurstatus: direct verzenden naar werkgever via e-mail
6. **WeFact verstuurt de factuur** automatisch per e-mail naar het factuuradres van de werkgever
7. **Sla factuur-referentie op** in Airtable Transaction record:
   - `wefact_invoice_id`: het WeFact factuur-ID
   - `wefact_invoice_number`: het factuurnummer (voor klantreferentie)
   - `invoice`: de directe URL naar de factuur in het WeFact klantportaal (wordt teruggegeven door de WeFact API na aanmaken) — dit veld bestaat al op de Transactions tabel als URL-veld
8. **Verstuur "Factuur beschikbaar" e-mail** via MailerSend (N-9):
   - Template: `invoice-available`
   - Variabelen: `employer_name`, `invoice_number` (uit stap 7), `invoice_url` (uit stap 7), `transaction_date`
9. **Log event** in Airtable Events tabel: `invoice_created` met `employer_id`, `transaction_id`, `wefact_invoice_number` en `amount_euros`
10. **Update de order in het portaal**: de Next.js app toont op de bestellingspagina/orderoverzicht een klikbare link naar de factuur op basis van het `invoice` veld. De werkgever kan zo vanuit het portaal direct de factuur inzien en downloaden.

**Webhook payload (van Next.js app)**:
```json
{
  "employer_id": "recXXXXXXXXXXXXXX",
  "transaction_id": "recXXXXXXXXXXXXXX",
  "product_id": "recXXXXXXXXXXXXXX",
  "amount_euros": 49.00,
  "amount_credits": 0
}
```

**WeFact API endpoints gebruikt**:
- `POST /api/1/relation` — Relatie aanmaken (indien nieuw)
- `GET /api/1/relation` — Relatie zoeken op btw/KVK
- `POST /api/1/invoice` — Factuur aanmaken + versturen (response bevat `PayUrl` of `DownloadUrl` voor de factuurlink)

**Airtable schema-uitbreiding (toe te voegen door gebruiker)**:
| Tabel | Veld | Type | Doel |
|---|---|---|---|
| Transactions | `wefact_invoice_id` | Single Line Text | WeFact intern factuur-ID |
| Transactions | `wefact_invoice_number` | Single Line Text | Leesbaar factuurnummer (bijv. 2026-0042) |
| Products | `wefact_product_code` | Single Line Text | Artikelcode in WeFact catalogus (bijv. `PKG-STARTER`, `BUNDLE-50`) — ✅ Aanwezig |

Het veld `invoice` (URL) bestaat al op de Transactions tabel en wordt gebruikt voor de factuurlink.

---

## Notificatie Workflows (n8n + MailerSend)

> **Principe**: Interne meldingen → Airtable Automations | Werkgever-e-mails → n8n + MailerSend Templates

Professionele transactie-e-mails naar werkgevers via MailerSend templates. Trigger-opties:
- **Optie A — Webhook vanuit Next.js**: de app stuurt een webhook naar n8n na de actie (vergelijkbaar met `triggerWebflowSync`)
- **Optie B — Airtable polling/webhook**: n8n pollt Airtable of ontvangt webhook bij statuswijziging

#### Workflow N-1: Vacature ingediend

**Trigger**: Status → `Wacht op goedkeuring` (Airtable webhook of Next.js webhook)
**Ontvanger**: Werkgever (contactpersoon van de vacature)
**MailerSend Template**: `vacancy-submitted`

**Flow**:
1. Ontvang trigger met `vacancy_id`
2. Haal vacaturedata op uit Airtable: `title`, `employer_id`, `contact_name`, `contact_email`
3. Haal employer op: `company_name`
4. Verstuur e-mail via MailerSend met template-variabelen: `vacancy_title`, `employer_name`, `contact_name`

---

#### Workflow N-2: Vacature goedgekeurd & gepubliceerd

**Trigger**: Status → `Gepubliceerd` (Airtable webhook)
**Ontvanger**: Werkgever
**MailerSend Template**: `vacancy-published`

**Flow**:
1. Ontvang trigger met `vacancy_id`
2. Haal vacaturedata op: `title`, `public_url`, `contact_name`, `contact_email`, `employer_id`
3. Haal employer op: `company_name`
4. Verstuur e-mail met template-variabelen: `vacancy_title`, `vacancy_url`, `employer_name`, `contact_name`

---

#### Workflow N-3: Vacature afgekeurd / aanpassing nodig

**Trigger**: Status → `Aanpassing nodig` (Airtable webhook)
**Ontvanger**: Werkgever
**MailerSend Template**: `vacancy-rejected`

**Flow**:
1. Ontvang trigger met `vacancy_id`
2. Haal vacaturedata op: `title`, `contact_name`, `contact_email`, `rejection_reason` (indien aanwezig)
3. Haal employer op: `company_name`
4. Verstuur e-mail met template-variabelen: `vacancy_title`, `employer_name`, `contact_name`, `rejection_reason`

---

#### Workflow N-8: Aankoop credits bevestigd

**Trigger**: Webhook van Next.js app (na aanmaken purchase-transactie)
**Ontvanger**: Werkgever
**MailerSend Template**: `purchase-confirmed`

**Flow**:
1. Ontvang webhook van Next.js app met `transaction_id`, `employer_id`, `product_id`
2. Haal transactiedata op: `created_at`, `amount_credits`, `amount_euros`
3. Haal product op: `display_name`, `credits`
4. Haal employer op: `company_name`, contactpersoon + e-mailadres
5. Verstuur e-mail met template-variabelen: `product_name`, `credits_purchased`, `amount_euros`, `employer_name`, `transaction_date`

**Opmerking**: Deze workflow kan gecombineerd worden met Workflow 8 (WeFact facturatie) als er ook een eurobedrag in rekening wordt gebracht.

---

#### Workflow N-12c: Nieuw teamlid toegevoegd (bevestiging naar uitnodiger)

**Trigger**: Invite geaccepteerd (webhook van Next.js app)
**Ontvanger**: Uitnodiger (de werkgever die het teamlid heeft uitgenodigd)
**MailerSend Template**: `team-member-joined`

**Flow**:
1. Ontvang webhook van Next.js app met `inviter_user_id`, `new_user_email`, `employer_id`
2. Haal uitnodigerdata op: naam + e-mailadres
3. Haal employer op: `company_name`
4. Verstuur e-mail met template-variabelen: `inviter_name`, `new_member_email`, `employer_name`

---

## Error Handler Workflow (Centraal)

**Trigger**: n8n Error Trigger — ontvangt automatisch fouten van alle andere workflows
**Doel**: Stuur een Slack-bericht naar `#ctc-error-handlers` bij elke workflow-fout

**Instelling**: Stel deze workflow in als de globale Error Workflow via n8n → Settings → "Error Workflow". Alle andere workflows erven dit automatisch, zonder dat je ze individueel hoeft aan te passen.

**Flow**:
1. **Error Trigger** ontvangt de fout inclusief alle metadata van n8n
2. **Verstuur Slack-bericht** naar `#ctc-error-handlers` met de volgende informatie:
   - 🔴 **Workflow naam** — `{{ $workflow.name }}`
   - **Foutmelding** — `{{ $json.error.message }}`
   - **Node waar het misging** — `{{ $json.error.node.name }}`
   - **Uitvoeringstijd** — `{{ $json.startedAt }}`
   - **Record ID** (indien beschikbaar in de input) — bijv. `vacancy_id`, `employer_id`, `transaction_id`
   - **🔗 Link naar de uitvoering** — `{{ $execution.url }}` (directe link naar de gefaalde run in n8n)

**Slack berichtformaat**:
```
🔴 *Workflow fout: {{ $workflow.name }}*

• *Fout:* {{ $json.error.message }}
• *Node:* {{ $json.error.node.name }}
• *Tijd:* {{ $json.startedAt }}

<{{ $execution.url }}|Bekijk uitvoering in n8n →>
```

**Credentials**: Slack (reeds verbonden in n8n)
**Kanaal**: `#ctc-error-handlers`

---

## Vangnet Workflow (Scheduled Catch-All)

**Trigger**: Schedule — elke 15 minuten
**Doel**: Opvangen van gemiste webhooks

**Flow**:
1. Query Airtable: alle vacatures waar `needs_webflow_sync = true`
2. Per vacature: bepaal juiste actie op basis van status:
   - `"gepubliceerd"` → Workflow 3 of 4 (create/update)
   - `"gedepubliceerd"` of `"verlopen"` → Workflow 5 (archiveren)
3. Verwerk max 10 per run (rate limiting)

---

## Business Rules

### Publicatie
- Alleen vacatures met status `"gepubliceerd"` (Airtable: `"Gepubliceerd"`) worden als live CMS item in Webflow gezet
- De `needs_webflow_sync` boolean in Airtable is het signaal dat sync nodig is
- De webhook is het primaire trigger-mechanisme; de 15-minuten schedule is het vangnet

### Status Mapping (Airtable → Webflow actie)
| Airtable Status | Airtable Raw Value | Webflow Actie |
|---|---|---|
| `concept` | `Concept` | Geen sync |
| `wacht_op_goedkeuring` | `Wacht op goedkeuring` | Geen sync |
| `gepubliceerd` | `Gepubliceerd` | Create/Update + Publish |
| `gedepubliceerd` | `Gedepubliceerd` | Archiveer/Unpublish |
| `verlopen` | `Verlopen` | Archiveer/Unpublish |

### SEO Content (AI)
- Taal: **Nederlands**
- Tone: professioneel, toegankelijk, inclusief
- SEO title: max 60 karakters
- Meta description: max 150-160 karakters
- AI model: **Anthropic Claude** (claude-sonnet-4-20250514)
- Alleen genereren bij Create of wanneer relevante velden (title, location) gewijzigd zijn
- Altijd JSON-output verwachten van AI

### Media
- Afbeeldingen worden doorgestuurd als **URL's** (Airtable attachment URL's of Cloudinary URL's)
- Webflow accepteert externe image URL's bij Image en MultiImage fields
- Alt-teksten meesturen voor toegankelijkheid

### Sync Volgorde (Dependencies)
```
1. Lookup Tables (Sectors, Regions, Fields, FunctionTypes, EducationLevels)
2. Features
3. Products (depends on Features)
4. Employers (depends on Sectors; FAQ sync is onderdeel van Employer Sync)
5. Vacancies (depends on Employers, all Lookups)
6. "New" Label Expiry (updates Vacancies)
7. "Featured" Label Expiry (updates Vacancies)
8. WeFact Facturatie (onafhankelijk; triggered by Next.js app na succesvolle aankoop met eurobedrag)
```

### Facturatie (WeFact)
- Een factuur wordt **alleen aangemaakt als er een eurobedrag in rekening wordt gebracht** (`amount_euros > 0`)
- Aankopen die volledig met credits worden betaald, genereren **geen factuur**
- Bij gemengde betalingen (credits + euros) wordt het eurobedrag gefactureerd; de credits worden als informatieve regel op de factuur vermeld
- Btw-percentage: **21%** (standaard NL), tenzij werkgever een geldig btw-nummer heeft buiten NL (dan 0% + verlegde btw — toekomstige uitbreiding)
- De factuur wordt **direct verstuurd** via WeFact bij aanmaken — geen conceptfase
- Het WeFact factuur-ID en -nummer worden teruggekoppeld naar Airtable (Transactions tabel)
- De Next.js app triggert de facturatie-webhook **na** succesvolle verwerking van de betaling/transactie

### Rate Limiting
- Webflow API: max 60 requests/minute (CMS API)
- Airtable API: max 5 requests/second
- Implementeer wachttijden en retry-logica in n8n

---

## n8n Node Principes

### Gebruik altijd officiële nodes waar mogelijk
Gebruik **altijd de ingebouwde n8n nodes** in plaats van HTTP Request nodes, tenzij de benodigde operatie niet beschikbaar is in de officiële node.

| Service | Officiële node | Gebruik voor |
|---|---|---|
| **Airtable** | `n8n-nodes-base.airtable` | Records ophalen, aanmaken, bijwerken |
| **Webflow** | `n8n-nodes-base.webflow` | CMS items aanmaken, bijwerken, ophalen, verwijderen |
| **MailerSend** | `n8n-nodes-base.mailersend` | Transactionele e-mails versturen via templates |
| **Slack** | `n8n-nodes-base.slack` | Berichten sturen naar kanalen |
| **Anthropic** | `@n8n/n8n-nodes-langchain.lmChatAnthropic` | AI-tekstgeneratie via LLM Chain |

Gebruik een **HTTP Request node** alleen als de officiële node de benodigde operatie niet ondersteunt (bijv. Webflow Publishing API, WeFact API).

### Webflow node: verplichte basisvelden bij API-configuratie

Bij het aanmaken of aanpassen van een Webflow node via de n8n API moeten **altijd** de volgende parameters expliciet worden meegegeven, ook als ze een default waarde hebben:

```json
{
  "resource": "item",
  "operation": "create",   // of "update", "get", "getAll", "deleteItem"
  "siteId": "69845709ef5e7bf2a18e422c",
  "collectionId": "<collection-id-uit-prd>",
  "live": false
}
```

Zonder `resource: "item"` toont n8n de conditionele velden (siteId, collectionId, fieldsUi) **niet** in de UI — ook al worden ze in de JSON meegegeven. De node voert dan wel uit, maar is onleesbaar in de editor.

De dropdowns voor Site, Collection en Fields laden dynamisch vanuit Webflow. Ze tonen de juiste waarde zodra de dropdown opent en de opties geladen zijn.

---

## API Credentials Nodig

| Service | Type | Scopes/Permissions | Waar te configureren |
|---|---|---|---|
| **Airtable** | Personal Access Token | `data.records:read`, `data.records:write` op de Colourful Jobs base | n8n Credentials → Airtable (✅ reeds verbonden) |
| **Webflow** | API Token | CMS read/write, Publishing | n8n Credentials → Webflow (✅ reeds verbonden) |
| **Anthropic** | API Key | Messages API (claude-sonnet-4-20250514) | n8n Credentials → HTTP Header Auth (✅ reeds verbonden) |
| **WeFact** | API Key | Relaties lezen/schrijven, Facturen aanmaken en versturen | n8n Credentials → HTTP Header Auth (`Authorization: Basic {base64(apikey:)}`) |
| **MailerSend** | API Token | Send emails, gebruik templates | n8n Credentials → HTTP Header Auth (`Authorization: Bearer {token}`) |
| **Slack** | OAuth / Bot Token | Send messages naar `#ctc-error-handlers` | n8n Credentials → Slack (✅ reeds verbonden) |

### n8n Webhook URLs
De Next.js app stuurt webhooks naar n8n via env variabelen. Beide functies zijn geïmplementeerd in `src/lib/webflow-sync.ts`:

| Env variabele | Functie | Gebruikt door |
|---|---|---|
| `N8N_WEBFLOW_SYNC_WEBHOOK_URL` | `triggerWebflowSync(vacancyId)` | Workflows 3, 4, 5 |
| `N8N_EMPLOYER_WEBFLOW_SYNC_WEBHOOK_URL` | `triggerEmployerWebflowSync(employerId)` | Workflow 2 |

---

## Airtable Schema Wijzigingen (✅ Doorgevoerd)

Het veld `webflow_item_id` (Single Line Text) is toegevoegd aan alle tabellen die gesynchroniseerd worden naar Webflow:

| Tabel | Veld | Status |
|---|---|---|
| Vacancies | `webflow_item_id` | ✅ Aanwezig |
| Employers | `webflow_item_id` | ✅ Aanwezig |
| Sectors | `webflow_item_id` | ✅ Aanwezig |
| Regions | `webflow_item_id` | ✅ Aanwezig |
| Fields | `webflow_item_id` | ✅ Aanwezig |
| FunctionTypes | `webflow_item_id` | ✅ Aanwezig |
| EducationLevels | `webflow_item_id` | ✅ Aanwezig |
| FAQ | `webflow_item_id` | ✅ Aanwezig |
| Products | `webflow_item_id` | ✅ Aanwezig |
| Features | `webflow_item_id` | ✅ Aanwezig |
| Employers | `needs_webflow_sync` | ✅ Aanwezig |

---

## Error Handling & Monitoring

### Error Scenarios
| Scenario | Actie |
|---|---|
| Webflow API rate limit | Retry met exponential backoff (1s, 2s, 4s, max 3 retries) |
| Airtable record niet gevonden | Log error, skip, `needs_webflow_sync` blijft `true` |
| Reference niet gevonden (bijv. employer zonder `webflow_item_id`) | Trigger eerst sync van dependency, dan retry |
| AI generatie faalt | Gebruik fallback: title als seo_title, lege meta description |
| Webflow Create/Update faalt | Log error, `needs_webflow_sync` blijft `true`, vangnet pikt het op |

### Logging
- Elke sync actie loggen met: timestamp, airtable_id, webflow_id, actie (create/update/archive), success/failure
- Errors loggen met volledige error response
- **Slack notificaties**: alle workflow-fouten worden automatisch gemeld in `#ctc-error-handlers` via de centrale Error Handler Workflow

### Events Tabel (Airtable)
n8n schrijft de volgende events rechtstreeks naar de Airtable Events tabel (zelfde tabel als de Next.js app gebruikt). n8n heeft Airtable al gekoppeld, dus dit vereist geen extra credentials.

| Event type | Workflow | Velden |
|---|---|---|
| `vacancy_webflow_synced` | Workflow 3, 4, 5 | `vacancy_id`, `source: "n8n"`, `payload: { action: "create" / "update" / "archive", webflow_item_id }` |
| `invoice_created` | Workflow 8 | `employer_id`, `source: "n8n"`, `payload: { transaction_id, wefact_invoice_number, amount_euros }` |

**Implementatie**: Voeg na elke succesvolle actie een Airtable `Create Record` node toe in de Events tabel met de bovenstaande velden.

---

## Implementatie Volgorde

1. **Fase 1 — Foundation**: Airtable schema wijzigingen + Lookup Tables Sync workflow
2. **Fase 2 — Support**: Features Sync + Products Sync  
3. **Fase 3 — Employers**: Employer Sync workflow met media resolving (inclusief FAQ sync)
4. **Fase 4 — Vacancies**: Vacancy Create/Update/Archive workflows + SEO AI
5. **Fase 5 — Vangnet**: Scheduled catch-all workflow + monitoring
6. **Fase 6 — Notificaties**: MailerSend notification workflows (N-1, N-2, N-3 → N-8, N-9 → N-12c)

---

## Beslissingen (✅ Afgestemd)

1. **Archiveren vs. Verwijderen**: **Archiveren**. Bij depublish/verlopen wordt het Webflow item gearchiveerd (`_archived: true`), niet verwijderd. Zo kan het item bij republish hersteld worden met behoud van URL/slug.

2. **Video URL**: Webflow Employers collection heeft nu een `video-link` veld. Mapping: Airtable `video_url` → Webflow `video-link` (Link type). Toegevoegd aan de Employer field mapping.

3. **Employer `needs_webflow_sync`**: **Toevoegen aan Airtable**. Werkt hetzelfde als bij Vacancies: wordt `true` gezet wanneer employer-data wijzigt, zodat de sync alleen gewijzigde employers verwerkt in plaats van elke keer alle actieve employers te vergelijken. Veel efficiënter.

4. **Slug uniciteit**: Bij duplicaten wordt de bedrijfsnaam toegevoegd aan de slug. Voorbeeld: als `senior-developer` al bestaat, wordt het `senior-developer-colourful-jobs`. Dit is beter voor SEO dan een generieke suffix als `-2`.

5. **SEO regeneratie**: AI-SEO wordt **alleen gegenereerd als de velden leeg zijn**. Als er al SEO-tekst in Webflow staat (bijv. handmatig geoptimaliseerd), blijft die behouden. Dit geeft controle om SEO in Webflow te finetunen zonder dat de sync het overschrijft.
