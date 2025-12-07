import { Router } from 'express';
import { body } from 'express-validator';
import {
  createSchoolRequest,
  getSchoolRequests,
  getSchoolRequestById,
  updateRequestStatus,
  getUserSchoolRequests,
  getSchools,
  getSchoolById
} from '../controllers/school.controller.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';

const router = Router();

// School Requests
router.post(
  '/requests',
  authenticateToken,
  authorizeRoles('school'),
  [
    body('school_name').trim().notEmpty().withMessage('School name is required'),
    body('contact_person').trim().notEmpty().withMessage('Contact person is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('phone').trim().notEmpty().withMessage('Phone is required'),
    body('location').trim().notEmpty().withMessage('Location is required'),
    body('computer_type').isIn(['desktop', 'laptop', 'tablet', 'any']).withMessage('Invalid computer type'),
    body('quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
    body('justification').trim().notEmpty().withMessage('Justification is required'),
  ],
  createSchoolRequest
);

router.get('/requests', authenticateToken, authorizeRoles('admin'), getSchoolRequests);

router.get('/requests/user/:userId', authenticateToken, getUserSchoolRequests);

router.get('/requests/:id', authenticateToken, getSchoolRequestById);

router.patch(
  '/requests/:id/status',
  authenticateToken,
  authorizeRoles('admin'),
  [
    body('status').isIn(['pending', 'approved', 'fulfilled', 'rejected']).withMessage('Invalid status'),
  ],
  updateRequestStatus
);

// Schools
router.get('/', getSchools);

router.get('/:id', getSchoolById);

export default router;