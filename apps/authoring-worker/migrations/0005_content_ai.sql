-- Immutable proposals/candidate previews only. Editable Content remains exclusively
-- in pinsel_hosted_head; Apply/Undo use its atomic revisions and receipts.
CREATE TABLE pinsel_ai_proposal (id TEXT PRIMARY KEY, record TEXT NOT NULL, preview TEXT NOT NULL);
