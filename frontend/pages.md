# EscrowZero - Page Structure & Planning

## 🎯 Core User Flow

```
Landing Page → Connect Wallet → Dashboard → Create/Browse Orders → Execute Trade
```

## 📄 Page Structure

### 1. **Landing Page** (`/`)
**Purpose**: Introduce EscrowZero and convert visitors
**Components Needed**:
- Hero section with value proposition
- How it works (4-step process)
- Features showcase
- Trust indicators
- CTA to connect wallet

**Available Components to Use**:
- `navbar-1.tsx` - Main navigation
- `button.tsx` - Primary CTA buttons
- `card.tsx` - Feature cards
- `badge.tsx` - Status indicators
- `globe.tsx` - Visual appeal
- `raycast-animated-background.tsx` - Hero background
- `footer-section.tsx` - Footer

### 2. **Wallet Connection Modal** (Modal/Dialog)
**Purpose**: Connect Pera/Defly wallets
**Components Needed**:
- `dialog.tsx` - Modal container
- `button.tsx` - Wallet connection buttons
- `alert.tsx` - Connection status/errors

### 3. **Dashboard** (`/dashboard`)
**Purpose**: Main user interface after wallet connection
**Components Needed**:
- Account balance
- Quick actions (Create Order, Browse Orders)
- Recent transactions
- Order status overview

**Available Components to Use**:
- `card.tsx` - Dashboard cards
- `badge.tsx` - Order status
- `button.tsx` - Action buttons

### 4. **Create Order** (`/create-order`)
**Purpose**: Seller creates new order
**Components Needed**:
- Order form (item details, price, deadline)
- Preview card
- Confirmation flow

**Available Components to Use**:
- `input.tsx` - Form inputs
- `textarea.tsx` - Item description
- `label.tsx` - Form labels
- `card.tsx` - Order preview
- `button.tsx` - Submit/Cancel

### 5. **Browse Orders** (`/marketplace`)
**Purpose**: Buyer browses available orders
**Components Needed**:
- Order grid/list
- Search and filters
- Order details modal

**Available Components to Use**:
- `card.tsx` - Order cards
- `input.tsx` - Search bar
- `badge.tsx` - Order status
- `dialog.tsx` - Order details

### 6. **Order Details** (`/order/:id`)
**Purpose**: Detailed view of specific order
**Components Needed**:
- Order information
- Action buttons (Buy, Deliver, Release, Refund)
- Transaction history
- Chat/messaging (future)

**Available Components to Use**:
- `card.tsx` - Order details card
- `button.tsx` - Action buttons
- `badge.tsx` - Status indicators
- `alert.tsx` - Important notices

### 7. **My Orders** (`/my-orders`)
**Purpose**: User's order history and management
**Components Needed**:
- Orders as buyer
- Orders as seller
- Filter by status
- Quick actions

**Available Components to Use**:
- `card.tsx` - Order cards
- `switch.tsx` - Toggle buyer/seller view
- `badge.tsx` - Status indicators

## 🎨 Design Patterns

### Color Scheme
- **Primary**: Blue (#3B82F6) - Trust, reliability
- **Success**: Green (#10B981) - Completed orders
- **Warning**: Yellow (#F59E0B) - Pending actions
- **Danger**: Red (#EF4444) - Refunds, errors
- **Neutral**: Gray (#6B7280) - Secondary text

### Order Status Colors
- **Pending**: Orange badge
- **Delivered**: Blue badge
- **Completed**: Green badge
- **Refunded**: Red badge

### Typography
- **Hero Heading**: 4xl-6xl font weight bold
- **Section Headings**: 2xl-3xl font weight semibold
- **Card Titles**: xl font weight medium
- **Body Text**: base font weight normal

## 🔄 State Management

### Wallet State
- Connected wallet address
- Account balance
- Network (LocalNet/TestNet/MainNet)

### Order State
- User's orders (as buyer/seller)
- Available marketplace orders
- Order details and status

### UI State
- Loading states
- Error messages
- Success notifications

## 🧭 Navigation Structure

```
Navbar:
- Logo (EscrowZero)
- Marketplace
- My Orders
- Create Order
- Wallet Address (when connected)
- Connect Wallet (when disconnected)
```

## 📱 Responsive Design

### Desktop (1024px+)
- Full sidebar navigation
- Multi-column layouts
- Expanded order cards

### Tablet (768px-1023px)
- Collapsed sidebar
- Two-column order grid
- Medium-sized cards

### Mobile (767px-)
- Mobile navigation menu
- Single-column layout
- Compact cards

## 🚀 Implementation Priority

### Phase 1 (MVP - 2 hours)
1. **Landing Page** - Hero + How it works
2. **Wallet Connection** - Pera/Defly integration
3. **Dashboard** - Basic after-connection view

### Phase 2 (Core Features - 3 hours)
4. **Create Order** - Form and submission
5. **Browse Orders** - Marketplace view
6. **Order Details** - Individual order page

### Phase 3 (Polish - 1 hour)
7. **My Orders** - User order management
8. **Responsive design** - Mobile optimization
9. **Animations** - Loading states, transitions

## 🎯 Success Metrics

- **User can connect wallet** in < 30 seconds
- **Create order flow** takes < 2 minutes
- **Browse and find order** takes < 1 minute
- **Complete transaction** takes < 3 minutes
- **Mobile experience** is fully functional

## 🔧 Technical Notes

### Routing
- Use React Router for navigation
- Protect routes based on wallet connection
- Deep linking for order details

### Performance
- Lazy load order images
- Paginate order listings
- Cache wallet connection state

### Error Handling
- Network errors
- Wallet connection failures
- Transaction failures
- Form validation errors
