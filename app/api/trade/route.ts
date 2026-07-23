import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { symbol?: string; side?: string; quantity?: number }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { symbol, side, quantity } = body
  if (
    !symbol || typeof symbol !== 'string' ||
    !side || !['buy', 'sell'].includes(side) ||
    !quantity || typeof quantity !== 'number' || quantity <= 0
  ) {
    return NextResponse.json(
      { error: 'Missing or invalid fields: symbol, side, quantity required' },
      { status: 400 }
    )
  }

  const { error } = await supabase.from('trades').insert({
    user_id: user.id,
    symbol,
    side,
    quantity,
    price: 0,
    executed_at: new Date().toISOString(),
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    order: {
      symbol,
      side,
      quantity,
      user_id: user.id,
      executed_at: new Date().toISOString(),
    },
  })
}
