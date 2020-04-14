import sinon from 'sinon'
import { expect } from 'chai'
import { Ipv8TrustchainClient } from '../../../src/client/Ipv8TrustchainClient'

describe('Ipv8TrustchainClient.ts', function () {
  let trustchainClient: Ipv8TrustchainClient
  let globalWithFetch: NodeJS.Global & { fetch: () => Response }

  beforeEach(function () {
    trustchainClient = new Ipv8TrustchainClient('')
    globalWithFetch = global as NodeJS.Global & { fetch: () => Response }
  })

  describe('#getBlocksForUser', function () {
    it('should throw a error when the request failed', function () {
      globalWithFetch.fetch = sinon.mock().resolves({ ok: false, text: () => 'Not found' })

      expect(trustchainClient.getBlocksForUser('')).to.rejectedWith('Error when sending request to IPv8: Not found')
    })
  })
})
