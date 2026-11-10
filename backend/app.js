const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const connectDatabase = require('./connection');
const routes = require('./routes');

const app = express();

// Allow the dev frontend from localhost or a LAN address (phone testing).
const LOCAL_ORIGIN = new RegExp('^https?:\\/\\/(localhost|127\\.0\\.0\\.1|192\\.168\\.[0-9.]+|10\\.[0-9.]+):[0-9]+$');
const origins = [process.env.FRONTEND_ORIGIN || 'http://localhost:3000', 'http://127.0.0.1:3000'];
app.use(
  cors({
    origin: (origin, cb) => cb(null, !origin || origins.includes(origin) || LOCAL_ORIGIN.test(origin)),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/api/health', (req, res) => res.json({ ok: true, name: 'RoshanRozgar API', whatsapp: require('./services/whatsapp').getStatus() }));
app.use('/api', routes);

app.use((req, res) => res.status(404).json({ error: 'Not found' }));
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  if (err.name === 'MulterError') {
    const msg = err.code === 'LIMIT_FILE_SIZE' ? 'That file is too large (max 12 MB).' : err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE' ? 'Too many files. Please upload fewer photos at a time.' : 'Upload failed. Please try again.';
    return res.status(400).json({ error: msg });
  }
  const status = err.status || (err.name === 'CastError' ? 400 : 500);
  res.status(status).json({ error: status === 500 ? 'Something went wrong. Please try again.' : err.message });
});

const PORT = process.env.PORT || 5000;
connectDatabase(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/roshanrozgar')
  .then(() => {
    console.log('MongoDB connected');
    app.listen(PORT, () => console.log(`RoshanRozgar API running on port ${PORT}`));
    require('./services/whatsapp').start().catch((e) => console.error('WhatsApp:', e.message));
  })
  .catch((err) => {
    console.error('MongoDB connection failed:', err.message);
    process.exit(1);
  });

module.exports = app;
