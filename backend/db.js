import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';

const DB_JSON_PATH = path.resolve('data/database.json');

// Ensure parent data directory exists
const dbDir = path.dirname(DB_JSON_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Ensure database.json exists with initial structure
if (!fs.existsSync(DB_JSON_PATH)) {
  fs.writeFileSync(DB_JSON_PATH, JSON.stringify({ clientes: [], prestamos: [], configs: {} }, null, 2));
}

let isMongo = false;

// ----------------------------------------------------
// MongoDB Schema definition
// ----------------------------------------------------
const ClientSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  cedula: { type: String, required: true },
  phone: { type: String, required: true },
  notes: { type: String, default: '' }
}, { timestamps: true });

// Ensure compound unique index for cedula + userId in MongoDB
ClientSchema.index({ userId: 1, cedula: 1 }, { unique: true });

const LoanSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
  amount: { type: Number, required: true },
  type: { type: String, enum: ['semanal', 'mensual'], required: true },
  interestRate: { type: Number, required: true },
  interestAmount: { type: Number, required: true },
  totalAmount: { type: Number, required: true },
  remainingBalance: { type: Number, required: true },
  installmentsCount: { type: Number, required: true },
  status: { type: String, enum: ['pendiente', 'pagado'], default: 'pendiente' },
  installments: [{
    number: { type: Number, required: true },
    dueDate: { type: Date, required: true },
    amount: { type: Number, required: true },
    status: { type: String, enum: ['pendiente', 'pagado'], default: 'pendiente' },
    paymentDate: { type: Date }
  }]
}, { timestamps: true });

const ConfigSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true, index: true },
  nombre_app: { type: String, default: 'Prestamo Control' },
  logo: { type: String, default: '/assets/logo.png' },
  colores: {
    primary: { type: String, default: '#ff3b30' },
    background: { type: String, default: '#0a0a0c' },
    card: { type: String, default: '#16161a' },
    text: { type: String, default: '#ffffff' }
  },
  tasa_semanal: { type: Number, default: 20 },
  tasa_mensual_default: { type: Number, default: 15 },
  capital_inicial: { type: Number, default: 0 }
}, { timestamps: true });

let ClientModel;
let LoanModel;
let ConfigModel;

export async function initDB() {
  const mongoUri = process.env.MONGO_URI || '';
  if (mongoUri) {
    try {
      console.log('Intentando conectar a MongoDB...');
      await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 3000 });
      isMongo = true;
      ClientModel = mongoose.model('Client', ClientSchema);
      LoanModel = mongoose.model('Loan', LoanSchema);
      ConfigModel = mongoose.model('Config', ConfigSchema);
      console.log('¡Conexión a MongoDB establecida con éxito!');
      return;
    } catch (err) {
      console.warn('Fallo al conectar a MongoDB. Usando base de datos JSON local. Detalle:', err.message);
    }
  } else {
    console.log('No se especificó MONGO_URI. Usando base de datos JSON local.');
  }
  isMongo = false;
}

// ----------------------------------------------------
// Helper Functions for JSON DB
// ----------------------------------------------------
function readJsonDb() {
  try {
    const data = fs.readFileSync(DB_JSON_PATH, 'utf-8');
    const parsed = JSON.parse(data);
    if (!parsed.configs) parsed.configs = {};
    return parsed;
  } catch (err) {
    console.error('Error leyendo JSON DB:', err);
    return { clientes: [], prestamos: [], configs: {} };
  }
}

function writeJsonDb(data) {
  try {
    fs.writeFileSync(DB_JSON_PATH, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error escribiendo JSON DB:', err);
  }
}

// Generate unique ID for JSON items
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
}

// Helper: Calculate Client Risk Level
function computeRiskLevel(clientLoans) {
  if (!clientLoans || clientLoans.length === 0) return 'bueno';
  
  const now = new Date();
  let hasOverdue = false;
  let hasLatePayments = false;

  for (const loan of clientLoans) {
    for (const inst of loan.installments) {
      const dueDate = new Date(inst.dueDate);
      if (inst.status === 'pendiente' && dueDate < now) {
        hasOverdue = true;
      }
      if (inst.status === 'pagado' && inst.paymentDate) {
        const paymentDate = new Date(inst.paymentDate);
        if (paymentDate.getTime() - dueDate.getTime() > 3 * 24 * 60 * 60 * 1000) {
          hasLatePayments = true;
        }
      }
    }
  }

  if (hasOverdue) return 'moroso';
  if (hasLatePayments) return 'regular';
  return 'bueno';
}

// ----------------------------------------------------
// Core Database API with Multi-User isolation
// ----------------------------------------------------

const DEFAULT_CONFIG = {
  nombre_app: "Prestamo Control",
  logo: "/assets/logo.png",
  colores: { primary: "#ff3b30", background: "#0a0a0c", card: "#16161a", text: "#ffffff" },
  tasa_semanal: 20,
  tasa_mensual_default: 15,
  capital_inicial: 0
};

export async function getConfig(userId) {
  if (!userId) return DEFAULT_CONFIG;
  if (isMongo) {
    let conf = await ConfigModel.findOne({ userId }).lean();
    if (!conf) {
      conf = await ConfigModel.create({ userId, ...DEFAULT_CONFIG });
    }
    return {
      nombre_app: conf.nombre_app,
      logo: conf.logo,
      colores: conf.colores,
      tasa_semanal: conf.tasa_semanal,
      tasa_mensual_default: conf.tasa_mensual_default,
      capital_inicial: conf.capital_inicial || 0
    };
  } else {
    const db = readJsonDb();
    if (!db.configs[userId]) {
      db.configs[userId] = { ...DEFAULT_CONFIG, userId };
      writeJsonDb(db);
    }
    return db.configs[userId];
  }
}

export async function saveConfig(userId, config) {
  if (!userId) throw new Error('UserId is required');
  if (isMongo) {
    const updated = await ConfigModel.findOneAndUpdate(
      { userId },
      { $set: config },
      { new: true, upsert: true }
    ).lean();
    return updated;
  } else {
    const db = readJsonDb();
    db.configs[userId] = { ...db.configs[userId], ...config, userId };
    writeJsonDb(db);
    return db.configs[userId];
  }
}

export async function getClientes(userId) {
  if (!userId) return [];
  if (isMongo) {
    const mongoClients = await ClientModel.find({ userId }).lean();
    const clients = mongoClients.map(c => ({ id: c._id.toString(), ...c }));
    for (let client of clients) {
      const mongoLoans = await LoanModel.find({ client: client.id }).lean();
      client.riskLevel = computeRiskLevel(mongoLoans);
    }
    return clients;
  } else {
    const db = readJsonDb();
    const userClients = db.clientes.filter(c => c.userId === userId);
    return userClients.map(client => {
      const clientLoans = db.prestamos.filter(p => p.clientId === client.id);
      return {
        ...client,
        riskLevel: computeRiskLevel(clientLoans)
      };
    });
  }
}

export async function getClientByCedula(userId, cedula) {
  if (!userId) return null;
  const cleaned = cedula.replace(/[-\s]/g, '');
  if (isMongo) {
    const c = await ClientModel.findOne({ userId, cedula: cleaned }).lean();
    if (!c) return null;
    const client = { id: c._id.toString(), ...c };
    const loans = await LoanModel.find({ client: client.id }).lean();
    client.riskLevel = computeRiskLevel(loans);
    client.history = loans.map(l => ({ id: l._id.toString(), ...l }));
    return client;
  } else {
    const db = readJsonDb();
    const c = db.clientes.find(client => client.userId === userId && client.cedula.replace(/[-\s]/g, '') === cleaned);
    if (!c) return null;
    const loans = db.prestamos.filter(p => p.clientId === c.id);
    return {
      ...c,
      riskLevel: computeRiskLevel(loans),
      history: loans
    };
  }
}

export async function createClient(userId, clientData) {
  if (!userId) throw new Error('UserId is required');
  const cleanedCedula = clientData.cedula.replace(/[-\s]/g, '');
  
  // Check duplicate
  const existing = await getClientByCedula(userId, cleanedCedula);
  if (existing) {
    throw new Error('DUPLICATE_CEDULA');
  }

  if (isMongo) {
    const newClient = new ClientModel({
      userId,
      name: clientData.name,
      cedula: cleanedCedula,
      phone: clientData.phone,
      notes: clientData.notes || ''
    });
    const saved = await newClient.save();
    return { id: saved._id.toString(), name: saved.name, cedula: saved.cedula, phone: saved.phone, notes: saved.notes, riskLevel: 'bueno', history: [] };
  } else {
    const db = readJsonDb();
    const newClient = {
      id: generateId(),
      userId,
      name: clientData.name,
      cedula: cleanedCedula,
      phone: clientData.phone,
      notes: clientData.notes || ''
    };
    db.clientes.push(newClient);
    writeJsonDb(db);
    return { ...newClient, riskLevel: 'bueno', history: [] };
  }
}

export async function updateClientNotes(userId, id, notes) {
  if (!userId) throw new Error('UserId is required');
  if (isMongo) {
    const updated = await ClientModel.findOneAndUpdate({ _id: id, userId }, { notes }, { new: true }).lean();
    if (!updated) throw new Error('Client not found');
    return { id: updated._id.toString(), ...updated };
  } else {
    const db = readJsonDb();
    const idx = db.clientes.findIndex(c => c.id === id && c.userId === userId);
    if (idx === -1) throw new Error('Client not found');
    db.clientes[idx].notes = notes;
    writeJsonDb(db);
    return db.clientes[idx];
  }
}

export async function getPrestamos(userId) {
  if (!userId) return [];
  if (isMongo) {
    const mongoLoans = await LoanModel.find({ userId }).populate('client').lean();
    return mongoLoans.map(l => ({
      id: l._id.toString(),
      ...l,
      client: l.client ? { id: l.client._id.toString(), ...l.client } : null
    }));
  } else {
    const db = readJsonDb();
    const userLoans = db.prestamos.filter(p => p.userId === userId);
    return userLoans.map(loan => {
      const client = db.clientes.find(c => c.id === loan.clientId);
      return {
        ...loan,
        client: client || null
      };
    });
  }
}

export async function createLoan(userId, loanData) {
  if (!userId) throw new Error('UserId is required');
  const { clientId, amount, type, interestRate, installmentsCount } = loanData;
  
  // Calculations
  const interestAmount = amount * (interestRate / 100);
  const totalAmount = amount + interestAmount;
  const rawInstallmentAmount = totalAmount / installmentsCount;
  const installmentAmount = Math.round(rawInstallmentAmount * 100) / 100;

  // Generate Installment Schedule
  const installments = [];
  const now = new Date();
  
  for (let i = 1; i <= installmentsCount; i++) {
    const dueDate = new Date(now);
    if (type === 'semanal') {
      dueDate.setDate(now.getDate() + (i * 7));
    } else {
      dueDate.setMonth(now.getMonth() + i);
    }
    
    installments.push({
      number: i,
      dueDate: dueDate,
      amount: installmentAmount,
      status: 'pendiente',
      paymentDate: null
    });
  }

  // Adjust last installment if there is rounding residue
  const sumInstallments = installments.reduce((sum, inst) => sum + inst.amount, 0);
  const diff = totalAmount - sumInstallments;
  if (Math.abs(diff) > 0.01) {
    installments[installmentsCount - 1].amount = Math.round((installments[installmentsCount - 1].amount + diff) * 100) / 100;
  }

  if (isMongo) {
    const newLoan = new LoanModel({
      userId,
      client: clientId,
      amount,
      type,
      interestRate,
      interestAmount,
      totalAmount,
      remainingBalance: totalAmount,
      installmentsCount,
      status: 'pendiente',
      installments
    });
    const saved = await newLoan.save();
    const populated = await LoanModel.findById(saved._id).populate('client').lean();
    return { id: populated._id.toString(), ...populated, client: { id: populated.client._id.toString(), ...populated.client } };
  } else {
    const db = readJsonDb();
    const client = db.clientes.find(c => c.id === clientId && c.userId === userId);
    if (!client) throw new Error('Client not found');

    const newLoan = {
      id: generateId(),
      userId,
      clientId,
      amount,
      type,
      interestRate,
      interestAmount,
      totalAmount,
      remainingBalance: totalAmount,
      installmentsCount,
      status: 'pendiente',
      installments,
      createdAt: new Date().toISOString()
    };
    db.prestamos.push(newLoan);
    writeJsonDb(db);
    return { ...newLoan, client };
  }
}

export async function registerPayment(userId, paymentData) {
  if (!userId) throw new Error('UserId is required');
  const { loanId, installmentNumber, amountPaid } = paymentData;
  const now = new Date();

  if (isMongo) {
    const loanDoc = await LoanModel.findOne({ _id: loanId, userId });
    if (!loanDoc) throw new Error('Loan not found');

    const inst = loanDoc.installments.find(i => i.number === installmentNumber);
    if (!inst) throw new Error('Installment not found');

    if (inst.status === 'pagado') throw new Error('Installment already paid');

    inst.status = 'pagado';
    inst.paymentDate = now;
    
    // Update loan balance
    loanDoc.remainingBalance = Math.max(0, loanDoc.remainingBalance - inst.amount);
    if (loanDoc.remainingBalance === 0 || loanDoc.installments.every(i => i.status === 'pagado')) {
      loanDoc.status = 'pagado';
      loanDoc.remainingBalance = 0;
    }

    await loanDoc.save();
    const populated = await LoanModel.findById(loanId).populate('client').lean();
    
    return {
      loan: { id: populated._id.toString(), ...populated, client: { id: populated.client._id.toString(), ...populated.client } },
      paidInstallment: { number: inst.number, amount: inst.amount, dueDate: inst.dueDate }
    };
  } else {
    const db = readJsonDb();
    const loanIdx = db.prestamos.findIndex(p => p.id === loanId && p.userId === userId);
    if (loanIdx === -1) throw new Error('Loan not found');

    const loan = db.prestamos[loanIdx];
    const inst = loan.installments.find(i => i.number === installmentNumber);
    if (!inst) throw new Error('Installment not found');

    if (inst.status === 'pagado') throw new Error('Installment already paid');

    inst.status = 'pagado';
    inst.paymentDate = now.toISOString();

    loan.remainingBalance = Math.max(0, loan.remainingBalance - inst.amount);
    if (loan.remainingBalance === 0 || loan.installments.every(i => i.status === 'pagado')) {
      loan.status = 'pagado';
      loan.remainingBalance = 0;
    }

    db.prestamos[loanIdx] = loan;
    writeJsonDb(db);

    const client = db.clientes.find(c => c.id === loan.clientId);
    return {
      loan: { ...loan, client },
      paidInstallment: { number: inst.number, amount: inst.amount, dueDate: inst.dueDate }
    };
  }
}

export async function getDashboardData(userId) {
  if (!userId) return {};
  const config = await getConfig(userId);
  const clients = await getClientes(userId);
  const loans = await getPrestamos(userId);

  const capitalInicial = config.capital_inicial || 0;
  let totalPrestado = 0;
  let totalCobrado = 0;
  let gananciasInteres = 0;
  let gananciasEsperadas = 0; // Total interest expected from current active portfolio
  let clientesActivosSet = new Set();
  let clientesMorososSet = new Set();

  for (const loan of loans) {
    totalPrestado += loan.amount;
    
    const paidAmount = loan.totalAmount - loan.remainingBalance;
    totalCobrado += paidAmount;
    
    // Pro-rate interest gains: (paidAmount / totalAmount) * interestAmount
    if (loan.totalAmount > 0) {
      gananciasInteres += (paidAmount / loan.totalAmount) * loan.interestAmount;
    }

    if (loan.status === 'pendiente') {
      gananciasEsperadas += loan.interestAmount;
      if (loan.client) {
        clientesActivosSet.add(loan.client.id);
      }
    }
  }

  // Capital disponible = Capital Inicial + Total Cobrado - Total Prestado
  const capitalDisponible = capitalInicial + totalCobrado - totalPrestado;

  // Find delinquent clients (morosos)
  for (const client of clients) {
    if (client.riskLevel === 'moroso') {
      clientesMorososSet.add(client.id);
    }
  }

  return {
    totalPrestado: Math.round(totalPrestado * 100) / 100,
    totalCobrado: Math.round(totalCobrado * 100) / 100,
    gananciasInteres: Math.round(gananciasInteres * 100) / 100,
    gananciasEsperadas: Math.round(gananciasEsperadas * 100) / 100,
    capitalDisponible: Math.round(capitalDisponible * 100) / 100,
    clientesActivos: clientesActivosSet.size,
    clientesMorosos: clientesMorososSet.size
  };
}
