import { Router } from 'express'
import * as transactionController from '../controllers/transactionController.js'
import { authenticate } from '../middlewares/auth.js'

const router = Router()

// US18 + US19 — Registrar lançamento financeiro
// Body: { organizationId, categoryId, amount, date, description, tipo, source?, recipient? }
router.post('/', authenticate, transactionController.createTransaction)

// US29 — Consultar resumo financeiro mensal
// Ex.: GET /api/lancamentos/resumo/mensal?organizationId=10&mes=2026-09
router.get('/resumo/mensal', authenticate, transactionController.monthlySummary)

// US24 — Visualizar detalhes do lançamento
// Ex.: GET /api/lancamentos/123?organizationId=10
router.get('/:id', authenticate, transactionController.getOne)

export default router
