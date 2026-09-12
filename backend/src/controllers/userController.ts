import { Request, Response } from 'express'
import bcrypt from 'bcrypt'

import userRepository from '../repositories/userRepository.js'

function serializeUser(user: any) {
  return {
    id: user.id.toString(),
    name: user.name,
    email: user.email,
    active: user.active,
    createdAt: user.createdAt,
  }
}

async function getUsers(req: Request, res: Response) {
  try {
    const users = await userRepository.findAll()

    return res.json(users.map(serializeUser))
  } catch (error) {
    console.error(error)

    return res.status(500).json({
      error: 'Erro ao buscar usuários',
    })
  }
}

async function getUserById(req: Request, res: Response) {
  try {
    const { id: idParam } = req.params

    if (!idParam || Array.isArray(idParam)) {
      return res.status(400).json({
        error: 'ID de usuário inválido',
      })
    }

    const id = BigInt(idParam)

    //const id = BigInt(req.params.id)

    const user = await userRepository.findById(id)

    if (!user) {
      return res.status(404).json({
        error: 'Usuário não encontrado',
      })
    }

    return res.json(serializeUser(user))
  } catch (error) {
    console.error(error)

    return res.status(400).json({
      error: 'ID de usuário inválido',
    })
  }
}

async function createUser(req: Request, res: Response) {
  try {
    const {
      name,
      email,
      password,
      active,
    } = req.body

    if (!name || !email || !password) {
      return res.status(400).json({
        error: 'Nome, e-mail e senha são obrigatórios',
      })
    }

    const existingUser = await userRepository.findByEmail(email)

    if (existingUser) {
      return res.status(400).json({
        error: 'E-mail já cadastrado',
      })
    }

    const passwordHash = await bcrypt.hash(password, 10)

    const user = await userRepository.create({
      name,
      email,
      passwordHash,
      active,
    })

    return res.status(201).json(serializeUser(user))
  } catch (error) {
    console.error(error)

    return res.status(500).json({
      error: 'Erro ao criar usuário',
    })
  }
}

async function updateUser(req: Request, res: Response) {
  try {
    const { id: idParam } = req.params

    if (!idParam || Array.isArray(idParam)) {
      return res.status(400).json({
        error: 'ID de usuário inválido',
      })
    }

    const id = BigInt(idParam)

    //const id = BigInt(req.params.id)

    const {
      name,
      email,
      password,
      active,
    } = req.body

    const existingUser = await userRepository.findById(id)

    if (!existingUser) {
      return res.status(404).json({
        error: 'Usuário não encontrado',
      })
    }

    if (email && email !== existingUser.email) {
      const emailInUse = await userRepository.findByEmail(email)

      if (emailInUse) {
        return res.status(400).json({
          error: 'E-mail já cadastrado',
        })
      }
    }

    const data: {
      name?: string
      email?: string
      passwordHash?: string
      active?: boolean
    } = {}

    if (name !== undefined) {
      data.name = name
    }

    if (email !== undefined) {
      data.email = email
    }

    if (password !== undefined) {
      data.passwordHash = await bcrypt.hash(password, 10)
    }

    if (active !== undefined) {
      data.active = active
    }

    const updatedUser = await userRepository.update(id, data)

    return res.json(serializeUser(updatedUser))
  } catch (error) {
    console.error(error)

    return res.status(400).json({
      error: 'Erro ao atualizar usuário',
    })
  }
}

async function deleteUser(req: Request, res: Response) {
  try {
    const { id: idParam } = req.params

    if (!idParam || Array.isArray(idParam)) {
      return res.status(400).json({
        error: 'ID de usuário inválido',
      })
    }

    const id = BigInt(idParam)

    //const id = BigInt(req.params.id)

    const existingUser = await userRepository.findById(id)

    if (!existingUser) {
      return res.status(404).json({
        error: 'Usuário não encontrado',
      })
    }

    await userRepository.deleteById(id)

    return res.status(204).send()
  } catch (error) {
    console.error(error)

    return res.status(400).json({
      error: 'Não foi possível excluir o usuário',
    })
  }
}

export default {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
}
