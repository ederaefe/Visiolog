import fs from 'fs'
import path from 'path'
import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  // Read root standalone index.html
  const filePath = path.join(process.cwd(), 'index.html')
  let htmlContent = fs.readFileSync(filePath, 'utf8')

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

  // Inject authoritative server state into HTML with backward compatibility
  const authScript = `<script>window.__VISIOLOG_AUTH__ = ${isAuthenticated}; window.__AKOSIL_AUTH__ = ${isAuthenticated};</script>`
  htmlContent = htmlContent.replace('</head>', `${authScript}\n</head>`)

  return new NextResponse(htmlContent, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store, must-revalidate',
    },
  })
}
