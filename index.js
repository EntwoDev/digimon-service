const express = require('express');
const app = express();
const plamoRoutes = require('./src/routes/PlamoRoute');
const monitoringRoutes = require('./src/routes/Monitoring');
const cors = require('cors');
require('dotenv').config();
app.use(cors());

app.use(express.json());
app.use('/plamo', plamoRoutes);
app.use('/monitoring', monitoringRoutes);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));