'use client'

import { usePathname } from 'next/navigation'
import Decor from './Decor'

export default function FooterDecor() {
  const pathname = usePathname()
  if (pathname !== '/') return null
  return (
    <Decor
      items={[
        { k: 'bucket', pos: 'left-[2%] bottom-[14%]', faint: true, size: 36, m: true },
        { k: 'mop', pos: 'right-[2%] bottom-[14%]', faint: true, size: 36, rot: 10 },
        { k: 'bubbles', pos: 'right-[16%] top-[8%]', faint: true, size: 30 },
        { k: 'bubbles', pos: 'left-[14%] top-[10%]', faint: true, size: 30, m: true },
      ]}
    />
  )
}
