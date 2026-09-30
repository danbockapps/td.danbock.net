import {describe, expect, it} from 'vitest'
import {confirmEmail} from './actions'

describe('confirmEmail', () => {
  it('rejects an invalid email without touching the session', async () => {
    const formData = new FormData()
    formData.set('email', 'not-an-email')

    const result = await confirmEmail(undefined, formData)

    expect(result).toEqual({error: 'Enter a valid email address'})
  })

  it('rejects a blank email', async () => {
    const formData = new FormData()
    formData.set('email', '')

    const result = await confirmEmail(undefined, formData)

    expect(result).toEqual({error: 'Enter a valid email address'})
  })
})
