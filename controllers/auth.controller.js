const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/database');
const { validationResult } = require('express-validator');

// Eliminar etiquetas HTML y caracteres especiales
function stripHTML(input) {
  return input.replace(/<[^>]*>/g, '').replace(/[^a-zA-Z0-9@._-]/g, '').trim();
}

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN
  });
};

const createSendToken = (user, statusCode, req, res) => {
  const token = signToken(user.id);

  const cookieOptions = {
    expires: new Date(Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000),
    httpOnly: true,
    secure: req.secure || req.headers['x-forwarded-proto'] === 'https',
    sameSite: 'strict'
  };

  res.cookie('jwt', token, cookieOptions);
  user.password = undefined;

  res.status(statusCode).json({
    status: 'success',
    token,
    data: { user }
  });
};

exports.signup = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ status: 'error', errors: errors.array() });
    }

    const username = stripHTML(req.body.username);
    const email = stripHTML(req.body.email.toLowerCase());
    const password = req.body.password;

    const existingUser = await query('SELECT id FROM users WHERE email = ? OR username = ?', [email, username]);

    if (existingUser.length > 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Este email o nombre de usuario ya está registrado'
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const result = await query('INSERT INTO users (username, email, password) VALUES (?, ?, ?)', [username, email, hashedPassword]);

    const newUser = {
      id: result.insertId,
      username,
      email,
      role: 'user'
    };

    const sessionId = uuidv4();
    await query('INSERT INTO sessions (id, user_id, ip_address, user_agent, expires) VALUES (?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 1 DAY))', [sessionId, newUser.id, req.ip, req.headers['user-agent']]);

    createSendToken(newUser, 201, req, res);
  } catch (error) {
    console.error('Error en signup:', error);
    next(error);
  }
};

exports.login = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ status: 'error', errors: errors.array() });
    }

    const email = stripHTML(req.body.email.toLowerCase());
    const password = req.body.password;

    const users = await query('SELECT id, username, email, password, role FROM users WHERE email = ?', [email]);

    if (users.length === 0) {
      await query('INSERT INTO login_attempts (ip_address, email, success) VALUES (?, ?, FALSE)', [req.ip, email]);
      return res.status(401).json({ status: 'error', message: 'Email o contraseña incorrectos' });
    }

    const user = users[0];
    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect) {
      await query('INSERT INTO login_attempts (ip_address, email, success) VALUES (?, ?, FALSE)', [req.ip, email]);
      return res.status(401).json({ status: 'error', message: 'Email o contraseña incorrectos' });
    }

    await query('INSERT INTO login_attempts (ip_address, email, success) VALUES (?, ?, TRUE)', [req.ip, email]);

    const sessionId = uuidv4();
    await query('INSERT INTO sessions (id, user_id, ip_address, user_agent, expires) VALUES (?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 1 DAY))', [sessionId, user.id, req.ip, req.headers['user-agent']]);

    createSendToken(user, 200, req, res);
  } catch (error) {
    console.error('Error en login:', error);
    next(error);
  }
};

exports.logout = async (req, res, next) => {
  try {
    res.cookie('jwt', 'loggedout', {
      expires: new Date(Date.now() + 10 * 1000),
      httpOnly: true
    });

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      const token = req.headers.authorization.split(' ')[1];
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        await query('UPDATE sessions SET is_valid = FALSE WHERE user_id = ? AND ip_address = ?', [decoded.id, req.ip]);
      } catch (_) {}
    }

    res.status(200).json({ status: 'success' });
  } catch (error) {
    console.error('Error en logout:', error);
    next(error);
  }
};

exports.getMe = async (req, res, next) => {
  try {
    res.status(200).json({
      status: 'success',
      data: { user: req.user }
    });
  } catch (error) {
    console.error('Error en getMe:', error);
    next(error);
  }
};

exports.protect = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies.jwt) {
      token = req.cookies.jwt;
    }

    if (!token) {
      return res.status(401).json({ status: 'error', message: 'No estás autorizado para acceder a esta ruta' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const users = await query('SELECT id, username, email, role FROM users WHERE id = ?', [decoded.id]);

    if (users.length === 0) {
      return res.status(401).json({ status: 'error', message: 'El usuario al que pertenece este token ya no existe' });
    }

    const user = users[0];
    const sessions = await query('SELECT id FROM sessions WHERE user_id = ? AND is_valid = TRUE AND expires > NOW()', [user.id]);

    if (sessions.length === 0) {
      return res.status(401).json({ status: 'error', message: 'Tu sesión ha expirado. Por favor, inicia sesión de nuevo' });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ status: 'error', message: 'Token inválido o expirado. Inicia sesión de nuevo' });
    }

    console.error('Error en protect middleware:', error);
    next(error);
  }
};

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ status: 'error', message: 'No tienes permiso para realizar esta acción' });
    }
    next();
  };
};
