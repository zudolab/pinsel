# Recorded GitHub REST responses

Response bodies for `src/publish/github-provider.ts`, in the shapes of the GitHub REST API version `2022-11-28` (git refs/commits/trees, pulls, compare, check runs, contents, merge). Unused fields are trimmed. No token was ever used and no request reaches GitHub: they are written from the documented response schemas, not captured from a live repository, and `test/github-replay.ts` fails any request that has no fixture.

Placeholders `{{NAME}}` are filled per test; `{{BASE64:NAME}}` is the base64 of that value, like the `content` field of the contents API.
