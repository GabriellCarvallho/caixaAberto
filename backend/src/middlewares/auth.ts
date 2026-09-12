import { Request, Response, NextFunction } from 'express'
import jwt, { JwtPayload } from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET não definido nas variáveis de ambiente')
}

export interface AuthUser {
  id: string
  email: string
}

export interface AuthRequest extends Request {
  user?: AuthUser | null
}

interface TokenPayload extends JwtPayload {
  sub?: string
  id?: string
  email: string
}

function extractToken(req: Request): string | null {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }

  return authHeader.split(' ')[1] || null
}

function decodeUser(token: string): AuthUser {
  
  // gambiarrazinha essa verificação de novo do JWT_SECRET
  const JWT_SECRET = process.env.JWT_SECRET

  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET não definido nas variáveis de ambiente')
  }

  const decoded = jwt.verify(token, JWT_SECRET) as unknown as TokenPayload

  const id = decoded.sub ?? decoded.id

  if (!id || !decoded.email) {
    throw new Error('Payload do token inválido')
  }

  return {
    id: String(id),
    email: decoded.email,
  }
}

/**
 * Bloqueia a rota quando não existe um JWT válido.
 *
 * Popula req.user com:
 * {
 *   id: string,
 *   email: string
 * }
 */
function authenticate(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  const token = extractToken(req)

  if (!token) {
    return res.status(401).json({
      error: 'Token de autenticação não fornecido.',
    })
  }

  try {
    req.user = decodeUser(token)
    next()
  } catch (error) {
    return res.status(401).json({
      error: 'Token inválido ou expirado.',
    })
  }
}

/**
 * Não bloqueia a rota.
 *
 * Se existir um JWT válido, popula req.user.
 * Caso contrário, continua como anônimo.
 */
function optionalAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  const token = extractToken(req)

  if (!token) {
    req.user = null
    return next()
  }

  try {
    req.user = decodeUser(token)
  } catch {
    req.user = null
  }

  next()
}

export {
  authenticate,
  optionalAuth,
}