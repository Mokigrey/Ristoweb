const slugFormat = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const dnsLabel = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

export function isShowcaseSlug(slug: string) {
  return slug.length <= 80 && slugFormat.test(slug);
}

function showcaseDomain() {
  const domain = process.env.SELFWEB_SHOWCASE_DOMAIN?.trim().toLowerCase().replace(/\.$/, "");
  if (!domain || domain.length > 253) return null;
  const labels = domain.split(".");
  return labels.length > 1 && labels.every((label) => dnsLabel.test(label)) ? domain : null;
}

export function showcasePath(slug: string) {
  return `/vetrine/${encodeURIComponent(slug)}`;
}

export function showcaseSubdomainUrl(slug: string) {
  const domain = showcaseDomain();
  if (!domain || slug.length > 63 || !isShowcaseSlug(slug) || slug.length + domain.length + 1 > 253) return null;
  return `https://${slug}.${domain}/`;
}

export function matchShowcaseHost(authority: string) {
  const domain = showcaseDomain();
  if (!domain) return null;

  const host = authority.toLowerCase().replace(/:\d+$/, "").replace(/\.$/, "");
  const suffix = `.${domain}`;
  if (!host.endsWith(suffix)) return null;

  const slug = host.slice(0, -suffix.length);
  return { slug: showcaseSubdomainUrl(slug) ? slug : null };
}
