/** Site-wide links. Set GITHUB_URL once the repo is published - the docs
 * header/footer render the link only when it's non-empty. */
export const GITHUB_URL = "https://github.com/Stefa9250/solana-ui-kit";

/**
 * Public origin of the deployed docs. Used to build the `shadcn add` install
 * command and the /r/<slug>.json (registry) and /r/<slug>.md (LLM) endpoints.
 * Set NEXT_PUBLIC_SITE_URL in the deployment environment; the fallback below is
 * a placeholder for local dev only and will NOT install anything until replaced.
 *
 * Normalised so an empty, whitespace, protocol-less, or trailing-slash value
 * can never produce an invalid URL (which would crash `new URL()` at build).
 */
function normalizeOrigin(raw: string | undefined): string {
  const trimmed = (raw ?? "").trim().replace(/\/+$/, "");
  if (!trimmed) return "";
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

const CONFIGURED_ORIGIN = normalizeOrigin(process.env.NEXT_PUBLIC_SITE_URL);

export const SITE_URL = CONFIGURED_ORIGIN || "https://solana-ui-kit.vercel.app";

/** True while SITE_URL is still the dev placeholder (no real deployment set). */
export const SITE_URL_IS_PLACEHOLDER = CONFIGURED_ORIGIN === "";
