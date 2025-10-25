# FBparty Backend

Backend para descargar y servir videos de Facebook (incluyendo videos privados) usando cookies encriptadas.

## Descripción

Este sistema permite:
- Guardar cookies de Facebook encriptadas (AES-256-GCM)
- Extraer URLs de videos de Facebook usando Puppeteer
- Descargar videos y audios por separado (sin FFmpeg)
- Crear salas para organizar múltiples videos
- Servir videos y audios por separado a través de una API REST
- Generar thumbnails usando FFmpeg (opcional)

## Prerequisitos

### 1. FFmpeg (Opcional - solo para thumbnails)

FFmpeg se usa únicamente para generar thumbnails de los videos. Los videos y audios se sirven por separado.

**Windows:**
```powershell
winget install ffmpeg
```

O descarga manual desde: https://www.gyan.dev/ffmpeg/builds/

**Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install ffmpeg
```

**macOS:**
```bash
brew install ffmpeg
```

**Verificar instalación:**
```bash
ffmpeg -version
```

### 2. Node.js y npm

Requerido Node.js 18+ y npm 9+

## Instalación

```bash
npm install
```

## Configuración

### Variables de Entorno

Crea un archivo `.env` en la raíz del proyecto:

```env
# Database Configuration
DATABASE_HOST=your_db_host
DATABASE_NAME=postgres
DATABASE_USER=your_db_user
DATABASE_PASSWORD=your_db_password
DATABASE_PORT=5432
DATABASE_SSLMODE=require

# Cookie Secret Key (32 bytes hex)
# Genera una con: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
COOKIE_SECRET_KEY=your_secret_key_here

# Admin Secret Key (32 bytes hex)
SECRET_ADMIN=your_admin_secret_key

# Server Port
PORT=3020

```

# Testing data
```
NODE_ENV='development'

DATABASE_HOST='aws-1-us-east-1.pooler.supabase.com'
DATABASE_NAME='postgres'
DATABASE_USER='postgres.rqevkoefjxlklczbheqf'
DATABASE_PORT='6543'
DATABASE_PASSWORD='aGm*NF_5KD_8@CU'
DATABASE_SSLMODE='require'
DATABASE_POOLER='base-pooler.x'

SECRET_ADMIN='d5b85538e7c68d70930cb984ae82696411292113f292069d8c8bbb90b6a30928'
COOKIE_SECRET_KEY='31c00355abb88e6b47da65cd78018eedbff0ee9e9062a3e6d7f18409d8871b7b'
```

### Generar Claves Secretas

```bash
# Generar COOKIE_SECRET_KEY
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generar SECRET_ADMIN
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Uso

### 1. Iniciar el servidor

```bash
# Development
npm run start:dev

# Production
npm run start:prod
```

### 2. Configurar Cookies de Facebook

#### Obtener Cookies

En Chrome:
1. Abre DevTools (F12)
2. Ve a Application → Cookies → https://www.facebook.com
3. Exporta las cookies relevantes (c_user, xs, sb, datr, etc.) a JSON

O usa la extensión "EditThisCookie" para exportar todas las cookies.

#### Subir Cookies

**POST** `/admin/upload-cookie`

**Headers:**
```
Authorization: Bearer <token_admin>
Content-Type: application/json
```

**Body:**
```json
{
  "cookies": [
    {
      "name": "c_user",
      "value": "...",
      "domain": ".facebook.com",
      "path": "/",
      "expires": 1712345678,
      "httpOnly": true,
      "secure": true
    }
  ]
}
```

### 3. Crear Sala y Agregar Videos

#### Crear Sala

**POST** `/rooms/create`

```json
{
  "name": "Mi Sala de Videos",
  "description": "Videos favoritos"
}
```

#### Agregar Video

**POST** `/rooms/:roomId/add-video`

```json
{
  "facebookUrl": "https://www.facebook.com/watch/?v=123456789"
}
```

#### Procesar Video (Descargar)

**POST** `/rooms/videos/:videoId/process`

Esto descargará el video y lo combinará con audio usando FFmpeg.

#### Obtener Sala por Código

**GET** `/rooms/code/:code`

Retorna la sala con todos sus videos procesados.

### 4. Reproducir Video en Frontend

```html
<video controls>
  <source src="http://localhost:3020/videos/combined_1_123456789.mp4" type="video/mp4">
</video>
```

## Endpoints Principales

### Admin

- `POST /admin/login` - Login de administrador
- `POST /admin/upload-cookie` - Subir cookies de Facebook
- `POST /admin/validate-cookie` - Validar cookies
- `POST /admin/extract-video` - Extraer URL de video

### Rooms

- `POST /rooms/create` - Crear sala
- `GET /rooms/code/:code` - Obtener sala por código
- `POST /rooms/:roomId/add-video` - Agregar video a sala
- `GET /rooms/:roomId/videos` - Listar videos de sala
- `POST /rooms/videos/:videoId/process` - Procesar video
- `GET /rooms/videos/:videoId/public-url` - Obtener URL pública

## Estados del Video

- `pending` - URL agregada, esperando procesamiento
- `processing` - Descargando el video
- `completed` - Video descargado exitosamente
- `failed` - Error al descargar el video

## Comportamiento Técnico

### Procesamiento de Videos

1. Se extrae la URL del video desde Facebook usando Puppeteer
2. Se detecta y descarga el stream de audio separado
3. Se descargan video y audio por separado (sin combinar)
4. Se genera thumbnail usando FFmpeg (10mo segundo para evitar frames negros)
5. Se sirven video y audio por separado al frontend

### Compatibilidad Multi-Plataforma

El sistema detecta automáticamente la plataforma y ajusta:
- **Windows**: Ruta completa a `C:\ffmpeg\bin\ffmpeg.exe`
- **Linux/Mac**: Usa `ffmpeg` del PATH
- Escapa rutas correctamente según el SO

## Seguridad

- Las cookies se encriptan con AES-256-GCM antes de guardar
- Solo administradores pueden crear salas y procesar videos
- El acceso a la sala es público con el código
- Los videos descargados son públicos

## Limitaciones

- Las cookies pueden expirar en cualquier momento
- Facebook puede invalidar cookies por actividad sospechosa
- Las URLs de video pueden expirar rápidamente
- Rate limiting: no uses masivamente para evitar bloqueos
- Si la cuenta tiene 2FA, las cookies pueden ser más susceptibles a invalidación

## Swagger API Documentation

Cuando el servidor está corriendo en modo desarrollo, visita:

```
http://localhost:3020/api
```

## Desarrollo

```bash
# Development watch mode
npm run start:dev

# Production build
npm run build
npm run start:prod

# Run tests
npm run test
npm run test:e2e
npm run test:cov
```

## Proyecto Base

Proyecto creado con [NestJS](https://nestjs.com/) framework.

## Licencia

MIT licensed.
