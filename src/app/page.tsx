'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { getProgress, UserProgress, isLessonCompleted, getUnitProgress } from '@/lib/progress'

const unitData = [
  {
    id: 1,
    title: 'Hola, com et dius?',
    color: '#E8F5E9',
    accent: '#66BB6A',
    lessons: [
      { emoji: '📖', label: 'Gramàtica', href: '/gramatica?unit=1', key: 'gram-1' },
      { emoji: '🔊', label: 'Vocabulari', href: '/pronunciacio?unit=1', key: 'vocab-1' },
      { emoji: '💬', label: 'Conversa', href: '/conversa?scene=presentacions', key: 'conv-1' },
      { emoji: '✅', label: 'Exercicis', href: '/avaluacio', key: 'ex-1' },
    ],
  },
  {
    id: 2,
    title: 'Coneixes la meva família?',
    color: '#E3F2FD',
    accent: '#42A5F5',
    lessons: [
      { emoji: '📖', label: 'Gramàtica', href: '/gramatica?unit=2', key: 'gram-2' },
      { emoji: '🔊', label: 'Vocabulari', href: '/pronunciacio?unit=2', key: 'vocab-2' },
      { emoji: '💬', label: 'Conversa', href: '/conversa?scene=familia', key: 'conv-2' },
      { emoji: '✅', label: 'Exercicis', href: '/avaluacio', key: 'ex-2' },
    ],
  },
  {
    id: 3,
    title: 'On vius?',
    color: '#FFF3E0',
    accent: '#FFA726',
    lessons: [
      { emoji: '📖', label: 'Gramàtica', href: '/gramatica?unit=3', key: 'gram-3' },
      { emoji: '🔊', label: 'Vocabulari', href: '/pronunciacio?unit=3', key: 'vocab-3' },
      { emoji: '💬', label: 'Conversa', href: '/conversa?scene=habitatge', key: 'conv-3' },
      { emoji: '✅', label: 'Exercicis', href: '/avaluacio', key: 'ex-3' },
    ],
  },
  {
    id: 4,
    title: 'Què fas cada dia?',
    color: '#F3E5F5',
    accent: '#AB47BC',
    lessons: [
      { emoji: '📖', label: 'Gramàtica', href: '/gramatica?unit=4', key: 'gram-4' },
      { emoji: '🔊', label: 'Vocabulari', href: '/pronunciacio?unit=4', key: 'vocab-4' },
      { emoji: '💬', label: 'Conversa', href: '/conversa?scene=rutina', key: 'conv-4' },
      { emoji: '✅', label: 'Exercicis', href: '/avaluacio', key: 'ex-4' },
    ],
  },
  {
    id: 5,
    title: "T'agrada el cinema?",
    color: '#FCE4EC',
    accent: '#EC407A',
    lessons: [
      { emoji: '📖', label: 'Gramàtica', href: '/gramatica?unit=5', key: 'gram-5' },
      { emoji: '🔊', label: 'Vocabulari', href: '/pronunciacio?unit=5', key: 'vocab-5' },
      { emoji: '💬', label: 'Conversa', href: '/conversa?scene=gustos', key: 'conv-5' },
      { emoji: '✅', label: 'Exercicis', href: '/avaluacio', key: 'ex-5' },
    ],
  },
  {
    id: 6,
    title: 'Anem a comprar',
    color: '#FFF8E1',
    accent: '#FFB300',
    lessons: [
      { emoji: '📖', label: 'Gramàtica', href: '/gramatica?unit=6', key: 'gram-6' },
      { emoji: '🔊', label: 'Vocabulari', href: '/pronunciacio?unit=6', key: 'vocab-6' },
      { emoji: '💬', label: 'Conversa', href: '/conversa?scene=comprar', key: 'conv-6' },
      { emoji: '✅', label: 'Exercicis', href: '/avaluacio', key: 'ex-6' },
    ],
  },
  {
    id: 7,
    title: 'Què vol prendre?',
    color: '#E8EAF6',
    accent: '#5C6BC0',
    lessons: [
      { emoji: '📖', label: 'Gramàtica', href: '/gramatica?unit=7', key: 'gram-7' },
      { emoji: '🔊', label: 'Vocabulari', href: '/pronunciacio?unit=7', key: 'vocab-7' },
      { emoji: '💬', label: 'Conversa', href: '/conversa?scene=restaurant', key: 'conv-7' },
      { emoji: '✅', label: 'Exercicis', href: '/avaluacio', key: 'ex-7' },
    ],
  },
  {
    id: 8,
    title: 'Ens movem per la ciutat',
    color: '#E0F2F1',
    accent: '#26A69A',
    lessons: [
      { emoji: '📖', label: 'Gramàtica', href: '/gramatica?unit=8', key: 'gram-8' },
      { emoji: '🔊', label: 'Vocabulari', href: '/pronunciacio?unit=8', key: 'vocab-8' },
      { emoji: '💬', label: 'Conversa', href: '/conversa?scene=indicacions', key: 'conv-8' },
      { emoji: '✅', label: 'Exercicis', href: '/avaluacio', key: 'ex-8' },
    ],
  },
  {
    id: 9,
    title: 'Què necessito?',
    color: '#FBE9E7',
    accent: '#FF7043',
    lessons: [
      { emoji: '📖', label: 'Gramàtica', href: '/gramatica?unit=9', key: 'gram-9' },
      { emoji: '🔊', label: 'Vocabulari', href: '/pronunciacio?unit=9', key: 'vocab-9' },
      { emoji: '💬', label: 'Conversa', href: '/conversa?scene=tramits', key: 'conv-9' },
      { emoji: '✅', label: 'Exercicis', href: '/avaluacio', key: 'ex-9' },
    ],
  },
  {
    id: 10,
    title: 'Qui és qui?',
    color: '#EDE7F6',
    accent: '#7E57C2',
    lessons: [
      { emoji: '📖', label: 'Gramàtica', href: '/gramatica?unit=10', key: 'gram-10' },
      { emoji: '🔊', label: 'Vocabulari', href: '/pronunciacio?unit=10', key: 'vocab-10' },
      { emoji: '💬', label: 'Conversa', href: '/conversa?scene=descripcions', key: 'conv-10' },
      { emoji: '✅', label: 'Exercicis', href: '/avaluacio', key: 'ex-10' },
    ],
  },
  {
    id: 11,
    title: 'El pis a punt',
    color: '#EFEBE9',
    accent: '#8D6E63',
    lessons: [
      { emoji: '📖', label: 'Gramàtica', href: '/gramatica?unit=11', key: 'gram-11' },
      { emoji: '🔊', label: 'Vocabulari', href: '/pronunciacio?unit=11', key: 'vocab-11' },
      { emoji: '💬', label: 'Conversa', href: '/conversa?scene=pis', key: 'conv-11' },
      { emoji: '✅', label: 'Exercicis', href: '/avaluacio', key: 'ex-11' },
    ],
  },
  { id: 12, title: 'Avui és festa!', color: '#FFF9C4', accent: '#FDD835',
    lessons: [
      { emoji: '📖', label: 'Gramàtica', href: '/gramatica?unit=12', key: 'gram-12' },
      { emoji: '🔊', label: 'Vocabulari', href: '/pronunciacio?unit=12', key: 'vocab-12' },
      { emoji: '💬', label: 'Conversa', href: '/conversa?scene=festes', key: 'conv-12' },
      { emoji: '✅', label: 'Exercicis', href: '/avaluacio', key: 'ex-12' },
    ],
  },
  { id: 13, title: 'Ens formem', color: '#E1F5FE', accent: '#039BE5',
    lessons: [
      { emoji: '📖', label: 'Gramàtica', href: '/gramatica?unit=13', key: 'gram-13' },
      { emoji: '🔊', label: 'Vocabulari', href: '/pronunciacio?unit=13', key: 'vocab-13' },
      { emoji: '💬', label: 'Conversa', href: '/conversa?scene=formacio', key: 'conv-13' },
      { emoji: '✅', label: 'Exercicis', href: '/avaluacio', key: 'ex-13' },
    ],
  },
  { id: 14, title: 'Anem a comprar (ampliació)', color: '#F1F8E9', accent: '#7CB342',
    lessons: [
      { emoji: '📖', label: 'Gramàtica', href: '/gramatica?unit=14', key: 'gram-14' },
      { emoji: '🔊', label: 'Vocabulari', href: '/pronunciacio?unit=14', key: 'vocab-14' },
      { emoji: '💬', label: 'Conversa', href: '/conversa?scene=compres_roba', key: 'conv-14' },
      { emoji: '✅', label: 'Exercicis', href: '/avaluacio', key: 'ex-14' },
    ],
  },
  { id: 15, title: 'Com et trobes?', color: '#FFEBEE', accent: '#EF5350',
    lessons: [
      { emoji: '📖', label: 'Gramàtica', href: '/gramatica?unit=15', key: 'gram-15' },
      { emoji: '🔊', label: 'Vocabulari', href: '/pronunciacio?unit=15', key: 'vocab-15' },
      { emoji: '💬', label: 'Conversa', href: '/conversa?scene=salut', key: 'conv-15' },
      { emoji: '✅', label: 'Exercicis', href: '/avaluacio', key: 'ex-15' },
    ],
  },
  { id: 16, title: 'Sortim!', color: '#E8F5E9', accent: '#66BB6A',
    lessons: [
      { emoji: '📖', label: 'Gramàtica', href: '/gramatica?unit=16', key: 'gram-16' },
      { emoji: '🔊', label: 'Vocabulari', href: '/pronunciacio?unit=16', key: 'vocab-16' },
      { emoji: '💬', label: 'Conversa', href: '/conversa?scene=sortir', key: 'conv-16' },
      { emoji: '✅', label: 'Exercicis', href: '/avaluacio', key: 'ex-16' },
    ],
  },
  { id: 17, title: 'Tinc una entrevista!', color: '#E3F2FD', accent: '#42A5F5',
    lessons: [
      { emoji: '📖', label: 'Gramàtica', href: '/gramatica?unit=17', key: 'gram-17' },
      { emoji: '🔊', label: 'Vocabulari', href: '/pronunciacio?unit=17', key: 'vocab-17' },
      { emoji: '💬', label: 'Conversa', href: '/conversa?scene=entrevista', key: 'conv-17' },
      { emoji: '✅', label: 'Exercicis', href: '/avaluacio', key: 'ex-17' },
    ],
  },
  { id: 18, title: 'Tinc temps lliure', color: '#F3E5F5', accent: '#AB47BC',
    lessons: [
      { emoji: '📖', label: 'Gramàtica', href: '/gramatica?unit=18', key: 'gram-18' },
      { emoji: '🔊', label: 'Vocabulari', href: '/pronunciacio?unit=18', key: 'vocab-18' },
      { emoji: '💬', label: 'Conversa', href: '/conversa?scene=oci', key: 'conv-18' },
      { emoji: '✅', label: 'Exercicis', href: '/avaluacio', key: 'ex-18' },
    ],
  },
]

export default function Home() {
  const [progress, setProgress] = useState<UserProgress | null>(null)

  useEffect(() => {
    setProgress(getProgress())
  }, [])

  const xp = progress?.xp ?? 0
  const streak = progress?.streak ?? 0

  // Determine which lesson is "current" (first incomplete)
  const allLessons = unitData.flatMap((u) => u.lessons.map((l) => ({ ...l, unitId: u.id })))
  const currentKey = progress
    ? allLessons.find((l) => !isLessonCompleted(l.key, progress))?.key ?? null
    : allLessons[0]?.key ?? null

  return (
    <div className="min-h-screen bg-white">
      {/* Mobile header */}
      <div className="md:hidden flex items-center justify-between px-5 pt-5 pb-2">
        <span className="text-[18px] font-extrabold text-[#1a1a1a] tracking-tight">catalapp</span>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 bg-[#F5F5F5] rounded-full px-3 py-1.5 text-[12px] font-bold text-[#1a1a1a]">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FFA726" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
            {xp} XP
          </span>
          <span className="inline-flex items-center gap-1.5 bg-[#F5F5F5] rounded-full px-3 py-1.5 text-[12px] font-bold text-[#1a1a1a]">
            🔥 {streak}
          </span>
        </div>
      </div>

      <div className="px-5 md:px-10 lg:px-20 xl:px-32 py-8">
        <div className="max-w-[700px] mx-auto">

          {/* Hero */}
          <div className="mb-12">
            <p className="text-[13px] font-bold text-[#666] uppercase tracking-widest mb-3">Nivell A1 · Bàsic</p>
            <h1 className="text-[32px] font-extrabold text-[#1a1a1a] leading-[1.1] mb-4">
              Aprèn català,<br />pas a pas.
            </h1>
            <Link href="/avaluacio">
              <span className="inline-flex items-center gap-2 bg-[#1a1a1a] text-white text-[14px] font-bold px-6 py-3 rounded-full hover:bg-[#333] transition-colors">
                Avaluació dimarts
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
              </span>
            </Link>
          </div>

          {/* Learning Path */}
          <div className="space-y-10">
            {unitData.map((unit) => {
              const pct = progress ? getUnitProgress(unit.id, progress) : 0
              return (
                <section key={unit.id}>
                  {/* Unit header */}
                  <div className="flex items-center gap-3 mb-5">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: unit.color }}
                    >
                      <span className="text-[15px] font-extrabold" style={{ color: unit.accent }}>
                        {unit.id}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h2 className="text-[15px] font-extrabold text-[#1a1a1a]">Unitat {unit.id}</h2>
                        <span className="text-[12px] font-bold text-[#666]">{pct}%</span>
                      </div>
                      <p className="text-[13px] font-semibold text-[#666]">{unit.title}</p>
                    </div>
                  </div>

                  {/* Lesson nodes */}
                  <div className="ml-[19px]">
                    {unit.lessons.map((lesson, li) => {
                      const completed = progress ? isLessonCompleted(lesson.key, progress) : false
                      const isCurrent = lesson.key === currentKey
                      const locked = !completed && !isCurrent

                      let circleBg = 'bg-[#F5F5F5]'
                      let circleOpacity = ''
                      let textColor = 'text-[#1a1a1a]'
                      let subtextColor = 'text-[#555]'

                      if (completed) {
                        circleBg = 'bg-[#E8F5E9]'
                      } else if (isCurrent) {
                        circleBg = 'bg-[#1a1a1a]'
                      } else if (locked) {
                        circleBg = 'bg-[#F5F5F5]'
                        circleOpacity = 'opacity-40'
                        textColor = 'text-[#555]'
                        subtextColor = 'text-[#ddd]'
                      }

                      const isLast = li === unit.lessons.length - 1

                      const inner = (
                        <div className={`flex items-center gap-4 ${circleOpacity}`}>
                          <div className="relative flex flex-col items-center">
                            <div
                              className={`w-11 h-11 rounded-full flex items-center justify-center ${circleBg} flex-shrink-0`}
                            >
                              <span className="text-[18px]">{lesson.emoji}</span>
                            </div>
                            {!isLast && (
                              <div className="w-[2px] h-6 bg-gray-100 mt-1" />
                            )}
                          </div>
                          <div className={isLast ? '' : 'pb-7'}>
                            <p className={`text-[14px] font-bold ${textColor}`}>{lesson.label}</p>
                            {isCurrent && (
                              <p className={`text-[12px] font-semibold ${subtextColor}`}>Comença ara</p>
                            )}
                          </div>
                        </div>
                      )

                      if (locked) {
                        return (
                          <div key={lesson.key} className="cursor-not-allowed">
                            {inner}
                          </div>
                        )
                      }

                      return (
                        <Link key={lesson.key} href={lesson.href} className="block hover:opacity-80 transition-opacity">
                          {inner}
                        </Link>
                      )
                    })}
                  </div>
                </section>
              )
            })}
          </div>

          {/* Accés ràpid */}
          <div className="mt-14">
            <h3 className="text-[13px] font-bold text-[#666] uppercase tracking-widest mb-4">Accés ràpid</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Link href="/avaluacio" className="group block">
                <div className="rounded-2xl p-6 bg-[#1a1a1a] hover:bg-[#333] transition-colors">
                  <span className="text-2xl block mb-3">✅</span>
                  <h3 className="text-[15px] font-extrabold text-white mb-1">Mode Examen</h3>
                  <p className="text-[13px] font-semibold text-[#555]">Simula l&apos;avaluació de dimarts</p>
                </div>
              </Link>
              <Link href="/conversa" className="group block">
                <div className="rounded-2xl p-6 bg-[#F5F5F5] hover:bg-[#eee] transition-colors">
                  <span className="text-2xl block mb-3">💬</span>
                  <h3 className="text-[15px] font-extrabold text-[#1a1a1a] mb-1">Conversa amb IA</h3>
                  <p className="text-[13px] font-semibold text-[#666]">Practica parlant en català</p>
                </div>
              </Link>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
