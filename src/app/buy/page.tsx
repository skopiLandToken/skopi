import BuyClient from "./buy-client";

export default async function BuyPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const sp = searchParams || {};

  const rawAmount = Array.isArray(sp.amount) ? sp.amount[0] : sp.amount;
  const amount = rawAmount ? Number(rawAmount) : 10;

  const rawRef =
    (Array.isArray(sp.ref) ? sp.ref[0] : sp.ref) ||
    (Array.isArray(sp.refCode) ? sp.refCode[0] : sp.refCode) ||
    "";

  const nextPath = rawAmount ? `/buy?amount=${encodeURIComponent(rawAmount)}&ref=${encodeURIComponent(rawRef)}` : "/buy";

  return <BuyClient initialAmount={amount} initialRefCode={String(rawRef)} nextPath={nextPath} />;
}
