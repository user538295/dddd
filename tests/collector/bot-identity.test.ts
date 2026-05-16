import { describe, expect, it } from 'vitest'
import { isBotReviewer } from '~/collector/bot-identity'

describe('bot-identity', () => {
  it('bot_identity_user_type_bot_is_bot', () => {
    expect(isBotReviewer({ login: 'whatever', type: 'Bot' })).toBe(true)
  })

  it('bot_login_endswith_bracket_bot_literal_suffix', () => {
    expect(isBotReviewer({ login: 'dependabot[bot]', type: 'User' })).toBe(true)
  })

  it('bot_login_must_end_with_bracket_bot_not_just_contain_it', () => {
    expect(isBotReviewer({ login: 'foo[bot]bar', type: 'User' })).toBe(false)
  })

  it('human_user_with_login_ending_in_bracket_bot_is_classified_as_bot', () => {
    expect(isBotReviewer({ login: 'alice[bot]', type: 'User' })).toBe(true)
  })

  it('null_user_object_treated_as_human', () => {
    expect(isBotReviewer(null)).toBe(false)
    expect(isBotReviewer(undefined)).toBe(false)
  })

  it('null_user_type_treated_as_human', () => {
    expect(isBotReviewer({ login: 'alice', type: null })).toBe(false)
  })

  it('user_type_user_is_not_bot', () => {
    expect(isBotReviewer({ login: 'alice', type: 'User' })).toBe(false)
  })
})
