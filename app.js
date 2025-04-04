const express = require('express');
const helmet = require('helmet');
const xssClean = require('xss-clean');
const cors = require('cors');
app.use(cors({
  origin: 'https://lightgrey-jay-885399.hostingersite.com', // Tu dominio frontend exacto
  credentials: true
}));
const compression = require('compression');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const dotenv = require('dotenv');

// Importar rutas
const authRoutes = require('./routes/auth.routes');
const movieRoutes = require('./routes/movie.routes');
const errorHandler = require('./middleware/errorHandler');

// Cargar variables de entorno
dotenv.config();

// Crear aplicación Express
const app = express();

// Implementar seguridad HTTP con Helmet
app.use(helmet());

// Configuración de CORS para desarrollo
const corsOptions = {
  origin: true, // Permite cualquier origen en desarrollo
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
};
app.use(cors(corsOptions));

// Comprimir todas las respuestas
app.use(compression());

// Logging en desarrollo
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Limitar peticiones (rate limiting)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // limitar a 100 peticiones
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

// Middleware para parsear el body
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

// Prevenir XSS
app.use(xssClean());

// Rutas API
app.use('/api/auth', authRoutes);
app.use('/api/movies', movieRoutes);

// Ruta principal
app.get('/', (req, res) => {
  res.json({
    status: 'success',
    message: 'API de películas funcionando correctamente'
  });
});

// Manejar rutas no encontradas
app.all('*', (req, res, next) => {
  const err = new Error(`No se encontró la ruta: ${req.originalUrl}`);
  err.statusCode = 404;
  err.status = 'error';
  next(err);
});

// Middleware para manejar errores
app.use(errorHandler);

module.exports = app;
