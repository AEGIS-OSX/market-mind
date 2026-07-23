import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

type CookieToSet = { name: string; value: string; options: Record<string, unknown> }

async function createSupabaseClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: CookieToSet[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options as Parameters<typeof cookieStore.set>[2])
            )
          } catch {
            // Called from a Server Component -- cookies cannot be set
          }
        },
      },
    }
  )
}

const VALID_RISK_LEVELS = ['conservative', 'moderate', 'aggressive'] as const
const VALID_EXECUTION_MODES = ['auto', 'recommend'] as const

const DEFAULT_SETTINGS = {
  risk_level: 'moderate',
  investment_cap: null,
  execution_mode: 'recommend',
  brokerage_connected: false,
}

export async function GET() {
  const supabase = await createSupabaseClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('user_settings')
    .select('risk_level, investment_cap, execution_mode, brokerage_connected')
    .eq('user_id', user.id)
    .single()

  if (error || !data) {
    return NextResponse.json(DEFAULT_SETTINGS, { status: 200 })
  }

  return NextResponse.json(data, { status: 200 })
}

export async function PATCH(request: NextRequest) {
  const supabase = await createSupabaseClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  // Validate risk_level if provided
  if (body.risk_level !== undefined) {
    if (!VALID_RISK_LEVELS.includes(body.risk_level as typeof VALID_RISK_LEVELS[number])) {
      return NextResponse.json(
        { error: `risk_level must be one of: ${VALID_RISK_LEVELS.join(', ')}` },
        { status: 400 }
      )
    }
  }

  // Validate investment_cap if provided
  if (body.investment_cap !== undefined && body.investment_cap !== null) {
    const cap = Number(body.investment_cap)
    if (isNaN(cap) || cap <= 0) {
      return NextResponse.json(
        { error: 'investment_cap must be a positive number or null' },
        { status: 400 }
      )
    }
    body.investment_cap = cap
  }

  // Validate execution_mode if provided
  if (body.execution_mode !== undefined) {
    if (!VALID_EXECUTION_MODES.includes(body.execution_mode as typeof VALID_EXECUTION_MODES[number])) {
      return NextResponse.json(
        { error: `execution_mode must be one of: ${VALID_EXECUTION_MODES.join(', ')}` },
        { status: 400 }
      )
    }
  }

  // Never trust user_id from body -- always use session
  const upsertData: Record<string, unknown> = {
    user_id: user.id,
    updated_at: new Date().toISOString(),
  }

  if (body.risk_level !== undefined) upsertData.risk_level = body.risk_level
  if (body.investment_cap !== undefined) upsertData.investment_cap = body.investment_cap
  if (body.execution_mode !== undefined) upsertData.execution_mode = body.execution_mode
  if (body.brokerage_connected !== undefined) upsertData.brokerage_connected = body.brokerage_connected

  const { data, error } = await supabase
    .from('user_settings')
    .upsert(upsertData, { onConflict: 'user_id' })
    .select('risk_level, investment_cap, execution_mode, brokerage_connected')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data, { status: 200 })
}
