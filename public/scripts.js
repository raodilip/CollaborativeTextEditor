    //This creates a WebSocket connection to the server using Socket.IO. 
    //The connection enables real-time communication between the client and server
    const socket = io();
    const textArea = document.getElementById('text-area');
    const avatarContainer = document.getElementById('avatar-container');
    const editorInfo = document.getElementById('editor-info');
    const editorAvatar = document.getElementById('editor-avatar');
    let isOwner = false;

    // Function to generate a random avatar using a third-party API (e.g., robohash.org)
    function generateAvatar(userId) {
        return `https://robohash.org/${userId}.png?size=50x50`;
    }

    // Initialize the document state when the user connects
    //When a new client connects, the server sends the current document state (content and whether it is locked)
    socket.on('init', (state) => {
        textArea.value = state.content;
        // Display current users' avatars
        if (state.users) {
            state.users.forEach(user => {
                addUserAvatar(user.id, user.avatar);
            });
        }
        if (state.lockedBy) {
            textArea.classList.add('locked');
            textArea.disabled = true;

            // Set the editor info to show who is editing
            showEditorInfo(state.lockedBy, state.lockedByAvatar);
        }
    });

     // Display the avatar for the current user
     function addUserAvatar(userId, avatarUrl) {
        if (document.getElementById(`user-${userId}`)) return;
        const userAvatar = document.createElement('div');
        userAvatar.classList.add('user-avatar');
        userAvatar.id = `user-${userId}`;

        const img = document.createElement('img');
        img.src = avatarUrl;

        const text = document.createElement('span');
        text.innerText = `User ${userId}`;

        userAvatar.appendChild(img);
        userAvatar.appendChild(text);
        avatarContainer.appendChild(userAvatar);
    }

        function showEditorInfo(userId, avatarUrl) {
            editorInfo.classList.add('active');
            editorAvatar.innerHTML = `<img src="${avatarUrl}" alt="avatar">`;
            document.getElementById('editor-name').innerText = `${userId} is editing...`;
        }

    // When a new user connects, add their avatar
    socket.on('user-connected', (data) => {
        addUserAvatar(data.userId, data.avatar);
    });

    // Lock the text area when the current user clicks on it
    textArea.addEventListener('focus', () => {
        if (!textArea.disabled) {
            //The client tells the server that it wants to lock the document. 
            //This request is sent via WebSocket to ensure no other users can edit the document until it's unlocked.
            socket.emit('lock');
            isOwner = true;
        }
    });

    // Unlock the text area when the current user unfocuses from it
    textArea.addEventListener('blur', () => {
        if (isOwner) {
            socket.emit('unlock');
            isOwner = false;
        }
    });

    // Send text updates to the server
    textArea.addEventListener('input', () => {//Whenever the user types in the text area, this event triggers
        if (isOwner) {
            socket.emit('update', textArea.value);
        }
    });

    // Update the text area content from other users
    //This listens for updates from the server. 
    socket.on('update', (content) => {
        textArea.value = content;
    });

    // Handle document lock/unlock
    socket.on('lock', (data) => {
        //When another user locks the document, the server informs all clients (except the locking user) about the lock.
        //If the current user is not the owner (!isOwner), 
        //the text area is disabled and visually marked as locked (gray background)
        if (!isOwner) {
            textArea.classList.add('locked');
            textArea.disabled = true;

            // Show who is editing
            showEditorInfo(data.userId, data.avatar);
        }
    });

    //When the locking user unlocks the document, the server notifies all clients. 
    //The text area is enabled again and the "locked" class is removed.
    socket.on('unlock', () => {
        textArea.classList.remove('locked');
        textArea.disabled = false;

        // Hide the editor info
        editorInfo.classList.remove('active');
        editorAvatar.innerHTML = '';
    });

     // When a user disconnects, remove their avatar
     socket.on('user-disconnected', (userId) => {
        const userAvatar = document.getElementById(`user-${userId}`);
        if (userAvatar) {
            userAvatar.remove();
        }
    });