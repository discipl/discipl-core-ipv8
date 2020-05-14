import { expect } from 'chai'
import { Ipv8Utils } from '../../../src/utils/ipv8'
import forge from 'node-forge'

describe('util/ipv8.ts', function () {
  it('should convert a base64 encoded public key into a mid', function () {
    const publicKey = 'TGliTmFDTFBLOlrenuWQfMB+nPkaQ5PXnRaV7Z7JlXqkHvqL/hQbtktoOGaAFxhZKAgdL1YrglTW3bj0LcjEnqnHA8LFZc8yeHI='

    expect(Ipv8Utils.publicKeyToMid(publicKey, 'base64')).to.be.eq('NK/iVUPWqLmbgjGHCksRej/ynUY=')
  })

  it('should convert a hex encoded public key into a mid', function () {
    const publicKey = '4c69624e61434c504b3a5ade9ee5907cc07e9cf91a4393d79d1695ed9ec9957aa41efa8bfe141bb64b6838668017185928081d2f562b8254d6ddb8f42dc8c49ea9c703c2c565cf327872'

    expect(Ipv8Utils.publicKeyToMid(publicKey, 'hex')).to.be.eq('NK/iVUPWqLmbgjGHCksRej/ynUY=')
  })

  it('should convert a byte encoded public key into a mid', function () {
    const publicKey = forge.util.hexToBytes('4c69624e61434c504b3a5ade9ee5907cc07e9cf91a4393d79d1695ed9ec9957aa41efa8bfe141bb64b6838668017185928081d2f562b8254d6ddb8f42dc8c49ea9c703c2c565cf327872')

    expect(Ipv8Utils.publicKeyToMid(publicKey, 'bytes')).to.be.eq('NK/iVUPWqLmbgjGHCksRej/ynUY=')
  })
})
