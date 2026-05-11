import {
  Home,
  BookOpen,
  Layers,
  MessagesSquare,
  Bot,
  Mic,
  PenLine,
  ClipboardCheck,
  GraduationCap,
  BarChart3,
  Trophy,
  Gamepad2,
  Users,
  Swords,
  type LucideIcon,
} from 'lucide-react'

export interface NavItem {
  href: string
  label: string
  Icon: LucideIcon
  /** true si debe aparecer en el BottomNav móvil (máx 4, el 5º es "Més") */
  primary?: boolean
}

export interface NavGroup {
  label: string
  items: NavItem[]
}

export const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Aprèn',
    items: [
      { href: '/', label: 'Inici', Icon: Home, primary: true },
      { href: '/gramatica', label: 'Gramàtica', Icon: BookOpen, primary: true },
      { href: '/flashcards', label: 'Flashcards', Icon: Layers, primary: true },
      { href: '/dialegs', label: 'Diàlegs', Icon: MessagesSquare },
    ],
  },
  {
    label: 'Pràctica IA',
    items: [
      { href: '/conversa', label: 'Conversa', Icon: Bot, primary: true },
      { href: '/pronunciacio', label: 'Pronunciació', Icon: Mic },
      { href: '/escriptura', label: 'Escriptura IA', Icon: PenLine },
    ],
  },
  {
    label: 'Avança',
    items: [
      { href: '/avaluacio', label: 'Avaluació', Icon: ClipboardCheck },
      { href: '/examen', label: 'Examen CPNL', Icon: GraduationCap },
      { href: '/estadistiques', label: 'Estadístiques', Icon: BarChart3 },
    ],
  },
  {
    label: 'Competeix',
    items: [
      { href: '/duel', label: 'Duel PvP', Icon: Swords },
      { href: '/jocs', label: 'Jocs', Icon: Gamepad2 },
      { href: '/lliga', label: 'Lliga', Icon: Trophy },
      { href: '/amics', label: 'Amics', Icon: Users },
    ],
  },
]

export const PRIMARY_MOBILE_ITEMS: NavItem[] = NAV_GROUPS
  .flatMap((g) => g.items)
  .filter((i) => i.primary)

export const ALL_NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((g) => g.items)
