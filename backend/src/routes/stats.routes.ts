import { Router } from 'express';
import { getImpactReport, getDashboardStats } from '../controllers/stats.controller.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';

const router = Router();

router.get('/impact-report', getImpactReport);

router.get('/dashboard', authenticateToken, authorizeRoles('admin'), getDashboardStats);

export default router;