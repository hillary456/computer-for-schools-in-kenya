import { Router } from 'express';
import { getInventory, fulfillRequest } from '../controllers/inventory.controller.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';

const router = Router();

router.get('/', authenticateToken, authorizeRoles('admin'), getInventory);
router.post('/fulfill', authenticateToken, authorizeRoles('admin'), fulfillRequest); // <--- Add this

export default router; 