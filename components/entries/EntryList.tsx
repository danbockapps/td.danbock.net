import {formatRating} from '@/lib/format'

export interface EntryListItem {
  round?: number
  name: string
  rating: number | null
}

function byRatingDesc(a: EntryListItem, b: EntryListItem) {
  if (a.rating === b.rating) return 0
  if (a.rating === null) return 1
  if (b.rating === null) return -1
  return b.rating - a.rating
}

function EntryTable({entries, showRound}: {entries: EntryListItem[]; showRound: boolean}) {
  return (
    <table className="table">
      <thead>
        <tr>
          <th>Seed</th>
          {showRound && <th>Round</th>}
          <th>Name</th>
          <th>Rating</th>
        </tr>
      </thead>
      <tbody>
        {entries.map((e, i) => (
          <tr key={`${e.round ?? 0}-${e.name}-${i}`}>
            <td>{i + 1}</td>
            {showRound && <td>{e.round}</td>}
            <td>{e.name}</td>
            <td>{formatRating(e.rating)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export function EntryList({
  entries,
  showRound = false,
}: {
  entries: EntryListItem[]
  showRound?: boolean
}) {
  if (entries.length === 0) {
    return <p className="text-base-content/60">No entries yet.</p>
  }

  if (!showRound) {
    return (
      <div className="overflow-x-auto">
        <EntryTable entries={[...entries].sort(byRatingDesc)} showRound={false} />
      </div>
    )
  }

  const rounds = Array.from(new Set(entries.map((e) => e.round))).sort(
    (a, b) => (a ?? 0) - (b ?? 0),
  )

  return (
    <div className="flex flex-col gap-8">
      {rounds.map((round) => (
        <div key={round} className="overflow-x-auto">
          <h3 className="mb-2 font-semibold">Round {round}</h3>
          <EntryTable
            entries={entries.filter((e) => e.round === round).sort(byRatingDesc)}
            showRound={false}
          />
        </div>
      ))}
    </div>
  )
}
