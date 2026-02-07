# System Architecture

## Overview

The Reservation Management System is a full-stack application with three main components:

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (Next.js)                   │
│              React Components + Tailwind CSS            │
│                  http://localhost:3000                  │
└────────────────────────┬────────────────────────────────┘
                         │ HTTP/REST API
                         ↓
┌─────────────────────────────────────────────────────────┐
│                  Backend (Python/Flask)                 │
│              API Server + Chatbot Service               │
│                  http://localhost:5000                  │
└─────────────────────────────────────────────────────────┘
                         │
                         ↓
┌──────────────────────────────────────────────────────────┐
│                   Database (SQLite)                      │
│            Stores reservations and user data            │
└──────────────────────────────────────────────────────────┘
```

## Frontend Architecture

- **Pages**: User interfaces for making and viewing reservations
- **Components**: Reusable React components
- **Styles**: Tailwind CSS for responsive design
- **API Client**: Axios/fetch for backend communication

## Backend Architecture

- **Routes**: REST API endpoints
- **Models**: Database models (SQLAlchemy ORM)
- **Services**: Business logic (reservations, chatbot)
- **Database**: SQLite for development, PostgreSQL for production

## Data Flow

1. User interacts with frontend
2. Frontend sends request to backend API
3. Backend processes request and updates database
4. Backend returns response to frontend
5. Frontend updates UI

## Chatbot Integration

- Runs as a service in the backend
- Can use OpenAI API or local models
- Processes user messages and returns responses
- Integrated into `/api/chat` endpoint
