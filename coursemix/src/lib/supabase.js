import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

export const supabase = createClientComponentClient()

// Create a client for server components
export const createServerClient = () => {
  return createClientComponentClient()
} 