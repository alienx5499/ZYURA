# ZYURA Frontend

A modern Next.js frontend application for the ZYURA flight delay insurance protocol on Solana.

## Tech Stack

- **Next.js 16**: React framework with App Router
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Modern styling with Tailwind v4
- **Framer Motion**: Animations and transitions
- **@solana/wallet-adapter**: Wallet integration
- **@coral-xyz/anchor**: Solana program interaction
- **React 19**: Latest React features

## Prerequisites

- **Node.js** 18+ and **pnpm**
- **Solana wallet** (Phantom recommended)
- Access to Solana devnet

## Setup

### Install Dependencies

```bash
pnpm install
```

### Environment Variables

Create a `.env.local` file (optional):

```env
NEXT_PUBLIC_SOLANA_NETWORK=devnet
NEXT_PUBLIC_PROGRAM_ID=DWErB1gSbiBBeEaXzy3KEsCbMZCD6sXmrVT9WF9mZgxX
SOLANA_RPC=https://api.devnet.solana.com
```

### Development Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Available Scripts

### Development
- `pnpm dev` - Start development server with Turbopack
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint

### Admin Scripts
- `pnpm admin` - Run admin operations
- `pnpm update` - Update product parameters
- `pnpm watcher` - Watch for policy events
- `pnpm register-test-flight` - Register a test flight
- `pnpm populate-flight-data` - Populate flight data
- `pnpm update-flight-departure` - Update flight departure time

## Code Formatting

### Format All Code
```bash
# Format JavaScript, TypeScript, JSON, CSS, and Markdown files
pnpm format

# Check formatting without making changes
pnpm format:check
```

## Project Structure

```
frontend/
├── src/
│   ├── app/              # Next.js App Router
│   │   ├── page.tsx     # Landing page
│   │   ├── dashboard/   # Dashboard pages
│   │   └── api/         # API routes
│   ├── components/      # React components
│   │   ├── ui/          # UI component library
│   │   └── dashboard/   # Dashboard-specific components
│   ├── contexts/        # React contexts
│   ├── hooks/           # Custom hooks
│   ├── lib/             # Utilities
│   └── idl/             # Program IDL
├── scripts/             # Admin and utility scripts
├── public/              # Static assets
└── package.json
```

## Key Features

### Dashboard
- Interactive tutorial for first-time users
- Policy purchase with PNR auto-fill
- Policy management and viewing
- Product statistics
- Real-time flight delay tracking

### Interactive Tutorial
- Step-by-step guided tour
- Visual highlights and tooltips
- Form interaction demonstrations
- Auto-starts for first-time users (stored in localStorage)

### PNR Auto-fill
- Enter 6-character PNR code
- Automatically fetches flight details
- Auto-fills flight number, date, and time
- Displays passenger information

## Scripts Quick Reference

### Purchase Policy (devnet)
```bash
# From frontend/
PRODUCT_ID=1 \
POLICY_ID=789010 \
FLIGHT_NUMBER=RT756 \
npx tsx scripts/purchase.ts
```

### Payout (simulate delay)
```bash
# From frontend/
POLICY_ID=789010 \
PRODUCT_ID=1 \
ADMIN_KEYPAIR="$HOME/.config/solana/phantom-devnet.json" \
DELAY_MINUTES=9999 \
SOLANA_CLUSTER=devnet \
npx tsx scripts/payout.ts
```

### Deposit Liquidity (fund risk pool)
```bash
# From frontend/
USER_KEYPAIR=$HOME/.config/solana/phantom-devnet.json \
AMOUNT_6DP=100000000 \
npx tsx scripts/deposit.ts
```

## Notes

- **USDC mint (devnet)**: `4sCh4YUdsFuUFTaMyAx3SVnHvHkY9XNq1LX4L6nnWUtv`
- **Amounts are 6-decimal (6dp)**: Example: 5 USDC => `5_000_000`
- Ensure the risk pool has enough USDC before processing payouts
- Program ID: `DWErB1gSbiBBeEaXzy3KEsCbMZCD6sXmrVT9WF9mZgxX`

## Development Tips

- Use the interactive tutorial in development mode to test the onboarding flow
- Check browser console for wallet connection issues
- Use Phantom wallet for best compatibility
- All amounts in scripts use 6 decimal places (USDC standard)
