'use client'

import {getRoundEntries, getRoundPairings} from '@/app/t/[slug]/round/[round]/actions'
import {EntryList, type EntryListItem} from '@/components/entries/EntryList'
import {PairingList, type PairingListItem} from '@/components/pairings/PairingList'
import {RegistrationQr} from '@/components/RegistrationQr'
import {useEffect, useRef, useState} from 'react'

export function InfoScreen({
  slug,
  round,
  initialEntries,
  initialPairings,
  registerUrl,
}: {
  slug: string
  round: number
  initialEntries: EntryListItem[]
  initialPairings: PairingListItem[]
  registerUrl: string
}) {
  const [entries, setEntries] = useState(initialEntries)
  const [pairings, setPairings] = useState(initialPairings)
  const [newNames, setNewNames] = useState<Set<string>>(new Set())
  const entriesRef = useRef(initialEntries)

  useEffect(() => {
    const source = new EventSource(`/t/${slug}/round/${round}/info/events`)
    source.addEventListener('entries-changed', () => {
      getRoundPairings(slug, round).then((result) => {
        if (result.data) setPairings(result.data)
      })
      getRoundEntries(slug, round).then((result) => {
        if (!result.data) return
        const previousNames = new Set(entriesRef.current.map((e) => e.name))
        const added = new Set(
          result.data.filter((e) => !previousNames.has(e.name)).map((e) => e.name),
        )
        entriesRef.current = result.data
        setEntries(result.data)
        setNewNames(added)
      })
    })
    return () => source.close()
  }, [slug, round])

  if (pairings.length > 0) {
    return (
      <div className="mx-auto w-fit max-w-full">
        <PairingList pairings={pairings} />
      </div>
    )
  }

  return (
    <div className="grid gap-8 md:grid-cols-2">
      <div>
        <h2 className="mb-4 text-xl font-semibold">Entries ({entries.length})</h2>
        <EntryList entries={entries} newNames={newNames} />
      </div>
      <div className="flex flex-col items-center">
        <h2 className="mb-4 text-xl font-semibold">Please sign in</h2>
        <RegistrationQr url={registerUrl} />
      </div>
    </div>
  )
}
