# Prestamo Control - Fintech Loan Manager

**Prestamo Control** es una aplicación profesional y moderna de gestión de préstamos tipo fintech diseñada para funcionar en dispositivos móviles y de escritorio como una PWA (Progressive Web App). Cuenta con branding dinámico configurable, cálculo automático de intereses, amortizaciones, control de riesgo de clientes y generación de recibos en formato de imagen (PNG) con la opción de enviarlos por WhatsApp.

---

## Características Principales

- 🎨 **Branding Dinámico:** Cambia el nombre de la app, el logotipo y los colores en tiempo real. Se reflejan inmediatamente en el Login, el Dashboard y los Recibos.
- 🔒 **Autenticación Segura:** Panel de administración exclusivo para gestores (sin registro público).
- 👤 **Ficha de Clientes y Riesgo:** Búsqueda rápida por cédula. Calificación automática de riesgo en tiempo real (Bueno, Regular, Moroso) según su puntualidad de pago.
- 💰 **Préstamos Semanales y Mensuales:**
  - **Semanales:** Interés fijo de 20% (plazos de 4, 6, 8 y 12 semanas).
  - **Mensuales:** Interés editable (default 15%, plazos de 1, 2 y 3 meses).
- 🧾 **Recibos en Imagen (PNG):** Descarga el recibo de pago, imprímelo directamente o envíalo por WhatsApp con un solo clic con un mensaje dinámico pre-redactado.
- 💾 **Base de Datos Híbrida (MongoDB + Fallback Local):** Intenta conectar con MongoDB, y si no está disponible, crea automáticamente una base de datos JSON local en el disco para que funcione "fuera de la caja" sin configurar nada.

---

## Estructura del Proyecto

```text
prestamo-control/
├── assets/                     # Recursos gráficos compartidos (Logo)
├── backend/                    # Servidor Express, API REST y Base de datos
│   ├── data/
│   │   ├── config.json         # Branding dinámico y tasas de interés
│   │   └── database.json       # Fallback de base de datos local JSON
│   ├── db.js                   # Abstracción e inicialización de BD
│   ├── server.js               # Rutas API de la aplicación
│   └── package.json
└── frontend/                   # Interfaz de usuario React + Vite
    ├── public/
    │   ├── manifest.json       # PWA Manifest para instalación
    │   └── sw.js               # Service Worker para almacenamiento en caché
    ├── src/
    │   ├── App.jsx             # Vistas, formularios y lógica central
    │   ├── App.css             # Estilos de diseño móvil premium
    │   └── main.jsx            # Entrada de la aplicación React
    └── package.json
```

---

## Requisitos de Sistema

- **Node.js** v18 o superior.
- **NPM** o **Yarn** para instalación de paquetes.
- **MongoDB** (Opcional - Si no está presente, la app usará automáticamente el almacenamiento local JSON).

---

## Instrucciones de Instalación y Ejecución

Sigue estos pasos para arrancar el backend y el frontend.

### Paso 1: Clonar e ingresar al directorio de la aplicación
Asegúrate de que estás en la carpeta raíz del proyecto:
```bash
C:\Users\Bryan\.gemini\antigravity\scratch\prestamo-control
```

---

### Paso 2: Ejecución del Backend

1. Abre una terminal y dirígete al directorio `backend/`:
   ```bash
   cd backend
   ```
2. Instala las dependencias del servidor:
   ```bash
   npm install
   ```
3. *(Opcional)* Si deseas usar MongoDB, edita el archivo `.env` en la carpeta `backend/` agregando tu URI de conexión:
   ```env
   MONGO_URI=mongodb+srv://usuario:password@cluster.mongodb.net/prestamocontrol
   ```
   *Si no tienes MongoDB instalado, deja la variable en blanco. El sistema creará y usará de forma autónoma el archivo `backend/data/database.json`.*
4. Inicia el servidor de desarrollo:
   ```bash
   npm run dev
   ```
   El backend iniciará en el puerto **`5000`** (`http://localhost:5000`).

---

### Paso 3: Ejecución del Frontend

1. Abre una segunda terminal y dirígete al directorio `frontend/`:
   ```bash
   cd frontend
   ```
2. Instala las dependencias de React:
   ```bash
   npm install
   ```
3. Inicia el servidor de desarrollo de Vite:
   ```bash
   npm run dev
   ```
   El frontend estará disponible en el puerto **`3000`** (`http://localhost:3000`).

---

## Credenciales de Acceso (Admin)

Para iniciar sesión en el panel fintech, utiliza las siguientes credenciales por defecto:

- **Usuario:** `admin`
- **Contraseña:** `admin123`

*(Estas credenciales pueden ser modificadas en el archivo `backend/.env`)*

---

## Flujo de Prueba Recomendado

1. **Login:** Inicia sesión con `admin` / `admin123`.
2. **Branding:** Ve a la pestaña **Branding** (Configuración) y cambia el nombre de la aplicación (ej. *"Mi Fintech"*), sube un nuevo logo, o cambia el color principal. Comprueba cómo todo cambia instantáneamente sin recargar.
3. **Crear Cliente:** Ve a **Clientes**, haz clic en *Registrar* y crea un cliente.
4. **Validación de Cédula:** Intenta registrar el mismo cliente con la misma cédula. El sistema detendrá el registro, te alertará y te llevará automáticamente a su historial.
5. **Crear Préstamo:** Ve a **Préstamos**, selecciona el cliente, introduce un monto (ej. `20,000`) y elige plazo semanal o mensual. Mira los cálculos automáticos de cuotas e intereses en tiempo real antes de aprobarlo.
6. **Registrar Pago:** Ve a la amortización del préstamo creado, selecciona una cuota y haz clic en **Pagar**.
7. **Recibo e Imagen:** Se abrirá el recibo. Haz clic en **Descargar PNG** para guardar el comprobante en tu dispositivo, **Imprimir** para enviarlo a la impresora, o **Enviar por WhatsApp** para que se abra WhatsApp Web/Móvil con el mensaje dinámico redactado para tu cliente.
