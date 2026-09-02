'use client'

import {deleteEntry, updateEntry} from '@/app/admin/(protected)/tournaments/[slug]/actions'
import {useRouter} from 'next/navigation'
import {useState, useTransition} from 'react'

function useEntryEdit({
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
  const router = useRouter()
  const [name, setName] = useState(initialName)
  const [rating, setRating] = useState(initialRating === null ? '' : String(initialRating))
  const [team, setTeam] = useState(initialTeam ?? '')
  const [pending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)
  const [deleteRound, setDeleteRound] = useState(rounds[0])
  const [deletePending, startDeleteTransition] = useTransition()
  const [deleteError, setDeleteError] = useState<string | null>(null)

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

  function removeFromRound() {
    if (!window.confirm(`Remove ${name} from round ${deleteRound}?`)) return
    setDeleteError(null)
    startDeleteTransition(async () => {
      try {
        await deleteEntry(tournamentId, uscfId, deleteRound)
        router.refresh()
      } catch (e) {
        setDeleteError(e instanceof Error ? e.message : 'Failed to remove player')
      }
    })
  }

  return {
    name,
    setName,
    rating,
    setRating,
    team,
    setTeam,
    pending,
    saved,
    save,
    deleteRound,
    setDeleteRound,
    deletePending,
    deleteError,
    removeFromRound,
  }
}

type EntryEditProps = {
  tournamentId: number
  uscfId: string
  rounds: number[]
  initialName: string
  initialRating: number | null
  initialTeam: string | null
}

export function EntryEditRow(props: EntryEditProps) {
  const {rounds} = props
  const {
    name,
    setName,
    rating,
    setRating,
    team,
    setTeam,
    pending,
    saved,
    save,
    deleteRound,
    setDeleteRound,
    deletePending,
    deleteError,
    removeFromRound,
  } = useEntryEdit(props)

  return (
    <tr className="hidden md:table-row">
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
      <td>
        <div className="flex items-center gap-2">
          <select
            className="select select-xs"
            value={deleteRound}
            onChange={(e) => setDeleteRound(Number(e.target.value))}
          >
            {rounds.map((r) => (
              <option key={r} value={r}>
                Round {r}
              </option>
            ))}
          </select>
          <button
            className="btn btn-xs btn-error"
            onClick={removeFromRound}
            disabled={deletePending}
          >
            {deletePending ? 'Removing…' : 'Remove'}
          </button>
        </div>
        {deleteError && <div className="mt-1 text-xs text-error">{deleteError}</div>}
      </td>
    </tr>
  )
}

export function EntryEditCard(props: EntryEditProps) {
  const {rounds} = props
  const {
    name,
    setName,
    rating,
    setRating,
    team,
    setTeam,
    pending,
    saved,
    save,
    deleteRound,
    setDeleteRound,
    deletePending,
    deleteError,
    removeFromRound,
  } = useEntryEdit(props)

  return (
    <div className="card bg-base-200 md:hidden">
      <div className="card-body gap-3 p-4">
        <div className="text-xs text-base-content/60">
          Round{rounds.length > 1 ? 's' : ''} {rounds.join(', ')}
        </div>
        <label className="fieldset-label flex flex-col items-start gap-1">
          Name
          <input
            className="input input-sm w-full"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <div className="flex gap-3">
          <label className="fieldset-label flex grow flex-col items-start gap-1">
            Rating
            <input
              className="input input-sm w-full"
              placeholder="Unrated"
              value={rating}
              onChange={(e) => setRating(e.target.value)}
            />
          </label>
          <label className="fieldset-label flex grow flex-col items-start gap-1">
            Team
            <input
              className="input input-sm w-full"
              placeholder="No team"
              value={team}
              onChange={(e) => setTeam(e.target.value)}
            />
          </label>
        </div>
        <button className="btn btn-sm" onClick={save} disabled={pending}>
          {pending ? 'Saving…' : saved ? 'Saved' : 'Save'}
        </button>

        <div className="divider my-0"></div>

        <div className="flex items-center gap-2">
          <select
            className="select select-sm grow"
            value={deleteRound}
            onChange={(e) => setDeleteRound(Number(e.target.value))}
          >
            {rounds.map((r) => (
              <option key={r} value={r}>
                Round {r}
              </option>
            ))}
          </select>
          <button
            className="btn btn-sm btn-error"
            onClick={removeFromRound}
            disabled={deletePending}
          >
            {deletePending ? 'Removing…' : 'Remove from round'}
          </button>
        </div>
        {deleteError && <div className="text-xs text-error">{deleteError}</div>}
      </div>
    </div>
  )
}
