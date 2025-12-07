import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import authRoutes from './routes/auth.routes.js';
import donationsRoutes from './routes/donations.routes.js';
import schoolRequestsRoutes from './routes/schoolRequests.routes.js';
import contactRoutes from './routes/contact.routes.js';
const app = express();
const PORT = process.env.PORT || 3000;
app.use(cors({
    origin: 'http://127.0.0.1:5500',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
}));
app.use(express.json());
app.get('/', (req, res) => {
    res.status(200).send('E-Waste System Backend is running.');
});
app.use('/api/auth', authRoutes);
app.use('/api/donations', donationsRoutes);
app.use('/api/school-requests', schoolRequestsRoutes);
app.use('/api/contact', contactRoutes);
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        message: 'Critical Server Crash (Express)',
        details: err.message
    });
});
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Access at http://localhost:${PORT}`);
});
