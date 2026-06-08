# KudiBase 💰

A modern POS (Point of Sale) app for Nigerian small business merchants. Built with React Native (Expo) and SQLite.

## Features

- **📊 Sales Tracking** - Record sales with multiple payment methods (Cash, Transfer, POS, Pay Later)
- **📦 Inventory Management** - Track stock levels with low stock alerts
- **💳 Debt Management** - Track outstanding payments and send WhatsApp reminders
- **📈 Reports & Analytics** - Sales summaries, profit tracking, top products
- **Backup & Restore** - Export and import local backup files
- **🌙 Dark Mode** - Full dark/light theme support
- **💎 Premium Features** - Auto-reminders, advanced reports, exports, and inventory insights

## Tech Stack

- **Framework:** React Native (Expo SDK 54)
- **Language:** TypeScript
- **Database:** SQLite (expo-sqlite)
- **Navigation:** Expo Router (file-based)
- **Payments:** RevenueCat
- **Styling:** React Native StyleSheet

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- iOS Simulator / Android Emulator / Physical device

### Installation

```bash
# Clone the repository
git clone https://github.com/your-repo/kudibase.git
cd kudibase

# Install dependencies
npm install

# Start the development server
npx expo start
```

### Running on Device

```bash
# iOS
npm run ios

# Android
npm run android
```

## Project Structure

```
├── app/                    # Screens (file-based routing)
│   ├── (tabs)/             # Tab navigation screens
│   │   ├── index.tsx       # Dashboard
│   │   ├── sales.tsx       # POS screen
│   │   ├── inventory.tsx   # Inventory management
│   │   ├── debts.tsx       # Debt tracking
│   │   └── settings.tsx    # App settings
│   └── ...                 # Other routes
├── components/             # Reusable components
│   ├── sales/              # Sales screen components
│   ├── debts/              # Debts screen components
│   └── ui/                 # UI primitives
├── hooks/                  # Custom React hooks
├── lib/                    # Business logic
│   └── db/                 # Database modules
│       ├── connection.ts   # DB connection utilities
│       ├── schema.ts       # Table creation, migrations
│       ├── items.ts        # Inventory CRUD
│       ├── sales.ts        # Sales + reports
│       ├── payments.ts     # Payment records
│       ├── settings.ts     # App settings
│       └── import-export.ts # Backup/restore
└── constants/              # Theme, colors, config
```

## Scripts

```bash
npm start           # Start Expo dev server
npm run ios         # Run on iOS
npm run android     # Run on Android
npm test            # Run tests
npm run test:watch  # Run tests in watch mode
npm run lint        # Run ESLint
```

## Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage
```

## License

Private - All rights reserved

## Author

Al-Ameen Muhammad
