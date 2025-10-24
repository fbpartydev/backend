# Sistema de Salas para Videos de Facebook

Este sistema permite crear salas donde se pueden agregar múltiples URLs de videos de Facebook (incluyendo videos privados) y descargarlos automáticamente usando las cookies configuradas.

## Flujo de Trabajo

1. **Configurar cookies** (una sola vez)
2. **Crear una sala**
3. **Agregar URLs de videos** a la sala
4. **Procesar videos** (descargar)
5. **Reproducir videos** en el frontend

## Endpoints Disponibles

### 1. Crear Sala

**POST** `/rooms/create`

**Headers:**
```
Authorization: Bearer <token_admin>
Content-Type: application/json
```

**Body:**
```json
{
  "name": "Mi Sala de Videos",
  "description": "Videos favoritos"
}
```

**Respuesta:**
```json
{
  "id": 1,
  "name": "Mi Sala de Videos",
  "description": "Videos favoritos",
  "code": "A1B2C3D4",
  "active": true,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

### 2. Obtener Sala por Código (Público)

**GET** `/rooms/code/:code`

**Ejemplo:** `GET /rooms/code/A1B2C3D4`

**Respuesta:**
```json
{
  "id": 1,
  "name": "Mi Sala de Videos",
  "code": "A1B2C3D4",
  "videos": [
    {
      "id": 1,
      "facebookUrl": "https://www.facebook.com/watch/?v=123456",
      "status": "completed",
      "localPath": "..."
    }
  ]
}
```

### 3. Agregar Video a Sala

**POST** `/rooms/:roomId/add-video`

**Headers:**
```
Authorization: Bearer <token_admin>
Content-Type: application/json
```

**Body:**
```json
{
  "facebookUrl": "https://www.facebook.com/watch/?v=123456789"
}
```

**Respuesta:**
```json
{
  "id": 1,
  "facebookUrl": "https://www.facebook.com/watch/?v=123456789",
  "status": "pending",
  "roomId": 1,
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

### 4. Listar Videos de una Sala

**GET** `/rooms/:roomId/videos`

**Respuesta:**
```json
[
  {
    "id": 1,
    "facebookUrl": "https://www.facebook.com/watch/?v=123456789",
    "status": "completed",
    "roomId": 1,
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
]
```

### 5. Procesar Video (Descargar)

**POST** `/rooms/videos/:videoId/process`

**Headers:**
```
Authorization: Bearer <token_admin>
```

**Respuesta:**
```json
{
  "id": 1,
  "facebookUrl": "https://www.facebook.com/watch/?v=123456789",
  "videoUrl": "https://video.xx.fbcdn.net/v/...",
  "localPath": "/path/to/videos/video_1_123456789.mp4",
  "status": "completed",
  "publicUrl": "/videos/video_1_123456789.mp4",
  "roomId": 1
}
```

### 6. Obtener URL Pública del Video

**GET** `/rooms/videos/:videoId/public-url`

**Respuesta:**
```json
{
  "publicUrl": "/videos/video_1_123456789.mp4"
}
```

## Estados del Video

- **pending**: URL agregada, esperando procesamiento
- **processing**: Descargando el video
- **completed**: Video descargado exitosamente
- **failed**: Error al descargar el video

## Uso en el Frontend

Una vez que tengas la `publicUrl`, puedes usarla en un tag `<video>`:

```html
<video controls>
  <source src="http://localhost:3020/videos/video_1_123456789.mp4" type="video/mp4">
</video>
```

## Flujo Completo - Ejemplo

### 1. Crear Sala
```bash
POST /rooms/create
{
  "name": "Videos de Cumpleaños",
  "description": "Videos de la fiesta"
}
```

### 2. Agregar Videos
```bash
POST /rooms/1/add-video
{
  "facebookUrl": "https://www.facebook.com/watch/?v=123456789"
}

POST /rooms/1/add-video
{
  "facebookUrl": "https://www.facebook.com/watch/?v=987654321"
}
```

### 3. Procesar Videos
```bash
POST /rooms/videos/1/process
POST /rooms/videos/2/process
```

### 4. Obtener Sala con Videos
```bash
GET /rooms/code/A1B2C3D4
```

### 5. Reproducir en Frontend
```javascript
const videos = sala.videos.filter(v => v.status === 'completed');
videos.forEach(video => {
  const videoUrl = `http://localhost:3020${video.publicUrl}`;
  // Usar en tag <video>
});
```

## Requisitos del Sistema

### FFmpeg (Obligatorio)
El sistema requiere FFmpeg para combinar el video y audio de Facebook.

**Instalación Windows:**
```powershell
winget install ffmpeg
```

Ver guía completa: [docs/FFMPEG_INSTALLATION.md](FFMPEG_INSTALLATION.md)

## Notas Importantes

- **FFmpeg debe estar instalado** para que los videos tengan audio
- Los videos se descargan en la carpeta `videos/` del servidor
- Los videos son accesibles públicamente en `/videos/:filename`
- Las cookies deben estar configuradas antes de procesar videos
- Si una cookie expira, todos los videos fallarán hasta que se reconfigure
- Los videos privados solo funcionarán si la cookie tiene acceso a ellos
- Facebook sirve video y audio por separado (DASH streaming)

## Seguridad

- Solo administradores pueden crear salas y procesar videos
- El acceso a la sala es público con el código
- Los videos descargados son públicos (considera implementar autenticación si son privados)

