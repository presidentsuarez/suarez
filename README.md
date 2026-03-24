# SUAREZ

Life & business management app. Track financial accounts, upload statements by quarter, and keep business and personal data separated with split permissions.

## Quick Start

```bash
npm install
npm start
```

Opens at [http://localhost:3000](http://localhost:3000). Runs in demo mode with sample data — no backend required.

## Stack

- **Frontend:** React (single-file App.js)
- **Styling:** Inline styles (Playfair Display, DM Sans, DM Mono)
- **Backend:** Supabase (planned — currently demo mode)

## Demo Mode

The app ships with 4 sample accounts and a few uploads. You can add accounts, toggle them active/inactive, and simulate statement uploads. All data is in-memory and resets on reload.

## Next Steps

1. Create a Supabase project and add credentials to `.env`
2. Connect auth (email/password + Google OAuth)
3. Wire up accounts and uploads to Supabase tables
4. Add Supabase Storage for statement file uploads
