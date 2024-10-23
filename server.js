// Import the express module
const express = require('express');

// Create an instance of express
const app = express();

// Define a route for the root URL ('/')
app.get('/', (req, res) => {
  res.send('Hello World!');
});

// Start the server and listen on port 3000
const port = 3000;
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}/`);
});
