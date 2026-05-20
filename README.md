# rise-together

A habit tracker where consistency is better with friends. Built with Expo, expo-router, NativeWind, and Clerk.

## Stack

- **Expo SDK 54** + **expo-router** (file-based routing)
- **NativeWind preview** (Tailwind v4 via `@theme` in `global.css`)
- **Clerk** (email/password auth with email verification + reset)
- **TypeScript**, Plus Jakarta Sans + Inter fonts

## Setup

```sh
npm install
```

Create a `.env` with your Clerk publishable key:

```
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
```

Run:

```sh
npx expo start -c
```

Press `i` for iOS simulator or scan the QR with Expo Go.
