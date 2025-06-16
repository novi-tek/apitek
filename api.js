require('dotenv').config();

console.log('DB_SERVER:', process.env.DB_SERVER);
console.log('DB_NAME:', process.env.DB_NAME);
console.log('DB_USER:', process.env.DB_USER);
console.log('DB_PASS:', process.env.DB_PASS);
console.log('DB_PORT:', process.env.DB_PORT);
console.log('PORT:', process.env.PORT);

const express = require('express');
const cors = require('cors');
const sql = require('mssql');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());

// 🛑 Middleware global para desactivar caché
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
  next();
});

// Configuración SQL Server
const config = {
  server: process.env.DB_SERVER,
  database: process.env.DB_NAME,
  options: {
    trustServerCertificate: true,
    encrypt: false,
  },
  authentication: {
    type: 'default',
    options: {
      userName: process.env.DB_USER,
      password: process.env.DB_PASS
    }
  }
};

// Archivos estáticos
app.use(express.static(__dirname));

// Ruta HTML principal
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'page.html'));
});

// Endpoint insumos (ahora con grupos de la tabla real)
app.get('/insumos', async (req, res) => {
  try {
    await sql.connect(config);
    const result = await sql.query(`
      SELECT
        i.idinsumo      AS id_insumo,
        i.descripcion   AS nombre_insumo,
        a.nombre        AS almacen,
        ai.existencia   AS stock_actual,
        i.idgruposi,
        g.idgrupo,
        g.descripcion   AS grupo
      FROM acumuladoinsumos ai
      JOIN insumos i ON ai.idinsumo = i.idinsumo
      LEFT JOIN almacen a ON ai.idalmacen = a.idalmacen
      LEFT JOIN grupos g ON TRY_CAST(i.idgruposi AS INT) = TRY_CAST(g.idgrupo AS INT)
      WHERE ai.idalmacen = 3
      ORDER BY grupo, nombre_insumo;
    `);
    res.json(result.recordset);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno de servidor' });
  } finally {
    await sql.close();
  }
});

// Endpoint ventas (igual que antes)
app.get('/ventas', async (req, res) => {
  try {
    await sql.connect(config);
    const result = await sql.query(`
      SELECT TOP 100 
        ch.folio,
        ch.fecha,
        ch.total,
        cp.idformadepago
      FROM 
        cheques ch
      LEFT JOIN 
        chequespagos cp ON ch.folio = cp.folio
      ORDER BY 
        ch.fecha DESC;
    `);
    res.json(result.recordset);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno de servidor' });
  } finally {
    await sql.close();
  }
});

// Inicia servidor
app.listen(port, () => {
  console.log(`✅ API escuchando en: http://localhost:${port}`);
});
