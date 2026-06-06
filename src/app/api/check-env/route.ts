import { NextResponse } from 'next/server'

/**
 * 临时诊断端点 - 验证环境变量
 * GET /api/check-env
 */
export async function GET() {
  const cronSecret = process.env.CRON_SECRET || ''
  
  return NextResponse.json({
    success: true,
    data: {
      hasCronSecret: !!cronSecret,
      cronSecretLength: cronSecret.length,
      cronSecretFirst10: cronSecret.slice(0, 10),
      cronSecretLast10: cronSecret.slice(-10),
      cronSecretHash: cronSecret.split('').reduce((a,b)=>a+b.charCodeAt(0),0),
      allEnvKeys: Object.keys(process.env).filter(k => !k.includes('KEY') && !k.includes('SECRET') && !k.includes('PASSWORD') && !k.includes('URL')),
    }
  })
}
