import { NextResponse } from "next/server";
import { Connection, PublicKey } from "@solana/web3.js";
import { getAccount } from "@solana/spl-token";

function mustEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

export async function GET() {
  try {
    const rpcUrl = mustEnv("SOLANA_RPC_URL");
    const mint = new PublicKey(mustEnv("SKOPI_MINT"));

    const treasuryAta = new PublicKey(mustEnv("SKOPI_TREASURY_ATA"));
    const treasuryBucketAta = new PublicKey(mustEnv("SKOPI_TREASURY_BUCKET_ATA"));
    const saleAta = new PublicKey(mustEnv("SKOPI_SALE_ATA"));
    const foundersAta = new PublicKey(mustEnv("SKOPI_FOUNDERS_ATA"));
    const liqAta = new PublicKey(mustEnv("SKOPI_LIQ_ATA"));

    const connection = new Connection(rpcUrl, "confirmed");

    const [mintInfo, supplyResp, t0, t1, s, f, l] = await Promise.all([
      connection.getParsedAccountInfo(mint),
      connection.getTokenSupply(mint),
      getAccount(connection, treasuryAta),
      getAccount(connection, treasuryBucketAta),
      getAccount(connection, saleAta),
      getAccount(connection, foundersAta),
      getAccount(connection, liqAta),
    ]);

    const mintData: any = mintInfo?.value?.data as any;
    const mintParsed: any = mintData?.parsed?.info || {};

    const communityAddress = "4biedGARHUjUrn9C1zREGLaZXzB7cAXu7HZbw3zSHZBQ";
    const communityRaw = "99975000000000";

    const publicMovementLog = [
      {
        id: "tiffany-25k-community-test",
        when: "2026-03-17T17:27:01.000Z",
        label: "Tiffany test/community transfer",
        sourceBucket: "Community bucket",
        sourceWallet: "4biedGARHUjUrn9C1zREGLaZXzB7cAXu7HZbw3zSHZBQ",
        destinationWallet: "HDmJcrwjjNfrfcFj3bSsJnTNv4Cr8BLD9frFTcLJ2MAK",
        amountRaw: "25000000000",
        type: "Manual community/test allocation",
        note: "Early live transfer and holder-verification test during the active SKOPI rollout. Not a standard public-sale allocation.",
        txSignature: "52hpWy35P4s5aKtT2uvUGTbVZzJwUjUrxUu4HT33M2fn6N6ZUacCXWk54z2f8KQxD6pfzK9GTS2MQxtFK2N3uRm9",
      },
    ];

    const result = {
      ok: true,
      rpcUrl,
      mint: mint.toBase58(),
      mintAuthority: mintParsed?.mintAuthority || null,
      freezeAuthority: mintParsed?.freezeAuthority || null,
      decimals: supplyResp.value.decimals,
      supplyUi: supplyResp.value.uiAmountString,
      deprecatedMints: [
        "4DDjiaj31Q2enUoi7ezZ5yjsDshCqVfW43b3RgVFi2M3"
      ],
      accounts: {
        treasuryAta: { address: treasuryAta.toBase58(), amountRaw: t0.amount.toString() },
        treasuryBucketAta: { address: t1.address?.toBase58?.() || treasuryBucketAta.toBase58(), amountRaw: t1.amount.toString() },
        saleAta: { address: saleAta.toBase58(), amountRaw: s.amount.toString() },
        foundersAta: { address: foundersAta.toBase58(), amountRaw: f.amount.toString() },
        liqAta: { address: liqAta.toBase58(), amountRaw: l.amount.toString() },
        commAta: { address: communityAddress, amountRaw: communityRaw },
      },
      publicMovementLog,
    };

    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? String(e) },
      { status: 500 }
    );
  }
}
