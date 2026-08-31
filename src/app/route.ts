import fs from 'fs'
import path from 'path'
import { NextResponse, NextRequest } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  // Authoritatively check authentication session with Supabase server
  let isAuthenticated = false
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    isAuthenticated = !!user
  } catch {
    isAuthenticated = false
  }

  // If standalone index.html exists, serve it with auth script injection
  const filePath = path.join(process.cwd(), 'index.html')
  if (fs.existsSync(filePath)) {
    try {
      let htmlContent = fs.readFileSync(filePath, 'utf8')
      const authScript = `<script>window.__VISIOLOG_AUTH__ = ${isAuthenticated}; window.__AKOSIL_AUTH__ = ${isAuthenticated};</script>`
      htmlContent = htmlContent.replace('</head>', `${authScript}\n</head>`)

      return new NextResponse(htmlContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-store, must-revalidate',
        },
      })
    } catch {
      // Fall through to redirect
    }
  }

  // If running in Next.js production mode without root index.html:
  const origin = request.nextUrl.origin
  if (isAuthenticated) {
    return NextResponse.redirect(new URL('/projects', origin))
  }
  return NextResponse.redirect(new URL('/auth', origin))
}
