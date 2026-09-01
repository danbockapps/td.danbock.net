'use client'

import {updateEntry} from '@/app/admin/(protected)/tournaments/[slug]/actions'
import {useState, useTransition} from 'react'

export function EntryEditRow({
  tournamentId,
  uscfId,
  rounds,
  initialName,
  initialRating,
  initialTeam,
}: {
  tournamentId: number
  uscfId: string
  rounds: number[]
  initialName: string
  initialRating: number | null
  initialTeam: string | null
}) {
  const [name, setName] = useState(initialName)
  const [rating, setRating] = useState(initialRating === null ? '' : String(initialRating))
  const [team, setTeam] = useState(initialTeam ?? '')
  const [pending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)

  function save() {
    startTransition(async () => {
      await updateEntry(tournamentId, uscfId, {
        name,
        rating: rating.trim() === '' ? null : Number(rating),
        team: team.trim() === '' ? null : team.trim(),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 1500)
    })
  }

  return (
    <tr>
      <td>{rounds.join(', ')}</td>
      <td>
        <input
          className="input input-sm w-full"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </td>
      <td>
        <input
          className="input input-sm w-24"
          placeholder="Unrated"
          value={rating}
          onChange={(e) => setRating(e.target.value)}
        />
      </td>
      <td>
        <input
          className="input input-sm w-32"
          placeholder="No team"
          value={team}
          onChange={(e) => setTeam(e.target.value)}
        />
      </td>
      <td>
        <button className="btn btn-xs" onClick={save} disabled={pending}>
          {pending ? 'Saving…' : saved ? 'Saved' : 'Save'}
        </button>
      </td>
    </tr>
  )
}
