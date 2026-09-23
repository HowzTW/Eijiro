import { describe, expect, it } from 'vitest'
import { getDisplayHost, getDisplayUrl, getSafeExternalUrl, normalizeUrl } from '../src/utils/url'

describe('normalizeUrl', () => {
  it('缺少 protocol 時補上 https', () => {
    expect(normalizeUrl('example.com/path')).toBe('https://example.com/path')
  })

  it('保留有效的 https 網址', () => {
    expect(normalizeUrl(' https://example.com/a?q=1 ')).toBe('https://example.com/a?q=1')
  })

  it('拒絕帳號密碼網址', () => {
    expect(() => normalizeUrl('https://user:pass@example.com')).toThrow('帳號或密碼')
  })

  it('拒絕非 http 協定', () => {
    expect(() => normalizeUrl('javascript:alert(1)')).toThrow()
  })
})

describe('display helpers', () => {
  it('簡化網域和根路徑', () => {
    expect(getDisplayHost('https://www.example.com/')).toBe('example.com')
    expect(getDisplayUrl('https://www.example.com/')).toBe('example.com')
  })

  it('只允許安全的外部連結協定', () => {
    expect(getSafeExternalUrl('https://example.com')).toBe('https://example.com/')
    expect(getSafeExternalUrl('javascript:alert(1)')).toBeNull()
  })
})
