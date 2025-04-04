// Middleware para manejar errores de forma centralizada
const errorHandler = (err, req, res, next) => {
    // Valores por defecto
    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';
  
    // Errores específicos de desarrollo
    if (process.env.NODE_ENV === 'development') {
      sendErrorDev(err, req, res);
    }
    // Errores específicos de producción
    else {
      // Copia profunda del error para no modificar el original
      let error = { ...err };
      error.message = err.message;
      error.name = err.name;
  
      // Error de MySQL - entrada duplicada
      if (error.code === 'ER_DUP_ENTRY') {
        error = handleDuplicateFieldsDB(error);
      }
  
      // Error de validación de MySQL
      if (error.sqlState === '45000') {
        error = handleValidationErrorDB(error);
      }
  
      // Error de token JWT inválido
      if (error.name === 'JsonWebTokenError') {
        error = handleJWTError();
      }
  
      // Error de token JWT expirado
      if (error.name === 'TokenExpiredError') {
        error = handleJWTExpiredError();
      }
  
      // Enviar error formateado para producción
      sendErrorProd(error, req, res);
    }
  };
  
  // Enviar error en desarrollo con todos los detalles
  const sendErrorDev = (err, req, res) => {
    // API
    if (req.originalUrl.startsWith('/api')) {
      return res.status(err.statusCode).json({
        status: err.status,
        error: err,
        message: err.message,
        stack: err.stack
      });
    }
  
    // Renderizado para páginas no API (si hubiera)
    console.error('ERROR 💥', err);
    return res.status(err.statusCode).json({
      status: err.status,
      message: err.message
    });
  };
  
  // Enviar error en producción con información limitada
  const sendErrorProd = (err, req, res) => {
    // API
    if (req.originalUrl.startsWith('/api')) {
      // Error operacional, confiable: enviar mensaje al cliente
      if (err.isOperational) {
        return res.status(err.statusCode).json({
          status: err.status,
          message: err.message
        });
      }
      
      // Error de programación o desconocido: no filtrar detalles
      console.error('ERROR 💥', err);
      
      // Enviar mensaje genérico
      return res.status(500).json({
        status: 'error',
        message: 'Algo salió mal!'
      });
    }
  
    // Renderizado para páginas no API (si hubiera)
    if (err.isOperational) {
      return res.status(err.statusCode).json({
        status: err.status,
        message: err.message
      });
    }
    
    // Error de programación o desconocido: no filtrar detalles
    console.error('ERROR 💥', err);
    
    // Enviar mensaje genérico
    return res.status(500).json({
      status: 'error',
      message: 'Algo salió mal!'
    });
  };
  
  // Manejar errores de campo duplicado
  const handleDuplicateFieldsDB = err => {
    const message = `El valor '${err.sqlMessage.match(/['"]([^'"]*)['"]/)[1]}' ya está en uso. Por favor usa otro valor!`;
    
    return {
      statusCode: 400,
      status: 'error',
      message,
      isOperational: true
    };
  };
  
  // Manejar errores de validación de MySQL
  const handleValidationErrorDB = err => {
    return {
      statusCode: 400,
      status: 'error',
      message: err.message,
      isOperational: true
    };
  };
  
  // Manejar error de token JWT inválido
  const handleJWTError = () => {
    return {
      statusCode: 401,
      status: 'error',
      message: 'Token inválido. Por favor, inicia sesión de nuevo!',
      isOperational: true
    };
  };
  
  // Manejar error de token JWT expirado
  const handleJWTExpiredError = () => {
    return {
      statusCode: 401,
      status: 'error',
      message: 'Tu sesión ha expirado! Por favor, inicia sesión de nuevo.',
      isOperational: true
    };
  };
  
  module.exports = errorHandler;