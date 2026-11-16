'use client'

import { usePathname } from 'next/navigation'
import Decor from './Decor'

export default function FooterDecor() {
  const pathname = usePathname()
  if (pathname !== '/') return null
  return (
    <Decor
      items={[
        { k: 'bucket', pos: 'left-[2%] bottom-[14%]', size: 48 },
        { k: 'mop', pos: 'right-[2%] bottom-[14%]', size: 50, rot: 10 },
        { k: 'bubbles', pos: 'right-[16%] top-[6%]', size: 42, m: false },
        { k: 'sparkle', pos: 'left-[14%] top-[8%]', size: 40 },
      ]}
    />
  )
}
