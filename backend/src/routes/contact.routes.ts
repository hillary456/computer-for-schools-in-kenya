import { Router } from 'express';
import { body } from 'express-validator';
import {
  createContactMessage,
  getContactMessages,
  updateMessageStatus
} from '../controllers/contact.controller.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';

const router = Router();

router.post(
  '/',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('subject').trim().notEmpty().withMessage('Subject is required'),
    body('message').trim().notEmpty().withMessage('Message is required'),
  ],
  createContactMessage
);

router.get('/', authenticateToken, authorizeRoles('admin'), getContactMessages as any as (req: any, res: any, next: any) => void);

router.patch(
  '/:id/status',
  authenticateToken as any,
  authorizeRoles('admin'),
  [
    body('status').isIn(['unread', 'read', 'replied']).withMessage('Invalid status'),
  ],
  updateMessageStatus
);

export default router;