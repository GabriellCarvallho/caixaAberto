import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET não definido nas variáveis de ambiente')
}

interface UserForToken {
  id: bigint
  email: string
}

/**
 * Gera o JWT utilizado para autenticação da aplicação.
 *
 * O ID do usuário é armazenado no campo "sub" (subject)
 * do JWT, convertido para string porque o JWT não trabalha
 * diretamente com BigInt.
 */
function signUserToken(user: UserForToken): string {
    if (!JWT_SECRET) {
        throw new Error('JWT_SECRET não configurado');
    }  
  
    return jwt.sign(
    {
      email: user.email,
    },
    JWT_SECRET,
    {
      subject: user.id.toString(),
      expiresIn: '1d',
    }
  )
}

export {
  signUserToken,
}
