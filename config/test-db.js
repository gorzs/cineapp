const mysql = require('mysql2/promise');
require('dotenv').config();

(async () => {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: process.env.DB_PORT || 3306,
      ssl: {
        rejectUnauthorized: true
      }
    });

    console.log('✅ Conexión exitosa a PlanetScale');
    const [rows] = await connection.execute('SELECT 1 + 1 AS resultado');
    console.log('Resultado de prueba:', rows);

    await connection.end();
  } catch (error) {
    console.error('❌ Error en conexión:', error);
  }
})();
