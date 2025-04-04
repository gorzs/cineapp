const express = require('express');
const app = express();

// ✅ CORS configurado correctamente
const corsOptions = {
  origin: 'https://lightgrey-jay-885399.hostingersite.com',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
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

// Middleware personalizado para debug
app.use((req, res, next) => {
  console.log(`[CORS DEBUG] ${req.method} ${req.path}`);
  next();
});


// Middleware
app.use(compression());

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Demasiadas peticiones desde esta IP, por favor intente de nuevo después de 15 minutos',
  handler: (req, res, next, options) => {
    res.status(429).json({
      status: 'error',
      message: options.message
    });
  }
});
app.use('/api/', limiter);

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser(process.env.SESSION_SECRET));

app.use(session({
  genid: (req) => uuidv4(),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000
  }
}));

app.use(xssClean());

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/movies', movieRoutes);

app.get('/', (req, res) => {
  res.json({
    status: 'success',
    message: 'API de películas funcionando correctamente'
  });
});

app.all('*', (req, res, next) => {
  const err = new Error(`No se encontró la ruta: ${req.originalUrl}`);
  err.statusCode = 404;
  err.status = 'error';
  next(err);
});

app.use(errorHandler);
