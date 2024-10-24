// Import the express module
const express = require('express');
const http = require('http');// Import Node's built-in HTTP module
const { Server } = require('socket.io');// Import Socket.IO for real-time WebSocket handling
// Create an instance of express
const app = express();
const server = http.createServer(app);// Create an HTTP server using the Express app
const io = new Server(server);// Attach Socket.IO to the server

let documentState = {
    content: '',
    lockedBy: null,
    users: [] // Store connected users with their avatar information
};
app.use(express.static('public'));// Serve static files from the 'public' directory

//This event is triggered whenever a new client connects to the server. Each connection is associated with a unique socket.id.
io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);// Log when a user connects

    // Generate a random avatar for this user
    const avatarUrl = `https://robohash.org/${socket.id}.png?size=50x50`;
    const user = { id: socket.id, avatar: avatarUrl };
    documentState.users.push(user);

    // Send the current document state to the new user
    socket.emit('init', {
        content: documentState.content,
        lockedBy: documentState.lockedBy,
        lockedByAvatar: documentState.lockedBy ? `https://robohash.org/${documentState.lockedBy}.png?size=50x50` : null,
        users: documentState.users // Send the full list of users with avatars
    });//socket.emit Emits a message to only the connected client (sender):

    // Broadcast the new user to all other clients
    socket.broadcast.emit('user-connected', { userId: socket.id, avatar: avatarUrl });

    // Handle locking the document
    //This listens for a "lock" event from the client. 
    //It is triggered when a client attempts to lock the document for editing
    socket.on('lock', () => {
        if (!documentState.lockedBy) {
            documentState.lockedBy = socket.id;
            //This broadcasts a "lock" event to all other clients, 
            //letting them know that the document is now locked by a specific user. 
            io.emit('lock', { userId: socket.id , avatar: `https://robohash.org/${socket.id}.png?size=50x50`}); // io.emit sends a message to all connected clients, including the one that triggered the event.
        }
    });

    // Handle unlocking the document
    //This listens for an "unlock" event from the client. 
    //It is triggered when the user who has locked the document wants to release the lock.
    socket.on('unlock', () => {
        if (documentState.lockedBy === socket.id) {
            documentState.lockedBy = null;
            //This broadcasts an "unlock" event to all connected clients
            io.emit('unlock');// io.emit sends a message to all connected clients, including the one that triggered the event.
        }
    });

    // Handle text updates
    //This listens for "update" events from the client. 
    //This event is triggered whenever the client (who has locked the document) makes changes to the document's content.
    socket.on('update', (content) => {
        if (documentState.lockedBy === socket.id) {
            documentState.content = content;
            //broadcast update
            socket.broadcast.emit('update', content);//broadcasts the updated content to all connected clients except the one who made the update
        }
    });

    // Handle user disconnection and unlocking the document
    //This event is triggered when a user disconnects from the server 
    socket.on('disconnect', () => {
        if (documentState.lockedBy === socket.id) {
            documentState.lockedBy = null;
            io.emit('unlock');// io.emit sends a message to all connected clients, including the one that triggered the event.
        }

        // Remove the user from the list and notify other clients
        documentState.users = documentState.users.filter(user => user.id !== socket.id);
        io.emit('user-disconnected', socket.id);
        console.log(`User disconnected: ${socket.id}`);
    });
});

// Start the server and listen on port 3000
const port = 3000;
server.listen(port, () => {
  console.log(`Server running at http://localhost:${port}/`);
});
