const { query } = require('../config/database');
const { validationResult } = require('express-validator');
const xss = require('xss');

// Función para eliminar etiquetas HTML por completo
const stripHtmlTags = (input = '') => {
  if (typeof input !== 'string') return '';
  return xss(input.replace(/<[^>]*>/g, '')).trim();
};


// Crear una nueva película
exports.createMovie = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ status: 'error', errors: errors.array() });
    }

    const title = stripHtmlTags(req.body.title);
    const director = stripHtmlTags(req.body.director);
    const year = parseInt(req.body.year, 10);
    const genre = stripHtmlTags(req.body.genre);
    const plot = req.body.plot ? stripHtmlTags(req.body.plot) : null;
    const poster_url = req.body.poster_url ? stripHtmlTags(req.body.poster_url) : null;
    const rating = parseFloat(req.body.rating || 0);

    const result = await query(
      `INSERT INTO movies (title, director, year, genre, plot, poster_url, rating, user_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [title, director, year, genre, plot, poster_url, rating, req.user.id]
    );

    const newMovie = await query(
      `SELECT m.*, u.username as creator_username
       FROM movies m
       JOIN users u ON m.user_id = u.id
       WHERE m.id = ?`,
      [result.insertId]
    );

    res.status(201).json({ status: 'success', data: { movie: newMovie[0] } });
  } catch (error) {
    console.error('Error en createMovie:', error);
    next(error);
  }
};

// Actualizar película
exports.updateMovie = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ status: 'error', errors: errors.array() });
    }

    const { id } = req.params;
    if (isNaN(id)) {
      return res.status(400).json({ status: 'error', message: 'ID de película inválido' });
    }

    const existing = await query('SELECT * FROM movies WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Película no encontrada' });
    }

    const movie = existing[0];
    if (movie.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ status: 'error', message: 'Sin permisos para actualizar esta película' });
    }

    const title = stripHtmlTags(req.body.title);
    const director = stripHtmlTags(req.body.director);
    const year = parseInt(req.body.year, 10);
    const genre = stripHtmlTags(req.body.genre);
    const plot = req.body.plot ? stripHtmlTags(req.body.plot) : null;
    const poster_url = req.body.poster_url ? stripHtmlTags(req.body.poster_url) : null;
    const rating = parseFloat(req.body.rating || 0);

    await query(
      `UPDATE movies SET title = ?, director = ?, year = ?, genre = ?, plot = ?, poster_url = ?, rating = ?, updated_at = NOW() WHERE id = ?`,
      [title, director, year, genre, plot, poster_url, rating, id]
    );

    const updatedMovie = await query(
      `SELECT m.*, u.username as creator_username
       FROM movies m
       JOIN users u ON m.user_id = u.id
       WHERE m.id = ?`,
      [id]
    );

    res.status(200).json({ status: 'success', data: { movie: updatedMovie[0] } });
  } catch (error) {
    console.error('Error en updateMovie:', error);
    next(error);
  }
};
