import { expect } from 'chai'
import { Ipv8Utils } from '../../../src/utils/ipv8'
import forge from 'node-forge'

describe('util/ipv8.ts', function () {
  describe('publicKeyToMid', function () {
    const publicKeys: { key: string; encoding: 'base64' | 'hex' | 'bytes' }[] = [
      { key: 'TGliTmFDTFBLOlrenuWQfMB+nPkaQ5PXnRaV7Z7JlXqkHvqL/hQbtktoOGaAFxhZKAgdL1YrglTW3bj0LcjEnqnHA8LFZc8yeHI=', encoding: 'base64' },
      { key: '4c69624e61434c504b3a5ade9ee5907cc07e9cf91a4393d79d1695ed9ec9957aa41efa8bfe141bb64b6838668017185928081d2f562b8254d6ddb8f42dc8c49ea9c703c2c565cf327872', encoding: 'hex' },
      { key: forge.util.hexToBytes('4c69624e61434c504b3a5ade9ee5907cc07e9cf91a4393d79d1695ed9ec9957aa41efa8bfe141bb64b6838668017185928081d2f562b8254d6ddb8f42dc8c49ea9c703c2c565cf327872'), encoding: 'bytes' }
    ]

    publicKeys.forEach(publicKey => {
      it(`should convert a public key in ${publicKey.encoding} format into a mid`, () => {
        expect(Ipv8Utils.publicKeyToMid(publicKey.key, publicKey.encoding)).to.be.eq('NK/iVUPWqLmbgjGHCksRej/ynUY=')
      })
    })
  })

  describe('publicKeyToDid', function () {
    const publicKeys: { key: string; encoding: 'base64' | 'hex' | 'bytes' }[] = [
      { key: 'TGliTmFDTFBLOlrenuWQfMB+nPkaQ5PXnRaV7Z7JlXqkHvqL/hQbtktoOGaAFxhZKAgdL1YrglTW3bj0LcjEnqnHA8LFZc8yeHI=', encoding: 'base64' },
      { key: '4c69624e61434c504b3a5ade9ee5907cc07e9cf91a4393d79d1695ed9ec9957aa41efa8bfe141bb64b6838668017185928081d2f562b8254d6ddb8f42dc8c49ea9c703c2c565cf327872', encoding: 'hex' },
      { key: forge.util.hexToBytes('4c69624e61434c504b3a5ade9ee5907cc07e9cf91a4393d79d1695ed9ec9957aa41efa8bfe141bb64b6838668017185928081d2f562b8254d6ddb8f42dc8c49ea9c703c2c565cf327872'), encoding: 'bytes' }
    ]

    publicKeys.forEach(publicKey => {
      it(`should convert a public key in ${publicKey.encoding} format into a did`, () => {
        expect(Ipv8Utils.publicKeyToDid(publicKey.key, publicKey.encoding)).to.be.eq('did:discipl:ipv8:TGliTmFDTFBLOlrenuWQfMB+nPkaQ5PXnRaV7Z7JlXqkHvqL/hQbtktoOGaAFxhZKAgdL1YrglTW3bj0LcjEnqnHA8LFZc8yeHI=')
      })
    })
  })
})
