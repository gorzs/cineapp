const { query } = require('../config/database');
const { validationResult } = require('express-validator');
const xss = require('xss');

// Función para eliminar etiquetas HTML por completo
const he = require('he'); // Asegúrate de instalar esto: npm install he

const he = require('he');

const sanitizeInput = (input = '') => {
  if (typeof input !== 'string') return '';

  // Primero decodifica las entidades HTML como &lt;script&gt;
  input = he.decode(input);

  // Elimina etiquetas como <script>...</script> y <style>...</style>
  input = input.replace(/<script.*?>.*?<\/script>/gis, '');
  input = input.replace(/<style.*?>.*?<\/style>/gis, '');

  // Elimina cualquier otra etiqueta HTML como <b>, <i>, etc.
  input = input.replace(/<\/?[^>]+(>|$)/g, '');

  return input.trim();
};



// Obtener todas las películas
exports.getAllMovies = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ status: 'error', errors: errors.array() });
    }

    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const offset = (page - 1) * limit;

    let whereClause = '';
    let queryParams = [];

    if (req.query.title) {
      whereClause += ' AND m.title LIKE ?';
      queryParams.push(`%${req.query.title}%`);
    }

    if (req.query.director) {
      whereClause += ' AND m.director LIKE ?';
      queryParams.push(`%${req.query.director}%`);
    }

    if (req.query.year) {
      whereClause += ' AND m.year = ?';
      queryParams.push(req.query.year);
    }

    if (req.query.genre) {
      whereClause += ' AND m.genre = ?';
      queryParams.push(req.query.genre);
    }

    const totalMoviesResult = await query(
      `SELECT COUNT(*) as total FROM movies m WHERE 1=1 ${whereClause}`,
      queryParams
    );
    const totalMovies = totalMoviesResult[0].total;

    let orderClause = ' ORDER BY m.created_at DESC';
    if (req.query.sort) {
      const sortField = req.query.sort.replace('-', '');
      const sortDirection = req.query.sort.startsWith('-') ? 'DESC' : 'ASC';
      const allowedSortFields = ['title', 'director', 'year', 'rating', 'created_at'];

      if (allowedSortFields.includes(sortField)) {
        orderClause = ` ORDER BY m.${sortField} ${sortDirection}`;
      }
    }

    const mainQueryParams = [...queryParams, limit, offset];

    const movies = await query(
      `SELECT m.*, u.username as creator_username
       FROM movies m
       JOIN users u ON m.user_id = u.id
       WHERE 1=1 ${whereClause}
       ${orderClause}
       LIMIT ? OFFSET ?`,
      mainQueryParams
    );

    res.status(200).json({
      status: 'success',
      results: movies.length,
      pagination: {
        page,
        limit,
        totalResults: totalMovies,
        totalPages: Math.ceil(totalMovies / limit)
      },
      data: { movies }
    });
  } catch (error) {
    console.error('Error en getAllMovies:', error);
    next(error);
  }
};

// Obtener una película por ID
exports.getMovie = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (isNaN(id)) {
      return res.status(400).json({ status: 'error', message: 'ID de película inválido' });
    }

    const movies = await query(
      `SELECT m.*, u.username as creator_username FROM movies m JOIN users u ON m.user_id = u.id WHERE m.id = ?`,
      [id]
    );

    if (movies.length === 0) {
      return res.status(404).json({ status: 'error', message: 'No se encontró la película' });
    }

    res.status(200).json({ status: 'success', data: { movie: movies[0] } });
  } catch (error) {
    console.error('Error en getMovie:', error);
    next(error);
  }
};

// Crear una nueva película
exports.createMovie = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ status: 'error', errors: errors.array() });
    }

    const title = sanitizeInput(req.body.title);
    const director = sanitizeInput(req.body.director);
    const year = parseInt(req.body.year, 10);
    const genre = sanitizeInput(req.body.genre);
    const plot = req.body.plot ? sanitizeInput(req.body.plot) : null;
    const poster_url = req.body.poster_url ? sanitizeInput(req.body.poster_url) : null;
    const rating = parseFloat(req.body.rating || 0);

    const result = await query(
      `INSERT INTO movies (title, director, year, genre, plot, poster_url, rating, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [title, director, year, genre, plot, poster_url, rating, req.user.id]
    );

    const newMovie = await query(
      `SELECT m.*, u.username as creator_username FROM movies m JOIN users u ON m.user_id = u.id WHERE m.id = ?`,
      [result.insertId]
    );

    res.status(201).json({ status: 'success', data: { movie: newMovie[0] } });
  } catch (error) {
    console.error('Error en createMovie:', error);
    next(error);
  }
};

// Actualizar una película
exports.updateMovie = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ status: 'error', errors: errors.array() });
    }

    const { id } = req.params;
    if (isNaN(id)) {
      return res.status(400).json({ status: 'error', message: 'ID inválido' });
    }

    const existing = await query('SELECT * FROM movies WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Película no encontrada' });
    }

    const movie = existing[0];
    if (movie.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ status: 'error', message: 'Sin permisos para actualizar' });
    }

    const title = sanitizeInput(req.body.title);
    const director = sanitizeInput(req.body.director);
    const year = parseInt(req.body.year, 10);
    const genre = sanitizeInput(req.body.genre);
    const plot = req.body.plot ? sanitizeInput(req.body.plot) : null;
    const poster_url = req.body.poster_url ? sanitizeInput(req.body.poster_url) : null;
    const rating = parseFloat(req.body.rating || 0);

    await query(
      `UPDATE movies SET title = ?, director = ?, year = ?, genre = ?, plot = ?, poster_url = ?, rating = ?, updated_at = NOW() WHERE id = ?`,
      [title, director, year, genre, plot, poster_url, rating, id]
    );

    await query(`UPDATE movies SET poster_url = REPLACE(poster_url, '&#x2F;', '/') WHERE poster_url LIKE '%&#x2F;%'`);


    const updatedMovie = await query(
      `SELECT m.*, u.username as creator_username FROM movies m JOIN users u ON m.user_id = u.id WHERE m.id = ?`,
      [id]
    );

    res.status(200).json({ status: 'success', data: { movie: updatedMovie[0] } });
  } catch (error) {
    console.error('Error en updateMovie:', error);
    next(error);
  }
};

// Eliminar una película
exports.deleteMovie = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (isNaN(id)) {
      return res.status(400).json({ status: 'error', message: 'ID inválido' });
    }

    const existing = await query('SELECT * FROM movies WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Película no encontrada' });
    }

    const movie = existing[0];
    if (movie.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ status: 'error', message: 'Sin permisos para eliminar' });
    }

    await query('DELETE FROM movies WHERE id = ?', [id]);
    res.status(204).json({ status: 'success', data: null });
  } catch (error) {
    console.error('Error en deleteMovie:', error);
    next(error);
  }
};
