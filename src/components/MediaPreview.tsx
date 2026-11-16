import { Video } from 'lucide-react'
import type { MediaKind } from '@/lib/mediaRules'

// Renders one media file. With `watermark` a KlarFix mark is overlaid (customer view).
export default function MediaPreview({
  kind,
  url,
  watermark = false,
  className = '',
}: {
  kind: MediaKind
  url: string | null
  watermark?: boolean
  className?: string
}) {
  return (
    <div className={`relative aspect-video w-full overflow-hidden rounded-xl bg-primary/5 ${className}`}>
      {!url ? (
        <div className="flex h-full items-center justify-center text-primary/40">
          <Video className="h-8 w-8" aria-hidden />
        </div>
      ) : kind === 'video' ? (
        <video src={url} controls playsInline preload="metadata" controlsList="nodownload" className="h-full w-full object-contain" />
      ) : (
        // Signed storage URLs are short-lived, so next/image optimisation is not useful here.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="h-full w-full object-contain" />
      )}
      {watermark && url && (
        <span
          aria-hidden
          className="pointer-events-none absolute end-2 top-2 rounded-md bg-primary/70 px-2 py-0.5 text-[11px] font-bold tracking-wide text-[#FFFFFF]"
        >
          KlarFix
        </span>
      )}
    </div>
  )
}
