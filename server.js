const app = require('./app');
const dotenv = require('dotenv');
const db = require('./config/database');

// Cargar variables de entorno
dotenv.config();

// Puerto
const PORT = process.env.PORT || 5000;

// Función para iniciar el servidor
const startServer = async () => {
  try {
    // Comprobar conexión a la base de datos
    const dbConnected = await db.testConnection();
    
    if (!dbConnected) {
      console.error('No se pudo conectar a la base de datos. El servidor no iniciará.');
      process.exit(1);
    }
    
    // Iniciar servidor
    app.listen(PORT, () => {
      console.log(`Servidor ejecutándose en el puerto ${PORT}`);
      console.log(`Modo: ${process.env.NODE_ENV}`);
    });
  } catch (error) {
    console.error('Error al iniciar el servidor:', error);
    process.exit(1);
  }
};

// Manejar rechazos de promesas no capturados
process.on('unhandledRejection', (err) => {
  console.error('ERROR NO CAPTURADO: ', err);
  // Cerrar servidor y salir
  process.exit(1);
});

// Iniciar el servidor
startServer();