# WebSocket Implementation Guide - FBParty

## 📋 Resumen General

El sistema FBParty requiere un servidor WebSocket para sincronizar eventos del reproductor y mensajes del chat entre múltiples usuarios que están viendo el mismo video.

## 🎯 Arquitectura

### Estructura de Datos

```typescript
interface PlayerEvent {
  type: 'play' | 'pause' | 'seek' | 'user_join' | 'user_leave' | 'episode_change' | 'message';
  timestamp: number;
  userId: string;
  userName: string;
  data?: any;
}
```

### Eventos del Sistema

#### 1. **play** - Reproducir video
```json
{
  "type": "play",
  "timestamp": 1234567890,
  "userId": "user_abc123",
  "userName": "Juan Pérez",
  "data": {
    "currentTime": 45.5
  }
}
```

#### 2. **pause** - Pausar video
```json
{
  "type": "pause",
  "timestamp": 1234567891,
  "userId": "user_abc123",
  "userName": "Juan Pérez",
  "data": {
    "currentTime": 120.3
  }
}
```

#### 3. **seek** - Saltar a tiempo específico
```json
{
  "type": "seek",
  "timestamp": 1234567892,
  "userId": "user_abc123",
  "userName": "Juan Pérez",
  "data": {
    "currentTime": 45.5,
    "targetTime": 300.0
  }
}
```

#### 4. **user_join** - Usuario se une a la sala
```json
{
  "type": "user_join",
  "timestamp": 1234567893,
  "userId": "user_abc123",
  "userName": "Juan Pérez",
  "data": {}
}
```

#### 5. **user_leave** - Usuario abandona la sala
```json
{
  "type": "user_leave",
  "timestamp": 1234567894,
  "userId": "user_abc123",
  "userName": "Juan Pérez",
  "data": {}
}
```

#### 6. **episode_change** - Cambio de episodio
```json
{
  "type": "episode_change",
  "timestamp": 1234567895,
  "userId": "user_abc123",
  "userName": "Juan Pérez",
  "data": {
    "newVideoTitle": "Dr. Stone Capitulo 2",
    "newVideoCode": "DEF456"
  }
}
```

#### 7. **message** - Mensaje de chat
```json
{
  "type": "message",
  "timestamp": 1234567896,
  "userId": "user_abc123",
  "userName": "Juan Pérez",
  "data": {
    "message": "¡Hola! ¿Cómo están? 😀"
  }
}
```

## 🔌 Implementación del WebSocket

### Conexión

**URL:** `ws://localhost:3020/ws`

### Autenticación

El cliente debe enviar el token de autenticación al conectarse:

```javascript
const ws = new WebSocket('ws://localhost:3020/ws', {
  headers: {
    'token': `${token}`
  }
});
```

### Room ID

Cada video pertenece a una room. Los usuarios deben unirse a la room del video que están viendo.

**Room ID:** Se obtiene del campo `roomId` del video actual.

### Eventos del Cliente al Servidor

#### 1. Unirse a una Room
```json
{
  "action": "join_room",
  "roomId": 1,
  "videoCode": "ABC123"
}
```

#### 2. Enviar Evento del Reproductor
```json
{
  "action": "player_event",
  "roomId": 1,
  "event": {
    "type": "play",
    "timestamp": 1234567890,
    "userId": "user_abc123",
    "userName": "Juan Pérez",
    "data": {
      "currentTime": 45.5
    }
  }
}
```

#### 3. Enviar Mensaje de Chat
```json
{
  "action": "chat_message",
  "roomId": 1,
  "event": {
    "type": "message",
    "timestamp": 1234567896,
    "userId": "user_abc123",
    "userName": "Juan Pérez",
    "data": {
      "message": "¡Hola! ¿Cómo están? 😀"
    }
  }
}
```

### Eventos del Servidor al Cliente

#### 1. Evento del Reproductor (Broadcast)
```json
{
  "type": "player_event",
  "roomId": 1,
  "event": {
    "type": "play",
    "timestamp": 1234567890,
    "userId": "user_abc123",
    "userName": "Juan Pérez",
    "data": {
      "currentTime": 45.5
    }
  }
}
```

#### 2. Mensaje de Chat (Broadcast)
```json
{
  "type": "chat_message",
  "roomId": 1,
  "event": {
    "type": "message",
    "timestamp": 1234567896,
    "userId": "user_abc123",
    "userName": "Juan Pérez",
    "data": {
      "message": "¡Hola! ¿Cómo están? 😀"
    }
  }
}
```

## 🎮 Lógica del Frontend

### Enviar Eventos

El frontend envía eventos a través de la función `sendPlayerEvent()`:

```typescript
const sendPlayerEvent = (event: PlayerEvent) => {
  // TODO: Implementar envío al socket
  console.log('Enviar evento al socket:', event);
  
  // Por ahora, agregamos el evento al chat local
  setChatMessages(prev => [...prev, event]);
};
```

### Recibir Eventos

El frontend recibe eventos a través de la función `receivePlayerEvent()`:

```typescript
const receivePlayerEvent = (event: PlayerEvent) => {
  // TODO: Implementar recepción del socket
  console.log('Recibir evento del socket:', event);
  
  // Aplicar el evento al reproductor
  applyPlayerEvent(event, videoRef);
  
  // Agregar al chat
  setChatMessages(prev => [...prev, event]);
};
```

## 📝 Notas Importantes

### Eventos que NO se Sincronizan

- **volume**: El volumen es individual por usuario
- **fullscreen**: La pantalla completa es individual por usuario

### Eventos que SÍ se Sincronizan

- **play**: Todos los usuarios deben reproducir al mismo tiempo
- **pause**: Todos los usuarios deben pausar al mismo tiempo
- **seek**: Todos los usuarios deben saltar al mismo tiempo
- **episode_change**: Todos los usuarios deben cambiar al mismo episodio
- **message**: Todos los usuarios deben ver el mismo mensaje

### Persistencia del Chat

El chat se guarda en `localStorage` con la clave `chat_room_{roomId}`:

```javascript
localStorage.setItem(`chat_room_${roomId}`, JSON.stringify(chatMessages));
```

Esto permite que el chat persista entre episodios y sesiones.

## 🔄 Flujo de Sincronización

### Ejemplo: Usuario A pausa el video

1. Usuario A hace clic en pausa
2. Frontend crea evento `pause` con `currentTime`
3. Frontend envía evento al servidor WebSocket
4. Servidor recibe evento y lo broadcast a todos los usuarios en la room
5. Usuario B recibe el evento
6. Frontend de Usuario B aplica el evento al reproductor (pausa y ajusta tiempo)
7. Frontend de Usuario B muestra el evento en el chat

### Ejemplo: Usuario A envía mensaje

1. Usuario A escribe mensaje y presiona Enter
2. Frontend crea evento `message` con el texto
3. Frontend envía evento al servidor WebSocket
4. Servidor recibe mensaje y lo broadcast a todos los usuarios en la room
5. Usuario B recibe el mensaje
6. Frontend de Usuario B muestra el mensaje en el chat

## 🛠️ Implementación del Backend

### Estructura Recomendada

```javascript
// Ejemplo con Socket.io
const io = require('socket.io')(server);

io.on('connection', (socket) => {
  // Autenticación
  const token = socket.handshake.headers.authorization;
  const user = verifyToken(token);
  
  socket.on('join_room', (data) => {
    const { roomId, videoCode } = data;
    socket.join(`room_${roomId}`);
    
    // Notificar a otros usuarios
    socket.to(`room_${roomId}`).emit('user_joined', {
      userId: user.id,
      userName: user.name
    });
  });
  
  socket.on('player_event', (data) => {
    const { roomId, event } = data;
    
    // Broadcast a todos en la room excepto al emisor
    socket.to(`room_${roomId}`).emit('player_event', event);
  });
  
  socket.on('chat_message', (data) => {
    const { roomId, event } = data;
    
    // Broadcast a todos en la room excepto al emisor
    socket.to(`room_${roomId}`).emit('chat_message', event);
  });
  
  socket.on('disconnect', () => {
    // Notificar que el usuario se fue
    // ...
  });
});
```

## ✅ Checklist de Implementación

- [ ] Configurar servidor WebSocket
- [ ] Implementar autenticación con token
- [ ] Implementar join_room
- [ ] Implementar player_event (broadcast)
- [ ] Implementar chat_message (broadcast)
- [ ] Implementar user_join/user_leave
- [ ] Manejar desconexiones
- [ ] Validar eventos antes de broadcast
- [ ] Logging de eventos para debugging
- [ ] Manejo de errores

## 📊 Ejemplo de Flujo Completo

```
Usuario A                    Servidor WebSocket              Usuario B
    |                              |                            |
    |-- join_room(roomId: 1) ---->|                            |
    |                              |<-- join_room(roomId: 1) ---|
    |                              |                            |
    |<-- user_joined -------------|                            |
    |                              |-- user_joined ------------>|
    |                              |                            |
    |-- player_event(play) ------->|                            |
    |                              |-- player_event(play) ------>|
    |                              |                            |
    |<-- player_event(play) ------|                            |
    |                              |<-- player_event(play) -----|
    |                              |                            |
    |-- chat_message("Hola") ----->|                            |
    |                              |-- chat_message("Hola") ---->|
    |                              |                            |
    |<-- chat_message("Hola") ----|                            |
    |                              |<-- chat_message("Hola") ---|
```

## 🎯 Resumen

El sistema de WebSocket debe:
1. Autenticar usuarios con token
2. Permitir unirse a rooms por roomId
3. Broadcast eventos del reproductor a todos los usuarios en la room
4. Broadcast mensajes de chat a todos los usuarios en la room
5. Notificar cuando usuarios se unen o abandonan
6. Manejar desconexiones correctamente

Los eventos se aplican automáticamente en el frontend usando las funciones `applyPlayerEvent()` y `sendPlayerEvent()` que ya están implementadas.

