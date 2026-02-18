# Reservation Management System - Copilot Instructions

This workspace contains a full-stack reservation management system with the following structure:

## Project Overview
- **Frontend**: Next.js application with React and Tailwind CSS
- **Backend**: Python Flask API with chatbot integration
- **Documentation**: Guides and architecture documentation

## Key Technologies
- Next.js 14+ with TypeScript
- Python 3.9+ with Flask
- Tailwind CSS for styling
- SQLAlchemy for database ORM

## Development Workflow

### Frontend Development
- Located in `frontend/` directory
- Uses Next.js App Router with TypeScript
- Tailwind CSS for styling
- Common commands:

- Install deps: `cd frontend && npm ci`
- Start dev server: `cd frontend && npm run dev` (hot-reloads)
- Type-check only: `cd frontend && npx tsc --noEmit`
- Build for production: `cd frontend && npm run build`
- Preview production build: `cd frontend && npm run start`

Notes:
- If you see TypeScript errors in the editor, run the `npx tsc --noEmit` command to surface type-check issues.
- For quick linting and formatting, use the workspace's `eslint` and `prettier` scripts if present (e.g. `npm run lint`).

### Backend Development
- Located in `backend/` directory
- Flask REST API
- Chatbot service integration
- Start with: `cd backend && python app.py`

Notes:
- Create and activate a Python virtual environment before installing dependencies:

```powershell
cd backend
py -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

+- If you encounter dependency issues (for example with `boto3` pins), try updating `requirements.txt` or installing problematic packages individually.

## Next Steps After Initialization

1. Initialize the Next.js frontend with Tailwind CSS
2. Set up Python virtual environment in backend
3. Create database models and migrations
4. Implement core reservation features
5. Integrate chatbot service
6. Build authentication system

## Documentation
- See `docs/SETUP.md` for setup instructions
- See `docs/ARCHITECTURE.md` for system design
