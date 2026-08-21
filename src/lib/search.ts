/** Escape Postgres LIKE/ILIKE metacharacters so user input matches literally. */
export function escapeLike(s: string): string {
  return s.replace(/[%_\\]/g, "\\$&");
}

/**
 * Sanitize a user-supplied search term for safe interpolation into a PostgREST
 * `.or(...)` filter string. Escapes LIKE metacharacters and neutralizes the
 * PostgREST filter-grammar delimiters (`,` `(` `)` `"`) that could otherwise
 * inject extra predicates or embedded-resource references.
 *
 * The tenant `.eq(company_id/organization_id)` filter MUST always remain a
 * separate top-level filter — never folded into the `.or()` group — so that even
 * a malformed term can never widen tenant scope.
 */
export function sanitizeSearchTerm(s: string): string {
  return escapeLike(s).replace(/[(),"]/g, " ").trim();
}
