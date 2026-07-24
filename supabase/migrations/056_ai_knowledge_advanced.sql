-- ============================================================
-- 056_ai_knowledge_advanced.sql — Advanced knowledge base features
--
-- Extends the knowledge base with:
--   - File uploads (PDF, DOCX)
--   - URL imports
--   - Usage tracking
--   - Source type tracking
--
-- Idempotent — safe to run multiple times.
-- ============================================================

ALTER TABLE ai_knowledge_documents
  ADD COLUMN IF NOT EXISTS source_type text DEFAULT 'text' CHECK (source_type IN ('text', 'file', 'url')),
  ADD COLUMN IF NOT EXISTS file_url text,
  ADD COLUMN IF NOT EXISTS file_size integer,
  ADD COLUMN IF NOT EXISTS file_type text,
  ADD COLUMN IF NOT EXISTS url text,
  ADD COLUMN IF NOT EXISTS usage_count integer DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_ai_knowledge_documents_source_type ON ai_knowledge_documents(source_type);
CREATE INDEX IF NOT EXISTS idx_ai_knowledge_documents_usage ON ai_knowledge_documents(usage_count DESC);
