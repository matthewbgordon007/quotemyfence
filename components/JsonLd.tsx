/**
 * Inline JSON-LD structured data for SEO.
 * Use multiple <JsonLd> tags per page for Organization, WebSite, FAQPage, Article, etc.
 */
export function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
