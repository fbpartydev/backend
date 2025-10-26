const WebSocket = require('ws');

const wsUrl = 'ws://localhost:3020/ws';
const authToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiZW1haWwiOiJsb3BlemJhY2tlbmRAZ21haWwuY29tIiwicm9sZSI6ImFkbWluIiwiaWF0IjoxNzYxNTE0MDUwfQ.XEAxcdwKJ6fVoQrVdNa7CshBIHexULHU_lhvPu5EhUA';

const socket = new WebSocket(wsUrl, {
  headers: { token: authToken }
});

socket.on('open', () => {
  console.log('Conectado al WebSocket');

  // Puedes unirte a la sala
  const joinRoomData = {
    action: 'join_room',
    roomId: 1,
    videoCode: 'ABC123'
  };
  socket.send(JSON.stringify(joinRoomData));
});

socket.on('message', (data) => {
  console.log('Mensaje recibido:', data.toString());
});

socket.on('error', (err) => {
  console.error('Error de conexión:', err);
});

socket.on('close', (code, reason) => {
  console.log('Desconectado:', code, reason.toString());
});
