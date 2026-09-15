import { Router } from 'express';

import {
  downloadReceipt,
  receiveReceiptFile,
  uploadReceipt,
} from '../controllers/receiptController.js';
import { authenticate } from '../middlewares/auth.js';
import { loadContext, requireRole } from '../middlewares/load-context.js';

const router = Router();

router.post(
  '/:id/comprovante',
  authenticate,
  loadContext,
  requireRole('TESOUREIRO'),
  receiveReceiptFile,
  uploadReceipt,
);

// Leitura e direito de qualquer membro com vinculo ativo, entao sem requireRole.
router.get('/:id/comprovante', authenticate, loadContext, downloadReceipt);

export default router;
