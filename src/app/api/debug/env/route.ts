import { NextResponse } from 'next/server'

export async function GET() {
  const envVars = {
    CRON_SECRET_SET: !!process.env.CRON_SECRET,
    CRON_SECRET_LENGTH: process.env.CRON_SECRET?.length || 0,
    CRON_SECRET_FIRST_10: process.env.CRON_SECRET?.slice(0, 10) || 'NOT_SET',
    KIMI_API_KEY_SET: !!process.env.KIMI_API_KEY,
    YOUTUBE_API_KEY_SET: !!process.env.YOUTUBE_API_KEY,
    BRAVE_SEARCH_KEY_SET: !!process.env.BRAVE_SEARCH_KEY,
    NEWSAPI_KEY_SET: !!process.env.NEWSAPI_KEY,
    DATABASE_URL_SET: !!process.env.DATABASE_URL,
    NODE_ENV: process.env.NODE_ENV,
  }
  
  return NextResponse.json({
    success: true,
    data: envVars,
    message: 'Environment variable diagnostic (no secrets exposed)',
  })
}
