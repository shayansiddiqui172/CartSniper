# CartSniper

Grocery price comparison app for Canadian stores. Scan a barcode → see prices across stores → save money.

## Quick Start

### Backend

```bash
cd cartsniper-backend
npm install
npx prisma generate
npx prisma migrate dev
npm run db:seed   # Load demo data
npm run dev       # http://localhost:3000
```

### Mobile App

```bash
cd cartsniper-mobile
npm install
npx expo start
```

Scan the QR code with Expo Go (iOS/Android) or press `i` for iOS simulator.

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/scan/barcode` | Scan barcode → get product + prices |
| POST | `/scan/image` | Image recognition fallback |
| GET | `/prices/:productId` | Get all store prices for product |
| POST | `/prices/compare` | Compare prices for multiple products |
| GET | `/cart` | Get cart with optimized totals |
| POST | `/cart/items` | Add item to cart |
| DELETE | `/cart/items/:id` | Remove item |
| GET | `/alerts` | Get price alerts |
| POST | `/alerts` | Create price alert |
| DELETE | `/alerts/:id` | Delete alert |

## Demo Flow

1. **Scan**: Open app → scan any barcode (or use `0057000000103` for Heinz Ketchup)
2. **Compare**: See prices across Walmart, Loblaws, No Frills, FreshCo, Metro
3. **Cart**: Add items → see "All at Walmart: $X" vs "Split trip: $Y"
4. **Alert**: Set target price → get notified when price drops

## Tech Stack

- **Backend**: Express + TypeScript + Prisma + SQLite
- **Mobile**: Expo + React Native
- **Integrations**: Open Food Facts API, Claude Vision (optional)

## Project Structure

```
cartsniper-backend/
├── src/
│   ├── api/routes/      # Express routes
│   ├── services/        # Business logic
│   ├── integrations/    # External APIs
│   └── config/          # Environment
├── prisma/              # Database schema + seed
└── tests/               # Unit + integration tests

cartsniper-mobile/
├── app/                 # Expo Router screens
└── components/          # Reusable UI components
```

## Team

Built at [Hackathon Name] - March 2026
