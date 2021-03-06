import sinon from 'sinon'
import { expect, use } from 'chai'
import chaiAsPromised from 'chai-as-promised'
import { Ipv8AttestationClient } from '../../../src/client/Ipv8AttestationClient'
use(chaiAsPromised)

describe('Ipv8AttestationClient.ts', function () {
  let attestationClient: Ipv8AttestationClient
  let globalWithFetch: NodeJS.Global & { fetch: () => Response }

  beforeEach(function () {
    attestationClient = new Ipv8AttestationClient('')
    globalWithFetch = global as NodeJS.Global & { fetch: () => Response }
  })

  describe('#getPeers', function () {
    it('should throw an error when the request fails', function () {
      globalWithFetch.fetch = sinon.mock().resolves({ ok: false, text: () => 'Not found' })

      expect(attestationClient.getPeers()).to.rejectedWith('Error when sending request to IPv8: Not found')
    })
  })

  describe('#getOutstanding', function () {
    it('should throw an error when the request fails', function () {
      globalWithFetch.fetch = sinon.mock().resolves({ ok: false, text: () => 'Not found' })

      expect(attestationClient.getOutstanding()).to.rejectedWith('Error when sending request to IPv8: Not found')
    })
  })

  describe('#findOutstanding', function () {
    it('should try 5 times if the oustanding request is not found', async function () {
      const mock = sinon.stub(attestationClient, 'getOutstanding')
        .resolves([])
        .onCall(4).resolves([{ attributeName: 'attribute', metadata: '', peerMid: 'abcde' }])

      const outstanding = await attestationClient.findOutstanding('attribute')

      expect(outstanding).to.deep.eq({ attributeName: 'attribute', metadata: '', peerMid: 'abcde' })
      expect(mock.callCount).to.eq(5)
    })
  })

  describe('#getAttributes', function () {
    it('should throw an error when the request fails', function () {
      globalWithFetch.fetch = sinon.mock().resolves({ ok: false, text: () => 'Not found' })

      expect(attestationClient.getAttributes()).to.rejectedWith('Error when sending request to IPv8: Not found')
    })

    it('should apply the input to the query parameters', function () {
      globalWithFetch.fetch = sinon.mock().withArgs('/attestation?type=attributes&mid=1234%2B').resolves({ ok: true, json: () => [''] })

      attestationClient.getAttributes('1234+')
    })
  })

  describe('#verify', function () {
    it('should throw an error when the request fails', function () {
      globalWithFetch.fetch = sinon.mock().resolves({ ok: false, text: () => 'Not found' })

      expect(attestationClient.verify('', '', '')).to.rejectedWith('Error when sending request to IPv8: Not found')
    })

    it('should apply the input to the query parameters', function () {
      globalWithFetch.fetch = sinon.mock().withArgs('/attestation?type=verify&mid=1234%2B&attribute_hash=abc123%2B&attribute_values=YXBwcm92ZQ%3D%3D').resolves({ ok: true, json: () => '' })

      attestationClient.verify('1234+', 'abc123+', 'approve')
    })
  })

  describe('#allowVerify', function () {
    it('should throw an error when the request fails', function () {
      globalWithFetch.fetch = sinon.mock().resolves({ ok: false, text: () => 'Not found' })

      expect(attestationClient.allowVerify('', '')).to.rejectedWith('Error when sending request to IPv8: Not found')
    })

    it('should apply the input to the query parameters', function () {
      globalWithFetch.fetch = sinon.mock().withArgs('/attestation?type=allow_verify&mid=1234%2B&attribute_name=need_beer%2B').resolves({ ok: true, json: () => '' })

      attestationClient.allowVerify('1234+', 'need_beer+')
    })
  })

  describe('#getOutstandingVerify', function () {
    it('should throw an error when the request fails', function () {
      globalWithFetch.fetch = sinon.mock().resolves({ ok: false, text: () => 'Not found' })

      expect(attestationClient.getOutstandingVerify()).to.rejectedWith('Error when sending request to IPv8: Not found')
    })
  })

  describe('#getVerificationOutput', function () {
    it('should throw an error when the request fails', function () {
      globalWithFetch.fetch = sinon.mock().resolves({ ok: false, text: () => 'Not found' })

      expect(attestationClient.getVerificationOutput()).to.rejectedWith('Error when sending request to IPv8: Not found')
    })
  })

  describe('#requestAttestation', function () {
    it('should throw an error when the request fails', function () {
      globalWithFetch.fetch = sinon.mock().resolves({ ok: false, text: () => 'Not found' })

      expect(attestationClient.requestAttestation('', '')).to.rejectedWith('Error when sending request to IPv8: Not found')
    })

    it('should apply the input to the query parameters', function () {
      globalWithFetch.fetch = sinon.mock().withArgs('/attestation?type=request&mid=1234%2B&metadata=eyJzb21lIjoib2JqZWN0In0%3D&attribute_name=need_beer%2B').resolves({ ok: true, json: () => '' })

      attestationClient.requestAttestation('need_beer+', '1234+', { some: 'object' })
    })
  })

  describe('#attest', function () {
    it('should throw an error when the request fails', function () {
      globalWithFetch.fetch = sinon.mock().resolves({ ok: false, text: () => 'Not found' })

      expect(attestationClient.attest('', '', '')).to.rejectedWith('Error when sending request to IPv8: Not found')
    })

    it('should apply the input to the query parameters', function () {
      globalWithFetch.fetch = sinon.mock().withArgs('/attestation?type=attest&mid=1234%2B&attribute_name=need_beer%2B&attribute_value=YXBwcm92ZQ%3D%3D').resolves({ ok: true, json: () => '' })

      attestationClient.attest('need_beer+', 'approve', '1234+')
    })
  })
})
