# Pinsel canonical content model

Source of truth for what the CMS stores, what the client may edit, and what the site structure fixes. Code: `packages/pinsel-content/src/models/**` (Composer `ContentModelRecord`s), `src/policy.ts`, `src/richtext-policy.ts`, `src/invariants.ts`, `src/import-rules.ts`. Content authority: the approved seed (`tests/fixtures/approved-seed/content.json`, yuko-site PR #4 @ `ce2ec05b`) plus the copy the approved prototype hard-codes in `build.py`.

## 1. Principles

- **Composer Content models, not a parallel format.** Every model is a `ContentModelRecord`; entries are `ContentEntryRecord`s under `content/entries/<model>/<id>.json`. The records are built without a runtime Composer import so the Worker and the editor can share them; the parity test proves each record equals what `defineSite().model()` derives from the same input, so the migration sub-issue can declare them through the DSL or reuse the records directly.
- **Ids.** Model ids are kebab-case. Field ids are `<modelId>-<kebab(key)>` (`course.homeDescription` → `course-home-description`), exactly Composer's derivation. Entry ids match Composer's `RECORD_ID_PATTERN` (`^[a-z0-9](?:[a-z0-9_-]{0,126}[a-z0-9])?$`) and are **unique per provider, not per model** (`validateSiteProject` reports `duplicate-record` otherwise), hence prefixes such as `page-`, `nav-`, `year-`. Singletons use the model id as the entry id.
- **Values are keyed by field id.** No `object`, `asset-use` or `list` fields are used: Composer 7ca114a3 binds only scalar fields to component props, so multi-item copy is `long-text` with one item per line (like `testimonial.quote`); images are structure (see §6) and content only supplies alt text.
- **One-entry models.** `site-copy`, `lessons-copy`, `about-copy`, `instructor-profile` and `contact-copy` hold exactly one entry (id = model id) but are `collection` in kind (`SINGLE_ENTRY_MODEL_IDS`): Composer injects content into a page only through collection attachments (a `single` model cannot be attached) and a route maps only one entry, while every page needs several of these. The policy keeps them update-only, so the editor can neither add nor remove an entry; `content:validate` asserts the one entry.
- **Timestamps.** Generated records carry Composer's `DEFAULT_TIMESTAMP` (`2026-09-12T00:00:00.000Z`) so regeneration is byte-stable; storage owns `generation`.
- **Dedupe rule.** Only byte-identical values share one field: `moreLabel` (3× もっと見る), the footer/header hrefs (`nav-link.href` ⊂ header), contact `courseOptions` (= `course.contactOptionLabel` + `contact-copy.courseUndecidedOption`), contact success/error strings. Everything `explore/prototype-content.md` §2 lists as "must stay separate" is a separate model or field: `home-result` vs `result-entry`, `home-voice` vs `testimonial`, `home-faq` vs `faq-item`, the two `target-item` pages, the three bios, the three timelines, `knowledge-card` vs `note`, `course.homeDescription`/`unit` vs `lessonsNote`, per-page `ctaSubCopy`.
- **Counts are fields.** `result-year.declaredCount` (sum 123) is independent of the 105 `result-entry` rows; `site-copy.statsResultsNumber` (`123+`), `statsSchoolsNumber` (`30+`), the footer description `11年間で123件以上…` and the home meta description are hand-written literals, never computed.
- **Order.** Every collection has a required `order` number. The client changes it only through `reorder-entries`; the seed numbers 1..n per scope (`target-item` per `page`, `timeline-entry` per `timeline`, `faq-item` per group, `result-entry` per year).

## 2. Models

25 models: 7 singletons and 18 collections. "editable" is the client policy (§3); `required` is Composer completeness. Seed counts: 11 years / 123 declared / 105 entries / 5 testimonials / 18 FAQ in 4 groups / 4 home FAQ / 5 notes / 8 legal rows / 3 courses (`SEED_ENTRY_COUNTS`).

### `site-copy` — サイト共通コピー

ヘッダー・フッター・トップページ・ノート一覧・404 の文言（1件のみ）

- Cardinality: one entry, id = model id (model kind `collection`, see §1)
- Client operations: update


| key | kind | required | editable |
| --- | --- | --- | --- |
| `brandWord` | text | yes | no |
| `brandSub` | text | yes | no |
| `heroLabel` | text | yes | yes |
| `heroTitleLines` | long-text (one line per heading line) | yes | yes |
| `heroLead` | long-text | yes | yes |
| `heroPrimaryLabel` | text | yes | yes |
| `heroPricingLabel` | text | yes | yes |
| `heroMetaLine` | text | yes | yes |
| `heroIntro` | long-text | yes | yes |
| `forYouTitle` | text | yes | yes |
| `pricingTitle` | text | yes | yes |
| `pricingNote` | text | yes | yes |
| `pricingMoreLabel` | text | yes | yes |
| `instructorTitle` | text | yes | yes |
| `instructorDetailLabel` | text | yes | yes |
| `resultsTitle` | text | yes | yes |
| `voicesTitle` | text | yes | yes |
| `faqTitle` | text | yes | yes |
| `moreLabel` | text | yes | yes |
| `ctaTitle` | text | yes | yes |
| `ctaButtonLabel` | text | yes | yes |
| `statsResultsNumber` | text | yes | yes |
| `statsResultsLabel` | text | yes | yes |
| `statsSchoolsNumber` | text | yes | yes |
| `statsSchoolsLabel` | text | yes | yes |
| `notesIndexTitle` | text | yes | yes |
| `notesIndexDescription` | long-text | yes | yes |
| `noteEyebrow` | text | yes | yes |
| `allNotesLabel` | text | yes | yes |
| `contentsLabel` | text | yes | yes |
| `notFoundTitle` | text | yes | yes |
| `notFoundBody` | long-text | yes | yes |
| `notFoundLinkLabel` | text | yes | yes |
| `footerInstagramLabel` | text | yes | yes |
| `footerCopyright` | text | yes | yes |
| `backToTopLabel` | text | yes | yes |

### `page-copy` — ページ見出しとメタ情報

ルートごとの <title>・meta description・ページ見出し・CTA 文言（9件、追加不可）

- Cardinality: collection (seed: 9)
- Client operations: update


| key | kind | required | editable |
| --- | --- | --- | --- |
| `route` | url | yes | no |
| `metaTitle` | text | yes | yes |
| `metaDescription` | long-text | no | yes |
| `headerTitle` | text | no | yes |
| `headerDescription` | long-text | no | yes |
| `asideLabel` | text | no | yes |
| `ctaSubCopy` | text | no | yes |
| `order` | number | yes | no |

### `nav-link` — ナビゲーションリンク

ヘッダー・フッターの共通リンク（7件、追加不可）。リンク先は変更不可

- Cardinality: collection (seed: 7)
- Client operations: update


| key | kind | required | editable |
| --- | --- | --- | --- |
| `href` | url | yes | no |
| `label` | text | yes | yes |
| `headerLabel` | text | yes | yes |
| `footerTitle` | text | yes | yes |
| `footerDescription` | text | yes | yes |
| `order` | number | yes | no |

### `lessons-copy` — オンラインクラス ページ文言

/lessons/ の見出し・本文・目次ラベル（1件のみ）

- Cardinality: one entry, id = model id (model kind `collection`, see §1)
- Client operations: update


| key | kind | required | editable |
| --- | --- | --- | --- |
| `tocForYou` | text | yes | yes |
| `tocCourse` | text | yes | yes |
| `tocPricing` | text | yes | yes |
| `tocConsultation` | text | yes | yes |
| `tocInstructor` | text | yes | yes |
| `tocSpecializations` | text | yes | yes |
| `tocGraduates` | text | yes | yes |
| `tocKnowledge` | text | yes | yes |
| `forYouTitle` | text | yes | yes |
| `courseTitle` | text | yes | yes |
| `courseIntro` | long-text | yes | yes |
| `pricingTitle` | text | yes | yes |
| `pricingScheduleNote` | long-text | yes | yes |
| `pricingContinueNote` | long-text | yes | yes |
| `pricingPaymentNote` | long-text | yes | yes |
| `consultationTitle` | text | yes | yes |
| `consultationTopicsTitle` | text | yes | yes |
| `consultationTopics` | long-text (one item per line) | yes | yes |
| `consultationFaqTitle` | text | yes | yes |
| `consultationFaqTopics` | long-text (one item per line) | yes | yes |
| `instructorTitle` | text | yes | yes |
| `careerTitle` | text | yes | yes |
| `specializationsTitle` | text | yes | yes |
| `specializationsNote` | long-text | yes | yes |
| `graduatesTitle` | text | yes | yes |
| `graduatesParagraphs` | long-text (one paragraph per line) | yes | yes |
| `knowledgeTitle` | text | yes | yes |

### `about-copy` — 講師紹介 ページ文言

/about/ の見出し（1件のみ）

- Cardinality: one entry, id = model id (model kind `collection`, see §1)
- Client operations: update


| key | kind | required | editable |
| --- | --- | --- | --- |
| `birthLine` | text | yes | yes |
| `instagramLabel` | text | yes | yes |
| `careerTitle` | text | yes | yes |
| `educationTitle` | text | yes | yes |
| `messageTitle` | text | yes | yes |
| `featuresTitle` | text | yes | yes |

### `instructor-profile` — 講師プロフィール

講師の名前・肩書・各ページの紹介文（1件のみ）。経歴の年表は「年表」モデル

- Cardinality: one entry, id = model id (model kind `collection`, see §1)
- Client operations: update


| key | kind | required | editable |
| --- | --- | --- | --- |
| `name` | text | yes | yes |
| `latinName` | text | yes | yes |
| `title` | text | yes | yes |
| `portraitAlt` | text | yes | yes |
| `homeBio` | long-text | yes | yes |
| `lessonsBio` | long-text | yes | yes |
| `aboutMessage` | long-text (one paragraph per line) | yes | yes |

### `contact-copy` — お問い合わせ ページ文言

/contact/ のフォーム文言・流れ・法定表記の見出し（1件のみ）

- Cardinality: one entry, id = model id (model kind `collection`, see §1)
- Client operations: update


| key | kind | required | editable |
| --- | --- | --- | --- |
| `stepsTitle` | text | yes | yes |
| `legalSummary` | text | yes | yes |
| `formAriaLabel` | text | yes | yes |
| `nameLabel` | text | yes | yes |
| `emailLabel` | text | yes | yes |
| `courseLabel` | text | yes | yes |
| `courseUndecidedOption` | text | yes | yes |
| `messageLabel` | text | yes | yes |
| `requiredLabel` | text | yes | yes |
| `optionalLabel` | text | yes | yes |
| `submitLabel` | text | yes | yes |
| `submittingLabel` | text | yes | yes |
| `successTitle` | text | yes | yes |
| `successBody` | long-text | yes | yes |
| `errorMessage` | long-text | yes | yes |
| `backLabel` | text | yes | yes |
| `valueMissingMessage` | text | yes | yes |
| `emailFormatMessage` | text | yes | yes |
| `previewNotice` | long-text | yes | yes |
| `successPreviewEyebrow` | text | yes | yes |
| `successPreviewNotice` | long-text | yes | yes |

### `course` — コース・料金

進路相談・2ヶ月・4ヶ月（3件、追加不可。並び順は ?course= の番号に対応）

- Cardinality: collection (seed: 3)
- Client operations: update


| key | kind | required | editable |
| --- | --- | --- | --- |
| `name` | text | yes | yes |
| `price` | text | yes | yes |
| `unit` | text | yes | yes |
| `homeDescription` | text | yes | yes |
| `lessonsNote` | text | yes | yes |
| `contactOptionLabel` | text | yes | yes |
| `featured` | boolean | yes | yes |
| `order` | number | yes | no |

### `course-step` — 授業の流れ

/lessons/ 授業内容カード（3件）

- Cardinality: collection (seed: 3)
- Client operations: update, reorder


| key | kind | required | editable |
| --- | --- | --- | --- |
| `title` | text | yes | yes |
| `description` | long-text | yes | yes |
| `order` | number | yes | no |

### `target-item` — こんな方へ

トップ（5件）と /lessons/（7件）のチェックリスト。別々に管理

- Cardinality: collection (seed: 12)
- Client operations: update, create, delete, reorder


| key | kind | required | editable |
| --- | --- | --- | --- |
| `page` | choice(home \| lessons) | yes | yes |
| `text` | text | yes | yes |
| `order` | number | yes | no |

### `specialization` — 専攻分野

/lessons/ 専攻分野一例（9件）

- Cardinality: collection (seed: 9)
- Client operations: update, create, delete, reorder


| key | kind | required | editable |
| --- | --- | --- | --- |
| `de` | text | yes | yes |
| `ja` | text | yes | yes |
| `order` | number | yes | no |

### `feature-card` — レッスンの特長

/about/ 特長カード（4件）

- Cardinality: collection (seed: 4)
- Client operations: update, create, delete, reorder


| key | kind | required | editable |
| --- | --- | --- | --- |
| `title` | text | yes | yes |
| `description` | long-text | yes | yes |
| `order` | number | yes | no |

### `timeline-entry` — 年表

/lessons/ 経歴（7件）、/about/ 経歴（6件）・学歴（2件）。3つの年表は別々に管理

- Cardinality: collection (seed: 15)
- Client operations: update, create, delete, reorder


| key | kind | required | editable |
| --- | --- | --- | --- |
| `timeline` | choice(lessons-career \| about-career \| about-education) | yes | yes |
| `year` | text | yes | yes |
| `text` | text | yes | yes |
| `order` | number | yes | no |

### `result-year` — 合格実績 年度

年度見出しと件数（11件）。件数は手入力の数値で、明細の行数とは独立

- Cardinality: collection (seed: 11)
- Client operations: update, create, delete, reorder


| key | kind | required | editable |
| --- | --- | --- | --- |
| `label` | text | yes | yes |
| `declaredCount` | number | yes | yes |
| `order` | number | yes | no |

### `result-entry` — 合格実績 明細

大学・学科の行（105件）。URL は許可リストの大学のみ

- Cardinality: collection (seed: 105)
- Client operations: update, create, delete, reorder


| key | kind | required | editable |
| --- | --- | --- | --- |
| `year` | reference → `result-year` | yes | yes |
| `school` | text | yes | yes |
| `department` | text | yes | yes |
| `url` | url | no | yes |
| `order` | number | yes | no |

### `home-result` — トップ 合格実績カード

トップページの抜粋（6件）。詳細ページとは別に管理

- Cardinality: collection (seed: 6)
- Client operations: update, create, delete, reorder


| key | kind | required | editable |
| --- | --- | --- | --- |
| `yearLabel` | text | yes | yes |
| `school` | text | yes | yes |
| `detail` | text | yes | yes |
| `order` | number | yes | no |

### `testimonial` — 生徒の声

/voices/ の合格体験談（5件）。引用は改行で段落を分ける

- Cardinality: collection (seed: 5)
- Client operations: update, create, delete, reorder


| key | kind | required | editable |
| --- | --- | --- | --- |
| `author` | text | yes | yes |
| `yearLabel` | text | yes | yes |
| `school` | text | yes | yes |
| `department` | text | yes | yes |
| `quote` | long-text | yes | yes |
| `order` | number | yes | no |

### `home-voice` — トップ 生徒の声

トップページの抜粋（3件）。/voices/ とは別の文章

- Cardinality: collection (seed: 3)
- Client operations: update, create, delete, reorder


| key | kind | required | editable |
| --- | --- | --- | --- |
| `quote` | long-text | yes | yes |
| `author` | text | yes | yes |
| `school` | text | yes | yes |
| `order` | number | yes | no |

### `faq-group` — FAQ カテゴリー

/faq/ のカテゴリー（4件）

- Cardinality: collection (seed: 4)
- Client operations: update, create, delete, reorder


| key | kind | required | editable |
| --- | --- | --- | --- |
| `title` | text | yes | yes |
| `order` | number | yes | no |

### `faq-item` — FAQ

/faq/ の質問と回答（18件）

- Cardinality: collection (seed: 18)
- Client operations: update, create, delete, reorder


| key | kind | required | editable |
| --- | --- | --- | --- |
| `group` | reference → `faq-group` | yes | yes |
| `question` | text | yes | yes |
| `answer` | long-text | yes | yes |
| `order` | number | yes | no |

### `home-faq` — トップ FAQ

トップページの質問と回答（4件）。/faq/ とは別の文章

- Cardinality: collection (seed: 4)
- Client operations: update, create, delete, reorder


| key | kind | required | editable |
| --- | --- | --- | --- |
| `question` | text | yes | yes |
| `answer` | long-text | yes | yes |
| `order` | number | yes | no |

### `note` — ノート記事

/notes/<slug>/ の記事（5件）。slug は URL なので変更不可

- Cardinality: collection (seed: 5)
- Client operations: update, reorder


| key | kind | required | editable |
| --- | --- | --- | --- |
| `slug` | slug | yes | no |
| `title` | text | yes | yes |
| `description` | long-text | yes | yes |
| `body` | markdown | yes | yes |
| `order` | number | yes | no |

### `knowledge-card` — 受験について知る カード

/lessons/ のノート紹介カード（5件）。文言は記事とは別

- Cardinality: collection (seed: 5)
- Client operations: update, create, delete, reorder


| key | kind | required | editable |
| --- | --- | --- | --- |
| `note` | reference → `note` | yes | yes |
| `title` | text | yes | yes |
| `description` | text | yes | yes |
| `order` | number | yes | no |

### `contact-step` — お申し込みの流れ

/contact/ の手順（5件）。番号は表示順から付く

- Cardinality: collection (seed: 5)
- Client operations: update, create, delete, reorder


| key | kind | required | editable |
| --- | --- | --- | --- |
| `title` | text | yes | yes |
| `description` | text | yes | yes |
| `order` | number | yes | no |

### `legal-row` — 特定商取引法に基づく表記

/contact/ の表の行（8件）

- Cardinality: collection (seed: 8)
- Client operations: update, create, delete, reorder


| key | kind | required | editable |
| --- | --- | --- | --- |
| `key` | text | yes | yes |
| `value` | text | yes | yes |
| `order` | number | yes | no |
## 3. Editable-field policy (`src/policy.ts`)

Reconciled by Gate-1 (#7) with the pinned `zudo-composer/content` entry: the trusted policy IS Composer's `HostContentPolicy` (field **ids**, upstream operation vocabulary `put-entry-values | create-entry | delete-entry | reorder`) and the decision IS Composer's `authorizeContentMutation`, narrowed by Pinsel's own field rules.

- `PINSEL_EDITABLE_FIELDS` — the readable spec by field **key** per model (what the tables in §2 show).
- `PINSEL_CONTENT_POLICY` — the server policy the Worker enforces through `applyHostContentRequest`. It lists `order` for every model that may `reorder`, because Composer's `reorder` rewrites a *permitted* number field.
- `PINSEL_EDITOR_POLICY` — the presentation copy `mountContentEditor` receives: identical, except `order` is never listed, so the editor never offers it as a field. The server stays authoritative.
- `refusePinselRequest(request, models)` — host rules run before Composer's decision: `note.body` markdown subset (§4), `url` fields limited to internal paths / `https://`, `result-entry.url` limited to `SCHOOL_URL_ALLOWLIST`, and `order` refused in `put-entry-values` (only `reorder` moves it; `create-entry` may set the new entry's position). Refusals use Composer's codes: `forbidden`, `unknown-field`, `unknown-model`, `invalid-value`, `unsafe-reference`, `stale`, `malformed-request`, `wrong-project`, `not-found`, `conflict`.
- `authorizePinselMutation(actor, request, snapshot)` — Composer's decision under `PINSEL_CONTENT_POLICY` plus the host rules; used by tests and available to any in-process caller.

Operations: `put-entry-values` (singletons and every collection), `create-entry`/`delete-entry` (collections whose size is free), `reorder` (all collections except `course`, `page-copy`, `nav-link`). `note` allows `put-entry-values` + `reorder` only: a new note is a new route.

Read-only fields: `site-copy.brandWord/brandSub`, `page-copy.route`, `nav-link.href`, `note.slug`, every `order` (in the editor; on the server `order` moves only through `reorder`). Everything else in §2 is client-editable, including `result-year.declaredCount`, prices and `course.featured`.

Request shape (Composer `ContentMutationRequest`, values keyed by field **id**): `put-entry-values` / `create-entry` `{ kind, projectId: "pinsel", providerId: "content-filesystem", modelId, entryId, expectedRevision, values }`, `delete-entry { …, entryId }`, `reorder { …, fieldId: "<model>-order", entryIds }`. Any extra key is `malformed-request`.

## 4. Rich-text policy for `note.body` (`src/richtext-policy.ts`)

Allowed: `## ` headings, paragraphs, flat `- ` bullet lists, inline links `[text](href)` with `href` an internal path (`/contact/`, `/notes/x/#section-2`) or `https://…`, `*emphasis*` / `**strong**`.

Forbidden (code): raw HTML tags (`raw-html`), images (`image`), `# ` (`heading-1`, the article title owns h1), `### ` and deeper (`heading-3-plus`), empty headings, inline/fenced/indented code (`code`), tables (`table`), blockquotes (`blockquote`), ordered lists (`ordered-list`), `*`/`+` bullets (`bullet-marker`), nested lists (`nested-list`), thematic breaks, reference-style links (`link-reference`), `http://`, `mailto:`, protocol-relative or script hrefs (`unsafe-link`).

Why: the five approved notes use exactly h2 (6/6/8/6/6), paragraphs, flat lists (10/6/9/4/0 lines) and one `[お問い合わせ](/contact/)` each — verified by `richtext-policy.test.ts` against the fixture bodies. The prototype renderer (`build.py note_body()`) understands only these blocks; the zudo-react port (#8) implements the same subset, so anything outside it would render as literal text or need a renderer the approved design never had. Headings get `#section-N` by position (`noteHeadings()`), which is also what the checker-neutral prototype does.

## 5. Structure manifest (`src/site/structure.ts`, `defineSite`)

Implemented as `buildPinselSite(entries, pack)`; the component ids/props/slots it authors against are fixed in `src/site/component-contract.ts` (pack `pinsel@0.2.0`), which `@pinsel/ui` must ship (`checkPackAgainstContract`, run by `content:validate`). How the pinned Composer (7ca114a3) shapes it:

- **No global template.** The compiler never materialises a template's collection attachments, so the frame cannot receive Content. Every page composition's root is `pinsel.site-frame` with slots `header` / `main` / `footer`; `pinsel.site-header` / `pinsel.site-footer` are injected from `site-copy`, their nav items from `nav-link` (header in the prototype order `HEADER_NAV_HREFS`, footer in `nav-link.order`).
- **One entry per node.** A node's props come from the one entry its mapping selects. Copy from a second model reaches a node through a slot filled by a nested attachment (instructor `identity`, CTA `subcopy`, article `eyebrow`, TOC items). One-entry models are injected with limit-1 collection mappings into `pinsel.group` hosts (a group renders its items with no wrapper).
- **Static conditions only.** Attachment conditions cannot refer to the parent entry, so the result-year sections (with their `result-entry` rows), the FAQ categories (with their items), their TOC entries and the five note pages are generated per entry at assemble time and select their entry by pin (`query.pins`, patched after `toSiteProject()` because the DSL has no pins; an impossible `order = -1` condition keeps a deleted pin from selecting another entry). Rows inside an existing year/group are live; a new year, FAQ group or note needs a re-assemble (the publication pipeline always assembles from the snapshot's entries).
- **Positional ids** come from the renderer's injected 1-based `slotIndex` (`#student-N`, `details#category-G-N`, the `01` numbering); where a positional item sits alone inside a generated group (results/FAQ TOC, `#faq-N`) the number is a structure literal of that generated node.
- Plan pathnames have no trailing slash (`/lessons`); `planPathname` / `routeForPlanPathname` map them to the 14 output routes. Page `<title>`/description come from `resolvePageMeta(route, entries)` and are emitted as `OUTPUTS` in `apps/site/data/routes.generated.ts`.


Global template (all 14 outputs): `header` outlet ← `nav-link` collection (header subset, `headerLabel`) + `site-copy.brandWord/brandSub` + `site-copy.ctaButtonLabel` (contact button) → `<main id="main">` outlet → `footer` outlet ← `nav-link` (7: `label`, `footerTitle`, `footerDescription`), `site-copy.footerInstagramLabel` → `INSTAGRAM_URL`, `site-copy.footerCopyright` (the approved prototype literal `© 2015–2026 …`; the client edits the year, the build never computes it, so projection stays deterministic), `site-copy.backToTopLabel`. `<head>` ← `page-copy.metaTitle/metaDescription` (notes: `{note.title} - Pinsel Notes` / `note.description`). English eyebrows (For You, COURSE & PRICING, Instructor, Results, Voices, FAQ, Contact, Lessons, About, Notes, Message, Our lessons, Course, Pricing, Consultation, Specializations, For Graduates, Knowledge) and ARIA labels are structure literals, not content. Section ids are §6 invariants.

| Route | Sections in prototype order | Feeds |
| --- | --- | --- |
| `/` | hero → hero-meta → `#for-you` → `#pricing` → art → `#instructor` → `#results` → `#voices` → `#faq` → CTA | `site-copy.hero*` + `/lessons/` + `HERO_PRICING_HREF`; `site-copy.heroMetaLine/heroIntro`; `target-item[page=home]` (attachment, sort `order`); `course` (attachment, sort `order`; link `contactHrefForCourse`) + `site-copy.pricingNote/pricingMoreLabel` (税込 / POPULAR / このコースについて相談する stay `pinsel.pricing-card` manifest defaults: a slot child cannot read site-copy); `instructor-profile` (`homeBio`, `instructorDetailLabel` → `/about/`); `home-result` (attachment) + `moreLabel` → `/results/`; `home-voice` (attachment) + `moreLabel` → `/voices/`; `home-faq` (attachment, `details#home-q-N`) + `moreLabel` → `/faq/`; CTA ← `site-copy.ctaTitle/ctaButtonLabel` + `page-copy[page-home].ctaSubCopy` |
| `/lessons/` | PageHeader → TOC(8) → `#for-you` → `#course` → `#pricing` → `#consultation` → art → `#instructor` → `#specializations` → `#graduates` → `#knowledge` → CTA | `page-copy[page-lessons]`; `lessons-copy.toc*`; `target-item[page=lessons]`; `lessons-copy.courseIntro` + `course-step` (attachment); `course[two-month,four-month]` (`name`, `price`, `lessonsNote`) + `lessons-copy.pricing*Note`; `course[consultation]` + `lessons-copy.consultation*`; `instructor-profile.lessonsBio` + `timeline-entry[timeline=lessons-career]`; `specialization` (attachment) + `lessons-copy.specializationsNote`; `lessons-copy.graduatesParagraphs` + `ASSET_PATHS.graduatesIllustration` (alt `""`); `knowledge-card` (attachment, href from referenced `note.slug`); CTA ← `page-copy[page-lessons].ctaSubCopy` |
| `/about/` | PageHeader → profile → CV (経歴 / 学歴) → art → `#message` → レッスンの特長 → CTA | `page-copy[page-about]`; `instructor-profile.name/latinName` + `about-copy.birthLine/instagramLabel` → `INSTAGRAM_URL`; `timeline-entry[timeline=about-career]`, `[about-education]` + `about-copy.careerTitle/educationTitle`; `instructor-profile.aboutMessage` + `about-copy.messageTitle`; `feature-card` (attachment) + `about-copy.featuresTitle`; CTA |
| `/results/` | PageHeader + stats → aside TOC → `section#year-<label>` ×11 → CTA(small) | `page-copy[page-results]` (+ `asideLabel`); `site-copy.stats*`; `result-year` (attachment, sort `order`) each with `result-entry[year=ref]` (nested collection attachment, sort `order`; `url` → external link); CTA |
| `/voices/` | PageHeader → student index → `article#student-N` ×5 (art after #2) → CTA(small) | `page-copy[page-voices]`; `testimonial` (attachment, sort `order`; `quote` split on newline) |
| `/faq/` | PageHeader → aside TOC → `section#faq-N` ×4 → CTA(small) | `page-copy[page-faq]` (+ `asideLabel`); `faq-group` (attachment) each with `faq-item[group=ref]` (nested, first group open) |
| `/notes/` | PageHeader → note cards (editorial) → art. No CTA | `site-copy.notesIndexTitle/notesIndexDescription`, `page-copy[page-notes]` meta; `note` (attachment, sort `order`) |
| `/notes/<slug>/` | breadcrumb → article heading → art(ribbon) → aside Contents → prose (`h2#section-N`) → All Notes → art. No CTA | `note` collection route `entry-field: slug`; `site-copy.noteEyebrow/contentsLabel/allNotesLabel`; All Notes ← `note` in seed key order with `aria-current` on self; last paragraph link `/contact/` comes from the markdown |
| `/contact/` | PageHeader(ribbon) → aside steps → form + success panel → legal `<details#legal>` → art. No CTA | `page-copy[page-contact]`; `contact-copy.*`; `contact-step` (attachment); `course.contactOptionLabel` after `courseUndecidedOption` (option index = `COURSE_QUERY_OPTIONS.index`); `legal-row` (attachment) |
| `/404.html` | not-found block → art | `site-copy.notFound*` → `/`; `page-copy[page-not-found].metaTitle` only (no description) |

Mapping bindings are scalar (`text`, `long-text`, `number`, `boolean`, `choice`) or list projections; references resolve to the target entry's fields (`knowledge-card.note` → slug, `result-entry.year` → grouping). `free-tuition`'s title is displayed as two `.title-phrase` spans by the UI (presentation keyed on slug), the stored title is the plain string.

## 6. Invariants (`src/invariants.ts`)

- Routes (14): `PINSEL_ROUTES` = `/`, `/lessons/`, `/about/`, `/results/`, `/voices/`, `/faq/`, `/notes/`, 5 × `/notes/<slug>/`, `/contact/`, `/404.html` (`page-manifest.json` order; `outputFileForRoute`).
- Fragments (`ROUTE_FRAGMENTS`): `/` for-you, pricing, instructor, results, voices, faq; `/lessons/` for-you, course, pricing, consultation, instructor, specializations, graduates, knowledge; `/about/` message; `/results/` `year-<label>` ×11 (non-ASCII, `year-2025年度`…); `/voices/` `student-1..5`; `/faq/` `faq-1..4`; notes `section-1..N` (6/6/8/6/6). Positional ids follow collection order; adding/reordering entries shifts them deliberately. UI anchors (`#main`, `#top`, `#site-navigation`, `#legal`, `#contact-form`, `#hero-title`, `#home-q-N`) are not content.
- Course query: `/contact/?course=N` sets `selectedIndex = N`; 0 = 未定, 1 = 有料進路相談 (`consultation`), 2 = 2ヶ月コース (`two-month`), 3 = 4ヶ月コース (`four-month`). `course.order` therefore is read-only.
- Navigation: `NAV_HREFS` (7 footer, `nav-link.order`) / `HEADER_NAV_HREFS` (6, prototype `ui.py NAV` order); `HERO_PRICING_HREF` `/#pricing`; `INSTAGRAM_URL`; `SITE_ORIGIN` `https://pinsel-germany.com`.
- External links: `SCHOOL_URL_ALLOWLIST` = seed `schoolUrls` verbatim (47 names, name variants share URLs); `ALLOWED_EXTERNAL_URLS` = those + Instagram. Every school in the 105 rows has an https entry (test).
- Assets: `ASSET_PATHS` instructor portrait, graduates illustration, favicon.
- Markdown headings → `#section-N` by position (`NOTE_SECTION_COUNTS`).

## 7. Import rules and `content/baseline.json` (`src/import-rules.ts`)

- Files: `content/entries/<modelId>/<entryId>.json`, one `ContentEntryRecord` each, `lifecycle: "published"`, `generation: 0`, seed timestamps; the only paths the publisher may write (plus `content/snapshot.json`).
- Id scheme: as in §2 "Id scheme" (`seedEntryId(prefix, n)` = `<prefix>-<NN>`); client-created entries get `<modelId>-<host id>` and ids are never reused.
- Digest: `sha256(canonicalStringifyJson(entry.values))` lowercase hex, values only.
- `content/baseline.json` (`ContentBaseline`): `{ schemaVersion: 1, source: { repository, pr, head }, seedContentDigest, entriesDigest, importedAt, entries: { "<modelId>/<entryId>": { modelId, entryId, digest, protectedDigest } } }`.
- `protectedDigest` per entry = the same digest over only the fields the server policy never writes (`page-copy.route`, `nav-link.href`, `note.slug`, `course.order`, …); `entriesDigest` = sha256 of the canonical `entries` map. The publication checker compares protected digests and allowed create/delete per model.
- Importer: `node scripts/content/import-seed.mjs` (`pnpm --filter @pinsel/content content:import`), logic in `src/import/import-seed.ts`; the seed records come from `src/import/seed-entries.ts`.
- Decision per seed entry (`decideImport`): no file → `create`; file = baseline = seed → `unchanged` (idempotent re-run makes no write); file = baseline ≠ seed → `update-from-seed` and advance the baseline; file ≠ baseline (or no baseline and file ≠ seed) → `keep-newer` — the CMS edit wins, the importer reports it and never overwrites. The publication pipeline advances the baseline to the published snapshot's digests after a verified merge.

## 8. Coverage of `expected-content.json`

Every `body` kind / `recordGroups` / `links` group per page maps to a model:

| Page | expected-content source | Model / field |
| --- | --- | --- |
| all | `shared.footer` footer-title/description (7×2), `shared.destinations`, `shared.instagram` | `nav-link.footerTitle/footerDescription/href`, `INSTAGRAM_URL` |
| `/` | metadata | `page-copy[page-home]` |
| `/` | hero `static-p` ×3 (label, h1 line, 5-line lead) | `site-copy.heroLabel/heroTitleLines/heroLead` |
| `/` | `static-p` 初心者の方も… | `site-copy.heroIntro` |
| `/` | `MoreLinkButton.text` クラスの詳細はこちら, `Carousel.moreText` | `site-copy.pricingMoreLabel`, `site-copy.moreLabel` |
| `/` | `InstructorProfile.name/title/bio`, `static-a` 詳しく見る | `instructor-profile.name/title/homeBio`, `site-copy.instructorDetailLabel` |
| `/` | `literal-pricingData` (12), pricing `static-p` note | `course.name/price/unit/homeDescription`, `site-copy.pricingNote` |
| `/` | `literal-results` (home result cards, 6) | `home-result` |
| `/` | `literal-voices` (3) | `home-voice` |
| `/` | `literal-faqItems` (4×2) | `home-faq` |
| `/` | `literal-targetItems` (5) | `target-item[page=home]` |
| `/` | `CtaSection.text/subCopy`, cta `static-p` | `site-copy.ctaButtonLabel/ctaTitle`, `page-copy.ctaSubCopy` |
| `/` | links `/#pricing` | `HERO_PRICING_HREF` |
| `/lessons/` | `PageHeader.*`, metadata, `CtaSection.*` | `page-copy[page-lessons]` |
| `/lessons/` | `static-h2` ×6, `static-h3` 経歴/面談で話す内容/よくある質問 | `lessons-copy.*Title`, `careerTitle`, `consultationTopicsTitle`, `consultationFaqTitle` |
| `/lessons/` | `static-p` name/bio | `instructor-profile.name/lessonsBio` |
| `/lessons/` | `static-p` course intro, price cards (2ヶ月/4ヶ月 name, price, 税込 note), schedule/continue/payment notes, consultation (進路相談, ¥10,000, 税込 note) | `lessons-copy.courseIntro/pricing*Note`, `course.name/price/lessonsNote` |
| `/lessons/` | `static-p` specializations note, graduates ×4 | `lessons-copy.specializationsNote/graduatesParagraphs` |
| `/lessons/` | `InfoCard.title/description` ×3 | `course-step` |
| `/lessons/` | `literal-recommendedItems` (7) | `target-item[page=lessons]` |
| `/lessons/` | `literal-specializations` (9×2) | `specialization.de/ja` |
| `/lessons/` | `literal-careerTimeline` (7×2) | `timeline-entry[lessons-career]` |
| `/lessons/` | `literal-knowledgeCards` (5×2) | `knowledge-card.title/description` |
| `/lessons/` | `inline-list` (5 + 6) | `lessons-copy.consultationTopics/consultationFaqTopics` |
| `/about/` | `PageHeader.title`, metadata, `CtaSection.*` | `page-copy[page-about]` |
| `/about/` | `static-p` name, 1987年…, `static-h2` ×4 | `instructor-profile.name`, `about-copy.birthLine/careerTitle/educationTitle/messageTitle/featuresTitle` |
| `/about/` | `static-p` message ×7 | `instructor-profile.aboutMessage` |
| `/about/` | `literal-education` (2), `literal-career` (6) (`年　text`) | `timeline-entry[about-education]`, `[about-career]` (`year` + `text`) |
| `/about/` | `literal-features` (4×2) | `feature-card` |
| `/results/` | `PageHeader.*`, metadata, `CtaSection.*` | `page-copy[page-results]` |
| `/results/` | `literal-stats` (123+/合格実績/30+/合格校数) | `site-copy.stats*` |
| `/results/` | `recordGroups` 11 years (label, declaredCount, school+department rows) | `result-year.label/declaredCount`, `result-entry.school/department` |
| `/voices/` | `PageHeader.*`, metadata, `CtaSection.*` | `page-copy[page-voices]` |
| `/voices/` | `testimonial` body (author, year, school, department, quote) + recordGroup "Five full testimonials" | `testimonial` |
| `/faq/` | `PageHeader.*`, metadata, `CtaSection.*` | `page-copy[page-faq]` |
| `/faq/` | `faq` body: 4 group titles + 18 Q/A | `faq-group.title`, `faq-item.question/answer` |
| `/contact/` | `PageHeader.*`, metadata | `page-copy[page-contact]` |
| `/contact/` | `static-h2` お申し込みの流れ, `static-summary` | `contact-copy.stepsTitle/legalSummary` |
| `/contact/` | `literal-steps` (5×2) | `contact-step` |
| `/contact/` | `literal-tokushoho` (8×2) | `legal-row` |
| `/contact/` | `form-label` ×4, `form-option` ×4, `form-ui` 必須/送信する | `contact-copy.*Label`, `courseUndecidedOption` + `course.contactOptionLabel`, `requiredLabel`, `submitLabel` |
| `/notes/` | `PageHeader.description`, metadata, `article-card` (5×2), links ×5 | `site-copy.notesIndexDescription`, `page-copy[page-notes]`, `note.title/description/slug` |
| `/notes/<slug>/` | `article-title/description/block`, metadata, `all-notes-link` ×4, `article-contact` | `note.title/description/body` (blocks = h2 / paragraph / list), `NOTE_SLUGS`, link inside `body` |
| `/404.html` | `static-h1/p/a`, metadata title, link `/` | `site-copy.notFound*`, `page-copy[page-not-found].metaTitle` |

Not in `expected-content.json` but visible in the approved prototype and covered: hero buttons/links, hero-meta line, JP section titles, TOC labels, POPULAR/税込 (pricing-card defaults), All Notes/Contents/Pinsel Notes, footer copyright/Instagram label/ページの先頭へ, contact 任意/送信中/success/error/preview notices, back button, validation messages.

## 9. Verification

- `pnpm --filter @pinsel/content test`: models/policy/rich-text/invariants as above, plus `import-seed.test.ts` (fresh import = committed `content/entries` + `content/baseline.json` byte for byte; second run writes nothing; a CMS-edited entry is `keep-newer` and never overwritten; `update-from-seed` when only the baseline moved), `migration.test.ts` (seed counts per model, 11 years declaring 123 vs 105 rows with allowlisted URLs, multi-paragraph testimonial quotes, 18 FAQ in 4 groups, home copies distinct from detail records, note bodies byte-identical to `content.json`, both course wordings, per-route `<title>`/description = `expected-content.json`, every field covered by `PUBLICATION_MAP`), `structure.test.ts` (zero diagnostics, deterministic assembly, Node compiler = portable plan = `tests/golden/routes.snapshot.json`, prototype fragments/links/art windows) and `publication.test.ts` (the checker on a dist rendered by the contract test double: unmodified pass, allowed price/FAQ edit pass, stale dist / order / adjacency / missing output / protected field / forbidden create-delete caught).
- `pnpm --filter @pinsel/content content:validate` / `content:check [--update]`: see the scripts' headers; `PINSEL_STRUCTURE_PACK=contract` swaps in the render-nothing contract pack while `@pinsel/ui` does not yet satisfy the contract (the plan is identical once it does).
- `node scripts/content/check-publication.mjs --dist <dir>`: the publication gate; run against the approved prototype dist it reports only the three contact-form data attributes the prototype keeps inside `site.js` (`data-submitting-label`, `data-value-missing-message`, `data-email-format-message`, new in the component contract).
- `node scripts/content/trace-to-source.mjs --prototype <seed>/prototype/src`: every entry value traced to a `content.json` path, the prototype line that hard-codes it, a structure key, a seed position or a reference.
