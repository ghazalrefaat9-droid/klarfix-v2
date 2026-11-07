import { Suspense } from 'react'
import OfferView from './OfferView'

// The token is only known at request time, so the client view (useParams) needs a Suspense boundary with Cache Components.
export default function OfferPage() {
  return (
    <Suspense fallback={<main className="p-8 text-center text-primary/70">…</main>}>
      <OfferView />
    </Suspense>
  )
}
