import React, { useState, useEffect, useRef } from 'react';
import html2canvas from 'html2canvas';
import {
  LayoutDashboard,
  Users,
  HandCoins,
  Settings,
  Search,
  Plus,
  Phone,
  User,
  FileText,
  CheckCircle2,
  Clock,
  ArrowLeft,
  AlertTriangle,
  Download,
  Printer,
  Send,
  Sparkles,
  LogOut,
  Calendar,
  CreditCard
} from 'lucide-react';

export default function App() {
  // Authentication & Branding State
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [config, setConfig] = useState({
    nombre_app: 'Prestamo Control',
    logo: '/assets/logo.png',
    colores: { primary: '#ff3b30', background: '#0a0a0c', card: '#16161a', text: '#ffffff' },
    tasa_semanal: 20,
    tasa_mensual_default: 15
  });

  // Navigation
  const [currentView, setCurrentView] = useState('dashboard'); // 'dashboard', 'clientes', 'prestamos', 'configuracion'

  // Application State
  const [clients, setClients] = useState([]);
  const [loans, setLoans] = useState([]);
  const [dashboardStats, setDashboardStats] = useState({
    totalPrestado: 0,
    totalCobrado: 0,
    gananciasInteres: 0,
    clientesActivos: 0,
    clientesMorosos: 0
  });

  // UI / Search & Forms State
  const [searchCedula, setSearchCedula] = useState('');
  const [selectedClient, setSelectedClient] = useState(null);
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [activeReceipt, setActiveReceipt] = useState(null);

  // Form inputs
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // New Client Form
  const [newClientName, setNewClientName] = useState('');
  const [newClientCedula, setNewClientCedula] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [newClientNotes, setNewClientNotes] = useState('');
  const [clientFormError, setClientFormError] = useState('');
  const [clientFormSuccess, setClientFormSuccess] = useState('');
  const [showAddClientModal, setShowAddClientModal] = useState(false);

  // New Loan Form
  const [loanClientId, setLoanClientId] = useState('');
  const [loanAmount, setLoanAmount] = useState('');
  const [loanType, setLoanType] = useState('semanal'); // 'semanal', 'mensual'
  const [loanDuration, setLoanDuration] = useState('4'); // weeks: 4,6,8,12; months: 1,2,3
  const [loanInterestRate, setLoanInterestRate] = useState(20);
  const [loanFormError, setLoanFormError] = useState('');
  const [loanFormSuccess, setLoanFormSuccess] = useState('');
  const [showAddLoanModal, setShowAddLoanModal] = useState(false);

  // Config Form
  const [configAppName, setConfigAppName] = useState('');
  const [configPrimaryColor, setConfigPrimaryColor] = useState('');
  const [configWeeklyRate, setConfigWeeklyRate] = useState('');
  const [configMonthlyRate, setConfigMonthlyRate] = useState('');
  const [configLogoFile, setConfigLogoFile] = useState(null);
  const [configSuccess, setConfigSuccess] = useState('');

  // Client Details notes update
  const [editingNotes, setEditingNotes] = useState('');

  // Ref for receipt PNG capturing
  const receiptRef = useRef(null);

  // Fetch configuration
  const fetchConfig = async () => {
    try {
      const res = await fetch('/api/config');
      if (res.ok) {
        const data = await res.json();
        setConfig(data);
        // Sync config inputs
        setConfigAppName(data.nombre_app);
        setConfigPrimaryColor(data.colores?.primary || '#ff3b30');
        setConfigWeeklyRate(data.tasa_semanal);
        setConfigMonthlyRate(data.tasa_mensual_default);
      }
    } catch (err) {
      console.error('Error fetching config:', err);
    }
  };

  // Fetch Dashboard Stats, Clients, Loans
  const refreshData = async () => {
    if (!token) return;
    try {
      // Config
      await fetchConfig();

      // Dashboard stats
      const dashRes = await fetch('/api/dashboard');
      if (dashRes.ok) {
        const stats = await dashRes.json();
        setDashboardStats(stats);
      }

      // Clients
      const clientsRes = await fetch('/api/clientes');
      if (clientsRes.ok) {
        const clientsData = await clientsRes.json();
        setClients(clientsData);
      }

      // Loans
      const loansRes = await fetch('/api/prestamos');
      if (loansRes.ok) {
        const loansData = await loansRes.json();
        setLoans(loansData);
      }
    } catch (err) {
      console.error('Error refreshing data:', err);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  useEffect(() => {
    if (token) {
      refreshData();
    }
  }, [token]);

  // Handle Login
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        localStorage.setItem('token', data.token);
        setToken(data.token);
        setCurrentView('dashboard');
      } else {
        setLoginError(data.message || 'Credenciales inválidas');
      }
    } catch (err) {
      setLoginError('Error de red al conectar al servidor');
    }
  };

  // Handle Logout
  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken('');
    setCurrentView('dashboard');
  };

  // Handle client creation
  const handleAddClient = async (e) => {
    e.preventDefault();
    setClientFormError('');
    setClientFormSuccess('');

    if (!newClientName || !newClientCedula || !newClientPhone) {
      setClientFormError('Complete todos los campos obligatorios');
      return;
    }

    try {
      const res = await fetch('/api/clientes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newClientName,
          cedula: newClientCedula,
          phone: newClientPhone,
          notes: newClientNotes
        })
      });

      const data = await res.json();

      if (res.status === 201) {
        setClientFormSuccess('¡Cliente registrado con éxito!');
        // Clear fields
        setNewClientName('');
        setNewClientCedula('');
        setNewClientPhone('');
        setNewClientNotes('');
        refreshData();
        setTimeout(() => {
          setShowAddClientModal(false);
          setClientFormSuccess('');
        }, 1500);
      } else if (res.status === 409) {
        // DUPLICATE_CEDULA - Show history automatically
        setClientFormError('¡La cédula ya está registrada! Abriendo historial...');
        setTimeout(() => {
          setShowAddClientModal(false);
          setClientFormError('');
          // Open history for this duplicate client
          setSelectedClient(data.client);
          setEditingNotes(data.client.notes || '');
          setCurrentView('clientes');
        }, 2000);
      } else {
        setClientFormError(data.error || 'Error al guardar cliente');
      }
    } catch (err) {
      setClientFormError('Error de red al registrar cliente');
    }
  };

  // Update client observations
  const handleUpdateNotes = async () => {
    try {
      const res = await fetch(`/api/clientes/${selectedClient.id}/notes`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: editingNotes })
      });
      if (res.ok) {
        const updated = await res.json();
        setSelectedClient(prev => ({ ...prev, notes: updated.notes }));
        refreshData();
      }
    } catch (err) {
      console.error('Error updating notes:', err);
    }
  };

  // Handle interest rate adjustment on loan type change
  useEffect(() => {
    if (loanType === 'semanal') {
      setLoanInterestRate(config.tasa_semanal || 20);
      setLoanDuration('4');
    } else {
      setLoanInterestRate(config.tasa_mensual_default || 15);
      setLoanDuration('1');
    }
  }, [loanType, config]);

  // Handle loan creation
  const handleAddLoan = async (e) => {
    e.preventDefault();
    setLoanFormError('');
    setLoanFormSuccess('');

    if (!loanClientId || !loanAmount || !loanDuration || !loanInterestRate) {
      setLoanFormError('Por favor complete todos los datos del formulario');
      return;
    }

    try {
      const res = await fetch('/api/prestamos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: loanClientId,
          amount: loanAmount,
          type: loanType,
          interestRate: loanInterestRate,
          installmentsCount: loanDuration
        })
      });

      if (res.status === 201) {
        setLoanFormSuccess('¡Préstamo creado con éxito!');
        setLoanAmount('');
        setLoanClientId('');
        refreshData();
        setTimeout(() => {
          setShowAddLoanModal(false);
          setLoanFormSuccess('');
        }, 1500);
      } else {
        const data = await res.json();
        setLoanFormError(data.error || 'Error al crear préstamo');
      }
    } catch (err) {
      setLoanFormError('Error de red al crear préstamo');
    }
  };

  // Register installment payment
  const handleRegisterPayment = async (loanId, installmentNumber, amount) => {
    try {
      const res = await fetch('/api/pagos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ loanId, installmentNumber, amountPaid: amount })
      });
      if (res.ok) {
        const data = await res.json();
        // Update local views
        setSelectedLoan(data.loan);
        
        // Find paid installment details for receipt
        const instDetails = data.paidInstallment;
        
        // Set receipt
        setActiveReceipt({
          appName: config.nombre_app,
          clientName: data.loan.client?.name || 'Cliente',
          cedula: data.loan.client?.cedula || 'N/A',
          phone: data.loan.client?.phone || '',
          amountPaid: instDetails.amount,
          installmentNumber: instDetails.number,
          date: new Date().toLocaleDateString('es-DO', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
          remainingBalance: data.loan.remainingBalance
        });
        
        refreshData();
      } else {
        alert('Error al registrar pago');
      }
    } catch (err) {
      console.error('Error paying installment:', err);
    }
  };

  // Generate PNG and download receipt
  const handleDownloadReceipt = () => {
    if (!receiptRef.current) return;
    html2canvas(receiptRef.current, { scale: 2 }).then(canvas => {
      const link = document.createElement('a');
      link.download = `Recibo_Cuota_${activeReceipt.installmentNumber}_${activeReceipt.clientName.replace(/\s+/g, '_')}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    });
  };

  // Print receipt
  const handlePrintReceipt = () => {
    const printContent = receiptRef.current.innerHTML;
    const originalContent = document.body.innerHTML;
    
    // Create static layout for printing
    document.body.innerHTML = `
      <div style="font-family: monospace; padding: 40px; max-width: 400px; margin: 0 auto; color: #000000; background: #ffffff;">
        ${printContent}
      </div>
    `;
    window.print();
    document.body.innerHTML = originalContent;
    // Reload page scripts binding (React reload is safer)
    window.location.reload();
  };

  // Send by WhatsApp
  const handleSendWhatsApp = () => {
    if (!activeReceipt) return;
    const phone = activeReceipt.phone.replace(/[^0-9]/g, '');
    const message = `Hola ${activeReceipt.clientName}, recibimos tu pago de RD$${activeReceipt.amountPaid.toLocaleString('es-DO', { minimumFractionDigits: 2 })}. Cuota #${activeReceipt.installmentNumber}. Balance restante RD$${activeReceipt.remainingBalance.toLocaleString('es-DO', { minimumFractionDigits: 2 })}. Gracias.`;
    const encodedText = encodeURIComponent(message);
    window.open(`https://wa.me/${phone.startsWith('1') ? phone : '1' + phone}?text=${encodedText}`, '_blank');
  };

  // File logo select & conversion to Base64
  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setConfigLogoFile(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Save Config
  const handleSaveConfig = async (e) => {
    e.preventDefault();
    setConfigSuccess('');
    try {
      const res = await fetch('/api/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre_app: configAppName,
          colores: { ...config.colores, primary: configPrimaryColor },
          tasa_semanal: parseFloat(configWeeklyRate),
          tasa_mensual_default: parseFloat(configMonthlyRate),
          logoBase64: configLogoFile
        })
      });

      if (res.ok) {
        const data = await res.json();
        setConfig(data);
        setConfigSuccess('Configuración guardada correctamente.');
        setTimeout(() => setConfigSuccess(''), 2500);
      }
    } catch (err) {
      alert('Error guardando configuración');
    }
  };

  // Search filter
  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(searchCedula.toLowerCase()) || 
    c.cedula.replace(/[-\s]/g, '').includes(searchCedula.replace(/[-\s]/g, ''))
  );

  // Quick Loan Calculations for view form
  const quickInterest = parseFloat(loanAmount || 0) * (parseFloat(loanInterestRate || 0) / 100);
  const quickTotal = parseFloat(loanAmount || 0) + quickInterest;
  const quickInstallment = quickTotal / parseInt(loanDuration || 1);

  // CSS variables object for dynamic styling
  const customStyles = {
    '--primary': config.colores?.primary || '#ff3b30',
    '--primary-rgb': config.colores?.primary ? hexToRgb(config.colores.primary) : '255, 59, 48',
    '--background': config.colores?.background || '#0a0a0c',
    '--card': config.colores?.card || '#16161a',
    '--text': config.colores?.text || '#ffffff'
  };

  // Helper to convert HEX to RGB
  function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '255, 59, 48';
  }

  // Auth Guard
  if (!token) {
    return (
      <div className="app-container animate-fade-in" style={customStyles}>
        <div className="login-view">
          <img className="login-logo" src={config.logo || '/assets/logo.png'} alt="Fintech Logo" onError={(e) => {e.target.src = '/assets/logo.png'}} />
          <div className="login-header">
            <h1>{config.nombre_app}</h1>
            <p className="text-muted">Ingresa a tu panel de préstamos fintech</p>
          </div>
          <div className="login-card">
            {loginError && <div style={{ color: '#ff453a', marginBottom: 15, fontSize: 13, fontWeight: 'bold' }}>{loginError}</div>}
            <form onSubmit={handleLogin}>
              <div className="form-group">
                <label className="form-label">Usuario</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="admin"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Contraseña</label>
                <input
                  type="password"
                  className="form-control"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <button type="submit" className="btn btn-primary">
                Iniciar Sesión
              </button>
            </form>
          </div>
          <div style={{ marginTop: 24, fontSize: 11, color: 'rgba(255,255,255,0.2)' }}>
            PRESTAMO CONTROL V1.0.0
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container" style={customStyles}>
      
      {/* Dynamic Header */}
      <header className="app-header">
        <div className="app-brand">
          <img className="app-logo" src={config.logo || '/assets/logo.png'} alt="Logo" onError={(e) => {e.target.src = '/assets/logo.png'}} />
          <span className="app-name">{config.nombre_app}</span>
        </div>
        <button onClick={handleLogout} className="btn-secondary" style={{ padding: '8px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
          <LogOut size={14} />
          <span style={{ fontSize: 12, fontWeight: 600 }}>Salir</span>
        </button>
      </header>

      {/* Main View Area */}
      <main className="view-content">
        
        {/* ========================================================================= */}
        {/* DASHBOARD VIEW */}
        {/* ========================================================================= */}
        {currentView === 'dashboard' && (
          <div className="animate-fade-in">
            <div style={{ marginBottom: 20 }}>
              <p className="text-muted" style={{ fontSize: 12, textTransform: 'uppercase', fontWeight: 600, letterSpacing: 1 }}>Panel General</p>
              <h1 style={{ margin: '4px 0 0 0' }}>Dashboard Financiero</h1>
            </div>

            {/* Stat widgets grid */}
            <div className="dashboard-stats">
              <div className="stat-card">
                <span className="stat-label">Total Prestado</span>
                <span className="stat-value" style={{ color: 'var(--text)' }}>RD$ {dashboardStats.totalPrestado?.toLocaleString()}</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">Total Cobrado</span>
                <span className="stat-value" style={{ color: 'var(--success)' }}>RD$ {dashboardStats.totalCobrado?.toLocaleString()}</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">Ganado Interés</span>
                <span className="stat-value" style={{ color: '#007aff' }}>RD$ {dashboardStats.gananciasInteres?.toLocaleString()}</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">Pendiente (Capital)</span>
                <span className="stat-value" style={{ color: 'var(--warning)' }}>
                  RD$ {Math.max(0, dashboardStats.totalPrestado + dashboardStats.gananciasInteres - dashboardStats.totalCobrado)?.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="dashboard-stats" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <div className="stat-card" style={{ borderLeft: '3px solid var(--success)' }}>
                <span className="stat-label">Clientes Activos</span>
                <span className="stat-value">{dashboardStats.clientesActivos}</span>
              </div>
              <div className="stat-card" style={{ borderLeft: '3px solid var(--danger)' }}>
                <span className="stat-label">Clientes Morosos</span>
                <span className="stat-value" style={{ color: 'var(--danger)' }}>{dashboardStats.clientesMorosos}</span>
              </div>
            </div>

            {/* Quick Actions Panel */}
            <div className="card" style={{ padding: 18 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Sparkles size={16} className="text-primary" style={{ color: 'var(--primary)' }} />
                Accesos Rápidos
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <button onClick={() => setShowAddClientModal(true)} className="btn btn-secondary" style={{ fontSize: 13, padding: 12 }}>
                  <Plus size={16} />
                  Nuevo Cliente
                </button>
                <button onClick={() => setShowAddLoanModal(true)} className="btn btn-primary" style={{ fontSize: 13, padding: 12 }}>
                  <HandCoins size={16} />
                  Crear Préstamo
                </button>
              </div>
            </div>

            {/* Active Overdue Alert banner */}
            {dashboardStats.clientesMorosos > 0 && (
              <div style={{ background: 'rgba(255,59,48,0.1)', border: '1px solid rgba(255,59,48,0.2)', padding: 12, borderRadius: 12, display: 'flex', alignItems: 'center', gap: 10, color: '#ff453a' }}>
                <AlertTriangle size={18} />
                <span style={{ fontSize: 12, fontWeight: 600 }}>Atención: {dashboardStats.clientesMorosos} cliente(s) presentan cuotas vencidas.</span>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* CLIENTES VIEW */}
        {/* ========================================================================= */}
        {currentView === 'clientes' && (
          <div className="animate-fade-in">
            <div style={{ display: 'flex', justifyContent: 'between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <p className="text-muted" style={{ fontSize: 12, textTransform: 'uppercase', fontWeight: 600 }}>Cartera de Clientes</p>
                <h1 style={{ margin: 0 }}>Directorio</h1>
              </div>
              <button onClick={() => setShowAddClientModal(true)} className="btn btn-primary" style={{ width: 'auto', padding: '8px 14px', borderRadius: 8, fontSize: 13, marginLeft: 'auto' }}>
                <Plus size={16} />
                Registrar
              </button>
            </div>

            {/* Search Input */}
            <div className="form-group" style={{ position: 'relative' }}>
              <input
                type="text"
                className="form-control"
                style={{ paddingLeft: 44 }}
                placeholder="Buscar por cédula o nombre..."
                value={searchCedula}
                onChange={(e) => setSearchCedula(e.target.value)}
              />
              <Search size={18} className="text-muted" style={{ position: 'absolute', left: 16, top: 16 }} />
            </div>

            {/* Client Directory List */}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              {filteredClients.length === 0 ? (
                <div style={{ padding: 30, textAlignment: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                  No se encontraron clientes.
                </div>
              ) : (
                filteredClients.map(client => (
                  <div key={client.id} className="list-item" onClick={() => {
                    setSelectedClient(client);
                    setEditingNotes(client.notes || '');
                  }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 2 }}>{client.name}</div>
                      <div className="text-muted" style={{ fontSize: 12 }}>Cédula: {client.cedula}</div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'end', gap: 6 }}>
                      <span className={`badge badge-risk-${client.riskLevel}`}>
                        {client.riskLevel === 'bueno' ? 'Bueno' : client.riskLevel === 'regular' ? 'Regular' : 'Moroso'}
                      </span>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{client.phone}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* PRESTAMOS VIEW */}
        {/* ========================================================================= */}
        {currentView === 'prestamos' && (
          <div className="animate-fade-in">
            <div style={{ display: 'flex', justifyContent: 'between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <p className="text-muted" style={{ fontSize: 12, textTransform: 'uppercase', fontWeight: 600 }}>Operaciones</p>
                <h1 style={{ margin: 0 }}>Préstamos</h1>
              </div>
              <button onClick={() => setShowAddLoanModal(true)} className="btn btn-primary" style={{ width: 'auto', padding: '8px 14px', borderRadius: 8, fontSize: 13, marginLeft: 'auto' }}>
                <Plus size={16} />
                Nuevo
              </button>
            </div>

            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              {loans.length === 0 ? (
                <div style={{ padding: 30, textAlignment: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                  Aún no se han registrado préstamos.
                </div>
              ) : (
                loans.map(loan => (
                  <div key={loan.id} className="list-item" onClick={() => setSelectedLoan(loan)}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>{loan.client?.name || 'Cliente desconocido'}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        Tipo: {loan.type === 'semanal' ? 'Semanal' : 'Mensual'} | Tasa: {loan.interestRate}%
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'end', gap: 6 }}>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>RD$ {loan.amount?.toLocaleString()}</div>
                      <span className={`badge ${loan.status === 'pagado' ? 'badge-status-pagado' : 'badge-status-pendiente'}`}>
                        {loan.status === 'pagado' ? 'Pagado' : `Bal: RD$ ${loan.remainingBalance?.toLocaleString()}`}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* CONFIGURACIÓN VIEW */}
        {/* ========================================================================= */}
        {currentView === 'configuracion' && (
          <div className="animate-fade-in">
            <div style={{ marginBottom: 20 }}>
              <p className="text-muted" style={{ fontSize: 12, textTransform: 'uppercase', fontWeight: 600 }}>Ajustes</p>
              <h1>Configuración de App</h1>
            </div>

            <form onSubmit={handleSaveConfig} className="card">
              {configSuccess && <div style={{ color: 'var(--success)', marginBottom: 15, fontSize: 13, fontWeight: 'bold' }}>{configSuccess}</div>}
              
              <div className="form-group">
                <label className="form-label">Nombre de la Aplicación</label>
                <input
                  type="text"
                  className="form-control"
                  value={configAppName}
                  onChange={(e) => setConfigAppName(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Subir Logotipo (Fintech Logo)</label>
                <input
                  type="file"
                  className="form-control"
                  accept="image/*"
                  onChange={handleLogoUpload}
                />
                <p className="text-muted" style={{ fontSize: 11, marginTop: 4 }}>Formatos admitidos: PNG, JPG, SVG. Se guarda dinámicamente.</p>
              </div>

              <div className="form-group">
                <label className="form-label">Color de Acento Fintech</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <input
                    type="color"
                    className="form-control"
                    style={{ width: 60, height: 44, padding: 4, cursor: 'pointer' }}
                    value={configPrimaryColor}
                    onChange={(e) => setConfigPrimaryColor(e.target.value)}
                  />
                  <span style={{ fontSize: 14, fontFamily: 'monospace' }}>{configPrimaryColor}</span>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Tasa de Interés Semanal (%)</label>
                <input
                  type="number"
                  className="form-control"
                  value={configWeeklyRate}
                  onChange={(e) => setConfigWeeklyRate(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Tasa de Interés Mensual Default (%)</label>
                <input
                  type="number"
                  className="form-control"
                  value={configMonthlyRate}
                  onChange={(e) => setConfigMonthlyRate(e.target.value)}
                />
              </div>

              <button type="submit" className="btn btn-primary" style={{ marginTop: 10 }}>
                Guardar Cambios
              </button>
            </form>
          </div>
        )}

      </main>

      {/* Navigation tabs */}
      <nav className="nav-bar">
        <button onClick={() => { setCurrentView('dashboard'); setSelectedClient(null); setSelectedLoan(null); }} className={`nav-item ${currentView === 'dashboard' ? 'active' : ''}`}>
          <LayoutDashboard size={20} />
          <span>Dashboard</span>
        </button>
        <button onClick={() => { setCurrentView('clientes'); setSelectedClient(null); setSelectedLoan(null); }} className={`nav-item ${currentView === 'clientes' ? 'active' : ''}`}>
          <Users size={20} />
          <span>Clientes</span>
        </button>
        <button onClick={() => { setCurrentView('prestamos'); setSelectedClient(null); setSelectedLoan(null); }} className={`nav-item ${currentView === 'prestamos' ? 'active' : ''}`}>
          <HandCoins size={20} />
          <span>Préstamos</span>
        </button>
        <button onClick={() => { setCurrentView('configuracion'); setSelectedClient(null); setSelectedLoan(null); }} className={`nav-item ${currentView === 'configuracion' ? 'active' : ''}`}>
          <Settings size={20} />
          <span>Branding</span>
        </button>
      </nav>

      {/* ========================================================================= */}
      {/* MODAL: ADD CLIENT */}
      {/* ========================================================================= */}
      {showAddClientModal && (
        <div className="modal-backdrop" onClick={() => setShowAddClientModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ margin: 0 }}>Registrar Cliente</h2>
              <button onClick={() => setShowAddClientModal(false)} className="btn-secondary" style={{ width: 'auto', padding: '6px 10px', borderRadius: 8, border: 'none', cursor: 'pointer' }}>Cerrar</button>
            </div>
            
            <form onSubmit={handleAddClient}>
              {clientFormError && <div style={{ color: '#ff453a', marginBottom: 15, fontSize: 13, fontWeight: 'bold' }}>{clientFormError}</div>}
              {clientFormSuccess && <div style={{ color: 'var(--success)', marginBottom: 15, fontSize: 13, fontWeight: 'bold' }}>{clientFormSuccess}</div>}
              
              <div className="form-group">
                <label className="form-label">Nombre Completo</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Juan Pérez"
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Cédula (Única y Obligatoria)</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="001-0000000-0"
                  value={newClientCedula}
                  onChange={(e) => setNewClientCedula(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Teléfono</label>
                <input
                  type="tel"
                  className="form-control"
                  placeholder="8095551234"
                  value={newClientPhone}
                  onChange={(e) => setNewClientPhone(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Observaciones Internas</label>
                <textarea
                  className="form-control"
                  placeholder="Notas internas de riesgo u otros..."
                  value={newClientNotes}
                  onChange={(e) => setNewClientNotes(e.target.value)}
                  rows="3"
                />
              </div>
              <button type="submit" className="btn btn-primary">
                Guardar Cliente
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADD LOAN */}
      {/* ========================================================================= */}
      {showAddLoanModal && (
        <div className="modal-backdrop" onClick={() => setShowAddLoanModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ margin: 0 }}>Crear Préstamo</h2>
              <button onClick={() => setShowAddLoanModal(false)} className="btn-secondary" style={{ width: 'auto', padding: '6px 10px', borderRadius: 8, border: 'none', cursor: 'pointer' }}>Cerrar</button>
            </div>

            <form onSubmit={handleAddLoan}>
              {loanFormError && <div style={{ color: '#ff453a', marginBottom: 15, fontSize: 13, fontWeight: 'bold' }}>{loanFormError}</div>}
              {loanFormSuccess && <div style={{ color: 'var(--success)', marginBottom: 15, fontSize: 13, fontWeight: 'bold' }}>{loanFormSuccess}</div>}

              <div className="form-group">
                <label className="form-label">Seleccionar Cliente</label>
                <select
                  className="form-control form-select"
                  value={loanClientId}
                  onChange={(e) => setLoanClientId(e.target.value)}
                  required
                >
                  <option value="">-- Seleccionar cliente --</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.name} (${c.cedula})</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Monto del Préstamo (RD$)</label>
                <input
                  type="number"
                  className="form-control"
                  placeholder="10000"
                  value={loanAmount}
                  onChange={(e) => setLoanAmount(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Tipo de Préstamo</label>
                <select
                  className="form-control form-select"
                  value={loanType}
                  onChange={(e) => setLoanType(e.target.value)}
                >
                  <option value="semanal">Semanal</option>
                  <option value="mensual">Mensual</option>
                </select>
              </div>

              {loanType === 'semanal' ? (
                <div className="form-group">
                  <label className="form-label">Plazo (Semanas)</label>
                  <select
                    className="form-control form-select"
                    value={loanDuration}
                    onChange={(e) => setLoanDuration(e.target.value)}
                  >
                    <option value="4">4 Semanas (20% interés)</option>
                    <option value="6">6 Semanas (20% interés)</option>
                    <option value="8">8 Semanas (20% interés)</option>
                    <option value="12">12 Semanas (20% interés)</option>
                  </select>
                </div>
              ) : (
                <div className="form-group">
                  <label className="form-label">Plazo (Meses)</label>
                  <select
                    className="form-control form-select"
                    value={loanDuration}
                    onChange={(e) => setLoanDuration(e.target.value)}
                  >
                    <option value="1">1 Mes</option>
                    <option value="2">2 Meses</option>
                    <option value="3">3 Meses</option>
                  </select>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Tasa de Interés (%)</label>
                <input
                  type="number"
                  className="form-control"
                  value={loanInterestRate}
                  onChange={(e) => setLoanInterestRate(e.target.value)}
                  disabled={loanType === 'semanal'} // Fixed at 20% for weekly loans
                />
              </div>

              {/* Real-time Calculation Panel */}
              {loanAmount && (
                <div className="card animate-fade-in" style={{ backgroundColor: 'rgba(255,255,255,0.02)', padding: 14, marginBottom: 16 }}>
                  <h4 style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', marginBottom: 8, color: 'var(--primary)' }}>Cálculo Estimado</h4>
                  <div className="receipt-line">
                    <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Interés ({loanInterestRate}%):</span>
                    <span style={{ fontSize: 13, fontWeight: 'bold' }}>RD$ {quickInterest.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="receipt-line">
                    <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Total a devolver:</span>
                    <span style={{ fontSize: 13, fontWeight: 'bold' }}>RD$ {quickTotal.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="receipt-line" style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 6, marginTop: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 'bold' }}>Cuota ({loanType === 'semanal' ? 'semanal' : 'mensual'}):</span>
                    <span style={{ fontSize: 14, fontWeight: 'bold', color: 'var(--success)' }}>
                      {loanDuration} cuotas de RD$ {quickInstallment.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              )}

              <button type="submit" className="btn btn-primary">
                Aprobar Préstamo
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CLIENT DETAILS (History & Profile) */}
      {/* ========================================================================= */}
      {selectedClient && (
        <div className="modal-backdrop" onClick={() => setSelectedClient(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <User size={20} className="text-muted" />
                <h2 style={{ margin: 0 }}>Detalle del Cliente</h2>
              </div>
              <button onClick={() => setSelectedClient(null)} className="btn-secondary" style={{ width: 'auto', padding: '6px 10px', borderRadius: 8, border: 'none', cursor: 'pointer' }}>Cerrar</button>
            </div>

            <div className="card" style={{ padding: 16, marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 10 }}>
                <div>
                  <h3 style={{ fontSize: 17, fontWeight: 700 }}>{selectedClient.name}</h3>
                  <div className="text-muted" style={{ fontSize: 13 }}>Cédula: {selectedClient.cedula}</div>
                  <div className="text-muted" style={{ fontSize: 13 }}>Telf: {selectedClient.phone}</div>
                </div>
                <span className={`badge badge-risk-${selectedClient.riskLevel}`}>
                  Riesgo: {selectedClient.riskLevel === 'bueno' ? 'Bueno' : selectedClient.riskLevel === 'regular' ? 'Regular' : 'Moroso'}
                </span>
              </div>

              {/* Internal observations field */}
              <div className="form-group" style={{ marginBottom: 0, marginTop: 12 }}>
                <label className="form-label" style={{ fontSize: 11 }}>Observaciones Internas</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="text"
                    className="form-control"
                    style={{ padding: '8px 12px', fontSize: 13 }}
                    value={editingNotes}
                    onChange={(e) => setEditingNotes(e.target.value)}
                    placeholder="Escribir notas de control..."
                  />
                  <button onClick={handleUpdateNotes} className="btn-primary" style={{ width: 'auto', padding: '8px 16px', borderRadius: 10, fontSize: 13, border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                    Guardar
                  </button>
                </div>
              </div>
            </div>

            {/* Loan History listing */}
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>Historial de Préstamos</h3>
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              {(!selectedClient.history || selectedClient.history.length === 0) ? (
                <div style={{ padding: 20, textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>
                  Este cliente no tiene historial de préstamos.
                </div>
              ) : (
                selectedClient.history.map(loan => (
                  <div key={loan.id} className="list-item" onClick={() => {
                    // Open detailed loan view
                    setSelectedLoan({ ...loan, client: selectedClient });
                    setSelectedClient(null);
                  }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>RD$ {loan.amount?.toLocaleString()} ({loan.type === 'semanal' ? 'Semanal' : 'Mensual'})</div>
                      <div className="text-muted" style={{ fontSize: 11 }}>Cuotas: {loan.installmentsCount} | {new Date(loan.createdAt || Date.now()).toLocaleDateString()}</div>
                    </div>
                    <span className={`badge ${loan.status === 'pagado' ? 'badge-status-pagado' : 'badge-status-pendiente'}`}>
                      {loan.status === 'pagado' ? 'PAGADO' : `Pend: RD$ ${loan.remainingBalance?.toLocaleString()}`}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: LOAN DETAILS & INSTALLMENT SCHEDULE */}
      {/* ========================================================================= */}
      {selectedLoan && (
        <div className="modal-backdrop" onClick={() => setSelectedLoan(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            
            <div style={{ display: 'flex', justifyContent: 'between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button onClick={() => {
                  // If we opened this from client profile, we go back there
                  if (selectedLoan.client) {
                    setSelectedClient(selectedLoan.client);
                  }
                  setSelectedLoan(null);
                }} style={{ background: 'none', border: 'none', color: 'var(--text)', marginRight: 6, cursor: 'pointer' }}>
                  <ArrowLeft size={20} />
                </button>
                <h2 style={{ margin: 0 }}>Amortización</h2>
              </div>
              <button onClick={() => setSelectedLoan(null)} className="btn-secondary" style={{ width: 'auto', padding: '6px 10px', borderRadius: 8, border: 'none', cursor: 'pointer' }}>Cerrar</button>
            </div>

            {/* Loan Card Summary */}
            <div className="card" style={{ padding: 16, marginBottom: 16 }}>
              <div className="receipt-line" style={{ marginBottom: 6 }}>
                <span className="text-muted" style={{ fontSize: 13 }}>Cliente:</span>
                <span style={{ fontWeight: 'bold', fontSize: 14 }}>{selectedLoan.client?.name || 'Cliente'}</span>
              </div>
              <div className="receipt-line" style={{ marginBottom: 6 }}>
                <span className="text-muted" style={{ fontSize: 13 }}>Monto inicial:</span>
                <span style={{ fontWeight: 'bold', fontSize: 14 }}>RD$ {selectedLoan.amount?.toLocaleString()}</span>
              </div>
              <div className="receipt-line" style={{ marginBottom: 6 }}>
                <span className="text-muted" style={{ fontSize: 13 }}>Tipo / Interés:</span>
                <span style={{ fontWeight: 'bold', fontSize: 14, textTransform: 'capitalize' }}>
                  {selectedLoan.type} ({selectedLoan.interestRate}%)
                </span>
              </div>
              <div className="receipt-line" style={{ borderTop: '1px solid var(--border)', paddingTop: 8, marginTop: 4 }}>
                <span className="text-muted" style={{ fontSize: 13 }}>Balance restante:</span>
                <span style={{ fontWeight: 'bold', fontSize: 15, color: selectedLoan.remainingBalance === 0 ? 'var(--success)' : 'var(--primary)' }}>
                  RD$ {selectedLoan.remainingBalance?.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Installments Table */}
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 10 }}>Calendario de Cuotas</h3>
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 2fr 1fr', padding: '10px 10px', backgroundColor: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border)', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>
                <span>CUOTA</span>
                <span>FECHA</span>
                <span>MONTO</span>
                <span>ESTADO</span>
              </div>

              {selectedLoan.installments?.map(inst => {
                const isOverdue = inst.status === 'pendiente' && new Date(inst.dueDate) < new Date();
                return (
                  <div key={inst.number} className={`installment-row ${isOverdue ? 'overdue' : ''}`}>
                    <span style={{ fontWeight: 600 }}>#{inst.number}</span>
                    <span className="text-muted">{new Date(inst.dueDate).toLocaleDateString('es-DO')}</span>
                    <span style={{ fontWeight: 'bold' }}>RD$ {inst.amount?.toLocaleString()}</span>
                    
                    {inst.status === 'pagado' ? (
                      <span className="badge badge-status-pagado" style={{ fontSize: 10, padding: '2px 6px' }}>PAGADO</span>
                    ) : (
                      <button 
                        onClick={() => handleRegisterPayment(selectedLoan.id, inst.number, inst.amount)} 
                        className="btn-primary" 
                        style={{ fontSize: 10, padding: '4px 6px', borderRadius: 6, border: 'none', cursor: 'pointer', width: '100%', fontWeight: 700 }}
                      >
                        PAGAR
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: PAYMENT RECEIPT IMAGE AND WHATSAPP */}
      {/* ========================================================================= */}
      {activeReceipt && (
        <div className="modal-backdrop" onClick={() => setActiveReceipt(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxHeight: '95%', display: 'flex', flexDirection: 'column' }}>
            
            <div style={{ display: 'flex', justifyContent: 'between', alignItems: 'center', marginBottom: 12 }}>
              <h2 style={{ margin: 0, fontSize: 18 }}>Recibo de Pago</h2>
              <button onClick={() => setActiveReceipt(null)} className="btn-secondary" style={{ width: 'auto', padding: '6px 10px', borderRadius: 8, border: 'none', cursor: 'pointer' }}>Cerrar</button>
            </div>

            {/* PNG Capturable Area */}
            <div style={{ overflowY: 'auto', flex: 1, padding: 4 }}>
              <div ref={receiptRef} className="receipt-wrapper">
                <div className="receipt-watermark">{activeReceipt.appName.toUpperCase()}</div>
                
                <div className="receipt-header">
                  <div className="receipt-title">{activeReceipt.appName}</div>
                  <div style={{ fontSize: 11, marginTop: 4 }}>COMPROBANTE DE TRANSACCION</div>
                </div>

                <div className="receipt-line">
                  <span>Fecha:</span>
                  <span>{activeReceipt.date}</span>
                </div>
                <div className="receipt-line">
                  <span>Cliente:</span>
                  <span style={{ fontWeight: 'bold' }}>{activeReceipt.clientName}</span>
                </div>
                <div className="receipt-line">
                  <span>Cédula:</span>
                  <span>{activeReceipt.cedula}</span>
                </div>
                
                <div className="receipt-divider"></div>
                
                <div className="receipt-line bold">
                  <span>CONCEPTO:</span>
                  <span>CUOTA #{activeReceipt.installmentNumber}</span>
                </div>
                <div className="receipt-line bold" style={{ fontSize: 16 }}>
                  <span>MONTO RECIBIDO:</span>
                  <span>RD$ {activeReceipt.amountPaid.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</span>
                </div>

                <div className="receipt-divider"></div>

                <div className="receipt-line bold">
                  <span>BALANCE RESTANTE:</span>
                  <span style={{ color: activeReceipt.remainingBalance === 0 ? 'green' : 'black' }}>
                    RD$ {activeReceipt.remainingBalance.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                {activeReceipt.remainingBalance === 0 && (
                  <div style={{ border: '2px solid green', padding: 6, marginTop: 12, textAlign: 'center', color: 'green', fontWeight: 'bold', textTransform: 'uppercase', borderRadius: 6, fontSize: 12 }}>
                    ¡PRÉSTAMO SALDADO!
                  </div>
                )}

                <div className="receipt-footer">
                  <div>Gracias por su puntualidad.</div>
                  <div style={{ fontSize: 9, marginTop: 4 }}>Documento de control interno no válido como factura fiscal.</div>
                </div>
              </div>
            </div>

            {/* Receipt Action Buttons */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 16 }}>
              <button onClick={handleDownloadReceipt} className="btn btn-secondary" style={{ padding: 12, fontSize: 13 }}>
                <Download size={16} />
                Descargar PNG
              </button>
              <button onClick={handlePrintReceipt} className="btn btn-secondary" style={{ padding: 12, fontSize: 13 }}>
                <Printer size={16} />
                Imprimir
              </button>
            </div>

            {activeReceipt.phone && (
              <button onClick={handleSendWhatsApp} className="btn btn-whatsapp" style={{ marginTop: 10, padding: 12, fontSize: 13 }}>
                <Send size={16} />
                Enviar por WhatsApp
              </button>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
