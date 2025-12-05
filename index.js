const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 8000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Configuration email
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT || 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Stockage temporaire (remplace par ta BDD après)
let messages = [];
let sentMessages = new Set();

// Fonction d'envoi email
async function sendEmail(to, subject, text) {
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: to,
      subject: subject,
      text: text
    });
    return true;
  } catch (error) {
    console.error('Erreur envoi email:', error);
    return false;
  }
}

// Vérificateur de messages (toutes les 30 secondes)
setInterval(async () => {
  const now = new Date();
  
  for (const msg of messages) {
    const scheduledDate = new Date(msg.date);
    const msgId = `${msg.email}-${msg.date}-${msg.message}`;
    
    if (scheduledDate <= now && !sentMessages.has(msgId) && !msg.sent) {
      console.log(`📨 Envoi du message à ${msg.email}...`);
      
      const success = await sendEmail(
        msg.email,
        'PeacePing - Message programmé',
        msg.message
      );
      
      if (success) {
        msg.sent = true;
        msg.sentAt = now.toISOString();
        sentMessages.add(msgId);
        console.log(`✅ Message envoyé à ${msg.email}`);
      }
    }
  }
}, 30000);

// Ajouter un message
app.post('/add', (req, res) => {
  const { email, message, date } = req.body;
  
  if (!email || !message || !date) {
    return res.status(400).json({ error: 'Tous les champs sont requis' });
  }
  
  const scheduledDate = new Date(date);
  const now = new Date();
  
  if (scheduledDate < now) {
    return res.status(400).json({ error: 'La date doit être dans le futur' });
  }
  
  if (!email.includes('@')) {
    return res.status(400).json({ error: 'Email invalide' });
  }
  
  const newMessage = {
    id: Date.now() + Math.random(),
    email,
    message,
    date,
    sent: false,
    createdAt: new Date().toISOString()
  };
  
  messages.push(newMessage);
  
  res.json({ 
    success: true, 
    message: 'Message programmé avec succès',
    data: newMessage
  });
});

// Récupérer les messages
app.get('/messages', (req, res) => {
  const { email } = req.query;
  
  let result = messages;
  if (email) {
    result = messages.filter(m => m.email === email);
  }
  
  res.json(result);
});

// Supprimer un message
app.delete('/messages/:id', (req, res) => {
  const id = parseFloat(req.params.id);
  const index = messages.findIndex(m => m.id === id);
  
  if (index === -1) {
    return res.status(404).json({ error: 'Message non trouvé' });
  }
  
  messages.splice(index, 1);
  res.json({ success: true, message: 'Message supprimé' });
});

// Status de l'app
app.get('/status', (req, res) => {
  res.json({
    status: 'running',
    totalMessages: messages.length,
    pendingMessages: messages.filter(m => !m.sent).length,
    sentMessages: messages.filter(m => m.sent).length,
    emailConfigured: !!(process.env.EMAIL_USER && process.env.EMAIL_PASS)
  });
});

// Page principale
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📧 Email configured: ${!!(process.env.EMAIL_USER && process.env.EMAIL_PASS)}`);
  console.log(`⏰ Checking for scheduled messages every 30 seconds...`);
});
