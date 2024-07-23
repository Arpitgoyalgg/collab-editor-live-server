const express = require('express');
const http = require('http');
const WebSocket = require('ws');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

let clients = new Map(); // Map to store clients and their usernames
let latestContent = ''; // Store the latest content

wss.on('connection', (ws) => {
  console.log('New client connected');
  const userId = generateUniqueId();
  clients.set(ws, { userId, username: null });

  // Send the latest content to the new client
  ws.send(JSON.stringify({ type: 'content', content: latestContent }));

  ws.on('message', (message) => {
    console.log('Received:', message);
    let parsedMessage;
    try {
      parsedMessage = JSON.parse(message);
    } catch (error) {
      console.error('Invalid JSON:', error);
      return;
    }

    if (parsedMessage.type === 'SET_USERNAME') {
      // Set the username for this client
      const client = clients.get(ws);
      if (client) {
        client.username = parsedMessage.username;
        // Notify all clients about the new user
        broadcast({
          type: 'USER_LIST',
          activeUsers: Array.from(clients.values()).map(c => c.username).filter(Boolean),
        });
      }
    } else if (parsedMessage.type === 'content') {
      // Update latest content and broadcast to all clients
      latestContent = parsedMessage.content;
      broadcast(parsedMessage);
    } else if (parsedMessage.type === 'DISCONNECT') {
      clients.delete(ws);
      // Notify all clients about the disconnection
      broadcast({
        type: 'USER_LIST',
        activeUsers: Array.from(clients.values()).map(c => c.username).filter(Boolean),
      });
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
    clients.delete(ws);
    // Notify all clients about the disconnection
    broadcast({
      type: 'USER_LIST',
      activeUsers: Array.from(clients.values()).map(c => c.username).filter(Boolean),
    });
  });
});

function broadcast(message) {
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  });
}

function generateUniqueId() {
  return Math.random().toString(36).substr(2, 9); // Simple unique ID generator
}

server.listen(3001, () => {
  console.log('WebSocket server is running on ws://localhost:3001');
});
