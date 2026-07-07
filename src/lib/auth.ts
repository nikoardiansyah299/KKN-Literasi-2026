import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';

const JWT_SECRET = process.env.JWT_SECRET || 'library-dev-secret';

export type AuthUser = {
  id: number;
  name: string;
  email: string;
  role: string;
};

export function signToken(user: AuthUser) {
  return jwt.sign({ id: user.id, role: user.role, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string) {
  return jwt.verify(token, JWT_SECRET) as AuthUser & { iat?: number; exp?: number };
}

export function hashPassword(password: string) {
  return bcrypt.hashSync(password, 10);
}

export function comparePassword(password: string, hash: string) {
  return bcrypt.compareSync(password, hash);
}

export async function getSessionUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get('library_token')?.value;
  if (!token) return null;

  try {
    const payload = verifyToken(token) as AuthUser;
    return payload;
  } catch {
    return null;
  }
}
