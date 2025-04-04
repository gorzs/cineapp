const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { validateSignup, validateLogin } = require('../middleware/validators');

// Rutas de autenticación
router.post('/signup', validateSignup, authController.signup);
router.post('/login', validateLogin, authController.login);
router.get('/logout', authController.logout);

// Rutas protegidas
router.get(
  '/me', 
  authController.protect, 
  authController.getMe
);

module.exports = router;