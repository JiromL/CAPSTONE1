# API Documentation

## Reservations Endpoints

### Get All Reservations
```
GET /api/reservations
```
Returns a list of all reservations.

**Response:**
```json
{
  "reservations": [
    {
      "id": 1,
      "user_id": 1,
      "date": "2024-02-15",
      "time": "14:00",
      "party_size": 4,
      "status": "confirmed"
    }
  ]
}
```

### Create Reservation
```
POST /api/reservations
```
Creates a new reservation.

**Request Body:**
```json
{
  "user_id": 1,
  "date": "2024-02-15",
  "time": "14:00",
  "party_size": 4
}
```

**Response:**
```json
{
  "message": "Reservation created",
  "data": {
    "id": 1,
    "user_id": 1,
    "date": "2024-02-15",
    "time": "14:00",
    "party_size": 4
  }
}
```

## Chat Endpoint

### Send Message to Chatbot
```
POST /api/chat
```
Send a message to the chatbot service.

**Request Body:**
```json
{
  "message": "When can I make a reservation?"
}
```

**Response:**
```json
{
  "response": "You can make a reservation anytime..."
}
```

## Health Check

### Check Backend Status
```
GET /api/health
```

**Response:**
```json
{
  "status": "Backend is running",
  "timestamp": "2024-02-07T10:30:00"
}
```
