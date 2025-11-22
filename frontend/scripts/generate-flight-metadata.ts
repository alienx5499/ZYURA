import crypto from 'crypto'
import path from 'path'
import { existsSync } from 'fs'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)

loadLocalEnv()

type FlightRecord = {
  flight_number: string
  date: string
  scheduled_departure_unix: number
  origin: string
  destination: string
  status: string
  pnrs: Array<PnrRecord>
  created_at: number
  updated_at: number
  actual_departure_unix?: number
  delay_minutes?: number
}

type PnrRecord = {
  pnr: string
  policyId: string | number
  policyholder: string
  wallet: string
  passenger: {
    fullName: string
    dateOfBirth: string
    documentId: string
    seat: string
    email: string
    phone: string
  }
  nft_metadata_url: string
  created_at: number
  updated_at: number
}

const AIRPORT_CODES = [
  'JFK',
  'LAX',
  'SFO',
  'SEA',
  'ORD',
  'ATL',
  'DFW',
  'DEN',
  'BOS',
  'MIA',
  'PHX',
  'LAS',
  'IAD',
  'CLT',
  'DTW',
  'MSP',
  'FLL',
  'SLC',
  'SAN',
  'BWI',
]

const FLIGHT_LETTER_SET = 'ABCDEFGHJKLMNPQRSTUVWXYZ'

const PASSENGER_FIRST_NAMES = [
  'Avery',
  'Jordan',
  'Taylor',
  'Morgan',
  'Riley',
  'Harper',
  'Logan',
  'Emerson',
  'Quinn',
  'Parker',
  'Hayden',
  'Sydney',
  'Reese',
  'Rowan',
  'Micah',
  'Sawyer',
  'Dylan',
  'Finley',
  'Kai',
  'Aria',
  'Lena',
  'Elena',
  'Noah',
  'Maya',
  'Ethan',
  'Isaac',
  'Leah',
  'Miles',
  'Zoe',
  'Theo',
  'Mila',
  'Caleb',
  'Eliza',
  'Sasha',
  'Jude',
  'Nico',
  'Luca',
  'Iris',
  'Mason',
]

const PASSENGER_LAST_NAMES = [
  'Anderson',
  'Bennett',
  'Campbell',
  'Diaz',
  'Ellis',
  'Foster',
  'Garcia',
  'Hughes',
  'Iqbal',
  'Jacobs',
  'Keller',
  'Lopez',
  'Mitchell',
  'Nguyen',
  'Owens',
  'Patel',
  'Reed',
  'Silva',
  'Turner',
  'Usman',
  'Vargas',
  'Walker',
  'Xu',
  'Young',
  'Zimmerman',
  'Coleman',
  'Fitzgerald',
  'Grayson',
  'Hernandez',
  'Jordan',
  'Khan',
  'Lawson',
  'Morales',
  'Nolan',
  'Ochoa',
  'Porter',
  'Ramirez',
  'Simmons',
  'Thompson',
]

const EMAIL_DOMAINS = ['gmail.com', 'outlook.com', 'icloud.com', 'yahoo.com', 'example.com']

const GITHUB_TOKEN = process.env.GITHUB_TOKEN
const GITHUB_REPO = process.env.GITHUB_FLIGHT_REPO
const GITHUB_BRANCH = process.env.GITHUB_BRANCH ?? 'main'
const GITHUB_FLIGHT_PATH = process.env.GITHUB_FLIGHT_PATH ?? 'flights'
const DEFAULT_COMMIT_MESSAGE = process.env.GITHUB_COMMIT_MESSAGE

const NEW_FLIGHT_COUNT = Number(process.env.NEW_FLIGHT_COUNT ?? 10)
const MIN_PNR_PER_FLIGHT = Math.max(1, Number(process.env.MIN_PNR_PER_FLIGHT ?? 1))
const MAX_PNR_PER_FLIGHT = Math.max(MIN_PNR_PER_FLIGHT, Number(process.env.MAX_PNR_PER_FLIGHT ?? 5))

function requireGithubRepo(): string {
  if (!GITHUB_REPO) {
    throw new Error('GITHUB_FLIGHT_REPO must be set.')
  }
  return GITHUB_REPO
}

function requireGithubToken(): string {
  if (!GITHUB_TOKEN) {
    throw new Error('GITHUB_TOKEN must be set.')
  }
  return GITHUB_TOKEN
}

async function main(): Promise<void> {
  requireGithubRepo()
  requireGithubToken()

  const { flights, existingPnrs } = await loadExistingFlightsFromGithub()
  reportExistingFlights(flights)

  const existingFlightNumbers = new Set(flights.keys())
  const createdFlights: Array<{ flight: string; pnrs: string[] }> = []
  const flightTargets =
    Number.isFinite(NEW_FLIGHT_COUNT) && NEW_FLIGHT_COUNT > 0 ? NEW_FLIGHT_COUNT : 1

  for (let i = 0; i < flightTargets; i++) {
    const flightNumber = generateFlightNumber(existingFlightNumbers)
    const origin = process.env.NEW_FLIGHT_ORIGIN ?? randomAirport()
    const destinationOverride = process.env.NEW_FLIGHT_DESTINATION
    const destination =
      destinationOverride && destinationOverride !== origin
        ? destinationOverride
        : randomAirport(origin)
    const scheduledDepartureUnix =
      process.env.SCHEDULED_DEPARTURE_UNIX != null
        ? Number(process.env.SCHEDULED_DEPARTURE_UNIX)
        : randomFutureUnix()
    const flightDate =
      process.env.FLIGHT_DATE ?? new Date(scheduledDepartureUnix * 1000).toISOString().slice(0, 10)

    const pnrCount = crypto.randomInt(MIN_PNR_PER_FLIGHT, MAX_PNR_PER_FLIGHT + 1)
    const newPnrs = generateUniquePnrs(existingPnrs, pnrCount)
    newPnrs.forEach((pnr) => existingPnrs.add(pnr))

    const flightRecord = buildFlightRecord({
      flightNumber,
      pnrs: newPnrs,
      origin,
      destination,
      scheduledDepartureUnix,
      flightDate,
    })

    await uploadToGithub(flightRecord, commitMessageForFlight(flightNumber))
    createdFlights.push({ flight: flightNumber, pnrs: newPnrs })
    existingFlightNumbers.add(flightNumber)
  }

  if (createdFlights.length === 0) {
    console.log('\nNo new flights were generated.')
    return
  }

  console.log('\nCreated new flight metadata:')
  for (const { flight, pnrs } of createdFlights) {
    console.log(`   • ${flight} (${pnrs.length} PNR${pnrs.length === 1 ? '' : 's'}) -> ${githubTargetPath(flight)}`)
  }
}

async function loadExistingFlightsFromGithub(): Promise<{
  flights: Map<string, PnrRecord[]>
  existingPnrs: Set<string>
}> {
  const entries = await listGithubDirectory(GITHUB_FLIGHT_PATH)
  const flights = new Map<string, PnrRecord[]>()
  const pnrs = new Set<string>()

  for (const entry of entries) {
    if (entry.type !== 'dir') continue
    const flightNumber = entry.name

    try {
      const data = await fetchFlightRecordFromGithub(flightNumber)
      if (!Array.isArray(data.pnrs)) {
        console.warn(`Skipping ${flightNumber}: pnrs field is not an array.`)
        continue
      }
      flights.set(flightNumber, data.pnrs)
      for (const record of data.pnrs) {
        if (record?.pnr) pnrs.add(record.pnr.toUpperCase())
      }
    } catch (error) {
      console.warn(`Failed to load ${flightNumber}: ${(error as Error).message}`)
    }
  }

  return { flights, existingPnrs: pnrs }
}

function reportExistingFlights(flights: Map<string, PnrRecord[]>): void {
  if (flights.size === 0) {
    console.log('No existing flight metadata found.')
    return
  }
  console.log('Existing flights and PNR counts:')
  for (const [flight, pnrs] of flights.entries()) {
    console.log(`   • ${flight}: ${pnrs.length} PNR(s)`)
  }
}

function generateFlightNumber(existing: Set<string>): string {
  for (let attempts = 0; attempts < 1000; attempts++) {
    const candidate = randomFlightCode()
    if (!existing.has(candidate)) {
      return candidate
    }
  }
  throw new Error('Unable to generate a unique flight number after many attempts.')
}

function randomFlightCode(): string {
  const letters = `${randomLetter()}${randomLetter()}`
  const digits = `${crypto.randomInt(0, 10)}${crypto.randomInt(0, 10)}${crypto.randomInt(0, 10)}`
  return `${letters}${digits}`
}

function randomLetter(): string {
  const index = crypto.randomInt(0, FLIGHT_LETTER_SET.length)
  return FLIGHT_LETTER_SET.charAt(index)
}

function generateUniquePnrs(existingPnrs: Set<string>, count: number): string[] {
  if (!Number.isInteger(count) || count <= 0) {
    throw new Error('PNR count must be a positive integer.')
  }
  const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const pnrs: string[] = []
  while (pnrs.length < count) {
    const candidate = Array.from({ length: 6 })
      .map(() => charset.charAt(Math.floor(crypto.randomInt(0, charset.length))))
      .join('')
    if (!existingPnrs.has(candidate) && !pnrs.includes(candidate)) {
      pnrs.push(candidate)
    }
  }
  return pnrs
}

type BuildFlightRecordInput = {
  flightNumber: string
  pnrs: string[]
  origin: string
  destination: string
  scheduledDepartureUnix: number
  flightDate: string
}

function buildFlightRecord({
  flightNumber,
  pnrs,
  origin,
  destination,
  scheduledDepartureUnix,
  flightDate,
}: BuildFlightRecordInput): FlightRecord {
  const now = Math.floor(Date.now() / 1000)
  return {
    flight_number: flightNumber,
    date: flightDate,
    scheduled_departure_unix: scheduledDepartureUnix,
    origin,
    destination,
    status: 'scheduled',
    pnrs: pnrs.map((pnr, index) => buildPnrRecord(pnr, index, now)),
    created_at: now,
    updated_at: now,
    delay_minutes: 0,
  }
}

function buildPnrRecord(pnr: string, index: number, timestamp: number): PnrRecord {
  const passengerProfile = randomPassengerProfile(pnr, index)
  return {
    pnr,
    policyId: 'NA',
    policyholder: 'NA',
    wallet: 'NA',
    passenger: {
      fullName: passengerProfile.fullName,
      dateOfBirth: passengerProfile.dateOfBirth,
      documentId: passengerProfile.documentId,
      seat: passengerProfile.seat,
      email: passengerProfile.email,
      phone: passengerProfile.phone,
    },
    nft_metadata_url: 'NA',
    created_at: timestamp,
    updated_at: timestamp,
  }
}

function randomPassengerProfile(pnr: string, index: number): {
  fullName: string
  dateOfBirth: string
  documentId: string
  seat: string
  email: string
  phone: string
} {
  const firstName =
    PASSENGER_FIRST_NAMES[crypto.randomInt(0, PASSENGER_FIRST_NAMES.length)]
  const lastName =
    PASSENGER_LAST_NAMES[crypto.randomInt(0, PASSENGER_LAST_NAMES.length)]
  const fullName = `${firstName} ${lastName}`
  const dateOfBirth = randomDateOfBirth()
  const documentId = `P${pnr}${crypto.randomInt(0, 1_000)
    .toString()
    .padStart(3, '0')}`.slice(0, 12)
  const seat = randomSeat()
  const email = generateEmail(firstName, lastName, index)
  const phone = randomPhoneNumber()

  return {
    fullName,
    dateOfBirth,
    documentId,
    seat,
    email,
    phone,
  }
}

function randomSeat(): string {
  const row = crypto.randomInt(1, 31)
  const seatLetters = ['A', 'B', 'C', 'D', 'E', 'F']
  const letter = seatLetters[crypto.randomInt(0, seatLetters.length)]
  return `${row}${letter}`
}

function generateEmail(firstName: string, lastName: string, index: number): string {
  const localFirst = firstName.replace(/[^a-zA-Z]/g, '').toLowerCase()
  const localLast = lastName.replace(/[^a-zA-Z]/g, '').toLowerCase()
  const suffix = crypto.randomInt(10, 99)
  const domain = EMAIL_DOMAINS[crypto.randomInt(0, EMAIL_DOMAINS.length)]
  return `${localFirst}.${localLast}${suffix}@${domain}`
}

function randomPhoneNumber(): string {
  const area = 200 + crypto.randomInt(0, 700) // avoid 0/1 prefixes
  const prefix = 200 + crypto.randomInt(0, 700)
  const line = crypto.randomInt(0, 10000).toString().padStart(4, '0')
  return `+1-${area}-${prefix}-${line}`
}

function randomDateOfBirth(): string {
  const start = new Date('1955-01-01').getTime()
  const end = new Date('2005-12-31').getTime()
  const randomTime = crypto.randomInt(0, Number(end - start))
  const dob = new Date(start + randomTime)
  return dob.toISOString().slice(0, 10)
}

function randomFutureUnix(minHours = 24, maxDays = 180): number {
  const now = Math.floor(Date.now() / 1000)
  const minOffset = minHours * 60 * 60
  const maxOffset = maxDays * 24 * 60 * 60
  if (maxOffset <= minOffset) {
    throw new Error('randomFutureUnix max range must be greater than min range.')
  }
  const offset = crypto.randomInt(minOffset, maxOffset + 1)
  return now + offset
}

async function uploadToGithub(record: FlightRecord, commitMessage: string): Promise<void> {
  const repo = requireGithubRepo()
  if (!repo.includes('/')) {
    console.warn('Invalid GITHUB_FLIGHT_REPO format. Expected "owner/repo". Skipping upload.')
    return
  }

  const serialized = JSON.stringify(record, null, 2)
  const encodedContent = Buffer.from(`${serialized}\n`, 'utf8').toString('base64')

  const targetPath = githubTargetPath(record.flight_number)
  const apiBase = githubContentsUrl(targetPath)
  const existingSha = await fetchFileSha(apiBase)

  const response = await fetch(apiBase, {
    method: 'PUT',
    headers: githubHeaders(),
    body: JSON.stringify({
      message: commitMessage,
      content: encodedContent,
      branch: GITHUB_BRANCH,
      sha: existingSha ?? undefined,
    }),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`GitHub upload failed (${response.status}): ${text}`)
  }

  const [owner, repoName] = repo.split('/', 2)
  console.log(`\nUploaded to GitHub: ${owner}/${repoName}@${GITHUB_BRANCH}:${targetPath}`)
}

function githubHeaders(): Record<string, string> {
  const token = requireGithubToken()
  return {
    Authorization: `token ${token}`,
    Accept: 'application/vnd.github+json',
  }
}

function githubTargetPath(flightNumber: string): string {
  return `${GITHUB_FLIGHT_PATH}/${flightNumber}/flight.json`
}

function githubContentsUrl(targetPath: string): string {
  const [owner, repo] = requireGithubRepo().split('/', 2)
  return `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURI(targetPath)}`
}

async function fetchFileSha(apiBase: string): Promise<string | null> {
  const url = `${apiBase}?ref=${encodeURIComponent(GITHUB_BRANCH)}`
  const response = await fetch(url, { headers: githubHeaders() })

  if (response.status === 404) {
    return null
  }
  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Failed to check existing GitHub file (${response.status}): ${text}`)
  }

  const json = (await response.json()) as { sha?: string }
  return json.sha ?? null
}

type GithubDirEntry = {
  name: string
  path: string
  type: 'file' | 'dir'
}

function randomAirport(exclude?: string): string {
  const pool = exclude ? AIRPORT_CODES.filter((code) => code !== exclude) : AIRPORT_CODES
  if (pool.length === 0) {
    throw new Error('No airport codes available to select.')
  }
  return pool[crypto.randomInt(0, pool.length)]
}

async function listGithubDirectory(subPath: string): Promise<GithubDirEntry[]> {
  const apiBase = githubContentsUrl(subPath)
  const response = await fetch(`${apiBase}?ref=${encodeURIComponent(GITHUB_BRANCH)}`, {
    headers: githubHeaders(),
  })

  if (response.status === 404) {
    console.warn(`GitHub path ${subPath} not found. Assuming empty.`)
    return []
  }

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Failed to list GitHub directory (${response.status}): ${text}`)
  }

  const json = (await response.json()) as GithubDirEntry[]
  return json
}

async function fetchFlightRecordFromGithub(flightNumber: string): Promise<FlightRecord> {
  const targetPath = githubTargetPath(flightNumber)
  const apiBase = githubContentsUrl(targetPath)
  const response = await fetch(`${apiBase}?ref=${encodeURIComponent(GITHUB_BRANCH)}`, {
    headers: githubHeaders(),
  })

  if (response.status === 404) {
    throw new Error(`Flight ${flightNumber} missing flight.json in GitHub repo.`)
  }

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Failed to load flight ${flightNumber} (${response.status}): ${text}`)
  }

  const json = (await response.json()) as { content: string; encoding: string }
  if (json.encoding !== 'base64') {
    throw new Error(`Unexpected encoding for ${flightNumber}: ${json.encoding}`)
  }
  const decoded = Buffer.from(json.content, 'base64').toString('utf8')
  return JSON.parse(decoded) as FlightRecord
}

function commitMessageForFlight(flightNumber: string): string {
  if (DEFAULT_COMMIT_MESSAGE) {
    return DEFAULT_COMMIT_MESSAGE.replaceAll('{flight}', flightNumber)
  }
  return `Add flight metadata ${flightNumber}`
}

main().catch((error) => {
  console.error('❌ Failed to generate flight metadata.')
  console.error(error)
  process.exit(1)
})

function loadLocalEnv(): void {
  try {
    const dotenv = require('dotenv') as { config: (opts: { path: string }) => void }
    const __dirname_es = path.dirname(new URL(import.meta.url).pathname)
    const envLocalPath = path.resolve(__dirname_es, '../.env.local')
    if (existsSync(envLocalPath)) {
      dotenv.config({ path: envLocalPath })
    }
  } catch {
    // dotenv not installed; ignore
  }
}


