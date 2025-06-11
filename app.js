const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();


// server.js (or app.js)

const app = express();
const allowedOriginsDev = [
  'http://localhost:5000', // update with your dev origin(s)
  'http://127.0.0.1:5000'
];
const allowedOriginsProd = [
  'https://pandara-samaja-backend.onrender.com' // update with your production origin(s)
];
const allowedOrigins = process.env.NODE_ENV === 'production' ? allowedOriginsProd : allowedOriginsDev;

app.use(cors({
  origin: function (origin, callback) {
    // Allow REST tools like Postman which send no Origin header
    if (!origin || origin === 'null') return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      return callback(null, true);
    }
    callback(new Error('Not allowed by CORS: ' + origin));
  }
}));
app.use(bodyParser.json());

const candidateRoutes = require('./routes/candidateRoutes');
app.use('/api/candidates', candidateRoutes);

const memberRoutes = require('./routes/memberRoutes');
app.use('/api/members', memberRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));