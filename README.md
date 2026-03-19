# FinancialWow - Dashboard de Pagos y Finanzas

Proyecto de gestión de pagos y retiros para Carlos y Diego, integrado con Supabase para persistencia de datos y diseñado con una estética premium.

## 🚀 Tecnologías

- **Frontend:** React + Vite
- **Base de Datos:** Supabase (PostgreSQL)
- **Estilos:** Vanilla CSS
- **Iconos:** Lucide React
- **Gráficos:** Recharts

## 🛠️ Configuración Local

1. Instala las dependencias:
   ```bash
   npm install
   ```

2. Crea un archivo `.env` en la raíz con tus credenciales de Supabase:
   ```env
   VITE_SUPABASE_URL=tu_url_de_supabase
   VITE_SUPABASE_ANON_KEY=tu_anon_key_de_supabase
   ```

3. Corre el servidor de desarrollo:
   ```bash
   npm run dev
   ```

## 🌐 Despliegue en Vercel

1. Sube el código a GitHub.
2. Importa el proyecto en Vercel.
3. Configura las **Environment Variables** en el panel de Vercel con las mismas claves del `.env`.
4. ¡Listo! Vercel detectará automáticamente que es un proyecto Vite.
