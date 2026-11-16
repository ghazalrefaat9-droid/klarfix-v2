export const PARTNER_VIEWS = [
  'start',
  'video',
  'statistik',
  'neu',
  'meine',
  'meine-angebot',
  'meine-angenommen',
  'meine-erledigt',
  'abgeschlossen',
  'nachrichten',
] as const
export type PartnerView = (typeof PARTNER_VIEWS)[number]
export const isPartnerView = (v: string | null): v is PartnerView => !!v && (PARTNER_VIEWS as readonly string[]).includes(v)

export type PartnerCounts = { neu: number; meine: number; angebot: number; angenommen: number; erledigt: number; abgeschlossen: number }
