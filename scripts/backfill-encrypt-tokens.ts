/**
 * One-time backfill: encrypts any `integrations` rows whose access_token/
 * refresh_token are still plaintext, from before token-crypto.ts existed.
 * Run manually, once, after TOKEN_ENCRYPTION_KEY is set in the deploy
 * environment: `npx tsx scripts/backfill-encrypt-tokens.ts`.
 *
 * Safe to re-run: a row already encrypted decrypts successfully and is
 * skipped; only rows that fail to decrypt (still plaintext) get rewritten.
 * There's no separate tracking column for this on purpose -- decrypt-first
 * doubles as the idempotency check.
 */
import { createAdminClient } from "../src/lib/supabase/admin";
import { decryptToken, encryptTokenOrNull } from "../src/lib/integrations/token-crypto";

async function main() {
  const supabase = createAdminClient();

  const { data: rows, error } = await supabase
    .from("integrations")
    .select("id, access_token, refresh_token")
    .or("access_token.not.is.null,refresh_token.not.is.null");

  if (error) {
    console.error("Failed to load integrations:", error.message);
    process.exit(1);
  }

  let encrypted = 0;
  let alreadyDone = 0;
  let failed = 0;

  for (const row of rows ?? []) {
    const needsAccessToken = row.access_token != null;
    const needsRefreshToken = row.refresh_token != null;

    let accessIsPlaintext = false;
    let refreshIsPlaintext = false;

    if (needsAccessToken) {
      try {
        decryptToken(row.access_token as string);
      } catch {
        accessIsPlaintext = true;
      }
    }
    if (needsRefreshToken) {
      try {
        decryptToken(row.refresh_token as string);
      } catch {
        refreshIsPlaintext = true;
      }
    }

    if (!accessIsPlaintext && !refreshIsPlaintext) {
      alreadyDone += 1;
      continue;
    }

    const update: { access_token?: string | null; refresh_token?: string | null } = {};
    if (accessIsPlaintext) update.access_token = encryptTokenOrNull(row.access_token);
    if (refreshIsPlaintext) update.refresh_token = encryptTokenOrNull(row.refresh_token);

    const { error: updateError } = await supabase
      .from("integrations")
      .update(update)
      .eq("id", row.id);

    if (updateError) {
      console.error(`Failed to encrypt integration ${row.id}:`, updateError.message);
      failed += 1;
      continue;
    }
    encrypted += 1;
  }

  console.log(`Encrypted: ${encrypted}, already encrypted: ${alreadyDone}, failed: ${failed}`);
  if (failed > 0) process.exit(1);
}

main();
