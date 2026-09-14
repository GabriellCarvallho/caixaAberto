import { Router } from 'express';

import {
  changePublicLinkState,
  generatePublicLink,
} from '../controllers/organizationPublicLinkController.js';
import { authenticate } from '../middlewares/auth.js';
import { loadContext, requireRole } from '../middlewares/load-context.js';

const router = Router();

router.post(
  '/atual/link-publico',
  authenticate,
  loadContext,
  requireRole('TESOUREIRO'),
  generatePublicLink,
);
router.patch(
  '/atual/link-publico',
  authenticate,
  loadContext,
  requireRole('TESOUREIRO'),
  changePublicLinkState,
);

export default router;
