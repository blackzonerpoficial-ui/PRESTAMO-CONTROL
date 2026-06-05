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
  saveConfig,
  getCedulaReport
} from './db.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

const assetsPath = path.resolve('../assets');
app.use('/assets', express.static(assetsPath));

if (!fs.existsSync(assetsPath)) {
  fs.mkdirSync(assetsPath, { recursive: true });
}

// ----------------------------------------------------
// Authentication Middleware
// ----------------------------------------------------
async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Acceso denegado. Token no proporcionado.' });
  }

  const token = authHeader.split(' ')[1];

  // Support local developer session (admin/admin123)
  if (token.startsWith('session_token_admin_') || token.startsWith('mock_admin_')) {
    req.userId = 'mock_admin_user_id';
    req.userEmail = 'admin@prestamocontrol.local';
    return next();
  }

  try {
    // Verify Google ID Token
    const googleRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${token}`);
    if (!googleRes.ok) {
      return res.status(401).json({ error: 'Sesión expirada o token de Google inválido.' });
    }
    const payload = await googleRes.json();
    req.userId = payload.sub; // Unique Google User ID
    req.userEmail = payload.email;
    next();
  } catch (err) {
    console.error('Error en authMiddleware:', err);
    return res.status(500).json({ error: 'Error del servidor en autenticación' });
  }
}

// ----------------------------------------------------
// API Routes
// ----------------------------------------------------

// POST /api/login - Local developer login (useful for testing without Google Config)
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const adminUser = process.env.ADMIN_USER || 'admin';
  const adminPass = process.env.ADMIN_PASS || 'admin123';

  if (username === adminUser && password === adminPass) {
    return res.json({
      success: true,
      token: 'session_token_admin_' + Date.now(),
      user: {
        id: 'mock_admin_user_id',
        email: 'admin@prestamocontrol.local',
        name: 'Administrador Local',
        picture: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'
      }
    });
  } else {
    return res.status(401).json({
      success: false,
      message: 'Usuario o contraseña incorrectos'
    });
  }
});

// POST /api/auth/google - Authenticate Google Account
app.post('/api/auth/google', async (req, res) => {
  const { idToken } = req.body;
  if (!idToken) {
    return res.status(400).json({ error: 'El Token de Google es requerido' });
  }

  try {
    const googleRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`);
    if (!googleRes.ok) {
      return res.status(401).json({ error: 'Token de Google inválido o expirado' });
    }

    const payload = await googleRes.json();
    
    res.json({
      success: true,
      token: idToken,
      user: {
        id: payload.sub,
        email: payload.email,
        name: payload.name,
        picture: payload.picture
      }
    });
  } catch (err) {
    console.error('Error verificando Google Token:', err);
    res.status(500).json({ error: 'Error interno verificando la cuenta de Google' });
  }
});

// Apply authentication middleware to all resources
app.use('/api/config', authMiddleware);
app.use('/api/clientes', authMiddleware);
app.use('/api/prestamos', authMiddleware);
app.use('/api/pagos', authMiddleware);
app.use('/api/dashboard', authMiddleware);
app.use('/api/buro', authMiddleware);

// GET /api/buro/:cedula — Buró de crédito interno anónimo
// Retorna el historial de comportamiento de pago de una cédula
// a través de TODOS los usuarios del sistema, sin revelar quién prestó ni montos.
app.get('/api/buro/:cedula', async (req, res) => {
  try {
    const { cedula } = req.params;
    if (!cedula || cedula.length < 5) {
      return res.status(400).json({ error: 'Cédula inválida' });
    }
    const report = await getCedulaReport(cedula);
    res.json(report);
  } catch (err) {
    console.error('Error en consulta de buró:', err);
    res.status(500).json({ error: 'Error al consultar el buró de crédito' });
  }
});

// GET /api/config
app.get('/api/config', async (req, res) => {
  try {
    const config = await getConfig(req.userId);
    res.json(config);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener la configuración' });
  }
});

// PUT /api/config
app.put('/api/config', async (req, res) => {
  try {
    const currentConfig = await getConfig(req.userId);
    const { nombre_app, colores, tasa_semanal, tasa_mensual_default, capital_inicial, logoBase64 } = req.body;

    let logoUrl = currentConfig.logo;

    if (logoBase64 && logoBase64.startsWith('data:image')) {
      const matches = logoBase64.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
      if (matches && matches.length === 3) {
        const ext = matches[1].split('/')[1] || 'png';
        const dataBuffer = Buffer.from(matches[2], 'base64');
        const fileName = `logo_${req.userId}_${Date.now()}.${ext}`;
        const filePath = path.join(assetsPath, fileName);

        // Delete old user logos to clean up space
        const files = fs.readdirSync(assetsPath);
        for (const file of files) {
          if (file.startsWith(`logo_${req.userId}_`)) {
            try {
              fs.unlinkSync(path.join(assetsPath, file));
            } catch (e) {
              console.error('Error al borrar logo anterior:', e);
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
      tasa_mensual_default: parseFloat(tasa_mensual_default) || currentConfig.tasa_mensual_default,
      capital_inicial: parseFloat(capital_inicial) || 0
    };

    const saved = await saveConfig(req.userId, updatedConfig);
    res.json(saved);
  } catch (err) {
    console.error('Error actualizando la configuración:', err);
    res.status(500).json({ error: 'Error al actualizar la configuración' });
  }
});

// GET /api/clientes
app.get('/api/clientes', async (req, res) => {
  try {
    const query = req.query.search;
    if (query) {
      const client = await getClientByCedula(req.userId, query);
      return res.json(client ? [client] : []);
    }
    const clients = await getClientes(req.userId);
    res.json(clients);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener los clientes' });
  }
});

// POST /api/clientes
app.post('/api/clientes', async (req, res) => {
  try {
    const { name, cedula, phone, notes } = req.body;
    if (!name || !cedula || !phone) {
      return res.status(400).json({ error: 'Todos los campos son requeridos' });
    }

    const client = await createClient(req.userId, { name, cedula, phone, notes });
    res.status(201).json(client);
  } catch (err) {
    if (err.message === 'DUPLICATE_CEDULA') {
      const cleanedCedula = req.body.cedula.replace(/[-\s]/g, '');
      const existingClient = await getClientByCedula(req.userId, cleanedCedula);
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

// PUT /api/clientes/:id/notes
app.put('/api/clientes/:id/notes', async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    const updated = await updateClientNotes(req.userId, id, notes);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Error al actualizar las notas' });
  }
});

// GET /api/prestamos
app.get('/api/prestamos', async (req, res) => {
  try {
    const loans = await getPrestamos(req.userId);
    res.json(loans);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener los préstamos' });
  }
});

// POST /api/prestamos
app.post('/api/prestamos', async (req, res) => {
  try {
    const { clientId, amount, type, interestRate, installmentsCount } = req.body;
    if (!clientId || !amount || !type || !interestRate || !installmentsCount) {
      return res.status(400).json({ error: 'Faltan parámetros requeridos para crear el préstamo' });
    }

    const loan = await createLoan(req.userId, {
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

// POST /api/pagos
app.post('/api/pagos', async (req, res) => {
  try {
    const { loanId, installmentNumber, amountPaid } = req.body;
    if (!loanId || !installmentNumber || !amountPaid) {
      return res.status(400).json({ error: 'Parámetros incompletos' });
    }

    const paymentResult = await registerPayment(req.userId, {
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

// GET /api/dashboard
app.get('/api/dashboard', async (req, res) => {
  try {
    const metrics = await getDashboardData(req.userId);
    res.json(metrics);
  } catch (err) {
    console.error('Error cargando métricas:', err);
    res.status(500).json({ error: 'Error al cargar métricas del panel' });
  }
});

async function start() {
  await initDB();
  app.listen(PORT, () => {
    console.log(`=== PRESTAMO CONTROL BACKEND (MULTI-USER) ===`);
    console.log(`Servidor activo en el puerto: ${PORT}`);
    console.log(`URL API: http://localhost:${PORT}`);
  });
}

start();
