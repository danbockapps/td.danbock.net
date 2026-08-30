import type {UscfLookup, UscfLookupResult} from './types'

const FIRST_NAMES = [
  'James',
  'Mary',
  'Robert',
  'Patricia',
  'John',
  'Jennifer',
  'Michael',
  'Linda',
  'David',
  'Elizabeth',
  'William',
  'Barbara',
  'Richard',
  'Susan',
  'Joseph',
  'Jessica',
  'Thomas',
  'Sarah',
  'Charles',
  'Karen',
]

const LAST_NAMES = [
  'Smith',
  'Johnson',
  'Williams',
  'Brown',
  'Jones',
  'Garcia',
  'Miller',
  'Davis',
  'Rodriguez',
  'Martinez',
  'Hernandez',
  'Lopez',
  'Gonzalez',
  'Wilson',
  'Anderson',
  'Thomas',
  'Taylor',
  'Moore',
  'Jackson',
  'Martin',
]

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export class MockUscfLookup implements UscfLookup {
  async lookup(_uscfId: string): Promise<UscfLookupResult> {
    await delay(300)

    const name = `${randomFrom(FIRST_NAMES)} ${randomFrom(LAST_NAMES)}`
    const isUnrated = Math.random() < 0.4
    const rating = isUnrated ? null : Math.floor(Math.random() * (2300 - 100 + 1)) + 100

    return {name, rating}
  }
}
