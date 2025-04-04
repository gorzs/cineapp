const express = require('express');
const helmet = require('helmet');
const xssClean = require('xss-clean');
const cors = require('cors'); // ✅ Solo una vez y bien posicionado
const compression = require('compression');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const dotenv = require('dotenv');

// Rutas y middleware personalizado
const authRoutes = require('./routes/auth.routes');
const movieRoutes = require('./routes/movie.routes');
const errorHandler = require('./middleware/errorHandler');

// Cargar variables de entorno
dotenv.config();

// Crear instancia de Express
const app = express();

// ✅ Configuración de CORS
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'https://lightgrey-jay-885399.hostingersite.com',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
};
app.use(cors(corsOptions));

// Seguridad HTTP con Helmet
app.use(helmet());

// Compresión de respuestas
app.use(compression());

// Logging solo en desarrollo
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Rate limiting para proteger la API
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Demasiadas peticiones desde esta IP. Intenta más tarde.',
  handler: (req, res, next, options) => {
    res.status(429).json({
      status: 'error',
      message: options.message
    });
  }
});
app.use('/api/', limiter);

// Parseo del body y cookies
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser(process.env.SESSION_SECRET));

// Configuración de sesiones
app.use(session({
  genid: (req) => uuidv4(),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 1 día
  }
}));

// Protección contra XSS
app.use(xssClean());

// Rutas de la API
app.use('/api/auth', authRoutes);
app.use('/api/movies', movieRoutes);

// Ruta base
app.get('/', (req, res) => {
  res.json({
    status: 'success',
    message: 'API de películas funcionando correctamente 🚀'
  });
});

// Manejo de rutas no encontradas
app.all('*', (req, res, next) => {
  const err = new Error(`No se encontró la ruta: ${req.originalUrl}`);
  err.statusCode = 404;
  err.status = 'error';
  next(err);
});

// Middleware de manejo de errores
app.use(errorHandler);

module.exports = app;
