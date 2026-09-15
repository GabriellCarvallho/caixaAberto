import { Router } from 'express';

import { getStatement } from '../controllers/statementController.js';
import { authenticate } from '../middlewares/auth.js';
import { loadContext } from '../middlewares/load-context.js';

const router = Router();

router.get('/', authenticate, loadContext, getStatement);

export default router;
