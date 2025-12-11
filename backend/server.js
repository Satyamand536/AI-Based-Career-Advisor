require('dotenv').config();
const path = require('path');
const express = require('express');
const app = express();
const PORT = process.env.PORT || 8000;
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const cors = require('cors');

// ===== ROUTES =====
const userRoute = require('./routes/userRoute');
const jobRoute = require('./routes/jobRoute');  // ✅ IMPORTANT

// ===== MIDDLEWARE =====
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));  // ✅ Changed to true
app.use(cookieParser());

// Auth middleware
const { checkForAuthenticationCookie } = require('./middlewares/auth');
app.use(checkForAuthenticationCookie("token"));

app.use((req, res, next) => {
  res.locals.user = req.user;
  next();
});

app.use(express.static(path.resolve('./public')));

// ===== DB CONNECTION =====
if (process.env.MONGO_URL) {
  mongoose.connect(process.env.MONGO_URL)
    .then(() => console.log('✅ MongoDB connected!'))
    .catch(err => console.error('❌ MongoDB error:', err.message));
}

// ===== ROUTES =====
app.get('/', (req, res) => {
  res.send('✅ Backend server is running!');
});

app.use('/user', userRoute);
app.use('/jobs', jobRoute);  // ✅ IMPORTANT

// ===== ERROR HANDLING =====
app.use((err, req, res, next) => {
  console.error('❌ Error:', err);
  res.status(500).json({ error: err.message });
});

// ===== START SERVER =====
app.listen(PORT, () => {
  console.log(`✅ Server started at PORT: ${PORT}`);
});
