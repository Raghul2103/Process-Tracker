# Process Tracker (MERN + Tailwind)

Full-stack Process Tracker web application with:
- React + Vite + Tailwind CSS frontend
- Node.js + Express + MongoDB backend
- Daily, weekly, and monthly reporting with Recharts

## Project Structure

```text
process-tracker/
├── frontend/
└── backend/
```

## Backend Setup

```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

Backend runs at `http://localhost:5000`.

## Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Frontend runs at `http://localhost:5173`.

## Features

- Log hourly activities by date
- Prevent duplicate hour entries per date
- Inline edit and delete activity entries
- Daily/weekly/monthly report generation
- Bar and pie chart visualizations
- Responsive dashboard UI
- Toast notifications and loading states
- JWT-ready middleware structure for future auth integration
