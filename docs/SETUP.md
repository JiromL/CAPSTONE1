# Setup Guide

## Prerequisites
- Node.js 18+ 
- Python 3.9+
- npm or yarn

## Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Create a Next.js app with Tailwind CSS:
   ```bash
   npx create-next-app@latest . --typescript --tailwind --app --src-dir --eslint
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

The frontend will be available at `http://localhost:3000`

## Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create a Python virtual environment:
   ```bash
   python -m venv venv
   ```

3. Activate the virtual environment:
   - Windows: `venv\Scripts\activate`
   - macOS/Linux: `source venv/bin/activate`

4. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

5. Create a .env file:
   ```bash
   cp .env.example .env
   ```

6. Update .env with your configuration

7. Run the backend:
   ```bash
   python app.py
   ```

The backend will be available at `http://localhost:5000`

## API Endpoints

- `GET /api/health` - Health check
- `GET /api/reservations` - Get all reservations
- `POST /api/reservations` - Create a new reservation
- `POST /api/chat` - Chat with the bot

## Next Steps

1. Set up database models (SQLAlchemy)
2. Implement authentication
3. Build frontend pages and components
4. Integrate chatbot service
5. Deploy to production
