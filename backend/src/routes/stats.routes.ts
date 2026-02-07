import { Router } from 'express';
import { getImpactReport, getDashboardStats } from '../controllers/stats.controller.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';
import { getBeneficiaries } from '../controllers/stats.controller.js';


const router = Router();

router.get('/impact-report', getImpactReport);
router.get('/beneficiaries', authenticateToken, authorizeRoles('admin'), getBeneficiaries);
router.get('/dashboard', authenticateToken, authorizeRoles('admin'), getDashboardStats);

export default router;