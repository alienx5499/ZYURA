import algosdk from 'algosdk';

function getAlgodBase(): string {
  const net = ((import.meta as unknown) as { env?: Record<string, string> }).env?.VITE_NETWORK || 'localnet';
  if (net === 'testnet') return 'https://testnet-api.algonode.cloud';
  if (net === 'mainnet') return 'https://mainnet-api.algonode.cloud';
  return '';
}

export async function pingAlgod(): Promise<boolean> {
  try {
    const base = getAlgodBase();
    const url = base ? `${base}/health` : '/algod/health';
    const res = await fetch(url, { method: 'GET' });
    return res.ok;
  } catch {
    return false;
  }
}

export async function getTxnParams() {
  const base = getAlgodBase();
  const url = base ? `${base}/v2/transactions/params` : '/algod/v2/transactions/params';
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch params');
  return res.json();
}

export function getAlgodClient() {
  const net = ((import.meta as unknown) as { env?: Record<string, string> }).env?.VITE_NETWORK || 'localnet';
  
  if (net === 'testnet') {
    return new algosdk.Algodv2('', 'https://testnet-api.algonode.cloud', 443);
  } else if (net === 'mainnet') {
    return new algosdk.Algodv2('', 'https://mainnet-api.algonode.cloud', 443);
  } else {
    // LocalNet
    return new algosdk.Algodv2(
      'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      'http://localhost',
      4001
    );
  }
}

export async function submitRawTxns(stxns: Uint8Array[]) {
  const blob = new Blob(stxns, { type: 'application/x-binary' });
  const base = getAlgodBase();
  const url = base ? `${base}/v2/transactions` : '/algod/v2/transactions';
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-binary' },
    body: blob,
  });
  if (!res.ok) {
    let details = '';
    try {
      details = await res.text();
    } catch {
      // ignore
    }
    throw new Error(details || 'Failed to submit');
  }
  return res.json();
}

export function getIndexerClient() {
  const net = ((import.meta as unknown) as { env?: Record<string, string> }).env?.VITE_NETWORK || 'localnet';
  if (net === 'testnet') {
    return new algosdk.Indexer('', 'https://testnet-idx.algonode.cloud', 443);
  } else if (net === 'mainnet') {
    return new algosdk.Indexer('', 'https://mainnet-idx.algonode.cloud', 443);
  } else {
    return new algosdk.Indexer(
      'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      'http://localhost',
      8980
    );
  }
}

export type FetchedOrder = {
  id: string;
  buyer: string;
  seller: string;
  amountMicroAlgos: number;
  deadlineUnix: number;
  txId: string;
  round: number;
};

export async function fetchOrdersForApp(appId: number, forAddress?: string): Promise<FetchedOrder[]> {
  const indexer = getIndexerClient();
  const appAddr = algosdk.getApplicationAddress(appId);
  // Fetch payment txns to app address; limit page size, paginate if needed later
  const res = await indexer
    .searchForTransactions()
    .address(appAddr)
    .txType('pay')
    .limit(100)
    .do();

  const txns: Array<Record<string, unknown>> = ((res.transactions as unknown) as Array<Record<string, unknown>>) || [];
  const orders: FetchedOrder[] = [];

  for (const t of txns) {
    try {
      const noteB64 = t.note as string | undefined;
      if (!noteB64) continue;
      const noteStr = new TextDecoder().decode(Buffer.from(noteB64, 'base64'));
      if (!noteStr.startsWith('order-deposit:')) continue;
      const parts = noteStr.split(':');
      if (parts.length < 3) continue;
      const deadlineUnix = Number(parts[1]);
      const sellerAddr = parts[2];
      const buyerAddr = t.sender as string;
      const amount = Number((t['payment-transaction'] as { amount?: number } | undefined)?.amount || 0);
      const txId = t.id as string;
      const round = Number((t['confirmed-round'] as number | undefined) || 0);

      if (forAddress && !(buyerAddr === forAddress || sellerAddr === forAddress)) continue;

      orders.push({
        id: `TX-${txId.slice(0, 8)}`,
        buyer: buyerAddr,
        seller: sellerAddr,
        amountMicroAlgos: amount,
        deadlineUnix,
        txId,
        round,
      });
    } catch {
      // ignore malformed txn
    }
  }

  // Sort newest first
  orders.sort((a, b) => b.round - a.round);
  return orders;
}


