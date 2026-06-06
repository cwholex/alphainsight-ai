import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * 更新专家 YouTube 频道 ID
 * POST /api/update-expert-youtube
 * Body: { expertName: string, youtubeChannelId: string }
 */
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { expertName, youtubeChannelId } = body

    if (!expertName || !youtubeChannelId) {
      return NextResponse.json({ success: false, error: 'Missing expertName or youtubeChannelId' }, { status: 400 })
    }

    const expert = await prisma.expert.findUnique({ where: { name: expertName } })
    if (!expert) {
      return NextResponse.json({ success: false, error: `Expert not found: ${expertName}` }, { status: 404 })
    }

    const sources = (expert.contentSources as any[]) || []
    const updatedSources = sources.map((s: any) => {
      if (s.type === 'youtube_channel' && s.identifier?.startsWith('PLACEHOLDER_')) {
        return { ...s, identifier: youtubeChannelId }
      }
      return s
    })

    await prisma.expert.update({
      where: { id: expert.id },
      data: { contentSources: updatedSources }
    })

    return NextResponse.json({
      success: true,
      data: {
        expert: expertName,
        youtubeChannelId,
        message: 'YouTube channel ID updated'
      }
    })
  } catch (err) {
    console.error('[UpdateExpertYouTube] Error:', err)
    return NextResponse.json({ success: false, error: 'Failed to update' }, { status: 500 })
  }
}
