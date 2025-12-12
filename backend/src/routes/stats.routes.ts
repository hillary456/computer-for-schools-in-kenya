import { Router } from 'express';
import { getImpactStatistics, getDashboardStats } from '../controllers/stats.controller.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';

const router = Router();

router.get('/impact', getImpactStatistics);

router.get('/dashboard', authenticateToken, authorizeRoles('admin'), getDashboardStats);

export default router;