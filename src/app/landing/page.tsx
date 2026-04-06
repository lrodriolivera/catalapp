import Link from 'next/link'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-[#1a1a1a]">
      {/* Senyera decorative bars */}
      <div className="h-2 bg-gradient-to-r from-[#FCDD09] via-[#DA121A] to-[#FCDD09]" />

      <div className="max-w-[800px] mx-auto px-6 py-16">
        {/* Hero */}
        <section className="text-center mb-20">
          <h1 className="text-[56px] md:text-[72px] font-extrabold tracking-tight leading-none mb-4">
            Catal<span className="text-[#DA121A]">App</span>
          </h1>
          <p className="text-[20px] md:text-[24px] text-[#555] font-medium mb-8">
            Apren catala gratis amb IA
          </p>
          <Link href="/"
            className="inline-block bg-[#1a1a1a] text-white font-bold text-[18px] px-10 py-4 rounded-full hover:bg-[#333] transition-colors">
            Comencar
          </Link>
        </section>

        {/* Senyera divider */}
        <div className="flex gap-1 mb-20 justify-center">
          <div className="h-1 w-16 bg-[#FCDD09] rounded-full" />
          <div className="h-1 w-16 bg-[#DA121A] rounded-full" />
          <div className="h-1 w-16 bg-[#FCDD09] rounded-full" />
          <div className="h-1 w-16 bg-[#DA121A] rounded-full" />
        </div>

        {/* Features */}
        <section className="mb-20">
          <div className="space-y-8">
            <div className="flex items-start gap-5">
              <span className="text-[40px] flex-shrink-0">🤖</span>
              <div>
                <h3 className="text-[20px] font-extrabold mb-1">Conversa amb IA</h3>
                <p className="text-[16px] text-[#666]">Practica parlant amb intel·ligencia artificial</p>
              </div>
            </div>
            <div className="flex items-start gap-5">
              <span className="text-[40px] flex-shrink-0">📚</span>
              <div>
                <h3 className="text-[20px] font-extrabold mb-1">18 unitats completes</h3>
                <p className="text-[16px] text-[#666]">Tot el curs A1 del CPNL</p>
              </div>
            </div>
            <div className="flex items-start gap-5">
              <span className="text-[40px] flex-shrink-0">🎓</span>
              <div>
                <h3 className="text-[20px] font-extrabold mb-1">Examen CPNL</h3>
                <p className="text-[16px] text-[#666]">Simula l&apos;examen real</p>
              </div>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="mb-20">
          <div className="bg-[#F8F8F8] rounded-2xl p-8 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div>
              <p className="text-[28px] font-extrabold text-[#1a1a1a]">463</p>
              <p className="text-[14px] text-[#888] font-medium">exercicis</p>
            </div>
            <div>
              <p className="text-[28px] font-extrabold text-[#1a1a1a]">960</p>
              <p className="text-[14px] text-[#888] font-medium">paraules</p>
            </div>
            <div>
              <p className="text-[28px] font-extrabold text-[#1a1a1a]">90</p>
              <p className="text-[14px] text-[#888] font-medium">dialegs</p>
            </div>
            <div>
              <p className="text-[28px] font-extrabold text-[#1a1a1a]">54</p>
              <p className="text-[14px] text-[#888] font-medium">escenaris IA</p>
            </div>
          </div>
        </section>

        {/* Testimonial */}
        <section className="mb-20 text-center">
          <div className="bg-[#F0F4FF] rounded-2xl p-8">
            <p className="text-[18px] text-[#444] italic leading-relaxed">
              &ldquo;Creat per estudiants del CPNL de Barcelona&rdquo;
            </p>
          </div>
        </section>

        {/* CTA final */}
        <section className="text-center mb-20">
          <h2 className="text-[32px] md:text-[40px] font-extrabold mb-6">
            Prova CatalApp gratis
          </h2>
          <Link href="/"
            className="inline-block bg-[#1a1a1a] text-white font-bold text-[18px] px-10 py-4 rounded-full hover:bg-[#333] transition-colors">
            Comencar ara
          </Link>
        </section>

        {/* Footer */}
        <footer className="border-t border-gray-200 pt-8 text-center">
          <p className="text-[14px] text-[#888] mb-2">
            Creat per Luis Armando Rodriguez &middot; StrixAI &middot; Llicencia AGPL-3.0
          </p>
          <a href="https://github.com" target="_blank" rel="noopener noreferrer"
            className="text-[14px] text-[#555] hover:text-[#1a1a1a] font-medium transition-colors">
            GitHub
          </a>
        </footer>
      </div>
    </div>
  )
}
