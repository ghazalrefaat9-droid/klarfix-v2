import {
  AppWindow,
  Building,
  Building2,
  Factory,
  Footprints,
  HardHat,
  House,
  Layers,
  PackageOpen,
  Sofa,
  Sparkles,
  Stethoscope,
  Store,
  Truck,
  type LucideIcon,
} from 'lucide-react'
import type { Lang } from '@/components/LanguageProvider'
import { CLEANING_TYPES, type CleaningTypeId } from '@/lib/applications'

const ICONS = {
  AppWindow,
  Building,
  Building2,
  Factory,
  Footprints,
  HardHat,
  House,
  Layers,
  PackageOpen,
  Sofa,
  Sparkles,
  Stethoscope,
  Store,
  Truck,
} satisfies Record<string, LucideIcon>

export type ReinigungsartIconName = keyof typeof ICONS

const ICON_BY_ID: Partial<Record<CleaningTypeId, ReinigungsartIconName>> = {
  wohnung: 'House',
  haus: 'Building',
  buero: 'Building2',
  fenster: 'AppWindow',
  teppich: 'Layers',
  polster: 'Sofa',
  praxis: 'Stethoscope',
  gewerbe: 'Store',
  industrie: 'Factory',
  grund: 'Sparkles',
  bau: 'HardHat',
  treppenhaus: 'Footprints',
  entruempelung: 'PackageOpen',
  umzug: 'Truck',
}

export type Reinigungsart = {
  id: CleaningTypeId
  name: string
  nameAr: string
  nameEn: string
  iconName: ReinigungsartIconName
}

// Derived from CLEANING_TYPES (the list partners pick from), so new partner types show up on the homepage automatically.
export const REINIGUNGSARTEN: Reinigungsart[] = CLEANING_TYPES.map((type) => ({
  id: type.id,
  name: type.label,
  nameAr: type.labelAr,
  nameEn: type.labelEn,
  iconName: ICON_BY_ID[type.id] ?? 'Sparkles',
}))

export function reinigungsartIcon(id: CleaningTypeId): LucideIcon {
  return ICONS[ICON_BY_ID[id] ?? 'Sparkles']
}

export function reinigungsartName(r: Reinigungsart, lang: Lang) {
  return lang === 'ar' ? r.nameAr : lang === 'en' ? r.nameEn : r.name
}
