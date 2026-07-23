import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (!user || authError) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  if (!body || !body.symbol || !body.side || !body.quantity) {
    return NextResponse.json(
      { error: 'Missing required fields: symbol, side, quantity' },
      { status: 400 }
    )
  }

  const { symbol, side, quantity } = body
  const validSides = ['buy', 'sell']
  if (!validSides.includes(side)) {
    return NextResponse.json(
      { error: 'Invalid side. Must be buy or sell' },
      { status: 400 }
    )
  }
  if (typeof quantity !== 'number' || quantity <= 0 || !Number.isFinite(quantity)) {
    return NextResponse.json(
      { error: 'Invalid quantity' },
      { status: 400 }
    )
  }

  // Record trade intent in DB scoped to authenticated user
  const { error: dbError } = await supabase
    .from('trades')
    .insert({
      user_id: user.id,
      symbol: symbol.toUpperCase(),
      side,
      quantity,
      price: 0, // Will be filled by Alpaca execution
      executed_at: new Date().toISOString(),
    })

  if (dbError) {
    return NextResponse.json(
      { error: 'Database error' },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true, message: 'Trade order queued' })
}
