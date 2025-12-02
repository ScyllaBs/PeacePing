const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8000;

// Middleware pour parser les données du formulaire
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Liste des messages programmés en mémoire (simple pour test)
let messages = [];

// Endpoint pour ajouter un message
app.post('/add', (req, res) => {
  const { message, date } = req.body;
  if (message && date) {
    messages.push({ message, date });
  }
  res.redirect('/');
});

// Endpoint pour récupérer la liste des messages
app.get('/messages', (req, res) => {
  res.json(messages);
});

// Servir la page HTML
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
