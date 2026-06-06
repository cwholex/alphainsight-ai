export function successResponse(data: unknown, status = 200) {
  return Response.json({ success: true, data }, { status })
}

export function errorResponse(message: string, status = 400, details?: unknown) {
  return Response.json({ success: false, error: message, details }, { status })
}

export async function requireAuth(req: Request) {
  const { getAuthToken, verifyToken } = await import('./auth')
  const token = getAuthToken(req)
  if (!token) return null
  return verifyToken(token)
}

export async function requireAdmin(req: Request) {
  const payload = await requireAuth(req)
  if (!payload || payload.role !== 'admin') {
    return null
  }
  return payload
}
