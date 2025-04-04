const express = require('express');
const helmet = require('helmet');
const xssClean = require('xss-clean');
const cors = require('cors');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const dotenv = require('dotenv');

const authRoutes = require('./routes/auth.routes');
const movieRoutes = require('./routes/movie.routes');
const errorHandler = require('./middleware/errorHandler');

dotenv.config();

const app = express();

// ✅ Configuración de CORS con dominio correcto
const corsOptions = {
  origin: 'https://lightgrey-jay-885399.hostingersite.com',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
};
app.use(cors(corsOptions));

// ... (el resto igual)
