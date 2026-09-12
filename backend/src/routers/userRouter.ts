import express from 'express'
import userController from '../controllers/userController.js'
import { authenticate } from '../middlewares/auth.js'

const router = express.Router()

router.use(authenticate)

router.get('/', userController.getUsers)
router.get('/:id', userController.getUserById)
router.post('/', userController.createUser)
router.put('/:id', userController.updateUser)
router.delete('/:id', userController.deleteUser)

export default router