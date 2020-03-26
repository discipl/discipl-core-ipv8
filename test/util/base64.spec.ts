import { expect } from 'chai'
import { Base64Utils } from '../../src/utils/base64'

describe('base64-util', () => {
  it('should encode a string into base64', () => {
    expect(Base64Utils.toBase64('discipl')).to.be.eq('ZGlzY2lwbA==')
  })

  it('should deencode a string from base64', () => {
    expect(Base64Utils.fromBase64('ZGlzY2lwbA==')).to.be.eq('discipl')
  })

  it('should encode unicode characters into base64', () => {
    expect(Base64Utils.toBase64('π≈')).to.be.eq('z4DiiYg=')
  })

  it('should deencode unicode characters from base64', () => {
    expect(Base64Utils.fromBase64('z4DiiYg=')).to.be.eq('π≈')
  })
})
