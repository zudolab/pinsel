# Native Assistant configuration and ownership

This guide describes the native integration under development in
[Composer T5](https://github.com/Takazudo/zudo-composer/issues/973).
Use the [compatibility ledger](composer-compatibility.md) for the exact installed
revision and accepted scenarios. Configuration alone is not an acceptance pass.

The Assistant is disabled unless `PINSEL_ASSISTANT_PROVIDER` is explicitly set.
Supported values are `anthropic`, `claude-cli`, `codex-cli`, and `fake`. There is
no automatic provider fallback. `fake` is an offline deterministic integration
fixture; it never proves authenticated inference.

For a real provider, set `PINSEL_ASSISTANT_MODEL` and
`PINSEL_ASSISTANT_EFFORT` (`low`, `medium`, or `high`) explicitly. These values
are passed to Composer unchanged. `codex-cli` additionally accepts
`PINSEL_ASSISTANT_SERVICE_TIER`. No provider imports settings from an unrelated
agent session, changes credentials, or installs a model CLI.

The `anthropic` provider reads the server-only `PINSEL_ASSISTANT_API_KEY`
environment variable. Never put its value in a config file, Content record,
prompt, screenshot or issue. An optional `PINSEL_ASSISTANT_BASE_URL` selects a
supported HTTPS endpoint or a loopback HTTP test server; Composer validates it.
CLI providers require their supported executable and existing authorized sign-in
in the actual execution environment. Missing capability remains a blocker.

The same explicit stage must be selected for authoring, capture and build. For
example, after a verified Note-route migration, start `notes-v1` with the selected
provider settings in the environment:

```sh
PINSEL_AUTHORING_STAGE=notes-v1 pnpm dev
```

This command does not
import owner data, authorize deployment or activate a production site.

## What the Assistant may propose

Local component fields and permitted named-slot changes belong to Composition.
Bound values belong to their referenced Content records. Trusted Pinsel policy
allows these shared fields:

| Content model | Fields | Ownership |
| --- | --- | --- |
| `course` | `course-price` | Shared pricing, including Home and Lessons |
| `faq-item` | `faq-item-question`, `faq-item-answer` | Detailed FAQ records |
| `home-faq` | `home-faq-question`, `home-faq-answer` | Independently authored Home excerpts |
| `note` | `note-title`, `note-body` | Selected Note record |

The policy does not permit changing record identity, URL slugs, publication,
course order or unrelated fields through AI. Selecting a shared use must resolve
the actual qualified record and show its affected uses. Similar text is not a
reason to merge Home excerpts with detailed records. A bound field must never be
copied into local component props to make an edit appear to work.

Proposals must leave canonical state unchanged until explicit Apply. Review the
actual Pinsel-rendered candidate, owner and affected uses. Mixed-domain requests
have separate reviewed operations with separate receipts and Undo; they are not
a cross-domain transaction. Applying one operation can make another stale and
require a new review. Stale approval must refuse rather than silently rebase.

Lost-response recovery uses the existing durable operation receipt. Undo restores
the operation's prior state only when its owning domain still matches the
expected after-image. Do not retry by creating another operation or overwrite
intervening edits. Recovery remains distinct from generating a new model reply.

New live-provider acceptance is held in [Pinsel #58](https://github.com/zudolab/pinsel/issues/58).
Record the actual provider, model, effort and tier, exact package/workspace
identities, and observed result when the supported capability is available.
Historical Note-only inference and scripted tests do not complete that hold.

The [canonical-read-only Inspector/Assistant proof](composer-assistant-readonly-acceptance.md)
checks shared affected-use display, actual fake-provider tools and explicit unsupported-request
reasons without Apply. Its stream-evidence recovery reads an existing run and remains
separate from canonical receipt recovery.

[Native Content value rules](native-content-validation.md) apply to both human and
Assistant writes. The actual selected Note body capability carries its supported
Markdown guidance; this never grants additional fields or operations.
