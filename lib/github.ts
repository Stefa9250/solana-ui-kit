import { GITHUB_URL } from "./site";

/**
 * Fetch the repo's star count (server-side, revalidated hourly). Returns null
 * on any failure - offline, rate-limited, private repo - so callers can just
 * hide the count rather than error.
 */
export async function getStars(): Promise<number | null> {
  if (!GITHUB_URL) return null;
  const api = GITHUB_URL.replace(
    "https://github.com/",
    "https://api.github.com/repos/",
  );
  try {
    const res = await fetch(api, {
      next: { revalidate: 3600 },
      headers: { Accept: "application/vnd.github+json" },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { stargazers_count?: number };
    return typeof data.stargazers_count === "number" ? data.stargazers_count : null;
  } catch {
    return null;
  }
}

/** Compact star display: 1234 → "1.2k". */
export function formatStars(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k` : String(n);
}
