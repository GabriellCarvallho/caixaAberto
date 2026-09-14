import { Request, Response } from 'express';
import bcrypt from 'bcrypt';

import type { User } from '../generated/prisma/client.js';
import userRepository from '../repositories/userRepository.js';
import { signUserToken } from '../utils/jwtUtils.js';

function serializeUser(user: User) {
  return {
    id: user.id.toString(),
    name: user.name,
    email: user.email,
    active: user.active,
    createdAt: user.createdAt,
  };
}

async function register(req: Request, res: Response) {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        error: 'Preencha todos os campos',
      });
    }

    const userExists = await userRepository.findByEmail(email);

    if (userExists) {
      return res.status(400).json({
        error: 'E-mail já cadastrado',
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await userRepository.create({
      name,
      email,
      passwordHash,
    });

    return res.status(201).json({
      user: serializeUser(user),
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: 'Erro ao cadastrar usuário',
    });
  }
}

async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: 'Preencha e-mail e senha',
      });
    }

    const user = await userRepository.findByEmail(email);

    if (!user) {
      return res.status(401).json({
        error: 'E-mail ou senha inválidos',
      });
    }

    if (!user.active) {
      return res.status(403).json({
        error: 'Usuário inativo',
      });
    }

    const passwordIsValid = await bcrypt.compare(password, user.passwordHash);

    if (!passwordIsValid) {
      return res.status(401).json({
        error: 'E-mail ou senha inválidos',
      });
    }

    const token = signUserToken(user);

    return res.json({
      token,
      user: serializeUser(user),
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: 'Erro ao fazer login',
    });
  }
}

async function logout(_req: Request, res: Response) {
  //essa função ainda não faz nada, somente volta uma mensagem de "logout realizado"
  return res.status(200).json({
    message: 'Logout realizado com sucesso',
  });
}

export default {
  register,
  login,
  logout,
};
