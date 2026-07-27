export function parseDomains(storeUrl: string | null | undefined): string[] {
  if (!storeUrl) return [];
  const raw = storeUrl.trim();
  if (!raw) return [];

  // 1. Try parsing JSON array
  if (raw.startsWith('[')) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map((d: string) => String(d).trim()).filter(Boolean);
      }
    } catch (e) {}
  }

  // 2. Fallback: Split by comma or newline
  return raw
    .split(/[\n,]+/)
    .map(d => d.trim())
    .filter(Boolean);
}

export function formatDomainsForInput(storeUrl: string | null | undefined): string {
  const list = parseDomains(storeUrl);
  return list.join(', ');
}
