'use client'

import {saveManualPairings} from '@/app/admin/(protected)/tournaments/[slug]/actions'
import {formatRating} from '@/lib/format'
import {useRouter} from 'next/navigation'
import {useMemo, useState, useTransition} from 'react'

export interface ManualEntry {
  id: number
  uscfId: string
  name: string
  rating: number | null
  team: string | null
  points: number
}

type Row =
  | {kind: 'pairing'; whiteEntryId: number | null; blackEntryId: number | null}
  | {kind: 'bye'; entryId: number}

function label(entry: ManualEntry) {
  const points = entry.points !== undefined ? `, ${entry.points} pts` : ''
  return `${entry.name} (${formatRating(entry.rating)}${points})`
}

export function ManualPairingEditor({
  slug,
  round,
  entries,
  previousOpponents,
}: {
  slug: string
  round: number
  entries: ManualEntry[]
  // uscfId -> uscfIds of prior-round opponents, used for rematch warnings
  previousOpponents: Record<string, string[]>
}) {
  const [rows, setRows] = useState<Row[]>([])
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const entriesById = useMemo(() => new Map(entries.map((e) => [e.id, e])), [entries])

  const assignedIds = useMemo(() => {
    const ids = new Set<number>()
    for (const row of rows) {
      if (row.kind === 'bye') {
        ids.add(row.entryId)
      } else {
        if (row.whiteEntryId !== null) ids.add(row.whiteEntryId)
        if (row.blackEntryId !== null) ids.add(row.blackEntryId)
      }
    }
    return ids
  }, [rows])

  const pool = useMemo(
    () =>
      entries
        .filter((e) => !assignedIds.has(e.id))
        .sort((a, b) => b.points - a.points || (b.rating ?? 0) - (a.rating ?? 0)),
    [entries, assignedIds],
  )

  function rowWarning(row: Row): string | null {
    if (row.kind !== 'pairing' || row.whiteEntryId === null || row.blackEntryId === null) {
      return null
    }
    const white = entriesById.get(row.whiteEntryId)
    const black = entriesById.get(row.blackEntryId)
    if (!white || !black) return null
    if (white.team && black.team && white.team === black.team) {
      return 'Same team'
    }
    if (previousOpponents[white.uscfId]?.includes(black.uscfId)) {
      return 'Rematch'
    }
    return null
  }

  function addPairingRow() {
    setRows((prev) => [...prev, {kind: 'pairing', whiteEntryId: null, blackEntryId: null}])
  }

  function addBye(entryId: number) {
    setRows((prev) => [...prev, {kind: 'bye', entryId}])
  }

  function removeRow(index: number) {
    setRows((prev) => prev.filter((_, i) => i !== index))
  }

  function updateRow(index: number, side: 'white' | 'black', value: number | null) {
    setRows((prev) =>
      prev.map((row, i) => {
        if (i !== index || row.kind !== 'pairing') return row
        return {...row, [side === 'white' ? 'whiteEntryId' : 'blackEntryId']: value}
      }),
    )
  }

  // Select options for a slot: everyone except players used in other rows,
  // except the player already in this row's opposite slot can't be picked.
  function optionsFor(index: number, side: 'white' | 'black'): ManualEntry[] {
    const blocked = new Set<number>()
    rows.forEach((row, i) => {
      if (i === index) return
      if (row.kind === 'bye') {
        blocked.add(row.entryId)
      } else {
        if (row.whiteEntryId !== null) blocked.add(row.whiteEntryId)
        if (row.blackEntryId !== null) blocked.add(row.blackEntryId)
      }
    })
    const row = rows[index]
    const otherId =
      row.kind === 'pairing' ? (side === 'white' ? row.blackEntryId : row.whiteEntryId) : null
    return entries.filter((e) => !blocked.has(e.id) && e.id !== otherId)
  }

  function save() {
    setError(null)

    for (const [i, row] of rows.entries()) {
      if (row.kind === 'pairing' && (row.whiteEntryId === null || row.blackEntryId === null)) {
        setError(`Board ${i + 1} is missing a player`)
        return
      }
    }

    const sheets = rows.map((row) =>
      row.kind === 'bye'
        ? {whiteEntryId: row.entryId, blackEntryId: null}
        : {whiteEntryId: row.whiteEntryId, blackEntryId: row.blackEntryId},
    )

    startTransition(async () => {
      try {
        const result = await saveManualPairings(slug, round, sheets)
        if (result?.warnings?.length) {
          const ok = window.confirm(`${result.warnings.join('\n')}\n\nSave anyway?`)
          if (!ok) return
          await saveManualPairings(slug, round, sheets, {
            confirmWarnings: true,
          })
        }
        router.refresh()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Something went wrong')
      }
    })
  }

  return (
    <div className="card bg-base-200 w-full p-4 shadow sm:p-6">
      {rows.length > 0 && (
        <div className="mb-4 flex flex-col gap-2">
          {rows.map((row, i) => (
            <div key={i} className="flex flex-col gap-1 rounded border border-base-300 p-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="w-6 text-sm text-base-content/60">
                  {row.kind === 'bye' ? 'Bye' : i + 1}
                </span>
                {row.kind === 'pairing' ? (
                  <>
                    <select
                      className="select select-bordered select-sm min-w-44 flex-1"
                      value={row.whiteEntryId ?? ''}
                      onChange={(e) =>
                        updateRow(i, 'white', e.target.value ? Number(e.target.value) : null)
                      }
                    >
                      <option value="">White: —</option>
                      {optionsFor(i, 'white').map((e) => (
                        <option key={e.id} value={e.id}>
                          {label(e)}
                        </option>
                      ))}
                    </select>
                    <select
                      className="select select-bordered select-sm min-w-44 flex-1"
                      value={row.blackEntryId ?? ''}
                      onChange={(e) =>
                        updateRow(i, 'black', e.target.value ? Number(e.target.value) : null)
                      }
                    >
                      <option value="">Black: —</option>
                      {optionsFor(i, 'black').map((e) => (
                        <option key={e.id} value={e.id}>
                          {label(e)}
                        </option>
                      ))}
                    </select>
                  </>
                ) : (
                  <span className="flex-1">
                    {label(entriesById.get(row.entryId) as ManualEntry)}
                  </span>
                )}
                <button
                  className="btn btn-ghost btn-sm"
                  disabled={pending}
                  onClick={() => removeRow(i)}
                >
                  Remove
                </button>
              </div>
              {rowWarning(row) && <p className="text-xs text-warning">⚠ {rowWarning(row)}</p>}
            </div>
          ))}
        </div>
      )}

      <button
        className="btn btn-outline btn-sm"
        disabled={pending || pool.length < 2}
        onClick={addPairingRow}
      >
        Add pairing
      </button>

      {pool.length > 0 && (
        <div className="mt-4">
          <h3 className="fieldset-label mb-2">Unpaired players:</h3>
          <div className="flex flex-col gap-1">
            {pool.map((e) => (
              <div key={e.id} className="flex items-center justify-between gap-2 text-sm">
                <span>{label(e)}</span>
                <button
                  className="btn btn-ghost btn-xs"
                  disabled={pending}
                  onClick={() => addBye(e.id)}
                >
                  Give bye
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && <p className="mt-4 text-sm text-error">{error}</p>}

      <button
        className="btn btn-primary mt-4 w-full"
        disabled={pending || rows.length === 0}
        onClick={save}
      >
        {pending ? 'Saving…' : 'Save pairings'}
      </button>
      {rows.length === 0 && (
        <p className="mt-2 text-xs text-base-content/60">
          Add pairings above, or give players byes from the unpaired list.
        </p>
      )}
    </div>
  )
}
