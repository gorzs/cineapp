const { body, param, query } = require('express-validator');

// Validación para registro de usuario
exports.validateSignup = [
  body('username')
    .trim()
    .not().isEmpty().withMessage('El nombre de usuario es obligatorio')
    .isLength({ min: 3, max: 50 }).withMessage('El nombre de usuario debe tener entre 3 y 50 caracteres')
    .matches(/^[a-zA-Z0-9_]+$/).withMessage('El nombre de usuario solo puede contener letras, números y guiones bajos')
    .escape(),
  
  body('email')
    .trim()
    .not().isEmpty().withMessage('El email es obligatorio')
    .isEmail().withMessage('Email inválido')
    .normalizeEmail(),
  
  body('password')
    .not().isEmpty().withMessage('La contraseña es obligatoria')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d])[A-Za-z\d\W]{8,}$/)
    .withMessage('La contraseña debe tener al menos 8 caracteres, incluir una mayúscula, una minúscula, un número y un símbolo'),
];

// Validación para inicio de sesión
exports.validateLogin = [
  body('email')
    .trim()
    .not().isEmpty().withMessage('El email es obligatorio')
    .isEmail().withMessage('Email inválido')
    .normalizeEmail(),
  
  body('password')
    .not().isEmpty().withMessage('La contraseña es obligatoria')
];

// Validación para la creación de películas
exports.validateMovie = [
  body('title')
    .trim()
    .not().isEmpty().withMessage('El título es obligatorio')
    .isLength({ max: 100 }).withMessage('El título no puede tener más de 100 caracteres')
    .escape(),
  
  body('director')
    .trim()
    .not().isEmpty().withMessage('El director es obligatorio')
    .isLength({ max: 100 }).withMessage('El director no puede tener más de 100 caracteres')
    .escape(),
  
  body('year')
    .not().isEmpty().withMessage('El año es obligatorio')
    .isInt({ min: 1888, max: new Date().getFullYear() + 5 }).withMessage(`El año debe estar entre 1888 y ${new Date().getFullYear() + 5}`)
    .toInt(),
  
  body('genre')
    .trim()
    .not().isEmpty().withMessage('El género es obligatorio')
    .isIn(['Acción', 'Aventura', 'Comedia', 'Drama', 'Fantasía', 
           'Horror', 'Misterio', 'Romance', 'Ciencia Ficción', 
           'Thriller', 'Animación', 'Documental', 'Otro'])
    .withMessage('Género no válido')
    .escape(),
  
  body('plot')
    .optional()
    .trim()
    .isLength({ max: 1000 }).withMessage('La sinopsis no puede tener más de 1000 caracteres')
    .escape(),
  
  body('poster_url')
    .optional()
    .trim()
    .isURL().withMessage('URL del póster no válida')
    .isLength({ max: 255 }).withMessage('La URL del póster no puede tener más de 255 caracteres')
    .escape(),
  
  body('rating')
    .optional()
    .isFloat({ min: 0, max: 10 }).withMessage('La calificación debe estar entre 0 y 10')
    .toFloat()
];

// Validación para la actualización de películas
exports.validateMovieUpdate = [
  param('id')
    .isInt().withMessage('ID de película inválido')
    .toInt(),
    
  body('title')
    .trim()
    .not().isEmpty().withMessage('El título es obligatorio')
    .isLength({ max: 100 }).withMessage('El título no puede tener más de 100 caracteres')
    .escape(),
  
  body('director')
    .trim()
    .not().isEmpty().withMessage('El director es obligatorio')
    .isLength({ max: 100 }).withMessage('El director no puede tener más de 100 caracteres')
    .escape(),
  
  body('year')
    .not().isEmpty().withMessage('El año es obligatorio')
    .isInt({ min: 1888, max: new Date().getFullYear() + 5 }).withMessage(`El año debe estar entre 1888 y ${new Date().getFullYear() + 5}`)
    .toInt(),
  
  body('genre')
    .trim()
    .not().isEmpty().withMessage('El género es obligatorio')
    .isIn(['Acción', 'Aventura', 'Comedia', 'Drama', 'Fantasía', 
           'Horror', 'Misterio', 'Romance', 'Ciencia Ficción', 
           'Thriller', 'Animación', 'Documental', 'Otro'])
    .withMessage('Género no válido')
    .escape(),
  
  body('plot')
    .optional()
    .trim()
    .isLength({ max: 1000 }).withMessage('La sinopsis no puede tener más de 1000 caracteres')
    .escape(),
  
  body('poster_url')
    .optional()
    .trim()
    .isURL().withMessage('URL del póster no válida')
    .isLength({ max: 255 }).withMessage('La URL del póster no puede tener más de 255 caracteres')
    .escape(),
  
  body('rating')
    .optional()
    .isFloat({ min: 0, max: 10 }).withMessage('La calificación debe estar entre 0 y 10')
    .toFloat()
];

// Validación para ID en parámetro
exports.validateId = [
  param('id')
    .isInt().withMessage('ID de película inválido')
    .toInt()
];

// Validación para parámetros de filtro en consultas
exports.validateMovieFilters = [
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('El número de página debe ser un entero positivo')
    .toInt(),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('El límite debe estar entre 1 y 100')
    .toInt(),
  
  query('title')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('El título no puede tener más de 100 caracteres')
    .escape(),
  
  query('director')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('El director no puede tener más de 100 caracteres')
    .escape(),
  
  query('year')
    .optional()
    .isInt({ min: 1888, max: new Date().getFullYear() + 5 }).withMessage(`El año debe estar entre 1888 y ${new Date().getFullYear() + 5}`)
    .toInt(),
  
  query('genre')
    .optional()
    .trim()
    .isIn(['Acción', 'Aventura', 'Comedia', 'Drama', 'Fantasía', 
           'Horror', 'Misterio', 'Romance', 'Ciencia Ficción', 
           'Thriller', 'Animación', 'Documental', 'Otro'])
    .withMessage('Género no válido')
    .escape(),
  
  query('sort')
    .optional()
    .custom(value => {
      const sortField = value.replace('-', '');
      const allowedSortFields = ['title', 'director', 'year', 'rating', 'created_at'];
      
      if (!allowedSortFields.includes(sortField)) {
        throw new Error('Campo de ordenamiento no válido');
      }
      
      return true;
    })
];