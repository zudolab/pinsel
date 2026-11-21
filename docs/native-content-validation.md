# Native Content value rules

Pinsel configures Composer's trusted `contentValidation` hook independently of
Assistant availability. The public host module is
`@pinsel/content/content-validation`, identity `pinsel-content-values@1`.
It reuses `checkFieldValue`: supported Note Markdown, internal/HTTPS links and
approved school URLs. It does not apply the removed Hosted editor's fixed-record
or structural-edit permissions.

Human writes and native Assistant proposals/Apply use the same server validator.
Changed fields are checked before commit; new entries and selected publication
check their supplied values. Validation refuses without changing canonical values,
tokens or revision history. The validator is field-local, not a cross-domain
transaction. Composer's existing schema and ownership checks still apply.

A Note title owns the document h1. Body content supports nonempty `##` headings,
paragraphs, flat `- ` lists, inline emphasis/strong and safe inline links. Raw HTML,
images, other heading levels, code, tables and nested lists are unsupported. The
actual Assistant `inspect_owner` result receives `NOTE_AI_BODY_CONSTRAINTS` for
`note-body` through trusted field guidance. Guidance does not expand permissions;
the server validator remains authoritative.

Existing historical invalid data remains readable and is not silently rewritten
at startup or import. An unrelated valid edit need not rewrite an unchanged legacy
body. Before a new publication of that entry, explicitly correct its invalid body.
Keep the original capture, import evidence and history. A new Undo or restore that
would write invalid values refuses; recovering an already committed receipt does
not replay or reverse its mutation.

Policy source and configuration are bound into reviewed capture, proposal and
release identities. A policy change requires restart and fresh review. Historical
published Content can still be read through its integrity-checked data reader;
this does not waive compatibility checks for rendering an old release with a
changed runtime.

Implementation and installed results are separate. Consult the
[compatibility ledger](composer-compatibility.md) and
[Composer #986](https://github.com/Takazudo/zudo-composer/issues/986) for exact
package identities, refusal/Apply/Undo/publication evidence and remaining work.
Known-data fixtures are not the owner's current local database. This integration
does not switch that database's authority or deploy a site.
