'use client'

import dynamic from 'next/dynamic'

const Onboarding = dynamic(() => import('@/components/Onboarding'), { ssr: false })

export default function OnboardingWrapper() {
  return <Onboarding />
}
