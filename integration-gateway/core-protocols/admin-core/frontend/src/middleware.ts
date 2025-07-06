import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

import { isValidToken } from './app/api/auth/utils'

// eslint-disable-next-line
const protectedRoutes = ['/*']
const publicRoutes = ['/login']

export default async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname

  // eslint-disable-next-line
  const isPublicRoute = publicRoutes.includes(path)

  // eslint-disable-next-line
  const cookie = cookies().get('token')

  const cookieIsValid = await isValidToken(cookie?.value)

  if (!isPublicRoute && !cookieIsValid) {
    return NextResponse.redirect(new URL('/login', req.nextUrl))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|.*\\.png$).*)']
}
