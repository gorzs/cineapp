const express = require('express');
const router = express.Router();
const movieController = require('../controllers/movie.controller');
const authController = require('../controllers/auth.controller');
const { 
  validateMovie, 
  validateMovieUpdate, 
  validateId, 
  validateMovieFilters 
} = require('../middleware/validators');

// Proteger todas las rutas después de este middleware
router.use(authController.protect);

// Rutas para películas
router
  .route('/')
  .get(validateMovieFilters, movieController.getAllMovies)
  .post(validateMovie, movieController.createMovie);

router
  .route('/:id')
  .get(validateId, movieController.getMovie)
  .put(validateMovieUpdate, movieController.updateMovie)
  .delete(validateId, movieController.deleteMovie);

module.exports = router;