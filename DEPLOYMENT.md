# 🚀 KudiBase Deployment Guide

This guide provides instructions for deploying both the KudiBase Mobile App and the Admin Dashboard.

## 📱 Mobile App (Expo)

The mobile app is built with Expo. We recommend using **EAS Build** for production.

### Prerequisites
1. Create an [Expo account](https://expo.dev/).
2. Install EAS CLI: `npm install -g eas-cli`.
3. Login: `eas login`.

### Deployment Steps
1. **Configure Project**: Run `eas build:configure`.
2. **Environment Variables**: Add your production keys to EAS Secrets:
   - `EXPO_PUBLIC_SUPABASE_URL`
   - `EXPO_PUBLIC_SUPABASE_ANON_KEY`
   - `REVENUECAT_ANDROID_API_KEY`
   - `REVENUECAT_IOS_API_KEY`
3. **Build for Android**: `eas build --platform android --profile production`.
4. **Build for iOS**: `eas build --platform ios --profile production`.
5. **Submit to Stores**: Use `eas submit` after a successful build.

---

## 💻 Admin Dashboard (Next.js)

The dashboard is a Next.js app. **Vercel** is the recommended deployment platform.

### Prerequisites
1. A [Vercel](https://vercel.com/) account.
2. The `admin-dashboard` directory as a root or part of a monorepo.

### Deployment Steps
1. **Push to GitHub**: Ensure your code is in a repository.
2. **Import to Vercel**: Connect your repo and select the `admin-dashboard` directory as the project root.
3. **Environment Variables**: Add the following in the Vercel Dashboard:
   - `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase URL.
   - `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase Service Role Key (Keep this secret!).
   - `ADMIN_PASSWORD`: The master password for the dashboard.
   - `NODE_ENV`: Set to `production`.
4. **Deploy**: Vercel will automatically build and deploy your app.

---

## 🛡️ Security Best Practices
- **Never commit `.env` files**: Ensure they are in your `.gitignore`.
- **Rotate Keys**: If a key is ever exposed, rotate it immediately in the Supabase/RevenueCat dashboard.
- **Service Role Key**: Never use the `SUPABASE_SERVICE_ROLE_KEY` in client-side code (Next.js components without `'use server'`).

---

## 🛠️ Maintenance
- **Database**: Monitor your Supabase project for storage and API limits.
- **Backups**: Ensure users are aware of the Google Drive backup feature in the mobile app.
