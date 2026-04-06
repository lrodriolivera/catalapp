'use client';

import { useEffect, useState, useCallback } from 'react';

const slides = [
  {
    emoji: '🇦🇩',
    title: 'Benvingut a CatalApp!',
    description: 'Aprèn català amb IA',
  },
  {
    emoji: '📚',
    title: '6 seccions per aprendre',
    description: '',
    features: [
      { icon: '📖', label: 'Gramàtica' },
      { icon: '💬', label: 'Conversa' },
      { icon: '🗣️', label: 'Pronúncia' },
      { icon: '🎭', label: 'Diàlegs' },
      { icon: '✅', label: 'Avaluació' },
      { icon: '🃏', label: 'Flashcards' },
    ],
  },
  {
    emoji: '🎙️',
    title: 'Conversa amb IA',
    description:
      'Mantén el botó premut per parlar i practica la teva pronúncia amb intel·ligència artificial.',
  },
  {
    emoji: '🚀',
    title: 'Preparat per començar?',
    description: 'Comença el teu camí per aprendre català ara mateix.',
    cta: true,
  },
];

export default function Onboarding() {
  const [visible, setVisible] = useState(false);
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState<'left' | 'right'>('right');
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    const done = localStorage.getItem('catalapp-onboarding-done');
    if (!done) {
      setVisible(true);
    }
  }, []);

  const close = useCallback(() => {
    localStorage.setItem('catalapp-onboarding-done', 'true');
    setVisible(false);
  }, []);

  const goTo = useCallback(
    (index: number) => {
      if (animating || index === current) return;
      setDirection(index > current ? 'right' : 'left');
      setAnimating(true);
      setTimeout(() => {
        setCurrent(index);
        setAnimating(false);
      }, 200);
    },
    [animating, current]
  );

  const next = useCallback(() => {
    if (current < slides.length - 1) {
      goTo(current + 1);
    }
  }, [current, goTo]);

  // Swipe support
  const [touchStart, setTouchStart] = useState<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart === null) return;
    const diff = e.changedTouches[0].clientX - touchStart;
    if (Math.abs(diff) > 50) {
      if (diff < 0 && current < slides.length - 1) {
        goTo(current + 1);
      } else if (diff > 0 && current > 0) {
        goTo(current - 1);
      }
    }
    setTouchStart(null);
  };

  if (!visible) return null;

  const slide = slides[current];

  return (
    <div className="fixed inset-0 z-[60] bg-white dark:bg-[#0F0F0F] flex flex-col items-center justify-between">
      {/* Skip button */}
      <div className="w-full flex justify-end p-4">
        <button
          onClick={close}
          className="text-sm font-semibold text-[#555] dark:text-[#A0A0A0] hover:opacity-70 cursor-pointer"
        >
          Saltar
        </button>
      </div>

      {/* Slide content */}
      <div
        className="flex-1 flex items-center justify-center w-full px-6"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className={`max-w-[400px] w-full mx-auto text-center transition-opacity duration-200 ${
            animating ? 'opacity-0' : 'opacity-100'
          } ${
            animating
              ? direction === 'right'
                ? 'translate-x-4'
                : '-translate-x-4'
              : 'translate-x-0'
          }`}
        >
          {/* Emoji */}
          <div className="text-7xl mb-8">{slide.emoji}</div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-[#1a1a1a] dark:text-[#F5F5F5] mb-4">
            {slide.title}
          </h1>

          {/* Description */}
          {slide.description && (
            <p className="text-base text-[#555] dark:text-[#A0A0A0] leading-relaxed mb-6">
              {slide.description}
            </p>
          )}

          {/* Features grid (slide 2) */}
          {'features' in slide && slide.features && (
            <div className="grid grid-cols-3 gap-4 mt-6">
              {slide.features.map((f) => (
                <div
                  key={f.label}
                  className="flex flex-col items-center gap-2 p-3 rounded-xl bg-[#F5F5F5] dark:bg-[#1A1A1A]"
                >
                  <span className="text-2xl">{f.icon}</span>
                  <span className="text-xs font-semibold text-[#1a1a1a] dark:text-[#F5F5F5]">
                    {f.label}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* CTA button (last slide) */}
          {'cta' in slide && slide.cta && (
            <button
              onClick={close}
              className="mt-8 px-8 py-3 rounded-full bg-gradient-to-r from-[#4F46E5] to-[#7C3AED] text-white font-bold text-base shadow-lg hover:opacity-90 transition-opacity cursor-pointer"
            >
              Començar
            </button>
          )}
        </div>
      </div>

      {/* Bottom navigation */}
      <div className="w-full flex flex-col items-center gap-6 pb-12">
        {/* Dots */}
        <div className="flex gap-2">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              aria-label={`Diapositiva ${i + 1}`}
              className={`w-2.5 h-2.5 rounded-full transition-colors duration-200 cursor-pointer ${
                i === current
                  ? 'bg-[#1a1a1a] dark:bg-[#F5F5F5]'
                  : 'bg-[#D0D0D0] dark:bg-[#444]'
              }`}
            />
          ))}
        </div>

        {/* Next button (not on last slide) */}
        {current < slides.length - 1 && (
          <button
            onClick={next}
            className="px-6 py-2.5 rounded-full bg-[#1a1a1a] dark:bg-[#F5F5F5] text-white dark:text-[#0F0F0F] font-semibold text-sm hover:opacity-90 transition-opacity cursor-pointer"
          >
            Següent
          </button>
        )}
      </div>
    </div>
  );
}
