import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import {
  initDB,
  getClientByCedula,
  createClient,
  getClientes,
  updateClientNotes,
  createLoan,
  getPrestamos,
  registerPayment,
  getDashboardData,
  getConfig,
  saveConfig
} from './db.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS and JSON body parser (increased limit for base64 logos)
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Serve assets directory statically
const assetsPath = path.resolve('../assets');
app.use('/assets', express.static(assetsPath));

// Ensure assets folder exists
if (!fs.existsSync(assetsPath)) {
  fs.mkdirSync(assetsPath, { recursive: true });
}

// ----------------------------------------------------
// API Routes
// ----------------------------------------------------

// POST /api/login - Authenticate admin
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  
  // Default admin credentials (configurable via env)
  const adminUser = process.env.ADMIN_USER || 'admin';
  const adminPass = process.env.ADMIN_PASS || 'admin123';

  if (username === adminUser && password === adminPass) {
    return res.json({
      success: true,
      token: 'session_token_admin_' + Date.now(),
      user: { username: 'admin', role: 'admin' }
    });
  } else {
    return res.status(401).json({
      success: false,
      message: 'Usuario o contraseña incorrectos'
    });
  }
});

// GET /api/config - Retrieve application configuration
app.get('/api/config', async (req, res) => {
  try {
    const config = await getConfig();
    res.json(config);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener la configuración' });
  }
});

// PUT /api/config - Save configuration and optional logo upload
app.put('/api/config', async (req, res) => {
  try {
    const currentConfig = await getConfig();
    const { nombre_app, colores, tasa_semanal, tasa_mensual_default, logoBase64 } = req.body;

    let logoUrl = currentConfig.logo;

    if (logoBase64 && logoBase64.startsWith('data:image')) {
      // Extract file extension and base64 data
      const matches = logoBase64.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
      if (matches && matches.length === 3) {
        const ext = matches[1].split('/')[1] || 'png';
        const dataBuffer = Buffer.from(matches[2], 'base64');
        const fileName = `custom_logo_${Date.now()}.${ext}`;
        const filePath = path.join(assetsPath, fileName);

        // Delete old custom logos to clean up space
        const files = fs.readdirSync(assetsPath);
        for (const file of files) {
          if (file.startsWith('custom_logo_')) {
            try {
              fs.unlinkSync(path.join(assetsPath, file));
            } catch (e) {
              console.error('Error al borrar logo viejo:', e);
            }
          }
        }

        fs.writeFileSync(filePath, dataBuffer);
        logoUrl = `/assets/${fileName}`;
      }
    }

    const updatedConfig = {
      nombre_app: nombre_app || currentConfig.nombre_app,
      logo: logoUrl,
      colores: colores || currentConfig.colores,
      tasa_semanal: parseFloat(tasa_semanal) || currentConfig.tasa_semanal,
      tasa_mensual_default: parseFloat(tasa_mensual_default) || currentConfig.tasa_mensual_default
    };

    const saved = await saveConfig(updatedConfig);
    res.json(saved);
  } catch (err) {
    console.error('Error actualizando la configuración:', err);
    res.status(500).json({ error: 'Error al actualizar la configuración' });
  }
});

// GET /api/clientes - Get all clients
app.get('/api/clientes', async (req, res) => {
  try {
    const query = req.query.search;
    if (query) {
      const client = await getClientByCedula(query);
      return res.json(client ? [client] : []);
    }
    const clients = await getClientes();
    res.json(clients);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener los clientes' });
  }
});

// POST /api/clientes - Create dynamic client
app.post('/api/clientes', async (req, res) => {
  try {
    const { name, cedula, phone, notes } = req.body;
    if (!name || !cedula || !phone) {
      return res.status(400).json({ error: 'Todos los campos (nombre, cédula, teléfono) son requeridos' });
    }

    const client = await createClient({ name, cedula, phone, notes });
    res.status(201).json(client);
  } catch (err) {
    if (err.message === 'DUPLICATE_CEDULA') {
      const cleanedCedula = req.body.cedula.replace(/[-\s]/g, '');
      const existingClient = await getClientByCedula(cleanedCedula);
      return res.status(409).json({
        error: 'DUPLICATE_CEDULA',
        message: 'Ya existe un cliente registrado con esta cédula.',
        client: existingClient
      });
    }
    console.error('Error al crear cliente:', err);
    res.status(500).json({ error: 'Error al registrar el cliente' });
  }
});

// PUT /api/clientes/:id/notes - Update internal observations
app.put('/api/clientes/:id/notes', async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    const updated = await updateClientNotes(id, notes);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Error al actualizar las notas' });
  }
});

// GET /api/prestamos - Get loans list
app.get('/api/prestamos', async (req, res) => {
  try {
    const loans = await getPrestamos();
    res.json(loans);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener los préstamos' });
  }
});

// POST /api/prestamos - Create a loan
app.post('/api/prestamos', async (req, res) => {
  try {
    const { clientId, amount, type, interestRate, installmentsCount } = req.body;
    if (!clientId || !amount || !type || !interestRate || !installmentsCount) {
      return res.status(400).json({ error: 'Faltan parámetros requeridos para crear el préstamo' });
    }

    const loan = await createLoan({
      clientId,
      amount: parseFloat(amount),
      type,
      interestRate: parseFloat(interestRate),
      installmentsCount: parseInt(installmentsCount)
    });
    res.status(201).json(loan);
  } catch (err) {
    console.error('Error al crear préstamo:', err);
    res.status(500).json({ error: 'Error al crear el préstamo' });
  }
});

// POST /api/pagos - Register payment for an installment
app.post('/api/pagos', async (req, res) => {
  try {
    const { loanId, installmentNumber, amountPaid } = req.body;
    if (!loanId || !installmentNumber || !amountPaid) {
      return res.status(400).json({ error: 'Parámetros incompletos para procesar el pago' });
    }

    const paymentResult = await registerPayment({
      loanId,
      installmentNumber: parseInt(installmentNumber),
      amountPaid: parseFloat(amountPaid)
    });
    res.json(paymentResult);
  } catch (err) {
    console.error('Error al procesar pago:', err);
    res.status(500).json({ error: err.message || 'Error al procesar el pago' });
  }
});

// GET /api/dashboard - Get key metrics
app.get('/api/dashboard', async (req, res) => {
  try {
    const metrics = await getDashboardData();
    res.json(metrics);
  } catch (err) {
    console.error('Error cargando métricas:', err);
    res.status(500).json({ error: 'Error al cargar métricas del panel' });
  }
});

// ----------------------------------------------------
// DB Initialization and Startup
// ----------------------------------------------------
async function start() {
  await initDB();
  app.listen(PORT, () => {
    console.log(`=== PRESTAMO CONTROL BACKEND ===`);
    console.log(`Servidor activo en el puerto: ${PORT}`);
    console.log(`URL API: http://localhost:${PORT}`);
    console.log(`Servicio estático de assets: http://localhost:${PORT}/assets/logo.png`);
  });
}

start();
