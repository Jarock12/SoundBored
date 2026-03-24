# SoundBored

A full-stack social music web application where users can sign up, log in, and eventually rate songs and albums, build tier lists, and follow friends to see music activity.

## Tech Stack

- **Frontend:** Next.js (App Router) + React
- **Database/Auth:** Supabase (PostgreSQL + Supabase Auth)
- **API:** Spotify Web API
- **Styling:** Tailwind CSS

## Current Sprint 1 Functionality

- Beta landing page
- User signup and login
- Supabase authentication integration
- User profile data stored in a `profiles` table
- Protected dashboard page
- Logout functionality

## Getting Started

### Prerequisites

- Node.js 18+ installed
- A Supabase account
- A Spotify Developer account

### Installation

Clone the repository:
Install dependencies
```terminal
git clone https://github.com/yourusername/SoundBored.git
cd SoundBored
```

Install dependencies:
```terminal
npm install
```
Create a local environment file:
```terminal
cp .env.example .env.local
```
Then add your Supabase and Spotify credentials to .env.local.
Start the development server:
```terminal
npm run dev
```
Open http://localhost:3000
 in your browser.

