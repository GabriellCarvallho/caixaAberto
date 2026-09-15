import { Router } from 'express';

import { listCategories } from '../controllers/categoryController.js';
import { authenticate } from '../middlewares/auth.js';
import { loadContext } from '../middlewares/load-context.js';

const router = Router();

router.get('/', authenticate, loadContext, listCategories);

export default router;
