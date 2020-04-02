import { Ipv8Connector } from '../../src/Ipv8Connector'
import { Ipv8AttestationClient } from '../../src/client/Ipv8AttestationClient'
import sinon from 'sinon'
import { use, expect } from 'chai'
import chaiAsPromised from 'chai-as-promised'
import { Ipv8TrustchainClient } from '../../src/client/Ipv8TrustchainClient'
import { TrustchainBlock } from 'ipv8'

use(chaiAsPromised)

describe('Ipv8Connector.ts', () => {
  let connector: Ipv8Connector
  let attestationClient: Ipv8AttestationClient
  let trustchainClient: Ipv8TrustchainClient
  before(() => {
    connector = new Ipv8Connector()
    attestationClient = new Ipv8AttestationClient('')
    trustchainClient = new Ipv8TrustchainClient('')
    connector.ipv8AttestationClient = attestationClient
    connector.ipv8TrustchainClient = trustchainClient
  })

  it('should have the name "ipv8"', () => {
    expect(connector.getName()).to.equal('ipv8')
  })

  it('should extract a IPv8 peer from a did', () => {
    const peer = connector.extractPeerFromDid('did:discipl:ipv8:eyJtaWQiOiJDTWlVa080RWY4MUtmWkEvbFBnMlU2SzE0bXM9Iiw' +
      'icHVibGljS2V5IjoiNGM2OTYyNGU2MTQzNGM1MDRiM2FiZjUxN2NiMDAxMjE3N2UxMjY3YzJiODAyYjVlZmEzOTQ4ZWFkMmVjNjFiMjZjY' +
      'mZmYzA3ZDM2MmM3OWVkZjFiMmU3OTIzZDM4MGI4NzI2MTNjZDdkODkwZGQ4NmExNGIwNjk0NzljNmY3YmRkZTE2NmZkOWFjZjhiOWM3NGE5NSJ9')

    expect(peer.mid).to.eq('CMiUkO4Ef81KfZA/lPg2U6K14ms=')
    expect(peer.publicKey).to.eq('4c69624e61434c504b3abf517cb0012177e1267c2b802b5efa3948ead2ec61b26cbffc07d362c79edf1b2e7923d380b872613cd7d890dd86a14b069479c6f7bdde166fd9acf8b9c74a95')
  })

  it('should throw a error when invalid JSON is present in a did', () => {
    expect(() => connector.extractPeerFromDid('did:discipl:ipv8:nope')).to.throw('Could not parse or decode DID: Invalid base64, URI malformed')
  })

  describe('claim', () => {
    beforeEach(() => {
      sinon.restore()
      sinon.stub(connector, 'extractPeerFromDid').returns({ mid: 'attester_mid', publicKey: 'pubkey' })
    })

    it('should be able to create a new claim', async () => {
      sinon.restore()
      sinon.stub(connector, 'extractPeerFromDid').returns({ mid: 'base64mid', publicKey: 'pubkey' })
      sinon.mock(attestationClient).expects('requestAttestation').once().withArgs('eyJuZWVkIjoiYmVlciJ9', 'base64mid')

      const link = await connector.claim('test', 'irrelevant', { 'need': 'beer' })

      expect(link).to.eq('link:discipl:ipv8:temp:eyJuZWVkIjoiYmVlciJ9')
    })

    it('should be able to attest a claim that is not attested before', async () => {
      sinon.stub(attestationClient, 'requestAttestation').resolves()
      sinon.stub(attestationClient, 'getOutstanding').resolves([{ attributeName: JSON.stringify({ 'need': 'beer' }), peerMid: 'attribute_owner_mid', metadata: '' }])

      // TODO verify that the attributes of the peer that requested attestation are requested
      sinon.mock(attestationClient).expects('attest').once().withArgs(JSON.stringify({ 'need': 'beer' }), 'approve', 'attribute_owner_mid').resolves()
      sinon.mock(trustchainClient).expects('getBlocksForUser').once().withArgs('pubkey').resolves([{ transaction: { name: JSON.stringify({ 'need': 'beer' }) }, hash: '1234' }])

      const link = await connector.claim('attribute_owner_mid', 'irrelevant', { 'need': 'beer' })
      const attestLink = await connector.claim('attester_mid', 'irrelevant', { 'approve': link })

      expect(attestLink).to.eq('link:discipl:ipv8:perm:1234')
    })

    it('should be able to reattest a existing claim', async () => {
      sinon.mock(attestationClient).expects('getOutstanding').once().resolves([{ attributeName: JSON.stringify({ 'need': 'beer' }), peerMid: 'ownerMid', hash: 'abcde' }])
      sinon.mock(trustchainClient).expects('getBlocksForUser').twice().withArgs('pubkey').resolves([{ transaction: { name: JSON.stringify({ 'need': 'beer' }) }, hash: '1234' }])
      sinon.mock(attestationClient).expects('attest').once().withArgs(JSON.stringify({ 'need': 'beer' }), 'extra_approve', 'ownerMid')

      const attestLink = await connector.claim('', 'irrelevant', { 'extra_approve': 'link:discipl:ipv8:perm:1234' })

      expect(attestLink).to.eq('link:discipl:ipv8:perm:1234')
    })

    it('should not be able to attest a none existing claim', () => {
      sinon.stub(attestationClient, 'getOutstanding').resolves([])

      expect(connector.attestClaim('', 'Y2xhaW0=', 'approve')).to.be.rejectedWith('Attestation request for "claim" could not be found')
    })

    it('should not be able to reattest a none existing claim', () => {
      sinon.stub(trustchainClient, 'getBlocksForUser').resolves([])
      sinon.stub(attestationClient, 'getOutstanding').resolves([{ attributeName: 'some_claim', peerMid: 'owner', metadata: '' }])

      expect(connector.reattestClaim('', '1234', 'nope')).to.be.rejectedWith('Attribute with hash "1234" could not be found')
    })

    describe('should give a error when a invalid link is given', async () => {
      const invalidLinks = [
        { input: { 'attest': 'link:discipl:ipv8:reference' }, description: 'Without a indicator', error: 'Could not extract a valid reference from the given claim' },
        { input: { 'attest': 'link:discipl:ipv8:perm:1234:second' }, description: 'Too long reference', error: 'Could not extract a valid reference from the given claim' },
        { input: { 'attest': 'link:discipl:ipv8:invalid:reference' }, description: 'Invalid indicator', error: 'Unknown link indirector: invalid' }
      ]

      invalidLinks.forEach((link) => {
        it(link.description, () => {
          const invalidLink = link.input

          expect(connector.claim('', 'approved', invalidLink)).to.be.rejectedWith(link.error)
        })
      })
    })

    it('should get the latest claim made by a did', async () => {
      sinon.stub(trustchainClient, 'getBlocksForUser').resolves([{ hash: 'abcde' }, { hash: 'fghi' }] as TrustchainBlock[])

      const lastClaim = await connector.getLatestClaim('irrelevant')
      expect(lastClaim).to.eq('link:discipl:ipv8:perm:abcde')
    })

    it('should get a calim by a given link', async () => {
      // eslint-disable-next-line @typescript-eslint/camelcase
      sinon.stub(trustchainClient, 'getBlocksForUser').resolves([{ hash: 'abcde', previous_hash: 'abcde_prev_hash', transaction: { name: 'my_attribute' } }, { hash: 'fghi', previous_hash: 'fghi_prev' }] as TrustchainBlock[])

      const link = 'link:discipl:ipv8:perm:abcde'
      const claim = await connector.get(link)

      expect(claim.previous).to.eq('link:discipl:ipv8:perm:abcde_prev_hash')
      expect(claim.data).to.eq('my_attribute')
    })

    it('should get a calim of a given temporary link', async () => {
      const link = 'link:discipl:ipv8:temp:eydzb21lJzonb2JqZWN0J30='
      const claim = await connector.get(link)

      expect(claim.previous).to.eq(null)
      expect(claim.data).to.eq("{'some':'object'}")
    })
  })
})
