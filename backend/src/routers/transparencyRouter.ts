import { Router } from 'express'
import { publicTransparency } from '../controllers/transactionController.js'

const router = Router()

// US32 — consulta pública, sem authenticate
// Ex.: GET /api/transparencia/minha-organizacao?mes=2026-09
router.get('/:publicLink', publicTransparency)

export default router
