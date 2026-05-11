'use client'

import { useEffect, useState } from 'react'
import { Heart, Snowflake, Zap, Gem, Check, ArrowRight } from 'lucide-react'
import { Mascot } from '@/components/ui/Mascot'
import { HeaderStats } from '@/components/ui/HeaderStats'
import { Button } from '@/components/ui/Button'
import { fireConfetti } from '@/components/ui/Confetti'
import { useStats } from '@/lib/useStats'
import { buyShopItem, HEART_MAX } from '@/lib/stats'
import { playPurchase } from '@/lib/sounds'

type ItemId = 'refill_hearts' | 'streak_freeze' | 'xp_double'

interface ShopItem {
  id: ItemId
  label: string
  desc: string
  price: number
  Icon: typeof Heart
  tone: 'red' | 'blue' | 'purple'
  disabledIf?: (s: ReturnType<typeof useStats>) => boolean
  disabledLabel?: string
}

const ITEMS: ShopItem[] = [
  {
    id: 'refill_hearts',
    label: 'Recarrega de vides',
    desc: 'Restaura totes les vides al màxim ara mateix.',
    price: 350,
    Icon: Heart,
    tone: 'red',
    disabledIf: (s) => (s?.hearts ?? 0) >= HEART_MAX,
    disabledLabel: 'Vides plenes',
  },
  {
    id: 'streak_freeze',
    label: 'Congela la ratxa',
    desc: 'Protegeix la ratxa un dia si oblides practicar.',
    price: 200,
    Icon: Snowflake,
    tone: 'blue',
    disabledIf: (s) => Boolean(s?.streakFreezeActive),
    disabledLabel: 'Ja actiu',
  },
  {
    id: 'xp_double',
    label: 'Doble XP 15 min',
    desc: 'Tots els punts d\'experiència compten el doble.',
    price: 450,
    Icon: Zap,
    tone: 'purple',
    disabledIf: (s) => Boolean(s?.xpDoubleUntil && Date.now() < s.xpDoubleUntil),
    disabledLabel: 'En marxa',
  },
]

const TONE: Record<'red' | 'blue' | 'purple', { card: string; iconBg: string; iconColor: string; title: string }> = {
  red: { card: 'bg-red-soft border-red/30', iconBg: 'bg-red border-red-dark', iconColor: 'text-white', title: 'text-red-dark' },
  blue: { card: 'bg-blue-soft border-blue/30', iconBg: 'bg-blue border-blue-dark', iconColor: 'text-white', title: 'text-blue-dark' },
  purple: { card: 'bg-purple-soft border-purple/30', iconBg: 'bg-purple border-purple-dark', iconColor: 'text-white', title: 'text-purple-dark' },
}

export default function BotigaPage() {
  const stats = useStats()
  const [flash, setFlash] = useState<string | null>(null)

  useEffect(() => {
    if (!flash) return
    const t = setTimeout(() => setFlash(null), 3000)
    return () => clearTimeout(t)
  }, [flash])

  const handleBuy = (item: ShopItem) => {
    const r = buyShopItem(item.id)
    if (!r.ok) {
      setFlash(r.reason === 'insufficient_gems' ? `Et falten ${item.price - (stats?.gems ?? 0)} gemmes` : 'No s\'ha pogut comprar')
      return
    }
    playPurchase()
    setFlash(`✓ ${item.label}`)
    fireConfetti({ x: 0.5, y: 0.3 })
  }

  return (
    <div className="mx-auto w-full max-w-[860px] px-5 md:px-8 py-8 md:py-12">
      <header className="mb-8 flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <Mascot expression="happy" size="md" />
          <div>
            <p className="text-xs font-extrabold uppercase tracking-widest text-primary mb-1">Botiga</p>
            <h1 className="text-3xl md:text-4xl leading-tight">Gasta les teves gemmes</h1>
          </div>
        </div>
        <HeaderStats showShop={false} />
      </header>

      <div className="mb-6 inline-flex items-center gap-2 bg-gold-soft border-2 border-gold/40 rounded-2xl px-4 py-3">
        <Gem size={20} className="text-blue fill-current" strokeWidth={2.5} />
        <p className="text-base font-extrabold text-orange-dark">
          Tens <span className="tabular-nums">{stats?.gems ?? 0}</span> gemmes
        </p>
      </div>

      {flash && (
        <div role="status" className="mb-6 bg-primary-soft border-2 border-primary/40 rounded-2xl px-4 py-3 animate-bounce-in">
          <p className="text-base font-extrabold text-primary-dark">{flash}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {ITEMS.map((item) => {
          const t = TONE[item.tone]
          const isDisabled = item.disabledIf?.(stats) ?? false
          const canAfford = (stats?.gems ?? 0) >= item.price
          return (
            <article key={item.id} className={`rounded-2xl border-2 border-b-[6px] p-5 ${t.card}`}>
              <div className={`w-14 h-14 rounded-2xl border-b-[4px] flex items-center justify-center mb-4 ${t.iconBg}`}>
                <item.Icon size={28} strokeWidth={2.75} className={t.iconColor} />
              </div>
              <h3 className={`text-lg ${t.title} mb-1`}>{item.label}</h3>
              <p className="text-sm text-ink-soft font-medium mb-4 min-h-[2.5em]">{item.desc}</p>

              {isDisabled ? (
                <div className="inline-flex items-center gap-1.5 bg-white/60 px-3 h-9 rounded-xl text-sm font-extrabold text-ink-soft">
                  <Check size={16} strokeWidth={3} />
                  {item.disabledLabel}
                </div>
              ) : (
                <Button
                  variant="primary"
                  size="sm"
                  fullWidth
                  disabled={!canAfford}
                  onClick={() => handleBuy(item)}
                  trailing={<Gem size={16} fill="currentColor" />}
                >
                  {item.price}
                </Button>
              )}
            </article>
          )
        })}
      </div>

      <section className="mt-12 bg-paper-2 border-2 border-line rounded-2xl p-6">
        <h2 className="text-xl md:text-2xl mb-3">Com aconseguir gemmes</h2>
        <ul className="space-y-2 text-base text-ink-soft font-semibold">
          <li className="flex items-center gap-2"><ArrowRight size={18} className="text-primary" strokeWidth={3} /> +5 gemmes per cada lliçó completada</li>
          <li className="flex items-center gap-2"><ArrowRight size={18} className="text-primary" strokeWidth={3} /> +10 gemmes cada 7 dies de ratxa</li>
          <li className="flex items-center gap-2"><ArrowRight size={18} className="text-primary" strokeWidth={3} /> +50 gemmes en promocionar de lliga</li>
        </ul>
      </section>
    </div>
  )
}
