-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding columns to customers
ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS embedding vector(768),
  ADD COLUMN IF NOT EXISTS embedding_updated_at TIMESTAMPTZ;

-- Add embedding columns to jobs
ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS embedding vector(768),
  ADD COLUMN IF NOT EXISTS embedding_updated_at TIMESTAMPTZ;

-- Add embedding columns to sales
ALTER TABLE sales
  ADD COLUMN IF NOT EXISTS embedding vector(768),
  ADD COLUMN IF NOT EXISTS embedding_updated_at TIMESTAMPTZ;

-- HNSW indexes for fast cosine-similarity search
CREATE INDEX IF NOT EXISTS customers_embedding_hnsw
  ON customers USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

CREATE INDEX IF NOT EXISTS jobs_embedding_hnsw
  ON jobs USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

CREATE INDEX IF NOT EXISTS sales_embedding_hnsw
  ON sales USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- Per-table semantic search RPCs (cosine similarity, company-scoped)
CREATE OR REPLACE FUNCTION search_customers_by_embedding(
  p_company_id UUID,
  p_embedding  vector(768),
  p_limit      INT DEFAULT 10
)
RETURNS TABLE(id UUID, similarity FLOAT)
LANGUAGE SQL STABLE
AS $$
  SELECT id, 1 - (embedding <=> p_embedding) AS similarity
  FROM customers
  WHERE company_id = p_company_id
    AND embedding IS NOT NULL
  ORDER BY embedding <=> p_embedding
  LIMIT p_limit;
$$;

CREATE OR REPLACE FUNCTION search_jobs_by_embedding(
  p_company_id UUID,
  p_embedding  vector(768),
  p_limit      INT DEFAULT 10
)
RETURNS TABLE(id UUID, similarity FLOAT)
LANGUAGE SQL STABLE
AS $$
  SELECT id, 1 - (embedding <=> p_embedding) AS similarity
  FROM jobs
  WHERE company_id = p_company_id
    AND embedding IS NOT NULL
  ORDER BY embedding <=> p_embedding
  LIMIT p_limit;
$$;

CREATE OR REPLACE FUNCTION search_sales_by_embedding(
  p_company_id UUID,
  p_embedding  vector(768),
  p_limit      INT DEFAULT 10
)
RETURNS TABLE(id UUID, similarity FLOAT)
LANGUAGE SQL STABLE
AS $$
  SELECT id, 1 - (embedding <=> p_embedding) AS similarity
  FROM sales
  WHERE company_id = p_company_id
    AND embedding IS NOT NULL
  ORDER BY embedding <=> p_embedding
  LIMIT p_limit;
$$;
