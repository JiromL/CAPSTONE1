# Reservation Management System

A full-stack reservation management system with AI chatbot support, built with Next.js, Python, and Tailwind CSS.

## Project Structure

```
├── frontend/          # Next.js frontend application
├── backend/          # Python backend and chatbot service
├── docs/             # Project documentation
└── README.md         # This file
```

## Tech Stack

- **Frontend**: Next.js, React, Tailwind CSS
- **Backend**: Python (Flask/FastAPI recommended)
- **Chatbot**: Python-based AI assistant
- **Styling**: Tailwind CSS

## Getting Started

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

### Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

## Features

- User reservation management
- Real-time booking system
- AI-powered chatbot for customer support
- Admin dashboard
- Responsive design with Tailwind CSS

## User Roles

- ADMIN
- DPO
- COUNSELOR
- PSYCHOLOGIST
- OFFICE_ASSISTANT (formerly STAFF)
- IC
- STUDENT

### Office Assistant Settings
- Accessible at `/office-assistant-settings` for OFFICE_ASSISTANT role.
- OFFICE_ASSISTANT can manage walk-in and email appointments, and all actions are logged.

All references to STAFF in the codebase have been renamed to OFFICE_ASSISTANT for clarity and consistency. Please use the OFFICE_ASSISTANT role for all office assistant workflows and permissions.

## Documentation

See the [docs](./docs) folder for detailed documentation.

## License

MIT
