'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import NewProfileSetup from '@/components/NewProfileSetup'
import Spinner from '@/components/Spinner'

export default function NewProfileSetupPage() {
  return (
    <div className="min-h-screen">
      <NewProfileSetup />
    </div>
  )
}