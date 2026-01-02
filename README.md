# Activity Tracker - MERN Stack

A daily activity and streak tracking application built with MongoDB, Express, React, and Node.js.

## Features
- User authentication (register/login)
- Select and track daily goals (career, personal, custom)
- Streak tracking with statistics
- Progress charts
- Admin dashboard with leaderboard

## Quick Start

### Prerequisites
- Node.js 18+
- MongoDB running locally or MongoDB Atlas URI

### Installation
```bash
npm run install-all
```

### Development
```bash
npm run dev
```
- Backend: http://localhost:3001
- Frontend: http://localhost:5173

### Environment Variables
Create `.env` in root:
```
MONGODB_URI=mongodb://localhost:27017/activity-tracker
SESSION_SECRET=your-secret-key
PORT=3001
CLIENT_URL=http://localhost:5173
```

## Project Structure
```
├── server.js           # Express server
├── routes/             # API routes
├── models/             # Mongoose models
├── middleware/         # Auth middleware
├── client/             # React frontend (Vite)
│   ├── src/
│   │   ├── pages/      # Page components
│   │   ├── components/ # Reusable components
│   │   ├── context/    # Auth context
│   │   └── api/        # Axios config
```

## API Endpoints
- `POST /api/auth/register` - Register user
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user
- `PUT /api/users/tasks` - Update selected tasks
- `GET /api/tasks/dashboard` - Get dashboard data
- `POST /api/tasks/:taskId/complete` - Toggle task completion
- `GET /api/admin/users` - Get all users (admin)
- `GET /api/admin/leaderboard` - Get leaderboard (admin)
