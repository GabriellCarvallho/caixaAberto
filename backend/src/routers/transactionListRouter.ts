import { Router } from 'express';

import { listTransactions } from '../controllers/transactionListController.js';
import { authenticate } from '../middlewares/auth.js';
import { loadContext } from '../middlewares/load-context.js';

const router = Router();

router.get('/', authenticate, loadContext, listTransactions);

export default router;
