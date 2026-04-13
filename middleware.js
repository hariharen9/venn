import { NextResponse } from 'next/server'

export function middleware(request) {
  const { pathname } = request.nextUrl
  
  const authCookie = request.cookies.get('venn_auth')
  const expectedValue = process.env.APP_PIN ? Buffer.from(process.env.APP_PIN).toString('base64') : null
  const isAuthenticated = authCookie?.value === expectedValue
  
  const isLoginPage = pathname === '/login'
  const isApiAuth = pathname === '/api/login'
  
  if (isApiAuth) {
    return NextResponse.next()
  }
  
  if (isLoginPage) {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL('/', request.url))
    }
    return NextResponse.next()
  }
  
  if (!isAuthenticated) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest).*)',
  ],
}