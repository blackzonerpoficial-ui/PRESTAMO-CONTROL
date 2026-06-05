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
  User as UserIcon,
  CheckCircle2,
  Clock,
  ArrowLeft,
  AlertTriangle,
  Download,
  Printer,
  Send,
  Sparkles,
  LogOut,
  TrendingUp,
  Landmark,
  ShieldCheck,
  PlusCircle,
  WifiOff,
  Pencil,
  Trash2
} from 'lucide-react';

export default function App() {
  // Authentication & Session State
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [userProfile, setUserProfile] = useState(JSON.parse(localStorage.getItem('user_profile')) || null);
  const [loginMethod, setLoginMethod] = useState('google'); // 'google' or 'local'
  const [apiError, setApiError] = useState(''); // Network / Connection Error status
  
  // App Branding Config
  const [config, setConfig] = useState({
    nombre_app: localStorage.getItem('local_app_name') || 'Prestamo Control',
    logo: '/assets/logo.png',
    colores: { 
      primary: localStorage.getItem('local_primary_color') || '#ff3b30', 
      background: '#0a0a0c', 
      card: '#16161a', 
      text: '#ffffff' 
    },
    tasa_semanal: 20,
    tasa_mensual_default: 15,
    capital_inicial: 0
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
    gananciasEsperadas: 0,
    capitalDisponible: 0,
    clientesActivos: 0,
    clientesMorosos: 0
  });

  // UI State
  const [searchCedula, setSearchCedula] = useState('');
  const [selectedClient, setSelectedClient] = useState(null);
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [activeReceipt, setActiveReceipt] = useState(null);
  const [showLoginSetupModal, setShowLoginSetupModal] = useState(false);

  // Local Login Form
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Add Client Form
  const [newClientName, setNewClientName] = useState('');
  const [newClientCedula, setNewClientCedula] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [newClientNotes, setNewClientNotes] = useState('');
  const [clientFormError, setClientFormError] = useState('');
  const [clientFormSuccess, setClientFormSuccess] = useState('');
  const [showAddClientModal, setShowAddClientModal] = useState(false);

  // Add Loan Form
  const [loanClientCedulaInput, setLoanClientCedulaInput] = useState('');
  const [matchedClient, setMatchedClient] = useState(null);
  const [loanAmount, setLoanAmount] = useState('');
  const [loanType, setLoanType] = useState('semanal');
  const [loanDuration, setLoanDuration] = useState('4');
  const [loanInterestRate, setLoanInterestRate] = useState(20);
  const [loanFormError, setLoanFormError] = useState('');
  const [loanFormSuccess, setLoanFormSuccess] = useState('');
  const [showAddLoanModal, setShowAddLoanModal] = useState(false);

  // Config Form
  const [configAppName, setConfigAppName] = useState(config.nombre_app);
  const [configPrimaryColor, setConfigPrimaryColor] = useState(config.colores.primary);
  const [configWeeklyRate, setConfigWeeklyRate] = useState(config.tasa_semanal);
  const [configMonthlyRate, setConfigMonthlyRate] = useState(config.tasa_mensual_default);
  const [configCapitalInicial, setConfigCapitalInicial] = useState('0');
const defaultGoogleClientId = process.env.REACT_APP_GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID_HERE';
  const [configGoogleClientId, setConfigGoogleClientId] = useState(
    localStorage.getItem('google_client_id') || defaultGoogleClientId
  );
  const [configLogoFile, setConfigLogoFile] = useState(null);
  const [configSuccess, setConfigSuccess] = useState('');

  const [editingNotes, setEditingNotes] = useState('');
  const [buroReport, setBuroReport] = useState(null);

  // Edit Client Modal
  const [showEditClientModal, setShowEditClientModal] = useState(false);
  const [editClientName, setEditClientName] = useState('');
  const [editClientPhone, setEditClientPhone] = useState('');
  const [editClientNotes, setEditClientNotes] = useState('');
  const [editClientRiskTag, setEditClientRiskTag] = useState('');
  const [editClientError, setEditClientError] = useState('');

  // Delete confirmation
  const [confirmDeleteLoan, setConfirmDeleteLoan] = useState(null);
  const [confirmDeleteClient, setConfirmDeleteClient] = useState(null);

  const receiptRef = useRef(null);

  // Helper fetch wrapper to inject Bearer token automatically
  const authenticatedFetch = async (url, options = {}) => {
    const headers = {
      ...options.headers,
      'Authorization': `Bearer ${token}`
    };
    return fetch(url, { ...options, headers });
  };

  // Safe formatting function to prevent NaN/Infinity crashes
  const formatCurrency = (val) => {
    const num = parseFloat(val);
    if (isNaN(num) || !isFinite(num)) return '0.00';
    return num.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // Fetch App Configuration
  const fetchConfig = async () => {
    if (!token) return;
    try {
      const res = await authenticatedFetch('/api/config');
      if (res.ok) {
        setApiError(''); // clear error if successful
        try {
          const data = await res.json();
          if (data && typeof data === 'object') {
            setConfig(data);
            
            // Sync local storage
            localStorage.setItem('local_app_name', data.nombre_app);
            localStorage.setItem('local_primary_color', data.colores?.primary || '#ff3b30');

            // Synchronize inputs
            setConfigAppName(data.nombre_app);
            setConfigPrimaryColor(data.colores?.primary || '#ff3b30');
            setConfigWeeklyRate(data.tasa_semanal);
            setConfigMonthlyRate(data.tasa_mensual_default);
            setConfigCapitalInicial(data.capital_inicial.toString());
          }
        } catch (jsonErr) {
          setApiError('Error de formato de API. ¿Subiste el archivo vercel.json?');
        }
      } else {
        setApiError('El servidor retornó un error al cargar la configuración.');
      }
    } catch (err) {
      setApiError('No se pudo conectar al servidor. Render puede estar despertando (espera 1 min).');
    }
  };

  // Refresh data
  const refreshData = async () => {
    if (!token) return;
    try {
      await fetchConfig();

      const dashRes = await authenticatedFetch('/api/dashboard');
      if (dashRes.ok) {
        try {
          const stats = await dashRes.json();
          if (stats && typeof stats === 'object') {
            setDashboardStats(stats);
          }
        } catch (e) {
          console.error('Error parsing dashboard JSON:', e);
        }
      }

      const clientsRes = await authenticatedFetch('/api/clientes');
      if (clientsRes.ok) {
        try {
          const clientsData = await clientsRes.json();
          if (Array.isArray(clientsData)) {
            setClients(clientsData);
          }
        } catch (e) {
          console.error('Error parsing clients JSON:', e);
        }
      }

      const loansRes = await authenticatedFetch('/api/prestamos');
      if (loansRes.ok) {
        try {
          const loansData = await loansRes.json();
          if (Array.isArray(loansData)) {
            setLoans(loansData);
          }
        } catch (e) {
          console.error('Error parsing loans JSON:', e);
        }
      }
    } catch (err) {
      console.error('Error refreshing data:', err);
    }
  };

  // Load Google button in login screen
  useEffect(() => {
    if (!token) {
      const initGoogleLogin = () => {
        if (typeof window.google !== 'undefined') {
          window.google.accounts.id.initialize({
            client_id: configGoogleClientId,
            callback: handleGoogleLoginCallback
          });
          window.google.accounts.id.renderButton(
            document.getElementById("google-signin-btn"),
            { theme: "dark", size: "large", width: "100%", text: "signin_with" }
          );
        }
      };
      const timer = setTimeout(initGoogleLogin, 1000);
      return () => clearTimeout(timer);
    }
  }, [token, loginMethod, configGoogleClientId]);

  // Handle data reload on login state change
  useEffect(() => {
    if (token) {
      refreshData();
    }
  }, [token]);

  // Handle live client search by cédula inside the Add Loan Form
  const handleLoanClientCedulaChange = async (e) => {
    const inputVal = e.target.value;
    setLoanClientCedulaInput(inputVal);
    setBuroReport(null);

    const cleanedInput = inputVal.replace(/[-\s]/g, '');
    if (cleanedInput.length >= 3) {
      const found = clients.find(c => c.cedula.replace(/[-\s]/g, '') === cleanedInput);
      setMatchedClient(found || null);
    } else {
      setMatchedClient(null);
    }

    // Fetch cross-user credit bureau report when cedula is long enough
    if (cleanedInput.length >= 5) {
      try {
        const res = await authenticatedFetch(`/api/buro/${encodeURIComponent(cleanedInput)}`);
        if (res.ok) {
          const data = await res.json();
          setBuroReport(data);
        }
      } catch (_) {
        // Silent fail — bureau is informational only
      }
    }
  };

  // Google Login Callback
  const handleGoogleLoginCallback = async (response) => {
    setLoginError('');
    try {
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: response.credential })
      });
      
      try {
        const data = await res.json();
        if (res.ok && data.success) {
          localStorage.setItem('token', data.token);
          localStorage.setItem('user_profile', JSON.stringify(data.user));
          setToken(data.token);
          setUserProfile(data.user);
          setCurrentView('dashboard');
        } else {
          setLoginError(data.error || 'Autenticación con Google falló');
        }
      } catch (jsonErr) {
        setLoginError('Error de red: La API de Vercel no está enlazada al Backend de Render. ¿Subiste el archivo vercel.json?');
      }
    } catch (err) {
      setLoginError('Error conectando con el servidor de autenticación');
    }
  };

  // Local Dev Login
  const handleLocalLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      
      try {
        const data = await res.json();
        if (res.ok && data.success) {
          localStorage.setItem('token', data.token);
          localStorage.setItem('user_profile', JSON.stringify(data.user));
          setToken(data.token);
          setUserProfile(data.user);
          setCurrentView('dashboard');
        } else {
          setLoginError(data.message || 'Usuario o contraseña incorrectos');
        }
      } catch (jsonErr) {
        setLoginError('Error de red: Vercel no redirige al Backend. Sube el archivo vercel.json a GitHub.');
      }
    } catch (err) {
      setLoginError('Error al conectar con el servidor. Render puede estar iniciando.');
    }
  };

  // Handle Logout
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user_profile');
    setToken('');
    setUserProfile(null);
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
      const res = await authenticatedFetch('/api/clientes', {
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
        setClientFormError('¡Cédula duplicada! Cargando historial de cliente...');
        setTimeout(() => {
          setShowAddClientModal(false);
          setClientFormError('');
          setSelectedClient(data.client);
          setEditingNotes(data.client.notes || '');
          setCurrentView('clientes');
        }, 2000);
      } else {
        setClientFormError(data.error || 'Error al registrar cliente');
      }
    } catch (err) {
      setClientFormError('Error de red al registrar cliente');
    }
  };

  // Update notes
  const handleUpdateNotes = async () => {
    try {
      const res = await authenticatedFetch(`/api/clientes/${selectedClient.id}/notes`, {
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

  // Open edit modal pre-filled with current client data
  const handleEditClient = (client) => {
    setEditClientName(client.name || '');
    setEditClientPhone(client.phone || '');
    setEditClientNotes(client.notes || '');
    setEditClientRiskTag(client.riskTag || '');
    setEditClientError('');
    setShowEditClientModal(true);
  };

  // Save edits to a client
  const handleSaveEditClient = async (e) => {
    e.preventDefault();
    setEditClientError('');
    if (!editClientName || !editClientPhone) {
      setEditClientError('Nombre y teléfono son obligatorios');
      return;
    }
    try {
      const res = await authenticatedFetch(`/api/clientes/${selectedClient.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editClientName,
          phone: editClientPhone,
          notes: editClientNotes,
          riskTag: editClientRiskTag
        })
      });
      if (res.ok) {
        const updated = await res.json();
        setSelectedClient(prev => ({ ...prev, ...updated }));
        setShowEditClientModal(false);
        refreshData();
      } else {
        setEditClientError('Error al guardar cambios');
      }
    } catch (err) {
      setEditClientError('Error de red al guardar');
    }
  };

  // Delete client (and all their loans)
  const handleDeleteClient = async (clientId) => {
    try {
      const res = await authenticatedFetch(`/api/clientes/${clientId}`, { method: 'DELETE' });
      if (res.ok) {
        setSelectedClient(null);
        setConfirmDeleteClient(null);
        refreshData();
      }
    } catch (err) {
      console.error('Error eliminando cliente:', err);
    }
  };

  // Delete a single loan
  const handleDeleteLoan = async (loanId) => {
    try {
      const res = await authenticatedFetch(`/api/prestamos/${loanId}`, { method: 'DELETE' });
      if (res.ok) {
        setSelectedLoan(null);
        setConfirmDeleteLoan(null);
        refreshData();
      }
    } catch (err) {
      console.error('Error eliminando préstamo:', err);
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

    if (!matchedClient) {
      setLoanFormError('Debe ingresar una cédula válida de un cliente registrado');
      return;
    }

    if (!loanAmount || !loanDuration || !loanInterestRate) {
      setLoanFormError('Por favor complete todos los datos del préstamo');
      return;
    }

    try {
      const res = await authenticatedFetch('/api/prestamos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: matchedClient.id,
          amount: loanAmount,
          type: loanType,
          interestRate: loanInterestRate,
          installmentsCount: loanDuration
        })
      });

      if (res.status === 201) {
        setLoanFormSuccess('¡Préstamo creado con éxito!');
        setLoanAmount('');
        setLoanClientCedulaInput('');
        setMatchedClient(null);
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
      const res = await authenticatedFetch('/api/pagos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ loanId, installmentNumber, amountPaid: amount })
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedLoan(data.loan);
        
        const instDetails = data.paidInstallment;
        
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

  // Generate PNG
  const handleDownloadReceipt = () => {
    if (!receiptRef.current) return;
    html2canvas(receiptRef.current, { scale: 2 }).then(canvas => {
      const link = document.createElement('a');
      link.download = `Recibo_Cuota_${activeReceipt.installmentNumber}_${activeReceipt.clientName.replace(/\s+/g, '_')}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    });
  };

  // Print
  const handlePrintReceipt = () => {
    const printContent = receiptRef.current.innerHTML;
    const originalContent = document.body.innerHTML;
    
    document.body.innerHTML = `
      <div style="font-family: monospace; padding: 40px; max-width: 400px; margin: 0 auto; color: #000000; background: #ffffff;">
        ${printContent}
      </div>
    `;
    window.print();
    document.body.innerHTML = originalContent;
    window.location.reload();
  };

  // Send WhatsApp
  const handleSendWhatsApp = () => {
    if (!activeReceipt) return;
    const phone = activeReceipt.phone.replace(/[^0-9]/g, '');
    const message = `Hola ${activeReceipt.clientName}, recibimos tu pago de RD$${activeReceipt.amountPaid.toLocaleString('es-DO', { minimumFractionDigits: 2 })}. Cuota #${activeReceipt.installmentNumber}. Balance restante RD$${activeReceipt.remainingBalance.toLocaleString('es-DO', { minimumFractionDigits: 2 })}. Gracias.`;
    const encodedText = encodeURIComponent(message);
    window.open(`https://wa.me/${phone.startsWith('1') ? phone : '1' + phone}?text=${encodedText}`, '_blank');
  };

  // Save config
  const handleSaveConfig = async (e) => {
    e.preventDefault();
    setConfigSuccess('');
    
    localStorage.setItem('google_client_id', configGoogleClientId);
    localStorage.setItem('local_app_name', configAppName);
    localStorage.setItem('local_primary_color', configPrimaryColor);

    try {
      const res = await authenticatedFetch('/api/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre_app: configAppName,
          colores: { ...config.colores, primary: configPrimaryColor },
          tasa_semanal: parseFloat(configWeeklyRate),
          tasa_mensual_default: parseFloat(configMonthlyRate),
          capital_inicial: parseFloat(configCapitalInicial),
          logoBase64: configLogoFile
        })
      });

      if (res.ok) {
        const data = await res.json();
        setConfig(data);
        setConfigSuccess('Configuración guardada correctamente.');
        setTimeout(() => setConfigSuccess(''), 2500);
        refreshData();
      }
    } catch (err) {
      alert('Error guardando configuración');
    }
  };

  // Handle Login Setup
  const handleSaveLoginSetup = (e) => {
    e.preventDefault();
    localStorage.setItem('google_client_id', configGoogleClientId);
    localStorage.setItem('local_app_name', configAppName);
    localStorage.setItem('local_primary_color', configPrimaryColor);
    
    setConfig(prev => ({
      ...prev,
      nombre_app: configAppName,
      colores: { ...prev.colores, primary: configPrimaryColor }
    }));
    
    setShowLoginSetupModal(false);
    window.location.reload();
  };

  // Logo File upload
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

  // Filtered clients list for the Clients view (by cédula or name search)
  const filteredClientsList = Array.isArray(clients)
    ? clients.filter(client => {
        if (!searchCedula) return true;
        const q = searchCedula.toLowerCase().replace(/[-\s]/g, '');
        const name = (client.name || '').toLowerCase();
        const cedula = (client.cedula || '').replace(/[-\s]/g, '');
        return name.includes(q) || cedula.includes(q);
      })
    : [];

  const quickInterest = parseFloat(loanAmount || 0) * (parseFloat(loanInterestRate || 0) / 100);
  const quickTotal = parseFloat(loanAmount || 0) + quickInterest;
  const quickInstallment = quickTotal / parseInt(loanDuration || 1);

  const customStyles = {
    '--primary': config.colores?.primary || '#ff3b30',
    '--primary-rgb': config.colores?.primary ? hexToRgb(config.colores.primary) : '255, 59, 48',
    '--background': config.colores?.background || '#0a0a0c',
    '--card': config.colores?.card || '#16161a',
    '--text': config.colores?.text || '#ffffff'
  };

  function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '255, 59, 48';
  }

  // AUTH VIEW
  if (!token) {
    return (
      <div className="app-container animate-fade-in" style={customStyles}>
        
        {/* Floating Setup Gear on Login Screen */}
        <button 
          onClick={() => setShowLoginSetupModal(true)} 
          className="btn-secondary" 
          style={{ position: 'absolute', top: 16, right: 16, width: 'auto', padding: 8, borderRadius: '50%', border: 'none', cursor: 'pointer', background: 'rgba(255,255,255,0.05)' }}
          title="Configurar credenciales de Google y Branding"
        >
          <Settings size={18} />
        </button>

        <div className="login-view">
          <img className="login-logo" src={config.logo || '/assets/logo.png'} alt="Fintech Logo" onError={(e) => {e.target.src = '/assets/logo.png'}} />
          <div className="login-header">
            <h1>{config.nombre_app}</h1>
            <p className="text-muted">Ingresa a tu panel de control de préstamos</p>
          </div>

          <div className="login-card">
            {loginError && <div style={{ color: '#ff3b30', marginBottom: 15, fontSize: 13, fontWeight: 'bold', textAlign: 'center' }}>{loginError}</div>}
            
            {/* Login Method Toggle */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 20, borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>
              <button
                onClick={() => { setLoginMethod('google'); setLoginError(''); }}
                className="btn-secondary"
                style={{ flex: 1, padding: 8, fontSize: 12, borderRadius: 8, backgroundColor: loginMethod === 'google' ? 'rgba(255,255,255,0.08)' : 'transparent', border: loginMethod === 'google' ? '1px solid var(--primary)' : 'none' }}
              >
                Cuenta Google
              </button>
              <button
                onClick={() => { setLoginMethod('local'); setLoginError(''); }}
                className="btn-secondary"
                style={{ flex: 1, padding: 8, fontSize: 12, borderRadius: 8, backgroundColor: loginMethod === 'local' ? 'rgba(255,255,255,0.08)' : 'transparent', border: loginMethod === 'local' ? '1px solid var(--primary)' : 'none' }}
              >
                Acceso Admin
              </button>
            </div>

            {loginMethod === 'google' ? (
              <div style={{ padding: '10px 0', textAlign: 'center' }}>
                <div style={{ marginBottom: 16, fontSize: 13, color: 'var(--text-muted)' }}>
                  Accede de manera rápida con tu cuenta de Google. Cada cuenta tendrá sus propios clientes y préstamos de forma independiente.
                </div>
                <div id="google-signin-btn" style={{ minHeight: 40, display: 'flex', justifyContent: 'center' }}></div>
                
                <div style={{ marginTop: 20, padding: 8, background: 'rgba(255,255,255,0.02)', borderRadius: 8, fontSize: 11, color: 'var(--text-muted)' }}>
                  <span>Si el botón de Google muestra un error, haz clic en el engranaje ⚙️ de arriba para configurar tu Client ID o usa el **Acceso Admin** de pruebas.</span>
                </div>
              </div>
            ) : (
              <form onSubmit={handleLocalLogin}>
                <div className="form-group">
                  <label className="form-label">Usuario Admin</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="admin"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
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
                    required
                  />
                </div>
                <button type="submit" className="btn btn-primary">
                  Ingresar como Administrador
                </button>
              </form>
            )}
          </div>
          <div style={{ marginTop: 24, fontSize: 11, color: 'rgba(255,255,255,0.2)' }}>
            FINTECH LOAN MANAGER © 2026
          </div>
        </div>

        {/* SETUP MODAL DIRECTLY FROM LOGIN SCREEN */}
        {showLoginSetupModal && (
          <div className="modal-backdrop" onClick={() => setShowLoginSetupModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h2 style={{ margin: 0, fontSize: 18 }}>Configuración Rápida</h2>
                <button onClick={() => setShowLoginSetupModal(false)} className="btn-secondary" style={{ width: 'auto', padding: '4px 8px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 11 }}>Cerrar</button>
              </div>

              <form onSubmit={handleSaveLoginSetup} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Nombre de tu App</label>
                  <input 
                    type="text" 
                    className="form-control"
                    value={configAppName}
                    onChange={(e) => setConfigAppName(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Color Principal</label>
                  <input 
                    type="color" 
                    className="form-control"
                    style={{ height: 40, cursor: 'pointer', padding: 2 }}
                    value={configPrimaryColor}
                    onChange={(e) => setConfigPrimaryColor(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Google Client ID</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    style={{ fontSize: 11, fontFamily: 'monospace' }}
                    placeholder="Escribe tu ID de Google aquí..."
                    value={configGoogleClientId}
                    onChange={(e) => setConfigGoogleClientId(e.target.value)}
                  />
                </div>
                <button type="submit" className="btn btn-primary">
                  Aplicar y Recargar
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="app-container" style={customStyles}>
      
      {/* Network / Connection Warning Banner */}
      {apiError && (
        <div style={{ background: '#ff3b30', color: 'white', padding: '8px 12px', fontSize: 11, fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 6, zIndex: 100 }}>
          <WifiOff size={14} />
          <span>{apiError}</span>
        </div>
      )}

      {/* Premium Header */}
      <header className="app-header">
        <div className="app-brand">
          <img className="app-logo" src={config.logo || '/assets/logo.png'} alt="Logo" onError={(e) => {e.target.src = '/assets/logo.png'}} />
          <div>
            <span className="app-name" style={{ display: 'block', color: 'var(--text)' }}>{config.nombre_app}</span>
            {userProfile && (
              <span style={{ fontSize: 10, color: 'var(--text-muted)', display: 'block' }}>{userProfile.email}</span>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {userProfile && userProfile.picture && (
            <img 
              src={userProfile.picture} 
              alt="Profile" 
              style={{ width: 28, height: 28, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.2)' }} 
            />
          )}
          <button onClick={handleLogout} className="btn-secondary" style={{ padding: '6px 10px', borderRadius: 8, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
            <LogOut size={13} />
            <span style={{ fontSize: 11, fontWeight: 600 }}>Salir</span>
          </button>
        </div>
      </header>

      {/* Main Container View */}
      <main className="view-content">
        
        {/* ========================================================================= */}
        {/* DASHBOARD VIEW */}
        {/* ========================================================================= */}
        {currentView === 'dashboard' && (
          <div className="animate-fade-in">
            
            <div style={{ marginBottom: 20 }}>
              <p className="text-muted" style={{ fontSize: 12, textTransform: 'uppercase', fontWeight: 600, letterSpacing: 0.5 }}>
                Hola, {userProfile?.name?.split(' ')[0] || 'Administrador'}
              </p>
              <h1 style={{ margin: '2px 0 0 0', fontSize: 24, color: 'var(--text)' }}>Resumen de Fondos</h1>
            </div>

            {/* Main Bank Capital Card */}
            <div className="card" style={{ background: 'linear-gradient(135deg, rgba(var(--primary-rgb), 0.25) 0%, rgba(10,10,12,0.6) 100%)', borderColor: 'rgba(var(--primary-rgb), 0.35)', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', right: -20, bottom: -20, opacity: 0.05, transform: 'scale(2.5)' }}>
                <Landmark size={80} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <Landmark size={18} style={{ color: 'var(--primary)' }} />
                <span className="stat-label" style={{ color: 'var(--text-muted)' }}>Capital Disponible (Banco)</span>
              </div>
              <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: -1, color: 'var(--text)' }}>
                RD$ {formatCurrency(dashboardStats.capitalDisponible)}
              </div>
              <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted)', borderTop: '1px solid var(--border)', paddingTop: 10 }}>
                <span>Fondo Inicial: RD$ {formatCurrency(config.capital_inicial)}</span>
                <span>En Circulación: RD$ {formatCurrency(Math.max(0, dashboardStats.totalPrestado - dashboardStats.totalCobrado))}</span>
              </div>
            </div>

            {/* Financial Grid */}
            <div className="dashboard-stats">
              <div className="stat-card">
                <span className="stat-label" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <TrendingUp size={12} style={{ color: 'var(--primary)' }} />
                  Total Prestado
                </span>
                <span className="stat-value" style={{ color: 'var(--text)' }}>RD$ {formatCurrency(dashboardStats.totalPrestado)}</span>
              </div>
              <div className="stat-card">
                <span className="stat-label" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <CheckCircle2 size={12} style={{ color: 'var(--success)' }} />
                  Total Cobrado
                </span>
                <span className="stat-value" style={{ color: 'var(--success)' }}>RD$ {formatCurrency(dashboardStats.totalCobrado)}</span>
              </div>
            </div>

            {/* Gains Grid */}
            <div className="dashboard-stats">
              <div className="stat-card">
                <span className="stat-label">Intereses Cobrados</span>
                <span className="stat-value" style={{ color: '#007aff' }}>RD$ {formatCurrency(dashboardStats.gananciasInteres)}</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">Ganancias Esperadas</span>
                <span className="stat-value" style={{ color: '#ff9500' }}>RD$ {formatCurrency(dashboardStats.gananciasEsperadas)}</span>
              </div>
            </div>

            {/* Client Indicators */}
            <div className="dashboard-stats" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <div className="stat-card" style={{ borderLeft: '3px solid var(--success)' }}>
                <span className="stat-label">Clientes Activos</span>
                <span className="stat-value" style={{ fontSize: 22, color: 'var(--text)' }}>{dashboardStats.clientesActivos}</span>
              </div>
              <div className="stat-card" style={{ borderLeft: '3px solid var(--danger)' }}>
                <span className="stat-label">Clientes Morosos</span>
                <span className="stat-value" style={{ color: 'var(--danger)', fontSize: 22 }}>{dashboardStats.clientesMorosos}</span>
              </div>
            </div>

            {/* Quick Actions Panel */}
            <div className="card" style={{ padding: 16 }}>
              <h3 style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', marginBottom: 12, color: 'var(--text-muted)', letterSpacing: 0.5 }}>
                Acción Rápida
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <button onClick={() => setShowAddClientModal(true)} className="btn btn-secondary" style={{ fontSize: 12, padding: 10 }}>
                  <Plus size={14} />
                  Nuevo Cliente
                </button>
                <button onClick={() => setShowAddLoanModal(true)} className="btn btn-primary" style={{ fontSize: 12, padding: 10 }}>
                  <HandCoins size={14} />
                  Crear Préstamo
                </button>
              </div>
            </div>

            {dashboardStats.clientesMorosos > 0 && (
              <div style={{ background: 'rgba(255,59,48,0.08)', border: '1px solid rgba(255,59,48,0.15)', padding: 12, borderRadius: 12, display: 'flex', alignItems: 'center', gap: 8, color: '#ff453a' }}>
                <AlertTriangle size={16} />
                <span style={{ fontSize: 12, fontWeight: 600 }}>Alerta: Tienes {dashboardStats.clientesMorosos} cliente(s) en estado moroso.</span>
              </div>
            )}

          </div>
        )}

        {/* ========================================================================= */}
        {/* CLIENTES VIEW */}
        {/* ========================================================================= */}
        {currentView === 'clientes' && (
          <div className="animate-fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <p className="text-muted" style={{ fontSize: 12, textTransform: 'uppercase', fontWeight: 600 }}>Gestión de Préstamos</p>
                <h1 style={{ margin: 0, fontSize: 24, color: 'var(--text)' }}>Clientes</h1>
              </div>
              <button onClick={() => setShowAddClientModal(true)} className="btn btn-primary" style={{ width: 'auto', padding: '8px 12px', borderRadius: 8, fontSize: 12 }}>
                <Plus size={14} />
                Nuevo
              </button>
            </div>

            <div className="form-group" style={{ position: 'relative' }}>
              <input
                type="text"
                className="form-control"
                style={{ paddingLeft: 40, height: 44, fontSize: 14 }}
                placeholder="Buscar por cédula o nombre..."
                value={searchCedula}
                onChange={(e) => setSearchCedula(e.target.value)}
              />
              <Search size={16} className="text-muted" style={{ position: 'absolute', left: 14, top: 14 }} />
            </div>

            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              {filteredClientsList.length === 0 ? (
                <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                  No se encontraron clientes en tu cartera.
                </div>
              ) : (
                filteredClientsList.map(client => (
                  <div key={client.id} className="list-item" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                      onClick={() => { setSelectedClient(client); setEditingNotes(client.notes || ''); }}>
                      <div style={{ flex: 1, cursor: 'pointer' }}>
                        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2, color: 'var(--text)' }}>{client.name}</div>
                        <div className="text-muted" style={{ fontSize: 11 }}>Ced: {client.cedula} | {client.phone}</div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'end', gap: 4 }}>
                        {/* Manual risk tag badge (priority) or computed risk */}
                        {client.riskTag ? (
                          <span style={{
                            fontSize: 9, padding: '2px 10px', borderRadius: 20, fontWeight: 800,
                            background: client.riskTag === 'bueno' ? '#34c759' : client.riskTag === 'malo' ? '#ff3b30' : '#ff9f0a',
                            color: '#fff', textTransform: 'uppercase'
                          }}>
                            {client.riskTag === 'entre_dos' ? 'Entre Dos' : client.riskTag}
                          </span>
                        ) : (
                          <span className={`badge badge-risk-${client.riskLevel}`} style={{ fontSize: 9, padding: '2px 8px' }}>
                            {client.riskLevel}
                          </span>
                        )}
                      </div>
                    </div>
                    {/* Action buttons row */}
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleEditClient(client); setSelectedClient(client); }}
                        style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '6px 0', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: 'var(--text)', cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>
                        <Pencil size={11} /> Editar
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setConfirmDeleteClient(client); }}
                        style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '6px 0', borderRadius: 8, border: '1px solid rgba(255,59,48,0.25)', background: 'rgba(255,59,48,0.07)', color: '#ff453a', cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>
                        <Trash2 size={11} /> Eliminar
                      </button>
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <p className="text-muted" style={{ fontSize: 12, textTransform: 'uppercase', fontWeight: 600 }}>Operaciones</p>
                <h1 style={{ margin: 0, fontSize: 24, color: 'var(--text)' }}>Historial Préstamos</h1>
              </div>
              <button onClick={() => setShowAddLoanModal(true)} className="btn btn-primary" style={{ width: 'auto', padding: '8px 12px', borderRadius: 8, fontSize: 12 }}>
                <Plus size={14} />
                Crear
              </button>
            </div>

            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              {loans.length === 0 ? (
                <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                  No hay préstamos activos registrados.
                </div>
              ) : (
                loans.map(loan => (
                  <div key={loan.id} className="list-item" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                      onClick={() => setSelectedLoan(loan)}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2, color: 'var(--text)' }}>{loan.client?.name || 'Cliente'}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          {loan.type === 'semanal' ? 'Semanal' : 'Mensual'} | Tasa: {loan.interestRate}%
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'end', gap: 4 }}>
                        <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)' }}>RD$ {formatCurrency(loan.amount)}</div>
                        <span className={`badge ${loan.status === 'pagado' ? 'badge-status-pagado' : 'badge-status-pendiente'}`} style={{ fontSize: 9, padding: '2px 8px' }}>
                          {loan.status === 'pagado' ? 'Saldado' : `Resto: RD$ ${formatCurrency(loan.remainingBalance)}`}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); setConfirmDeleteLoan(loan); }}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '5px 0', borderRadius: 8, border: '1px solid rgba(255,59,48,0.25)', background: 'rgba(255,59,48,0.07)', color: '#ff453a', cursor: 'pointer', fontSize: 11, fontWeight: 600, width: '100%' }}>
                      <Trash2 size={11} /> Eliminar Préstamo
                    </button>
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
            <div style={{ marginBottom: 16 }}>
              <p className="text-muted" style={{ fontSize: 12, textTransform: 'uppercase', fontWeight: 600 }}>Personalización</p>
              <h1 style={{ fontSize: 24, color: 'var(--text)' }}>Ajustes y Marca</h1>
            </div>

            <form onSubmit={handleSaveConfig} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {configSuccess && <div style={{ color: 'var(--success)', fontSize: 12, fontWeight: 'bold' }}>{configSuccess}</div>}
              
              <div className="form-group">
                <label className="form-label">Nombre del Negocio</label>
                <input
                  type="text"
                  className="form-control"
                  value={configAppName}
                  onChange={(e) => setConfigAppName(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Capital Inicial / Fondo de Caja (RD$)</label>
                <input
                  type="number"
                  className="form-control"
                  placeholder="100000"
                  value={configCapitalInicial}
                  onChange={(e) => setConfigCapitalInicial(e.target.value)}
                />
                <p className="text-muted" style={{ fontSize: 10, marginTop: 4 }}>Este capital determina el "Capital Disponible" en el dashboard.</p>
              </div>

              <div className="form-group">
                <label className="form-label">Google OAuth Client ID</label>
                <input
                  type="text"
                  className="form-control"
                  style={{ fontFamily: 'monospace', fontSize: 12 }}
                  placeholder="Tu Client ID de Google Console..."
                  value={configGoogleClientId}
                  onChange={(e) => setConfigGoogleClientId(e.target.value)}
                />
                <p className="text-muted" style={{ fontSize: 10, marginTop: 4 }}>Guarda tu ID de cliente de Google para activar el Login en producción.</p>
              </div>

              <div className="form-group">
                <label className="form-label">Logotipo de la Fintech</label>
                <input
                  type="file"
                  className="form-control"
                  accept="image/*"
                  onChange={handleLogoUpload}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Color Principal</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <input
                    type="color"
                    className="form-control"
                    style={{ width: 50, height: 40, padding: 3, cursor: 'pointer' }}
                    value={configPrimaryColor}
                    onChange={(e) => setConfigPrimaryColor(e.target.value)}
                  />
                  <span style={{ fontSize: 13, fontFamily: 'monospace', color: 'var(--text)' }}>{configPrimaryColor}</span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div className="form-group">
                  <label className="form-label">Tasa Semanal (%)</label>
                  <input
                    type="number"
                    className="form-control"
                    value={configWeeklyRate}
                    onChange={(e) => setConfigWeeklyRate(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Tasa Mensual (%)</label>
                  <input
                    type="number"
                    className="form-control"
                    value={configMonthlyRate}
                    onChange={(e) => setConfigMonthlyRate(e.target.value)}
                  />
                </div>
              </div>

              <button type="submit" className="btn btn-primary" style={{ marginTop: 6 }}>
                Guardar Configuración
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
          <span>Configuración</span>
        </button>
      </nav>

      {/* ========================================================================= */}
      {/* MODAL: REGISTRAR CLIENTE */}
      {/* ========================================================================= */}
      {showAddClientModal && (
        <div className="modal-backdrop" onClick={() => setShowAddClientModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ margin: 0, fontSize: 18, color: 'var(--text)' }}>Registrar Cliente</h2>
              <button onClick={() => setShowAddClientModal(false)} className="btn-secondary" style={{ width: 'auto', padding: '4px 8px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 11 }}>Cerrar</button>
            </div>
            
            <form onSubmit={handleAddClient} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {clientFormError && <div style={{ color: '#ff3b30', fontSize: 12, fontWeight: 'bold' }}>{clientFormError}</div>}
              {clientFormSuccess && <div style={{ color: 'var(--success)', fontSize: 12, fontWeight: 'bold' }}>{clientFormSuccess}</div>}
              
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
                <label className="form-label">Cédula (Obligatoria)</label>
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
                <label className="form-label">Notas / Observaciones Internas</label>
                <textarea
                  className="form-control"
                  placeholder="Información interna relevante sobre este cliente..."
                  value={newClientNotes}
                  onChange={(e) => setNewClientNotes(e.target.value)}
                  rows="3"
                />
              </div>
              <button type="submit" className="btn btn-primary" style={{ marginTop: 6 }}>
                Guardar Cliente
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CREAR PRESTAMO (SMART CÉDULA SEARCH) */}
      {/* ========================================================================= */}
      {showAddLoanModal && (
        <div className="modal-backdrop" onClick={() => setShowAddLoanModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ margin: 0, fontSize: 18, color: 'var(--text)' }}>Aprobar Préstamo</h2>
              <button onClick={() => setShowAddLoanModal(false)} className="btn-secondary" style={{ width: 'auto', padding: '4px 8px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 11 }}>Cerrar</button>
            </div>

            <form onSubmit={handleAddLoan} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {loanFormError && <div style={{ color: '#ff3b30', fontSize: 12, fontWeight: 'bold' }}>{loanFormError}</div>}
              {loanFormSuccess && <div style={{ color: 'var(--success)', fontSize: 12, fontWeight: 'bold' }}>{loanFormSuccess}</div>}

              {/* Input for Client Cédula Search */}
              <div className="form-group">
                <label className="form-label">Cédula del Cliente</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Introduce la cédula para buscar..."
                  value={loanClientCedulaInput}
                  onChange={handleLoanClientCedulaChange}
                  required
                />
              </div>

              {/* Dynamic matched client result box */}
              {loanClientCedulaInput && (
                <div style={{ marginTop: -4, marginBottom: 8 }}>
                  {matchedClient ? (
                    <div style={{ padding: 12, background: 'rgba(52, 199, 89, 0.08)', border: '1px solid rgba(52, 199, 89, 0.25)', borderRadius: 12 }}>
                      <div style={{ fontSize: 11, fontWeight: 'bold', color: 'var(--success)', textTransform: 'uppercase', marginBottom: 4 }}>🟢 Cliente Encontrado</div>
                      <div style={{ fontWeight: 'bold', fontSize: 14, color: 'var(--text)' }}>{matchedClient.name}</div>
                      <div className="text-muted" style={{ fontSize: 12, marginTop: 2 }}>
                        Teléfono: {matchedClient.phone} | Riesgo: <span style={{ fontWeight: 'bold', textTransform: 'capitalize' }}>{matchedClient.riskLevel}</span>
                      </div>
                    </div>
                  ) : (
                    <div style={{ padding: 12, background: 'rgba(255, 59, 48, 0.08)', border: '1px solid rgba(255, 59, 48, 0.25)', borderRadius: 12, color: '#ff453a', fontSize: 12 }}>
                      🔴 Cédula no registrada en la base de datos. Debes crear el cliente primero.
                    </div>
                  )}
                </div>
              )}

              {/* ── BURÓ DE CRÉDITO INTERNO ── */}
              {buroReport && buroReport.found && (
                <div style={{
                  padding: 14,
                  borderRadius: 12,
                  border: `1px solid ${buroReport.riesgo === 'moroso' ? 'rgba(255,59,48,0.4)' : buroReport.riesgo === 'regular' ? 'rgba(255,159,10,0.4)' : 'rgba(52,199,89,0.4)'}`,
                  background: buroReport.riesgo === 'moroso' ? 'rgba(255,59,48,0.07)' : buroReport.riesgo === 'regular' ? 'rgba(255,159,10,0.07)' : 'rgba(52,199,89,0.07)',
                  marginBottom: 4
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.08em' }}>
                      🏦 Buró de Crédito Interno
                    </span>
                    <span style={{
                      fontSize: 11, fontWeight: 800, padding: '3px 10px', borderRadius: 20,
                      background: buroReport.riesgo === 'moroso' ? '#ff3b30' : buroReport.riesgo === 'regular' ? '#ff9f0a' : '#34c759',
                      color: '#fff', textTransform: 'uppercase', letterSpacing: '0.05em'
                    }}>
                      {buroReport.riesgo === 'moroso' ? '⚠️ MOROSO' : buroReport.riesgo === 'regular' ? '⚡ ATRASOS' : '✅ BUEN PAGADOR'}
                    </span>
                  </div>
                  {buroReport.prestamosTotal === 0 ? (
                    <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>
                      Esta cédula tiene historial en el sistema pero sin préstamos registrados aún.
                    </p>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, textAlign: 'center' }}>
                      <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '8px 4px' }}>
                        <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)' }}>{buroReport.prestamosTotal}</div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Préstamos</div>
                      </div>
                      <div style={{ background: 'rgba(52,199,89,0.1)', borderRadius: 8, padding: '8px 4px' }}>
                        <div style={{ fontSize: 20, fontWeight: 800, color: '#34c759' }}>{buroReport.alDia}</div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Al día</div>
                      </div>
                      <div style={{ background: buroReport.enMora > 0 ? 'rgba(255,59,48,0.1)' : 'rgba(255,159,10,0.08)', borderRadius: 8, padding: '8px 4px' }}>
                        <div style={{ fontSize: 20, fontWeight: 800, color: buroReport.enMora > 0 ? '#ff3b30' : '#ff9f0a' }}>
                          {buroReport.enMora > 0 ? buroReport.enMora : buroReport.conAtraso}
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{buroReport.enMora > 0 ? 'En mora' : 'Con atraso'}</div>
                      </div>
                    </div>
                  )}
                  <p style={{ margin: '8px 0 0', fontSize: 10, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    ℹ️ Reporte anónimo — no se revela quién prestó ni montos. Tú decides si aprobar.
                  </p>
                </div>
              )}

              {buroReport && !buroReport.found && loanClientCedulaInput.replace(/[-\s]/g, '').length >= 5 && (
                <div style={{ padding: 10, borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>
                  🆕 <strong style={{ color: 'var(--text)' }}>Primera vez en el sistema.</strong> Esta cédula no tiene historial en ningún prestamista de la plataforma.
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Monto (RD$)</label>
                <input
                  type="number"
                  className="form-control"
                  placeholder="Monto a prestar..."
                  value={loanAmount}
                  onChange={(e) => setLoanAmount(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div className="form-group">
                  <label className="form-label">Frecuencia</label>
                  <select
                    className="form-control form-select"
                    value={loanType}
                    onChange={(e) => setLoanType(e.target.value)}
                  >
                    <option value="semanal">Semanal</option>
                    <option value="mensual">Mensual</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Plazo</label>
                  {loanType === 'semanal' ? (
                    <select
                      className="form-control form-select"
                      value={loanDuration}
                      onChange={(e) => setLoanDuration(e.target.value)}
                    >
                      <option value="4">4 Semanas</option>
                      <option value="6">6 Semanas</option>
                      <option value="8">8 Semanas</option>
                      <option value="12">12 Semanas</option>
                    </select>
                  ) : (
                    <select
                      className="form-control form-select"
                      value={loanDuration}
                      onChange={(e) => setLoanDuration(e.target.value)}
                    >
                      <option value="1">1 Mes</option>
                      <option value="2">2 Meses</option>
                      <option value="3">3 Meses</option>
                    </select>
                  )}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Tasa de Interés (%)</label>
                <input
                  type="number"
                  className="form-control"
                  value={loanInterestRate}
                  onChange={(e) => setLoanInterestRate(e.target.value)}
                  disabled={loanType === 'semanal'}
                />
              </div>

              {loanAmount && (
                <div className="card animate-fade-in" style={{ backgroundColor: 'rgba(255,255,255,0.02)', padding: 12, marginBottom: 4, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div className="receipt-line">
                    <span className="text-muted" style={{ fontSize: 12 }}>Interés Total:</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>RD$ {formatCurrency(quickInterest)}</span>
                  </div>
                  <div className="receipt-line">
                    <span className="text-muted" style={{ fontSize: 12 }}>Total a Devolver:</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>RD$ {formatCurrency(quickTotal)}</span>
                  </div>
                  <div className="receipt-line" style={{ borderTop: '1px solid var(--border)', paddingTop: 6, marginTop: 2 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>Monto Cuota:</span>
                    <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--success)' }}>
                      {loanDuration} cuotas de RD$ {formatCurrency(quickInstallment)}
                    </span>
                  </div>
                </div>
              )}

              <button type="submit" className="btn btn-primary" style={{ marginTop: 6 }} disabled={!matchedClient}>
                Confirmar Préstamo
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: DETALLE CLIENTE Y NOTAS */}
      {/* ========================================================================= */}
      {selectedClient && (
        <div className="modal-backdrop" onClick={() => setSelectedClient(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <UserIcon size={18} className="text-muted" />
                <h2 style={{ margin: 0, fontSize: 18, color: 'var(--text)' }}>Perfil del Cliente</h2>
              </div>
              <button onClick={() => setSelectedClient(null)} className="btn-secondary" style={{ width: 'auto', padding: '4px 8px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 11 }}>Cerrar</button>
            </div>

            <div className="card" style={{ padding: 14, marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 12 }}>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>{selectedClient.name}</h3>
                  <div className="text-muted" style={{ fontSize: 12, marginTop: 2 }}>Cédula: {selectedClient.cedula}</div>
                  <div className="text-muted" style={{ fontSize: 12 }}>Teléfono: {selectedClient.phone}</div>
                </div>
                <span className={`badge badge-risk-${selectedClient.riskLevel}`} style={{ fontSize: 9, padding: '2px 8px' }}>
                  Riesgo: {selectedClient.riskLevel}
                </span>
              </div>

              <div className="form-group" style={{ marginBottom: 0, marginTop: 10 }}>
                <label className="form-label" style={{ fontSize: 10 }}>Notas Internas</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  <input
                    type="text"
                    className="form-control"
                    style={{ padding: '8px 12px', fontSize: 13, height: 38 }}
                    value={editingNotes}
                    onChange={(e) => setEditingNotes(e.target.value)}
                    placeholder="Escribir notas de control..."
                  />
                  <button onClick={handleUpdateNotes} className="btn-primary" style={{ width: 'auto', padding: '0 12px', borderRadius: 8, fontSize: 12, border: 'none', cursor: 'pointer', fontWeight: 600, height: 38 }}>
                    Guardar
                  </button>
                </div>
              </div>
            </div>

            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8, color: 'var(--text)' }}>Historial de Préstamos</h3>
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              {(!selectedClient.history || selectedClient.history.length === 0) ? (
                <div style={{ padding: 20, textAlign: 'center', fontSize: 12, color: 'var(--text-muted)' }}>
                  Sin préstamos registrados en su historial.
                </div>
              ) : (
                selectedClient.history.map(loan => (
                  <div key={loan.id} className="list-item" onClick={() => {
                    setSelectedLoan({ ...loan, client: selectedClient });
                    setSelectedClient(null);
                  }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)' }}>RD$ {formatCurrency(loan.amount)} ({loan.type})</div>
                      <div className="text-muted" style={{ fontSize: 10 }}>Cuotas: {loan.installmentsCount} | {new Date(loan.createdAt || Date.now()).toLocaleDateString('es-DO')}</div>
                    </div>
                    <span className={`badge ${loan.status === 'pagado' ? 'badge-status-pagado' : 'badge-status-pendiente'}`} style={{ fontSize: 9, padding: '1px 6px' }}>
                      {loan.status === 'pagado' ? 'PAGADO' : `RD$ ${formatCurrency(loan.remainingBalance)}`}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: TABLA DE AMORTIZACION */}
      {/* ========================================================================= */}
      {selectedLoan && (
        <div className="modal-backdrop" onClick={() => setSelectedLoan(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button onClick={() => {
                  if (selectedLoan.client) {
                    setSelectedClient(selectedLoan.client);
                  }
                  setSelectedLoan(null);
                }} style={{ background: 'none', border: 'none', color: 'var(--text)', marginRight: 4, cursor: 'pointer' }}>
                  <ArrowLeft size={18} />
                </button>
                <h2 style={{ margin: 0, fontSize: 18, color: 'var(--text)' }}>Amortización</h2>
              </div>
              <button onClick={() => setSelectedLoan(null)} className="btn-secondary" style={{ width: 'auto', padding: '4px 8px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 11 }}>Cerrar</button>
            </div>

            <div className="card" style={{ padding: 14, marginBottom: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div className="receipt-line">
                <span className="text-muted" style={{ fontSize: 12 }}>Cliente:</span>
                <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)' }}>{selectedLoan.client?.name || 'Cliente'}</span>
              </div>
              <div className="receipt-line">
                <span className="text-muted" style={{ fontSize: 12 }}>Monto Inicial:</span>
                <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)' }}>RD$ {formatCurrency(selectedLoan.amount)}</span>
              </div>
              <div className="receipt-line">
                <span className="text-muted" style={{ fontSize: 12 }}>Tipo / Tasa:</span>
                <span style={{ fontWeight: 700, fontSize: 13, textTransform: 'capitalize', color: 'var(--text)' }}>{selectedLoan.type} ({selectedLoan.interestRate}%)</span>
              </div>
              <div className="receipt-line" style={{ borderTop: '1px solid var(--border)', paddingTop: 8, marginTop: 4 }}>
                <span className="text-muted" style={{ fontSize: 12 }}>Saldo Restante:</span>
                <span style={{ fontWeight: 800, fontSize: 14, color: selectedLoan.remainingBalance === 0 ? 'var(--success)' : 'var(--primary)' }}>
                  RD$ {formatCurrency(selectedLoan.remainingBalance)}
                </span>
              </div>
            </div>

            <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: 0.5 }}>Calendario de Pagos</h3>
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2.2fr 2fr 1.8fr', padding: '8px 10px', backgroundColor: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border)', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)' }}>
                <span>CUOTA</span>
                <span>VENCE</span>
                <span>MONTO</span>
                <span>ESTADO</span>
              </div>

              {selectedLoan.installments?.map(inst => {
                const isOverdue = inst.status === 'pendiente' && new Date(inst.dueDate) < new Date();
                return (
                  <div key={inst.number} className={`installment-row ${isOverdue ? 'overdue' : ''}`} style={{ gridTemplateColumns: '1fr 2.2fr 2fr 1.8fr' }}>
                    <span style={{ fontWeight: 600, color: 'var(--text)' }}>#{inst.number}</span>
                    <span className="text-muted">{new Date(inst.dueDate).toLocaleDateString('es-DO')}</span>
                    <span style={{ fontWeight: 700, color: 'var(--text)' }}>RD$ {formatCurrency(inst.amount)}</span>
                    
                    {inst.status === 'pagado' ? (
                      <span className="badge badge-status-pagado" style={{ fontSize: 8, padding: '2px 5px' }}>Saldada</span>
                    ) : (
                      <button 
                        onClick={() => handleRegisterPayment(selectedLoan.id, inst.number, inst.amount)} 
                        className="btn-primary" 
                        style={{ fontSize: 9, padding: '3px 6px', borderRadius: 4, border: 'none', cursor: 'pointer', width: '100%', fontWeight: 700 }}
                      >
                        COBRAR
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
      {/* MODAL: RECIBO DE PAGO */}
      {/* ========================================================================= */}
      {activeReceipt && (
        <div className="modal-backdrop" onClick={() => setActiveReceipt(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxHeight: '95%', display: 'flex', flexDirection: 'column' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h2 style={{ margin: 0, fontSize: 16, color: 'var(--text)' }}>Recibo de Pago</h2>
              <button onClick={() => setActiveReceipt(null)} className="btn-secondary" style={{ width: 'auto', padding: '4px 8px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 11 }}>Cerrar</button>
            </div>

            <div style={{ overflowY: 'auto', flex: 1, padding: 2 }}>
              <div ref={receiptRef} className="receipt-wrapper">
                <div className="receipt-watermark">{activeReceipt.appName.toUpperCase()}</div>
                
                <div className="receipt-header">
                  <div className="receipt-title">{activeReceipt.appName}</div>
                  <div style={{ fontSize: 10, marginTop: 2, letterSpacing: 0.5 }}>COMPROBANTE FINTECH</div>
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
                  <span>Detalle:</span>
                  <span>Cuota #{activeReceipt.installmentNumber}</span>
                </div>
                <div className="receipt-line bold" style={{ fontSize: 15 }}>
                  <span>Monto Cobrado:</span>
                  <span>RD$ {formatCurrency(activeReceipt.amountPaid)}</span>
                </div>

                <div className="receipt-divider"></div>

                <div className="receipt-line bold">
                  <span>Balance Pendiente:</span>
                  <span style={{ color: activeReceipt.remainingBalance === 0 ? 'green' : 'black' }}>
                    RD$ {formatCurrency(activeReceipt.remainingBalance)}
                  </span>
                </div>

                {activeReceipt.remainingBalance === 0 && (
                  <div style={{ border: '1.5px solid green', padding: 5, marginTop: 10, textAlign: 'center', color: 'green', fontWeight: 'bold', textTransform: 'uppercase', borderRadius: 5, fontSize: 11, letterSpacing: 0.5 }}>
                    ★ PRÉSTAMO SALDADO ★
                  </div>
                )}

                <div className="receipt-footer">
                  <div>¡Gracias por tu pago puntual!</div>
                  <div style={{ fontSize: 8, marginTop: 4, opacity: 0.7 }}>Documento digital de control de préstamos.</div>
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 14 }}>
              <button onClick={handleDownloadReceipt} className="btn btn-secondary" style={{ padding: 10, fontSize: 12 }}>
                <Download size={14} />
                Guardar Imagen
              </button>
              <button onClick={handlePrintReceipt} className="btn btn-secondary" style={{ padding: 10, fontSize: 12 }}>
                <Printer size={14} />
                Imprimir
              </button>
            </div>

            {activeReceipt.phone && (
              <button onClick={handleSendWhatsApp} className="btn btn-whatsapp" style={{ marginTop: 8, padding: 10, fontSize: 12 }}>
                <Send size={14} />
                Enviar WhatsApp
              </button>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
