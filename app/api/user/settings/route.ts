import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

const DEFAULTS = {
  risk_level: 'moderate',
  investment_cap: null,
  execution_mode: 'recommend',
  brokerage_connected: false,
}

async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )
}

export async function GET() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', session.user.id)
    .single()

  if (error || !data) {
    return NextResponse.json(DEFAULTS, { status: 404 })
  }

  return NextResponse.json(data)
}

export async function PATCH(request: Request) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { risk_level, investment_cap, execution_mode } = body
  const update: Record<string, any> = {
    user_id: session.user.id,
    updated_at: new Date().toISOString(),
  }

  if (risk_level !== undefined) {
    if (!['conservative', 'moderate', 'aggressive'].includes(risk_level)) {
      return NextResponse.json({ error: 'Invalid risk_level' }, { status: 400 })
    }
    update.risk_level = risk_level
  }

  if (investment_cap !== undefined) {
    if (investment_cap !== null && (typeof investment_cap !== 'number' || investment_cap < 0)) {
      return NextResponse.json({ error: 'Invalid investment_cap' }, { status: 400 })
    }
    update.investment_cap = investment_cap
  }

  if (execution_mode !== undefined) {
    if (!['auto', 'recommend'].includes(execution_mode)) {
      return NextResponse.json({ error: 'Invalid execution_mode' }, { status: 400 })
    }
    update.execution_mode = execution_mode
  }

  const { data, error } = await supabase
    .from('user_settings')
    .upsert(update, { onConflict: 'user_id' })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}