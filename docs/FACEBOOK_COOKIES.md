# Sistema de Cookies de Facebook

Este sistema permite guardar cookies de Facebook encriptadas y usar Puppeteer para extraer URLs de videos de Facebook.

## Configuración

### 1. Instalar FFmpeg

**Windows (usando winget):**
```powershell
winget install ffmpeg
```

**Windows (descarga manual):**
1. Ve a https://www.gyan.dev/ffmpeg/builds/
2. Descarga "ffmpeg-release-full.zip"
3. Extrae en `C:\ffmpeg`
4. Agrega `C:\ffmpeg\bin` al PATH

**Verificar instalación:**
```bash
ffmpeg -version
```

### 2. Generar clave de encriptación

Genera una clave secreta de 32 bytes (64 caracteres hex):

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Agrega la clave al archivo `.env`:

```env
COOKIE_SECRET_KEY=tu_clave_generada_aqui
```

## Uso

### 1. Obtener cookies de Facebook

En Chrome:
1. Abre DevTools (F12)
2. Ve a Application → Cookies → https://www.facebook.com
3. Exporta las cookies relevantes (c_user, xs, sb, datr, etc.) a JSON

O usa la extensión "EditThisCookie" para exportar todas las cookies.

### 2. Subir cookies

**Endpoint:** `POST /admin/upload-cookie`

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
    },
    {
      "name": "xs",
      "value": "...",
      "domain": ".facebook.com",
      "path": "/",
      "expires": 1712345678,
      "httpOnly": true,
      "secure": true
    }
    // ... más cookies
  ]
}
```

**Respuesta:**
```json
{
  "ok": true,
  "storedId": 1,
  "validate": {
    "ok": true
  }
}
```

### 3. Validar cookie

**Endpoint:** `POST /admin/validate-cookie`

**Headers:**
```
Authorization: Bearer <token_admin>
```

**Respuesta:**
```json
{
  "ok": true
}
```

O si está inválida:
```json
{
  "ok": false,
  "reason": "not_logged"
}
```

### 4. Extraer URL de video

**Endpoint:** `POST /admin/extract-video`

**Headers:**
```
Authorization: Bearer <token_admin>
Content-Type: application/json
```

**Body:**
```json
{
  "url": "https://www.facebook.com/watch/?v=123456789"
}
```

**Respuesta exitosa:**
```json
{
  "success": true,
  "videoUrl": "https://video.xx.fbcdn.net/v/..."
}
```

**Respuesta con error:**
```json
{
  "success": false,
  "error": "No video URL found"
}
```

## Seguridad

- Las cookies se guardan encriptadas con AES-256-GCM
- Solo administradores pueden subir/validar cookies
- Las cookies se validan antes de cada uso
- El sistema marca automáticamente la cookie como inválida si detecta problemas

## Consideraciones legales

⚠️ **AVISO IMPORTANTE:**

- Usar cookies de una cuenta para descargar contenido de Facebook puede violar los TOS de Meta
- Asegúrate de tener consentimiento explícito del administrador de la cuenta
- Asegúrate de tener permisos para descargar el contenido
- Cumple con las leyes locales de derechos de autor
- Implementa políticas de uso y procesos de takedown

## Limitaciones

- Las cookies pueden expirar en cualquier momento
- Facebook puede invalidar cookies por actividad sospechosa
- Las URLs de video pueden expirar rápidamente
- Rate limiting: no uses masivamente para evitar bloqueos
- Si la cuenta tiene 2FA, las cookies pueden ser más susceptibles a invalidación

## Mantenimiento

- Revisa periódicamente la validez de la cookie usando `/admin/validate-cookie`
- Si la cookie expira, solicita al admin que re-suba las cookies
- Implementa logs de auditoría para cada extracción
- Considera implementar alertas cuando la cookie sea marcada como inválida

