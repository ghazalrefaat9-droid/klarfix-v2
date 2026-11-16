'use client'

import { usePathname } from 'next/navigation'
import Decor from './Decor'

export default function FooterDecor() {
  const pathname = usePathname()
  if (pathname !== '/') return null
  return (
    <Decor
      items={[
        { k: 'bucket', x: 0.97, y: 0.96, size: 44, faint: true },
        { k: 'mop', x: 0.03, y: 0.1, size: 44, rot: 10, faint: true, m: false },
        { k: 'sparkle', x: 0.5, y: 0.5, size: 40, faint: true },
      ]}
    />
  )
}
