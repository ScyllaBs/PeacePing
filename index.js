const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 8000;

app.use(express.static(path.join(__dirname, 'public')));

// Stockage des messages et users
let messages = [];
let users = new Map(); // socket.id -> username

// Connexion d'un user
io.on('connection', (socket) => {
  console.log('👤 Nouvelle connexion:', socket.id);

  // User se connecte avec un pseudo
  socket.on('join', (username) => {
    users.set(socket.id, username);
    
    // Message système
    const joinMsg = {
      id: Date.now(),
      type: 'system',
      message: `${username} a rejoint le chat 🎉`,
      timestamp: new Date().toISOString()
    };
    
    messages.push(joinMsg);
    io.emit('message', joinMsg);
    
    // Envoyer l'historique au nouveau user
    socket.emit('history', messages);
    
    // Update liste users
    io.emit('users', Array.from(users.values()));
    
    console.log(`✅ ${username} a rejoint`);
  });

  // Réception d'un message
  socket.on('chat', (data) => {
    const username = users.get(socket.id);
    
    if (!username) {
      return socket.emit('error', 'Connecte-toi d\'abord !');
    }

    const msg = {
      id: Date.now() + Math.random(),
      type: 'user',
      username: username,
      message: data.message,
      timestamp: new Date().toISOString()
    };

    messages.push(msg);
    
    // Garder que les 200 derniers messages
    if (messages.length > 200) {
      messages = messages.slice(-200);
    }

    // Broadcast à tout le monde
    io.emit('message', msg);
    
    console.log(`💬 ${username}: ${data.message}`);
  });

  // User tape
  socket.on('typing', () => {
    const username = users.get(socket.id);
    if (username) {
      socket.broadcast.emit('typing', username);
    }
  });

  // User arrête de taper
  socket.on('stop_typing', () => {
    socket.broadcast.emit('stop_typing', socket.id);
  });

  // Déconnexion
  socket.on('disconnect', () => {
    const username = users.get(socket.id);
    
    if (username) {
      const leaveMsg = {
        id: Date.now(),
        type: 'system',
        message: `${username} a quitté le chat 😢`,
        timestamp: new Date().toISOString()
      };
      
      messages.push(leaveMsg);
      io.emit('message', leaveMsg);
      
      users.delete(socket.id);
      io.emit('users', Array.from(users.values()));
      
      console.log(`👋 ${username} est parti`);
    }
  });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

server.listen(PORT, () => {
  console.log(`🚀 Chat server running on port ${PORT}`);
  console.log(`💬 Go to http://localhost:${PORT}`);
});
