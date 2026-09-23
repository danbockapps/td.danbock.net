import {formatRating} from '@/lib/format'
import styles from './EntryList.module.css'

export interface EntryListItem {
  round?: number
  name: string
  uscfId: string
  rating: number | null
  points?: number
}

function byPointsThenRatingDesc(a: EntryListItem, b: EntryListItem) {
  const pointsDiff = (b.points ?? 0) - (a.points ?? 0)
  if (pointsDiff !== 0) return pointsDiff

  if (a.rating === b.rating) return 0
  if (a.rating === null) return 1
  if (b.rating === null) return -1
  return b.rating - a.rating
}

function EntryTable({
  entries,
  showRound,
  newNames,
}: {
  entries: EntryListItem[]
  showRound: boolean
  newNames?: Set<string>
}) {
  return (
    <table className="table">
      <thead>
        <tr>
          <th>Seed</th>
          {showRound && <th>Round</th>}
          <th>Name</th>
          <th>USCF ID</th>
          <th>Rating</th>
          <th>Points</th>
        </tr>
      </thead>
      <tbody>
        {entries.map((e, i) => (
          <tr
            key={`${e.round ?? 0}-${e.name}-${i}`}
            className={newNames?.has(e.name) ? styles.entryIn : undefined}
          >
            <td>{i + 1}</td>
            {showRound && <td>{e.round}</td>}
            <td>{e.name}</td>
            <td>{e.uscfId}</td>
            <td>{formatRating(e.rating)}</td>
            <td>{e.points ?? 0}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export function EntryList({
  entries,
  showRound = false,
  newNames,
}: {
  entries: EntryListItem[]
  showRound?: boolean
  newNames?: Set<string>
}) {
  if (entries.length === 0) {
    return <p className="text-base-content/60">No entries yet.</p>
  }

  if (!showRound) {
    return (
      <div>
        <EntryTable
          entries={[...entries].sort(byPointsThenRatingDesc)}
          showRound={false}
          newNames={newNames}
        />
      </div>
    )
  }

  const rounds = Array.from(new Set(entries.map((e) => e.round))).sort(
    (a, b) => (a ?? 0) - (b ?? 0),
  )

  return (
    <div className="flex flex-col gap-8">
      {rounds.map((round) => (
        <div key={round}>
          <h3 className="mb-2 font-semibold">Round {round}</h3>
          <EntryTable
            entries={entries.filter((e) => e.round === round).sort(byPointsThenRatingDesc)}
            showRound={false}
            newNames={newNames}
          />
        </div>
      ))}
    </div>
  )
}
