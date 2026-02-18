# PRD: Colourful Jobs — n8n Sync Workflows (Airtable → Webflow)

## Vision

Colourful Jobs is een Nederlands vacatureplatform dat werkgevers verbindt met werkzoekenden die op zoek zijn naar diversiteit en inclusie. Dit document beschrijft de n8n-automatiseringen die data vanuit Airtable (source of truth) synchroniseren naar Webflow (publieke website), inclusief AI-gegenereerde SEO-content.

---

## Architectuur Overzicht

```
┌─────────────┐     webhook / schedule     ┌─────────┐     Webflow API     ┌─────────────┐
│  Airtable   │ ──────────────────────────▶ │  n8n    │ ──────────────────▶ │  Webflow    │
│  (Source of │                             │ work-   │                     │  CMS        │
│   Truth)    │ ◀── status updates ──────── │ flows   │ ── AI (Anthropic) ──│  (Public    │
└─────────────┘                             └─────────┘                     │   Website)  │
                                                                            └─────────────┘
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
| Tags | `TAGS_TABLE` | Vacature-tags (bijv. "UITGELICHT", "NIEUW"). Linked aan Vacancies. Velden: `id` (record ID), `tag` (tekst). |

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
| └─ ○ Tags | `698f2c4e668f9bd10bfd0ddd` | `tags` | Lookup |
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
| `high_priority` | Boolean | `featured` | Switch | Direct mapping |
| — | — | `new` | Switch | `true` als `first-published-at` < 3 dagen geleden |
| — | — | `vacancy-tag` | Reference | Dynamisch bepaald door n8n: "uitgelicht" (bij upsell) of "nieuw" (eerste 3 dagen). Zie Beslissingen §3. |
| — | — | `announcement-bar` | Switch | Alleen bij specifieke upsell (handmatig of rule-based) |

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
1. **Haal alle records op** uit Airtable lookup table
2. **Haal alle items op** uit corresponderende Webflow collection
3. **Vergelijk** op basis van `webflow_item_id` veld in Airtable:
   - Nieuw (geen `webflow_item_id`): Maak item aan in Webflow
   - Bestaand (heeft `webflow_item_id`): Update item in Webflow als data gewijzigd
   - Verwijderd (Webflow item bestaat maar Airtable record niet): Archiveer/verwijder in Webflow
4. **AI-stap** (voor nieuwe items): Genereer SEO-content:
   - `seo-title`: max 60 chars, Nederlands, formaat: "Vacatures in {name} | Colourful Jobs" (voor Regions) of vergelijkbaar per type
   - `seo-meta-description`: max 160 chars, Nederlands, beschrijvend
   - `hero-intro`: 1-2 zinnen, Nederlands, uitnodigend
   - `seo-text`: 300-500 woorden, Nederlands, keyword-rich, naam minimaal 4x gebruiken
5. **Update Airtable**: Sla `webflow_item_id` op in het Airtable record
6. **Publish** de items in Webflow

**AI Prompt Template** (voor lookup SEO):
```
Je bent een Nederlandse SEO-copywriter voor Colourful Jobs, een inclusief vacatureplatform.

Genereer voor de {collection_type} "{name}" de volgende teksten in het Nederlands:

1. seo_title (max 60 karakters): Pakkende paginatitel voor zoekmachines. Formaat: "{name} vacatures | Colourful Jobs"
2. seo_meta_description (max 160 karakters): Korte, uitnodigende beschrijving voor zoekresultaten. Benoem het type vacatures en Colourful Jobs.
3. hero_intro (max 200 karakters): Korte, wervende introductietekst voor bovenaan de filterpagina.
4. seo_text (300-500 woorden): Informatieve SEO-tekst over vacatures in deze {collection_type}. Gebruik de naam van de {collection_type} minimaal 4x. Toon: professioneel maar toegankelijk, inclusief en uitnodigend.

Antwoord in JSON formaat: { "seo_title": "...", "seo_meta_description": "...", "hero_intro": "...", "seo_text": "..." }
```

**Sync Status**: Via `webflow_item_id` veld in Airtable + `last_synced_at` timestamp

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
   - FAQ items → haal `webflow_item_id`'s op uit Airtable FAQ tabel (eerst FAQ syncen!)
4. **Resolve media**:
   - Logo: Haal Media Asset record op → extract `file[0].url` (Airtable attachment URL)
   - Header image: Idem
   - Gallery: Idem voor alle linked Media Assets met `show_on_company_page = true`
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

### Workflow 3: FAQ Sync

**Trigger**: Onderdeel van Employer Sync (sub-workflow) + Schedule (1x per dag)
**Prioriteit**: Moet VOOR Employer Sync draaien want employers refereren naar FAQ items

**Flow**:
1. **Haal alle FAQ records op** uit Airtable
2. **Vergelijk** met bestaande Webflow FAQ items
3. **Upsert**: Create of Update in Webflow
4. **Update Airtable**: Sla `webflow_item_id` op per FAQ record
5. **Publish** items

**Velden mapping**: Zie FAQ tabel hierboven. Geen AI-stap nodig (content is handmatig).

---

### Workflow 4: Vacancy Publish → Webflow Create

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

### Workflow 5: Vacancy Update → Webflow Update

**Trigger**: Webhook van Next.js app (via `triggerWebflowSync()`) voor bestaande vacatures
**Signaal**: `needs_webflow_sync = true` + `webflow_item_id` is al gevuld

**Flow**: Identiek aan Workflow 4, maar:
- Altijd **Update** (nooit Create)
- SEO-teksten NIET opnieuw genereren als ze al gevuld zijn in Webflow (zodat handmatige optimalisaties behouden blijven)
- `new` badge opnieuw berekenen
- Na succesvolle update: `needs_webflow_sync = false`

---

### Workflow 6: Vacancy Depublish → Webflow Archiveren

**Trigger**: Webhook van Next.js app (bij depublish/verlopen)
**Signaal**: `needs_webflow_sync = true` + status = `"gedepubliceerd"` of `"verlopen"`

**Flow**:
1. **Ontvang webhook** met `vacancy_id`
2. **Haal vacancy op** — check status is `"gedepubliceerd"` of `"verlopen"`
3. **Haal `webflow_item_id` op** uit Airtable
4. **Unpublish/Archiveer** het item in Webflow (set `_archived: true` of verwijder)
5. **Update Airtable**: Zet `needs_webflow_sync = false`

> **Beslissing nodig**: Archiveren (item blijft bestaan maar is niet zichtbaar) vs. Verwijderen (item wordt permanent verwijderd). Aanbeveling: **archiveren**, zodat bij republish het item hersteld kan worden met behoud van URL/slug.

---

### Workflow 7: Products & Features Sync

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

### Workflow 8: Tags Sync

**Trigger**: Schedule — 1x per dag (06:00 CET, samen met lookups) + handmatige trigger
**Prioriteit**: Moet VOOR Vacancy Sync draaien want vacatures refereren naar tags

**Flow**:
1. **Haal alle Tags op** uit Airtable Tags tabel (velden: `id`, `tag`)
2. **Vergelijk** met bestaande Webflow Tags items op basis van `webflow_item_id`
3. **Upsert**: Create of Update in Webflow Tags collection
4. **Update Airtable**: Sla `webflow_item_id` op per Tag record
5. **Publish** items

---

### Workflow 9: "NIEUW" Tag Lifecycle

**Trigger**: Schedule — elke 15 minuten (kan gecombineerd worden met de Vangnet Workflow)
**Doel**: Automatisch de tag "NIEUW" toewijzen en verwijderen op basis van publicatiedatum

**Flow**:
1. **Haal alle gepubliceerde vacatures op** uit Airtable waar `first-published-at` is ingevuld
2. **Per vacature**, bereken of de publicatie < 3 dagen geleden is:
   - **Ja (< 3 dagen)** en tag "NIEUW" is NIET gekoppeld → Koppel de tag "NIEUW" in Airtable (linked record toevoegen) + zet `needs_webflow_sync = true`
   - **Nee (≥ 3 dagen)** en tag "NIEUW" IS gekoppeld → Ontkoppel de tag "NIEUW" in Airtable (linked record verwijderen) + zet `needs_webflow_sync = true`
   - **Geen wijziging nodig** → Skip
3. De reguliere Vacancy Sync (Workflow 4/5) pikt de `needs_webflow_sync = true` op en synct de updated tag-reference naar Webflow

**Opmerking**: De tag "UITGELICHT" wordt NIET door deze workflow beheerd. Die wordt in de Next.js app gekoppeld/ontkoppeld (aparte Cursor-briefing).

---

## Vangnet Workflow (Scheduled Catch-All)

**Trigger**: Schedule — elke 15 minuten
**Doel**: Opvangen van gemiste webhooks

**Flow**:
1. Query Airtable: alle vacatures waar `needs_webflow_sync = true`
2. Per vacature: bepaal juiste actie op basis van status:
   - `"gepubliceerd"` → Workflow 4 of 5 (create/update)
   - `"gedepubliceerd"` of `"verlopen"` → Workflow 6 (archiveren)
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
2. Tags
3. FAQs
4. Features
5. Products (depends on Features)
6. Employers (depends on Sectors, FAQs)
7. Vacancies (depends on Employers, Tags, all Lookups)
8. "NIEUW" Tag Lifecycle (depends on Tags, updates Vacancies)
```

### Rate Limiting
- Webflow API: max 60 requests/minute (CMS API)
- Airtable API: max 5 requests/second
- Implementeer wachttijden en retry-logica in n8n

---

## API Credentials Nodig

| Service | Type | Scopes/Permissions | Waar te configureren |
|---|---|---|---|
| **Airtable** | Personal Access Token | `data.records:read`, `data.records:write` op de Colourful Jobs base | n8n Credentials → Airtable |
| **Webflow** | API Token | CMS read/write, Publishing | n8n Credentials → Webflow |
| **Anthropic** | API Key | Messages API (claude-sonnet-4-20250514) | n8n Credentials → HTTP Header Auth |

### n8n Webhook URL
De Next.js app stuurt webhooks naar n8n via `N8N_WEBFLOW_SYNC_WEBHOOK_URL` (env variabele). Dit is al geïmplementeerd in `src/lib/webflow-sync.ts`:

```typescript
// Bestaande code in Next.js app
export async function triggerWebflowSync(vacancyId: string): Promise<void> {
  await fetch(WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ vacancy_id: vacancyId }),
  });
}
```

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
| Tags | `webflow_item_id` | ✅ Aanwezig |
| Employers | `needs_webflow_sync` | ✅ Aanwezig |

> **Optioneel maar aanbevolen**: Voeg ook een `webflow_last_synced_at` DateTime veld toe per tabel voor debugging en monitoring.

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
- Optioneel: stuur notificaties naar Slack bij herhaalde failures

---

## Implementatie Volgorde

1. **Fase 1 — Foundation**: Airtable schema wijzigingen + Lookup Tables Sync workflow
2. **Fase 2 — Support**: FAQ Sync + Features Sync + Products Sync  
3. **Fase 3 — Employers**: Employer Sync workflow met media resolving
4. **Fase 4 — Vacancies**: Vacancy Create/Update/Archive workflows + SEO AI
5. **Fase 5 — Vangnet**: Scheduled catch-all workflow + monitoring

---

## Beslissingen (✅ Afgestemd)

1. **Archiveren vs. Verwijderen**: **Archiveren**. Bij depublish/verlopen wordt het Webflow item gearchiveerd (`_archived: true`), niet verwijderd. Zo kan het item bij republish hersteld worden met behoud van URL/slug.

2. **Video URL**: Webflow Employers collection heeft nu een `video-link` veld. Mapping: Airtable `video_url` → Webflow `video-link` (Link type). Toegevoegd aan de Employer field mapping.

3. **Tags**: Er is een nieuwe `Tags` tabel in Airtable aangemaakt (velden: `id`, `tag`) die gelinkt is aan de Vacancies tabel. De Webflow Tags collection bevat dynamische labels die de weergave en positie van vacatures beïnvloeden:
   - **"UITGELICHT"** → Wordt aan de vacature gehangen wanneer de upsell "Uitgelicht" wordt gekocht. Wordt verwijderd als deze niet meer geldig is. **De toewijzingslogica in de Next.js app wordt in een aparte Cursor-briefing uitgewerkt** — de n8n workflow leest alleen de gekoppelde tag uit Airtable en synct die naar Webflow.
   - **"NIEUW"** → Wordt door de **n8n workflow** gezet voor vacatures die minder dan 3 dagen gepubliceerd zijn (berekend op basis van `first-published-at`). Na 3 dagen verwijdert de n8n workflow de tag automatisch, zowel in Airtable (link verwijderen) als in Webflow (reference updaten).
   - Tags worden vanuit Airtable gesynchroniseerd naar Webflow via de `vacancy-tag` reference.

4. **Employer `needs_webflow_sync`**: **Toevoegen aan Airtable**. Werkt hetzelfde als bij Vacancies: wordt `true` gezet wanneer employer-data wijzigt, zodat de sync alleen gewijzigde employers verwerkt in plaats van elke keer alle actieve employers te vergelijken. Veel efficiënter.

5. **Slug uniciteit**: Bij duplicaten wordt de bedrijfsnaam toegevoegd aan de slug. Voorbeeld: als `senior-developer` al bestaat, wordt het `senior-developer-colourful-jobs`. Dit is beter voor SEO dan een generieke suffix als `-2`.

6. **SEO regeneratie**: AI-SEO wordt **alleen gegenereerd als de velden leeg zijn**. Als er al SEO-tekst in Webflow staat (bijv. handmatig geoptimaliseerd), blijft die behouden. Dit geeft controle om SEO in Webflow te finetunen zonder dat de sync het overschrijft.
