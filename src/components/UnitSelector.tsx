'use client'

import { useState, useRef, useEffect } from 'react'
import { units } from '@/data/units'

interface Props {
  selectedUnit: number
  onSelect: (index: number) => void
}

export default function UnitSelector({ selectedUnit, onSelect }: Props) {
  const [open, setOpen] = useState(false)
  const unit = units[selectedUnit]
  const containerRef = useRef<HTMLDivElement>(null)

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open])

  // Close on click outside
  useEffect(() => {
    if (!open) return
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  return (
    <div className="relative mb-8" ref={containerRef}>
      {/* Selected unit button */}
      <button onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className="w-full flex items-center justify-between bg-[#F5F5F5] rounded-2xl px-5 py-4 text-left hover:bg-[#EFEFEF] transition-colors">
        <div className="flex items-center gap-3 min-w-0">
          <span className="bg-gradient-to-r from-[#4F46E5] to-[#7C3AED] text-white rounded-full w-9 h-9 flex items-center justify-center text-[14px] font-extrabold flex-shrink-0">
            {unit.id}
          </span>
          <div className="min-w-0">
            <p className="text-[15px] font-bold text-[#1a1a1a] truncate">Unitat {unit.id}: {unit.subtitle}</p>
            <p className="text-[13px] text-[#888] truncate">{unit.title}</p>
          </div>
        </div>
        <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          className={`flex-shrink-0 ml-2 transition-transform ${open ? 'rotate-180' : ''}`}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>

      {/* Dropdown */}
      {open && (
        <div role="listbox" aria-label="Selecciona una unitat" className="absolute top-full left-0 right-0 z-40 mt-2 bg-white rounded-2xl shadow-lg border border-gray-100 max-h-[60vh] overflow-y-auto">
          {units.map((u, i) => (
            <button key={u.id} role="option" aria-selected={selectedUnit === i} onClick={() => { onSelect(i); setOpen(false) }}
              className={`w-full flex items-center gap-3 px-5 py-3.5 text-left transition-colors border-b border-gray-50 last:border-0 ${
                selectedUnit === i ? 'bg-[#F0F4FF]' : 'hover:bg-[#F8F8F8]'
              }`}>
              <span className={`rounded-full w-8 h-8 flex items-center justify-center text-[13px] font-extrabold flex-shrink-0 ${
                selectedUnit === i
                  ? 'bg-gradient-to-r from-[#4F46E5] to-[#7C3AED] text-white'
                  : 'bg-[#F5F5F5] text-[#666]'
              }`}>
                {u.id}
              </span>
              <div className="min-w-0 flex-1">
                <p className={`text-[14px] font-bold truncate ${selectedUnit === i ? 'text-[#4F46E5]' : 'text-[#1a1a1a]'}`}>
                  {u.subtitle}
                </p>
                <p className="text-[12px] text-[#999] truncate">{u.title}</p>
              </div>
              {selectedUnit === i && (
                <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4F46E5" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
