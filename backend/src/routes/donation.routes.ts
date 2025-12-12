import { Router } from 'express';
import { body } from 'express-validator';
import {
  createDonation,
  getDonations,
  getDonationById,
  updateDonationStatus,
  getUserDonations
} from '../controllers/donation.controller';
import { authenticateToken, authorizeRoles } from '../middleware/auth';

const router = Router();

router.post(
  '/',
  [
    body('donor_name').trim().notEmpty().withMessage('Donor name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('phone').trim().notEmpty().withMessage('Phone is required'),
    body('address').trim().notEmpty().withMessage('Address is required'),
    body('computer_type').isIn(['desktop', 'laptop', 'tablet', 'mixed']).withMessage('Invalid computer type'),
    body('quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
    body('condition_status').isIn(['working', 'needs-repair', 'not-working', 'mixed']).withMessage('Invalid condition'),
  ],
  createDonation
);

router.get('/', authenticateToken, authorizeRoles('admin'), getDonations);

router.get('/user/:userId', authenticateToken, getUserDonations);

router.get('/:id', authenticateToken, getDonationById);

router.patch(
  '/:id/status',
  authenticateToken,
  authorizeRoles('admin'),
  [
    body('status').isIn(['pending', 'approved', 'collected', 'processing', 'delivered', 'rejected']).withMessage('Invalid status'),
  ],
  updateDonationStatus
);

export default router;