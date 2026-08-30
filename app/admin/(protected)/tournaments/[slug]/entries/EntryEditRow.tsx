'use client'

import {updateEntry} from '@/app/admin/(protected)/tournaments/[slug]/actions'
import {useState, useTransition} from 'react'

export function EntryEditRow({
  id,
  round,
  initialName,
  initialRating,
}: {
  id: number
  round: number
  initialName: string
  initialRating: number | null
}) {
  const [name, setName] = useState(initialName)
  const [rating, setRating] = useState(initialRating === null ? '' : String(initialRating))
  const [pending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)

  function save() {
    startTransition(async () => {
      await updateEntry(id, {
        name,
        rating: rating.trim() === '' ? null : Number(rating),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 1500)
    })
  }

  return (
    <tr>
      <td>{round}</td>
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
        <button className="btn btn-xs" onClick={save} disabled={pending}>
          {pending ? 'Saving…' : saved ? 'Saved' : 'Save'}
        </button>
      </td>
    </tr>
  )
}
