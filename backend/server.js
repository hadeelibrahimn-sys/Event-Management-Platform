const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

const authRoutes = require('./routes/authRoutes');
app.use('/api/auth', authRoutes);

const simulationRoutes = require('./routes/simulationRoutes');
app.use('/api/simulation', simulationRoutes);

const eventRoutes = require('./routes/eventRoutes');
app.use('/api/events', eventRoutes);

const savedEventRoutes = require('./routes/savedEventRoutes');
app.use('/api/saved-events', savedEventRoutes);

const bookingRoutes = require('./routes/bookingRoutes');
app.use('/api/bookings', bookingRoutes);

const organiserRoutes = require('./routes/organiserRoutes');
app.use('/api/organisers', organiserRoutes);

// Handles both /api/conversations and /api/conversations/:id/messages.
const messageRoutes = require('./routes/messageRoutes');
app.use('/api', messageRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'Eventify API is running' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
