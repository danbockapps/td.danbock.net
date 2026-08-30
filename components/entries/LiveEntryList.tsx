'use client'

import {getRoundEntries} from '@/app/t/[slug]/round/[round]/actions'
import {EntryList, type EntryListItem} from '@/components/entries/EntryList'
import {useEffect, useState} from 'react'

export function LiveEntryList({
  slug,
  round,
  initialEntries,
}: {
  slug: string
  round: number
  initialEntries: EntryListItem[]
}) {
  const [entries, setEntries] = useState(initialEntries)

  useEffect(() => {
    const source = new EventSource(`/t/${slug}/round/${round}/info/events`)
    source.addEventListener('entries-changed', () => {
      getRoundEntries(slug, round).then((result) => {
        if (result.data) setEntries(result.data)
      })
    })
    return () => source.close()
  }, [slug, round])

  return <EntryList entries={entries} />
}
