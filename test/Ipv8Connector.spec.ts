import { Ipv8Connector } from '../src/Ipv8Connector'
import { Ipv8AttestationClient } from '../src/Ipv8AttestationClient'
import sinon from 'sinon'
import { use, expect } from 'chai'
import chaiAsPromised from 'chai-as-promised'

use(chaiAsPromised)

describe('discipl-core-ipv8', () => {
  let connector: Ipv8Connector
  let attestationClient: Ipv8AttestationClient
  before(() => {
    connector = new Ipv8Connector()
    attestationClient = new Ipv8AttestationClient('')
    connector.ipv8AttestationClient = attestationClient
  })

  it('should have the name "ipv8"', () => {
    expect(connector.getName()).to.equal('ipv8')
  })

  describe('claim', () => {
    beforeEach(() => {
      sinon.restore()
      sinon.stub(attestationClient, 'requestAttestation').resolves()
      sinon.stub(attestationClient, 'attest').resolves()
    })

    it('should be able to create a new claim', async () => {
      const link = await connector.claim('test', 'irrelevant', { 'need': 'beer' })

      expect(link).to.eq('link:discipl:ipv8:temp:eyJuZWVkIjoiYmVlciJ9')
    })

    it('should be able to attest a claim that is not attested before', async () => {
      sinon.stub(attestationClient, 'getOutstanding').resolves([{ name: JSON.stringify({ 'need': 'beer' }), peerMid: '', metadata: '' }])
      sinon.stub(attestationClient, 'getAttributes').resolves([{ name: JSON.stringify({ 'need': 'beer' }), attestor: '', hash: '1234', metadata: '' }])

      const link = await connector.claim('test', 'irrelevant', { 'need': 'beer' })
      const attestLink = await connector.claim('', 'irrelevant', { 'approve': link })

      expect(attestLink).to.eq('link:discipl:ipv8:perm:1234')
    })

    it('should be able to re-attest a existing claim', async () => {
      sinon.stub(attestationClient, 'getAttributes').resolves([{ name: JSON.stringify({ 'need': 'beer' }), attestor: '', hash: '1234', metadata: '' }])

      const attestLink = await connector.claim('', 'irrelevant', { 'extra_approve': 'link:discipl:ipv8:perm:1234' })

      expect(attestLink).to.eq('link:discipl:ipv8:perm:1234')
    })

    it('should not be able to attest a none existing claim', () => {
      sinon.stub(attestationClient, 'getAttributes').resolves([])

      expect(connector.claim('', 'irrelevant', { 'extra_approve': 'link:discipl:ipv8:perm:1234' })).to.be.rejectedWith("Attribute with hash '1234' could not be found")
    })

    describe('should give a error when a invalid link is given', async () => {
      const invalidLinks = [
        { input: 'justastring', description: 'Only a string' },
        { input: 'link:discipl:ipv8:reference', description: 'Without a indicator' },
        { input: 'link:discipl:ipv8:invalid:reference', description: 'Invalid indicator' },
        { input: 'link:discipl:invalid:temp:reference', description: 'Invalid namespace' }
      ]

      invalidLinks.forEach((link) => {
        it(link.description, () => {
          const invalidLink = link.input

          expect(connector.attestClaim('', 'approved', invalidLink)).to.be.rejectedWith()
        })
      })
    })
  })
})
