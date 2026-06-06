export async function fetchETFPrice(etfCode: string): Promise<number | null> {
  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${etfCode}?interval=1d&range=1d`,
      { headers: { 'User-Agent': 'Mozilla/5.0' } }
    )
    if (!res.ok) return null
    const data = await res.json()
    const result = data?.chart?.result?.[0]
    if (!result) return null
    const closes = result.indicators?.quote?.[0]?.close?.filter(Boolean)
    return closes?.length ? closes[closes.length - 1] : null
  } catch {
    return null
  }
}

export async function fetchETFHistory(etfCode: string, days = 90): Promise<{ date: string; close: number }[]> {
  try {
    const end = Math.floor(Date.now() / 1000)
    const start = end - days * 86400
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${etfCode}?interval=1d&period1=${start}&period2=${end}`,
      { headers: { 'User-Agent': 'Mozilla/5.0' } }
    )
    if (!res.ok) return []
    const data = await res.json()
    const result = data?.chart?.result?.[0]
    if (!result) return []
    const timestamps = result.timestamp || []
    const closes = result.indicators?.quote?.[0]?.close || []
    return timestamps
      .map((t: number, i: number) => ({
        date: new Date(t * 1000).toISOString().slice(0, 10),
        close: closes[i],
      }))
      .filter((d: { close: number }) => d.close != null)
  } catch {
    return []
  }
}

export async function fetchVIX(): Promise<number | null> {
  return fetchETFPrice('^VIX')
}

export function calculateRSI(closes: number[], period = 14): number | null {
  if (closes.length < period + 1) return null
  let gains = 0, losses = 0
  for (let i = 1; i <= period; i++) {
    const change = closes[closes.length - i] - closes[closes.length - i - 1]
    if (change > 0) gains += change
    else losses -= change
  }
  if (losses === 0) return 100
  const rs = gains / losses
  return 100 - (100 / (1 + rs))
}
