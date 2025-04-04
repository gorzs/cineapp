const { query } = require('../config/database');
const { validationResult } = require('express-validator');
const xss = require('xss');


// Obtener todas las películas
exports.getAllMovies = async (req, res, next) => {
  try {
    // Validar datos de entrada
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        errors: errors.array()
      });
    }

    // Parámetros para filtrado y paginación
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const offset = (page - 1) * limit;

    let whereClause = '';
    let queryParams = [];

    // Filtro por título
    if (req.query.title) {
      whereClause += ' AND m.title LIKE ?';
      queryParams.push(`%${req.query.title}%`);
    }

    // Filtro por director
    if (req.query.director) {
      whereClause += ' AND m.director LIKE ?';
      queryParams.push(`%${req.query.director}%`);
    }

    // Filtro por año
    if (req.query.year) {
      whereClause += ' AND m.year = ?';
      queryParams.push(req.query.year);
    }

    // Filtro por género
    if (req.query.genre) {
      whereClause += ' AND m.genre = ?';
      queryParams.push(req.query.genre);
    }

    // Obtener total de películas para paginación
    const totalMoviesResult = await query(
      `SELECT COUNT(*) as total FROM movies m WHERE 1=1 ${whereClause}`,
      queryParams
    );
    const totalMovies = totalMoviesResult[0].total;

    // Opciones de ordenamiento
    let orderClause = ' ORDER BY m.created_at DESC';
    if (req.query.sort) {
      const sortField = req.query.sort.replace('-', '');
      const sortDirection = req.query.sort.startsWith('-') ? 'DESC' : 'ASC';

      // Lista blanca de campos ordenables
      const allowedSortFields = ['title', 'director', 'year', 'rating', 'created_at'];

      if (allowedSortFields.includes(sortField)) {
        orderClause = ` ORDER BY m.${sortField} ${sortDirection}`;
      }
    }

    // Copiar los parámetros para la consulta principal
    const mainQueryParams = [...queryParams];

    // Añadir parámetros de paginación
    mainQueryParams.push(limit, offset);


// Consulta principal con parámetros manejados explícitamente
    const movies = await query(
        `SELECT m.*, u.username as creator_username
         FROM movies m
                JOIN users u ON m.user_id = u.id
         WHERE 1=1 ${whereClause}
               ${orderClause}
           LIMIT ${limit} OFFSET ${offset}`,
        queryParams
    );

    console.log('Películas recuperadas:', movies.length);
    console.log('Primera película (si existe):', movies[0] || 'No hay películas');

    res.status(200).json({
      status: 'success',
      results: movies.length,
      pagination: {
        page,
        limit,
        totalResults: totalMovies,
        totalPages: Math.ceil(totalMovies / limit)
      },
      data: {
        movies
      }
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
    
    // Validar que id sea un número
    if (isNaN(id)) {
      return res.status(400).json({
        status: 'error',
        message: 'ID de película inválido'
      });
    }
    
    // Consultar la película
    const movies = await query(
      `SELECT m.*, u.username as creator_username 
       FROM movies m 
       JOIN users u ON m.user_id = u.id 
       WHERE m.id = ?`,
      [id]
    );
    
    if (movies.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'No se encontró la película con el ID proporcionado'
      });
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        movie: movies[0]
      }
    });
  } catch (error) {
    console.error('Error en getMovie:', error);
    next(error);
  }
};

// Crear una nueva película
exports.createMovie = async (req, res, next) => {
  try {
    // Validar datos de entrada
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        errors: errors.array()
      });
    }
    
    const title = xss(req.body.title.trim());
    const director = xss(req.body.director.trim());
    const year = parseInt(req.body.year, 10);
    const genre = xss(req.body.genre.trim());
    const plot = req.body.plot ? xss(req.body.plot.trim()) : null;
    const poster_url = req.body.poster_url ? xss(req.body.poster_url.trim()) : null;
    const rating = parseFloat(req.body.rating || 0);


    
    // Insertar la nueva película
    const result = await query(
      `INSERT INTO movies 
       (title, director, year, genre, plot, poster_url, rating, user_id) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [title, director, year, genre, plot || null, poster_url || null, rating || 0, req.user.id]
    );
    
    // Obtener la película creada
    const newMovie = await query(
      `SELECT m.*, u.username as creator_username 
       FROM movies m 
       JOIN users u ON m.user_id = u.id 
       WHERE m.id = ?`,
      [result.insertId]
    );
    
    res.status(201).json({
      status: 'success',
      data: {
        movie: newMovie[0]
      }
    });
  } catch (error) {
    console.error('Error en createMovie:', error);
    next(error);
  }
};

// Actualizar una película
exports.updateMovie = async (req, res, next) => {
  try {
    // Validar datos de entrada
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        errors: errors.array()
      });
    }
    
    const { id } = req.params;
    
    // Validar que id sea un número
    if (isNaN(id)) {
      return res.status(400).json({
        status: 'error',
        message: 'ID de película inválido'
      });
    }
    
    // Verificar que la película existe y pertenece al usuario actual
    const existingMovies = await query(
      'SELECT * FROM movies WHERE id = ?',
      [id]
    );
    
    if (existingMovies.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'No se encontró la película con el ID proporcionado'
      });
    }
    
    const movie = existingMovies[0];
    
    // Solo el creador o un administrador puede actualizar la película
    if (movie.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        status: 'error',
        message: 'No tienes permiso para actualizar esta película'
      });
    }
    
    const title = xss(req.body.title.trim());
    const director = xss(req.body.director.trim());
    const year = parseInt(req.body.year, 10);
    const genre = xss(req.body.genre.trim());
    const plot = req.body.plot ? xss(req.body.plot.trim()) : null;
    const poster_url = req.body.poster_url ? xss(req.body.poster_url.trim()) : null;
    const rating = parseFloat(req.body.rating || 0);

    
    // Actualizar la película
    await query(
      `UPDATE movies 
       SET title = ?, director = ?, year = ?, genre = ?, 
           plot = ?, poster_url = ?, rating = ?, updated_at = NOW() 
       WHERE id = ?`,
      [
        title, 
        director, 
        year, 
        genre, 
        plot || null, 
        poster_url || null, 
        poster_url || null,
        rating || 0,
        id
      ]
    );
    
    // Obtener la película actualizada
    const updatedMovie = await query(
      `SELECT m.*, u.username as creator_username 
       FROM movies m 
       JOIN users u ON m.user_id = u.id 
       WHERE m.id = ?`,
      [id]
    );
    
    res.status(200).json({
      status: 'success',
      data: {
        movie: updatedMovie[0]
      }
    });
  } catch (error) {
    console.error('Error en updateMovie:', error);
    next(error);
  }
};

// Eliminar una película
exports.deleteMovie = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Validar que id sea un número
    if (isNaN(id)) {
      return res.status(400).json({
        status: 'error',
        message: 'ID de película inválido'
      });
    }
    
    // Verificar que la película existe y pertenece al usuario actual
    const existingMovies = await query(
      'SELECT * FROM movies WHERE id = ?',
      [id]
    );
    
    if (existingMovies.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'No se encontró la película con el ID proporcionado'
      });
    }
    
    const movie = existingMovies[0];
    
    // Solo el creador o un administrador puede eliminar la película
    if (movie.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        status: 'error',
        message: 'No tienes permiso para eliminar esta película'
      });
    }
    
    // Eliminar la película
    await query(
      'DELETE FROM movies WHERE id = ?',
      [id]
    );
    
    res.status(204).json({
      status: 'success',
      data: null
    });
  } catch (error) {
    console.error('Error en deleteMovie:', error);
    next(error);
  }
};