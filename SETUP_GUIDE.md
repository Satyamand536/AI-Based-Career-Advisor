# AI Based Career Advisor - Setup Guide

## Issues Fixed

The following issues have been resolved:

1. **Network Error on Signup**: Fixed error handling to show specific error messages instead of generic "Network error"
2. **Backend Error Handling**: Improved error messages and validation
3. **Token Creation Bug**: Fixed issue where token was using `user.name` instead of `user.fullName`
4. **Response Handling**: Fixed Signin component to properly handle JSON responses
5. **MongoDB Connection**: Added better error messages for MongoDB connection issues

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (local installation or MongoDB Atlas account)
- npm or yarn

## Setup Instructions

### 1. Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the `backend` directory:
   ```bash
   # Copy the example file
   cp .env.example .env
   ```

4. Edit the `.env` file and add your MongoDB connection string:
   ```
   MONGO_URL=mongodb://localhost:27017/career_advisor
   ```
   Or for MongoDB Atlas:
   ```
   MONGO_URL=mongodb+srv://username:password@cluster.mongodb.net/database_name
   ```

5. Start the backend server:
   ```bash
   # For development (with auto-reload)
   npm run dev
   
   # Or for production
   npm start
   ```

   The backend should start on `http://localhost:8000`

### 2. Frontend Setup

1. Open a new terminal and navigate to the frontend directory:
   ```bash
   cd front
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the frontend development server:
   ```bash
   npm start
   ```

   The frontend should start on `http://localhost:3000`

## Running the Application

1. **Start MongoDB** (if using local MongoDB):
   - Make sure MongoDB is running on your system
   - Or ensure your MongoDB Atlas connection string is correct

2. **Start Backend Server**:
   ```bash
   cd backend
   npm run dev
   ```
   You should see: `server started at PORT:8000` and `MongoDB connected successfully!`

3. **Start Frontend Server** (in a new terminal):
   ```bash
   cd front
   npm start
   ```
   The browser should automatically open to `http://localhost:3000`

## Testing Signup

1. Navigate to `http://localhost:3000/signup`
2. Fill in the form:
   - Full Name
   - Email address
   - Password (minimum 6 characters)
3. Click Submit

## Common Issues and Solutions

### Issue: "Network error" when signing up

**Solution**: 
- Make sure the backend server is running on port 8000
- Check that MongoDB is connected (look for "MongoDB connected successfully!" in backend console)
- Verify your `.env` file has the correct `MONGO_URL`

### Issue: "MongoDB connection error"

**Solution**:
- Check your MongoDB connection string in `.env` file
- If using local MongoDB, ensure MongoDB service is running
- If using MongoDB Atlas, verify your connection string and network access settings

### Issue: "Email already exists"

**Solution**: This is expected behavior. Try with a different email address.

### Issue: Frontend can't connect to backend

**Solution**:
- Verify backend is running on `http://localhost:8000`
- Check that the proxy in `front/package.json` is set to `"proxy": "http://localhost:8000"`
- Make sure CORS is properly configured in `backend/server.js`

## Project Structure

```
AI based career advisor/
├── backend/
│   ├── .env                 # Environment variables (create this)
│   ├── .env.example         # Example environment file
│   ├── server.js            # Main server file
│   ├── routes/
│   │   └── userRoute.js     # User authentication routes
│   ├── models/
│   │   └── user.js          # User model
│   ├── middlewares/
│   │   └── auth.js          # Authentication middleware
│   └── services/
│       └── authentication.js # JWT token services
└── front/
    ├── src/
    │   ├── App.js           # Main React app
    │   └── components/
    │       ├── Signup.jsx   # Signup component
    │       ├── Signin.jsx   # Signin component
    │       └── Home.jsx     # Home component
    └── package.json         # Frontend dependencies
```

## What Was Fixed

### Frontend (`front/src/components/Signup.jsx`)
- Added proper error handling with specific error messages
- Added input validation before API call
- Improved error messages to show actual issues (backend not running, network errors, etc.)
- Fixed response handling to properly check for success/error

### Frontend (`front/src/components/Signin.jsx`)
- Fixed response handling to work with JSON responses instead of redirects
- Added better error handling
- Added input validation

### Backend (`backend/routes/userRoute.js`)
- Added input validation for signup and signin
- Improved error handling with specific error messages
- Added proper MongoDB error handling (duplicate key, validation errors)
- Fixed email case sensitivity (converting to lowercase)

### Backend (`backend/services/authentication.js`)
- Fixed token creation to use `user.fullName` instead of `user.name`

### Backend (`backend/server.js`)
- Added better MongoDB connection error handling
- Added check for missing MONGO_URL environment variable

## Next Steps

After successful signup, you can:
1. Test the signin functionality
2. Implement additional features
3. Deploy to production (update CORS settings and environment variables)

## Support

If you encounter any issues:
1. Check the browser console for frontend errors
2. Check the backend terminal for server errors
3. Verify MongoDB connection
4. Ensure both servers are running



