# OpenArabic Admin Dashboard

A Next.js admin dashboard for managing articles in the OpenArabic app.

## Features

- 📋 List all articles with search functionality
- ✏️ Edit article title, summary, author, category
- 🖼️ Upload and replace article images
- 🎨 Modern UI with shadcn/ui components
- 🔄 Real-time data from Supabase

## Getting Started

1. Install dependencies:

```bash
pnpm install
```

2. Run the development server with hot reloading:

```bash
pnpm dev
# or use the startup script
./start.sh
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser

**Hot Reloading:** Changes to any file will automatically reload in the browser - no need to rebuild!

## Tech Stack

- **Next.js 15** - App Router with TypeScript
- **shadcn/ui** - UI components built on Radix UI + Tailwind CSS
- **Supabase** - Database and storage
- **React Hook Form** + **Zod** - Form handling and validation

## Usage

### Articles List

- View all articles in a table format
- Search by title, author, or category
- Click "Edit" to modify an article

### Edit Article

- Update title and summary
- Change author from dropdown
- Change category from dropdown
- Upload new image or keep existing one
- Save changes to Supabase

## Notes

- No authentication required (local use only)
- Images are stored in Supabase Storage (`images` bucket)
- All data is pulled from and saved to Supabase in real-time
