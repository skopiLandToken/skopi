import { NextResponse } from "next/server";
import { Connection, PublicKey } from "@solana/web3.js";
import { getAccount} from "@solana/spl-token";

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
    const commAta = new PublicKey(mustEnv("SKOPI_COMM_ATA"));

    const connection = new Connection(rpcUrl, "confirmed");

    const [mintInfo, supplyResp, t0, t1, s, f, l, c] = await Promise.all([
      connection.getParsedAccountInfo(mint),
      connection.getTokenSupply(mint),
      getAccount(connection, treasuryAta),
      getAccount(connection, treasuryBucketAta),
      getAccount(connection, saleAta),
      getAccount(connection, foundersAta),
      getAccount(connection, liqAta),
      getAccount(connection, commAta),
    ]);

    // mintInfo is getParsedAccountInfo result
    const mintData: any = mintInfo?.value?.data as any;
    const mintParsed: any = mintData?.parsed?.info || {};
    const mintDecimals = Number(mintParsed?.decimals ?? 0);


    const result = {
      ok: true,
      rpcUrl,
      mint: mint.toBase58(),
      mintAuthority: mintInfo.mintAuthority ? mintInfo.mintAuthority.toBase58() : null,
      freezeAuthority: mintInfo.freezeAuthority ? mintInfo.freezeAuthority.toBase58() : null,
      decimals: supplyResp.value.decimals,
      supplyUi: supplyResp.value.uiAmountString,
      accounts: {
        treasuryAta: { address: treasuryAta.toBase58(), amountRaw: t0.amount.toString() },
        treasuryBucketAta: { address: treasuryBucketAta.toBase58(), amountRaw: t1.amount.toString() },
        saleAta: { address: saleAta.toBase58(), amountRaw: s.amount.toString() },
        foundersAta: { address: foundersAta.toBase58(), amountRaw: f.amount.toString() },
        liqAta: { address: liqAta.toBase58(), amountRaw: l.amount.toString() },
        commAta: { address: commAta.toBase58(), amountRaw: c.amount.toString() },
      },
    };

    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? String(e) },
      { status: 500 }
    );
  }
}
