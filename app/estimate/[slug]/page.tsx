import { redirect } from 'next/navigation';

export default async function EstimateSlugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  redirect(`/estimate/${encodeURIComponent(slug)}/contact`);
}
