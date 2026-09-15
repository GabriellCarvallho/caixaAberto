import { Router } from 'express';

import { getCategoryReport } from '../controllers/categoryReportController.js';
import { authenticate } from '../middlewares/auth.js';
import { loadContext } from '../middlewares/load-context.js';

const router = Router();

router.get('/categorias', authenticate, loadContext, getCategoryReport);

export default router;
