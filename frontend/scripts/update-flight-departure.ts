/*
  Script to update actual departure time for a flight
  This triggers payout evaluation by updating actual_departure_unix in flight.json

  Usage:
    GITHUB_TOKEN=your_token \
    FLIGHT_UPDATE_API_KEY=zyura@admin \
    FLIGHT_NUMBER=AA123 \
    ACTUAL_DEPARTURE_UNIX=1762266600 \
    tsx scripts/update-flight-departure.ts

  Or use ISO date string:
    FLIGHT_UPDATE_API_KEY=zyura@admin \
    ACTUAL_DEPARTURE_ISO="2025-11-04T15:30:00Z" \
    FLIGHT_NUMBER=AA123 \
    tsx scripts/update-flight-departure.ts
*/

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_FLIGHT_REPO = process.env.GITHUB_FLIGHT_REPO || "alienx5499/zyura-flight-metadata";
const GITHUB_BRANCH = process.env.GITHUB_BRANCH || "main";
const FLIGHT_NUMBER = process.env.FLIGHT_NUMBER;
const ACTUAL_DEPARTURE_UNIX = process.env.ACTUAL_DEPARTURE_UNIX 
  ? parseInt(process.env.ACTUAL_DEPARTURE_UNIX, 10)
  : undefined;
const ACTUAL_DEPARTURE_ISO = process.env.ACTUAL_DEPARTURE_ISO;

if (!GITHUB_TOKEN) {
  console.error("❌ GITHUB_TOKEN is required");
  process.exit(1);
}

if (!FLIGHT_NUMBER) {
  console.error("❌ FLIGHT_NUMBER is required");
  process.exit(1);
}

let actualDepartureUnix: number;

if (ACTUAL_DEPARTURE_UNIX) {
  actualDepartureUnix = ACTUAL_DEPARTURE_UNIX;
} else if (ACTUAL_DEPARTURE_ISO) {
  actualDepartureUnix = Math.floor(new Date(ACTUAL_DEPARTURE_ISO).getTime() / 1000);
} else {
  // Default to current time (for testing)
  actualDepartureUnix = Math.floor(Date.now() / 1000);
  console.log(`⚠️  No departure time provided, using current time: ${new Date(actualDepartureUnix * 1000).toISOString()}`);
}

async function updateFlightDeparture() {
  const apiUrl = process.env.API_URL || "http://localhost:3000";
  const endpoint = `${apiUrl}/api/zyura/flight/update-departure`;
  const apiKey = process.env.FLIGHT_UPDATE_API_KEY;
  
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  
  // Add API key if provided
  if (apiKey) {
    headers["x-api-key"] = apiKey;
  }
  
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({
        flight_number: FLIGHT_NUMBER,
        actual_departure_unix: actualDepartureUnix,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    const result = await response.json();
    console.log("✅ Flight departure updated successfully!");
    console.log(`📍 Flight: ${FLIGHT_NUMBER}`);
    console.log(`🕐 Actual Departure: ${new Date(actualDepartureUnix * 1000).toISOString()}`);
    console.log(`⏱️  Delay: ${result.delay_minutes} minutes`);
    console.log(`\n💡 Next step: Run watcher to check policies and trigger payouts:`);
    console.log(`   pnpm watcher`);
  } catch (error: any) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

updateFlightDeparture();

