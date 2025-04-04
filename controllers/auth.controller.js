const xss = require('xss');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/database');
const { validationResult } = require('express-validator');

// Firmar token JWT
const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN
  });
};

// Crear y enviar token
const createSendToken = (user, statusCode, req, res) => {
  const token = signToken(user.id);
  
  // Opciones para la cookie
  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
    secure: req.secure || req.headers['x-forwarded-proto'] === 'https',
    sameSite: 'strict'
  };
  
  // Enviar cookie
  res.cookie('jwt', token, cookieOptions);
  
  // Quitar password de la salida
  user.password = undefined;
  
  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user
    }
  });
};

// Registrar usuario
exports.signup = async (req, res, next) => {
  try {
    // Validar datos de entrada
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        errors: errors.array()
      });
    }

    const username = xss(req.body.username.trim());
    const email = xss(req.body.email.trim().toLowerCase());
    const password = req.body.password;


    // Verificar si el usuario ya existe
    const existingUser = await query(
      'SELECT id FROM users WHERE email = ? OR username = ?',
      [email, username]
    );

    if (existingUser.length > 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Este email o nombre de usuario ya está registrado'
      });
    }

    // Hash de la contraseña
    const hashedPassword = await bcrypt.hash(password, 12);

    // Insertar nuevo usuario
    const result = await query(
      'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
      [username, email, hashedPassword]
    );

    // Obtener el usuario creado
    const newUser = {
      id: result.insertId,
      username,
      email,
      role: 'user'
    };

    // Registrar la sesión
    const sessionId = uuidv4();
    await query(
      'INSERT INTO sessions (id, user_id, ip_address, user_agent, expires) VALUES (?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 1 DAY))',
      [sessionId, newUser.id, req.ip, req.headers['user-agent']]
    );

    // Crear y enviar token
    createSendToken(newUser, 201, req, res);
  } catch (error) {
    console.error('Error en signup:', error);
    next(error);
  }
};

// Iniciar sesión
exports.login = async (req, res, next) => {
  try {
    // Validar datos de entrada
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        errors: errors.array()
      });
    }

    const email = xss(req.body.email.trim().toLowerCase());
    const password = req.body.password;


    // Verificar si el usuario existe
    const users = await query(
      'SELECT id, username, email, password, role FROM users WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      // Registrar intento fallido
      await query(
        'INSERT INTO login_attempts (ip_address, email, success) VALUES (?, ?, FALSE)',
        [req.ip, email]
      );

      return res.status(401).json({
        status: 'error',
        message: 'Email o contraseña incorrectos'
      });
    }

    const user = users[0];

    // Comprobar si la contraseña es correcta
    console.log("Password de la solicitud:", password);
    console.log("Password almacenado (hash):", user.password);
    console.log("Tipo de datos - password:", typeof password);
    console.log("Tipo de datos - user.password:", typeof user.password);
    console.log("Longitud - password:", password.length);
    console.log("Longitud - user.password:", user.password.length);
    // Prueba generando un nuevo hash con la misma contraseña
    const testHash = await bcrypt.hash(password, 10);
    console.log("Nuevo hash generado:", testHash);
    console.log("Prueba de comparación con nuevo hash:", await bcrypt.compare(password, testHash));

    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    console.log("Resultado de la comparación bcrypt:", isPasswordCorrect);
    if (!isPasswordCorrect) {
      // Registrar intento fallido
      await query(
        'INSERT INTO login_attempts (ip_address, email, success) VALUES (?, ?, FALSE)',
        [req.ip, email]
      );

      return res.status(401).json({
        status: 'error',
        message: 'Email o contraseña incorrectos'
      });
    }

    // Registrar inicio de sesión exitoso
    await query(
      'INSERT INTO login_attempts (ip_address, email, success) VALUES (?, ?, TRUE)',
      [req.ip, email]
    );

    // Registrar la sesión
    const sessionId = uuidv4();
    await query(
      'INSERT INTO sessions (id, user_id, ip_address, user_agent, expires) VALUES (?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 1 DAY))',
      [sessionId, user.id, req.ip, req.headers['user-agent']]
    );

    // Crear y enviar token
    createSendToken(user, 200, req, res);
  } catch (error) {
    console.error('Error en login:', error);
    next(error);
  }
};

// Cerrar sesión
exports.logout = async (req, res, next) => {
  try {
    // Invalidar token
    res.cookie('jwt', 'loggedout', {
      expires: new Date(Date.now() + 10 * 1000),
      httpOnly: true
    });

    // Invalidar sesión si existe un token JWT
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      const token = req.headers.authorization.split(' ')[1];
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        await query(
          'UPDATE sessions SET is_valid = FALSE WHERE user_id = ? AND ip_address = ?',
          [decoded.id, req.ip]
        );
      } catch (err) {
        // Si el token no es válido, ignorar el error
      }
    }

    res.status(200).json({ status: 'success' });
  } catch (error) {
    console.error('Error en logout:', error);
    next(error);
  }
};

// Obtener el usuario actual
exports.getMe = async (req, res, next) => {
  try {
    res.status(200).json({
      status: 'success',
      data: {
        user: req.user
      }
    });
  } catch (error) {
    console.error('Error en getMe:', error);
    next(error);
  }
};

// Middleware para proteger rutas
exports.protect = async (req, res, next) => {
  try {
    let token;
    
    // Obtener token de los headers o las cookies
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies.jwt) {
      token = req.cookies.jwt;
    }
    
    if (!token) {
      return res.status(401).json({
        status: 'error',
        message: 'No estás autorizado para acceder a esta ruta'
      });
    }
    
    // Verificar token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Comprobar si el usuario existe
    const users = await query(
      'SELECT id, username, email, role FROM users WHERE id = ?',
      [decoded.id]
    );
    
    if (users.length === 0) {
      return res.status(401).json({
        status: 'error',
        message: 'El usuario al que pertenece este token ya no existe'
      });
    }
    
    const user = users[0];
    
    // Verificar si la sesión es válida
    const sessions = await query(
      'SELECT id FROM sessions WHERE user_id = ? AND is_valid = TRUE AND expires > NOW()',
      [user.id]
    );
    
    if (sessions.length === 0) {
      return res.status(401).json({
        status: 'error',
        message: 'Tu sesión ha expirado. Por favor, inicia sesión de nuevo'
      });
    }
    
    // Agregar usuario a la solicitud
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        status: 'error',
        message: 'Token inválido. Por favor, inicia sesión de nuevo'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        status: 'error',
        message: 'Tu sesión ha expirado. Por favor, inicia sesión de nuevo'
      });
    }
    
    console.error('Error en protect middleware:', error);
    next(error);
  }
};

// Middleware para restringir acceso según el rol
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        status: 'error',
        message: 'No tienes permiso para realizar esta acción'
      });
    }
    next();
  };
};
