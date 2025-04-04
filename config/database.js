const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

// Crear pool de conexiones para mejor rendimiento
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: '+00:00',
  charset: 'utf8mb4'
});

// Verificar conexión a la base de datos
const testConnection = async () => {
  try {
    const connection = await pool.getConnection();
    console.log('Conexión a MySQL establecida correctamente');
    connection.release();
    return true;
  } catch (error) {
    console.error('Error al conectar a MySQL:', error.message);
    return false;
  }
};

// Función de utilidad para ejecutar consultas
const query = async (sql, params) => {
  try {
    console.error('Consulta:', sql);
    console.error('Parámetros:', params);
    const [rows] = await pool.execute(sql, params);
    return rows;
  } catch (error) {
    console.error('Error en la consulta SQL:', error.message);
    console.error('Consulta:', sql);
    console.error('Parámetros:', params);
    throw error;
  }
};

module.exports = {
  pool,
  query,
  testConnection
};