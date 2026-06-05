import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';

const DB_JSON_PATH = path.resolve('data/database.json');
const CONFIG_JSON_PATH = path.resolve('data/config.json');

// Ensure database.json exists with initial structure
if (!fs.existsSync(DB_JSON_PATH)) {
  fs.writeFileSync(DB_JSON_PATH, JSON.stringify({ clientes: [], prestamos: [] }, null, 2));
}

let isMongo = false;

// ----------------------------------------------------
// MongoDB Schema definition
// ----------------------------------------------------
const ClientSchema = new mongoose.Schema({
  name: { type: String, required: true },
  cedula: { type: String, required: true, unique: true },
  phone: { type: String, required: true },
  notes: { type: String, default: '' }
}, { timestamps: true });

const LoanSchema = new mongoose.Schema({
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

let ClientModel;
let LoanModel;

export async function initDB() {
  const mongoUri = process.env.MONGO_URI || '';
  if (mongoUri) {
    try {
      console.log('Intentando conectar a MongoDB...');
      await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 3000 });
      isMongo = true;
      ClientModel = mongoose.model('Client', ClientSchema);
      LoanModel = mongoose.model('Loan', LoanSchema);
      console.log('¡Conexión a MongoDB establecida con éxito!');
      return;
    } catch (err) {
      console.warn('Fallo al conectar a MongoDB. Usando base de datos JSON local como fallback. Detalle:', err.message);
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
    return JSON.parse(data);
  } catch (err) {
    console.error('Error leyendo JSON DB:', err);
    return { clientes: [], prestamos: [] };
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
// - Buen cliente: paga a tiempo (sin cuotas vencidas y no tiene historial de moras en préstamos activos)
// - Regular: se atrasa ocasionalmente (tiene o tuvo cuotas pagadas tarde pero no vencidas actualmente, o préstamos pasados con problemas)
// - Moroso: tiene cuotas vencidas (estado "pendiente" y dueDate en el pasado)
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
        // If payment was made more than 3 days after due date, count as late
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
// Core Database API
// ----------------------------------------------------

export async function getConfig() {
  try {
    const configData = fs.readFileSync(CONFIG_JSON_PATH, 'utf-8');
    return JSON.parse(configData);
  } catch (err) {
    console.error('Error leyendo config.json:', err);
    return {
      nombre_app: "Prestamo Control",
      logo: "/assets/logo.png",
      colores: { primary: "#ff3b30", background: "#000000", card: "#1c1c1e", text: "#ffffff" },
      tasa_semanal: 20,
      tasa_mensual_default: 15
    };
  }
}

export async function saveConfig(config) {
  try {
    fs.writeFileSync(CONFIG_JSON_PATH, JSON.stringify(config, null, 2));
    return config;
  } catch (err) {
    console.error('Error escribiendo config.json:', err);
    throw err;
  }
}

export async function getClientes() {
  if (isMongo) {
    const mongoClients = await ClientModel.find().lean();
    const clients = mongoClients.map(c => ({ id: c._id.toString(), ...c }));
    // Add risk level dynamically
    for (let client of clients) {
      const mongoLoans = await LoanModel.find({ client: client.id }).lean();
      client.riskLevel = computeRiskLevel(mongoLoans);
    }
    return clients;
  } else {
    const db = readJsonDb();
    return db.clientes.map(client => {
      const clientLoans = db.prestamos.filter(p => p.clientId === client.id);
      return {
        ...client,
        riskLevel: computeRiskLevel(clientLoans)
      };
    });
  }
}

export async function getClientByCedula(cedula) {
  const cleaned = cedula.replace(/[-\s]/g, '');
  if (isMongo) {
    const c = await ClientModel.findOne({ cedula: cleaned }).lean();
    if (!c) return null;
    const client = { id: c._id.toString(), ...c };
    const loans = await LoanModel.find({ client: client.id }).lean();
    client.riskLevel = computeRiskLevel(loans);
    client.history = loans.map(l => ({ id: l._id.toString(), ...l }));
    return client;
  } else {
    const db = readJsonDb();
    const c = db.clientes.find(client => client.cedula.replace(/[-\s]/g, '') === cleaned);
    if (!c) return null;
    const loans = db.prestamos.filter(p => p.clientId === c.id);
    return {
      ...c,
      riskLevel: computeRiskLevel(loans),
      history: loans
    };
  }
}

export async function createClient(clientData) {
  const cleanedCedula = clientData.cedula.replace(/[-\s]/g, '');
  
  // Check duplicate
  const existing = await getClientByCedula(cleanedCedula);
  if (existing) {
    throw new Error('DUPLICATE_CEDULA');
  }

  if (isMongo) {
    const newClient = new ClientModel({
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

export async function updateClientNotes(id, notes) {
  if (isMongo) {
    const updated = await ClientModel.findByIdAndUpdate(id, { notes }, { new: true }).lean();
    if (!updated) throw new Error('Client not found');
    return { id: updated._id.toString(), ...updated };
  } else {
    const db = readJsonDb();
    const idx = db.clientes.findIndex(c => c.id === id);
    if (idx === -1) throw new Error('Client not found');
    db.clientes[idx].notes = notes;
    writeJsonDb(db);
    return db.clientes[idx];
  }
}

export async function getPrestamos() {
  if (isMongo) {
    const mongoLoans = await LoanModel.find().populate('client').lean();
    return mongoLoans.map(l => ({
      id: l._id.toString(),
      ...l,
      client: l.client ? { id: l.client._id.toString(), ...l.client } : null
    }));
  } else {
    const db = readJsonDb();
    return db.prestamos.map(loan => {
      const client = db.clientes.find(c => c.id === loan.clientId);
      return {
        ...loan,
        client: client || null
      };
    });
  }
}

export async function createLoan(loanData) {
  const { clientId, amount, type, interestRate, installmentsCount } = loanData;
  
  // Calculations
  const interestAmount = amount * (interestRate / 100);
  const totalAmount = amount + interestAmount;
  const rawInstallmentAmount = totalAmount / installmentsCount;
  const installmentAmount = Math.round(rawInstallmentAmount * 100) / 100; // Round to 2 decimals

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
    // Populate client
    const populated = await LoanModel.findById(saved._id).populate('client').lean();
    return { id: populated._id.toString(), ...populated, client: { id: populated.client._id.toString(), ...populated.client } };
  } else {
    const db = readJsonDb();
    const client = db.clientes.find(c => c.id === clientId);
    if (!client) throw new Error('Client not found');

    const newLoan = {
      id: generateId(),
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

export async function registerPayment(paymentData) {
  const { loanId, installmentNumber, amountPaid } = paymentData;
  const now = new Date();

  if (isMongo) {
    const loanDoc = await LoanModel.findById(loanId);
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
    const loanIdx = db.prestamos.findIndex(p => p.id === loanId);
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

export async function getDashboardData() {
  const clients = await getClientes();
  const loans = await getPrestamos();

  let totalPrestado = 0;
  let totalCobrado = 0;
  let gananciasInteres = 0;
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
      if (loan.client) {
        clientesActivosSet.add(loan.client.id);
      }
    }
  }

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
    clientesActivos: clientesActivosSet.size,
    clientesMorosos: clientesMorososSet.size
  };
}
