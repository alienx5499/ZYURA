import { NextRequest, NextResponse } from "next/server";

type FlightQuery = {
  number: string;
  date?: string;
};

type FlightDelayResult = {
  num: string;
  date?: string;
  delay_minutes: number;
};

// Reads an external flight API. You can configure via env:
// - FLIGHT_API_BASE: e.g. https://api.example.com/flight
// - FLIGHT_API_KEY: optional bearer/API key
// The endpoint is expected to return JSON with a numeric field at `delay_minutes`.
async function fetchDelayForFlight(flight: FlightQuery, signal: AbortSignal): Promise<FlightDelayResult> {
  const base = process.env.FLIGHT_API_BASE;
  const apiKey = process.env.FLIGHT_API_KEY;

  // If no provider configured, allow a mock fallback for testing on Vercel/Local
  if (!base) {
    const mock = Number(process.env.MOCK_DELAY_MINUTES ?? "0");
    return { num: flight.number, date: flight.date, delay_minutes: isFinite(mock) ? mock : 0 };
    }

  const url = new URL(base);
  url.searchParams.set("num", flight.number);
  if (flight.date) url.searchParams.set("date", flight.date);

  const headers: Record<string, string> = { "content-type": "application/json" };
  if (apiKey) {
    // Prefer standard bearer; adjust if your provider needs a different header key
    headers["authorization"] = `Bearer ${apiKey}`;
  }

  const res = await fetch(url.toString(), {
    method: "GET",
    headers,
    // Abort long calls to keep function snappy
    signal,
    // Force no-cache to avoid stale values when Switchboard cranks
    cache: "no-store",
  });

  if (!res.ok) {
    // Treat non-200 as zero delay but include basic info
    return { num: flight.number, date: flight.date, delay_minutes: 0 };
  }

  let json: any;
  try {
    json = await res.json();
  } catch {
    return { num: flight.number, date: flight.date, delay_minutes: 0 };
  }

  // Default semantic: top-level `delay_minutes`. Adjust if your provider differs.
  const value = Number(json?.delay_minutes ?? 0);
  const delay = Number.isFinite(value) ? value : 0;
  return { num: flight.number, date: flight.date, delay_minutes: delay };
}

function parseFlights(qs: URLSearchParams): FlightQuery[] {
  // Accept either:
  // - flights=AA123@2025-11-04,BA456@2025-11-04
  // - flight=AA123&flight=BA456&date=2025-11-04 (shared date)
  // - flight=AA123@2025-11-04 (multiple repeated)
  const result: FlightQuery[] = [];

  const flightsCsv = qs.get("flights");
  const sharedDate = qs.get("date") || undefined;

  if (flightsCsv) {
    for (const item of flightsCsv.split(",")) {
      const trimmed = item.trim();
      if (!trimmed) continue;
      const [num, dt] = trimmed.split("@");
      result.push({ number: num, date: dt || sharedDate });
    }
  }

  const flightParams = qs.getAll("flight");
  for (const f of flightParams) {
    const [num, dt] = f.split("@");
    result.push({ number: num, date: dt || sharedDate });
  }

  // Basic de-dupe by number+date
  const seen = new Set<string>();
  const unique: FlightQuery[] = [];
  for (const f of result) {
    const key = `${f.number}@${f.date ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(f);
  }
  return unique;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const flights = parseFlights(searchParams);

  if (flights.length === 0) {
    return NextResponse.json(
      {
        error: "No flights provided. Use flights=AA123@YYYY-MM-DD,BB456@YYYY-MM-DD or flight=AA123&flight=BB456&date=YYYY-MM-DD",
      },
      { status: 400 }
    );
  }

  // Apply a per-request timeout to cap total time (8s)
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const results = await Promise.all(
      flights.map((f) => fetchDelayForFlight(f, controller.signal).catch(() => ({ num: f.number, date: f.date, delay_minutes: 0 })))
    );

    const delays = results.map((r) => r.delay_minutes);
    const maxDelay = delays.length ? Math.max(...delays) : 0;

    const body = {
      max_delay_minutes: maxDelay,
      flights: results,
      as_of: Math.floor(Date.now() / 1000),
    };

    return NextResponse.json(body, { status: 200 });
  } finally {
    clearTimeout(timeout);
  }
}


