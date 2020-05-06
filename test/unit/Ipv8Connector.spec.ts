import Ipv8Connector from '../../src/Ipv8Connector'
import { Ipv8AttestationClient } from '../../src/client/Ipv8AttestationClient'
import sinon from 'sinon'
import { use, expect } from 'chai'
import chaiAsPromised from 'chai-as-promised'
import { Ipv8TrustchainClient } from '../../src/client/Ipv8TrustchainClient'
import { TrustchainBlock } from '../../src/types/ipv8'
import stringify from 'json-stable-stringify'
import { Base64Utils } from '../../src/utils/base64'

use(chaiAsPromised)

describe('Ipv8Connector.ts', function () {
  let connector: Ipv8Connector
  let attestationClient: Ipv8AttestationClient
  let trustchainClient: Ipv8TrustchainClient
  beforeEach(() => {
    connector = new Ipv8Connector()
    attestationClient = new Ipv8AttestationClient('')
    trustchainClient = new Ipv8TrustchainClient('')
    connector.ipv8AttestationClient = attestationClient
    connector.ipv8TrustchainClient = trustchainClient
  })

  it('should have the name "ipv8"', function () {
    expect(connector.getName()).to.equal('ipv8')
  })

  it('should extract a IPv8 peer from a did', function () {
    const peer = connector.extractPeerFromDid('did:discipl:ipv8:eyJtaWQiOiJDTWlVa080RWY4MUtmWkEvbFBnMlU2SzE0bXM9Iiw' +
      'icHVibGljS2V5IjoiNGM2OTYyNGU2MTQzNGM1MDRiM2FiZjUxN2NiMDAxMjE3N2UxMjY3YzJiODAyYjVlZmEzOTQ4ZWFkMmVjNjFiMjZjY' +
      'mZmYzA3ZDM2MmM3OWVkZjFiMmU3OTIzZDM4MGI4NzI2MTNjZDdkODkwZGQ4NmExNGIwNjk0NzljNmY3YmRkZTE2NmZkOWFjZjhiOWM3NGE5NSJ9')

    expect(peer.mid).to.eq('CMiUkO4Ef81KfZA/lPg2U6K14ms=')
    expect(peer.publicKey).to.eq('4c69624e61434c504b3abf517cb0012177e1267c2b802b5efa3948ead2ec61b26cbffc07d362c79edf1b2e7923d380b872613cd7d890dd86a14b069479c6f7bdde166fd9acf8b9c74a95')
  })

  it('should throw an error when another string than a DID is given', function () {
    expect(() => connector.extractPeerFromDid('nope')).to.throw('The given string is not a valid DID')
  })

  it('should throw an error when invalid JSON is present in a did', function () {
    expect(() => connector.extractPeerFromDid('did:discipl:ipv8:nope')).to.throw('Could not parse or decode DID: Invalid base64, URI malformed')
  })

  describe('claim', function () {
    beforeEach(() => {
      sinon.restore()
      sinon.stub(connector, 'extractPeerFromDid').returns({ mid: 'attester_mid', publicKey: 'pubkey' })
    })

    it('should be able to create a new claim with a string as data', async function () {
      sinon.restore()
      sinon.stub(connector, 'extractPeerFromDid').returns({ mid: 'base64mid', publicKey: 'pubkey' })
      sinon.mock(attestationClient).expects('requestAttestation').once().withArgs('ZGF0YQ==', 'base64mid')

      const link = await connector.claim('owner_mid', 'irrelevant', 'data', 'attester_mid')

      expect(link).to.eq('link:discipl:ipv8:temp:ZGF0YQ==')
    })

    it('should be able to create a new claim with a object as data', async function () {
      sinon.restore()
      sinon.stub(connector, 'extractPeerFromDid').returns({ mid: 'base64mid', publicKey: 'pubkey' })
      sinon.mock(attestationClient).expects('requestAttestation').once().withArgs('eyJuZWVkIjoiYmVlciJ9', 'base64mid')

      const link = await connector.claim('owner_mid', 'irrelevant', { 'need': 'beer' }, 'attester_mid')

      expect(link).to.eq('link:discipl:ipv8:temp:eyJuZWVkIjoiYmVlciJ9')
    })

    it('should be able to attest a claim that has not been attested before', async function () {
      const attributeName = Base64Utils.toBase64(stringify({ 'need': 'beer' }))
      sinon.stub(attestationClient, 'requestAttestation').resolves()
      sinon.stub(attestationClient, 'getOutstanding').resolves([{ attributeName: attributeName, peerMid: 'attribute_owner_mid', metadata: '' }])
      sinon.mock(attestationClient).expects('attest').once().withArgs(attributeName, 'approve', 'attribute_owner_mid').resolves()
      sinon.mock(trustchainClient).expects('getBlocksForUser').once().withArgs('pubkey').resolves([{ transaction: { name: attributeName }, hash: '1234' }])

      const link = await connector.claim('attribute_owner_mid', 'irrelevant', { 'need': 'beer' }, 'attester_mid')
      const attestLink = await connector.claim('attester_mid', 'irrelevant', { 'approve': link }, 'attester_mid')

      expect(attestLink).to.eq('link:discipl:ipv8:perm:1234')
    })

    it('should be able to reattest a existing claim', async function () {
      sinon.mock(attestationClient).expects('getOutstanding').once().resolves([{ attributeName: stringify({ 'need': 'beer' }), peerMid: 'ownerMid', hash: 'abcde' }])
      sinon.mock(trustchainClient).expects('getBlocksForUser').twice().withArgs('pubkey').resolves([{ transaction: { name: stringify({ 'need': 'beer' }) }, hash: '1234' }])
      sinon.mock(attestationClient).expects('attest').once().withArgs(stringify({ 'need': 'beer' }), 'extra_approve', 'ownerMid')

      const attestLink = await connector.claim('owner_mid', 'irrelevant', { 'extra_approve': 'link:discipl:ipv8:perm:1234' }, 'attester_mid')

      expect(attestLink).to.eq('link:discipl:ipv8:perm:1234')
    })

    it('should not be able to attest a none existing claim', function () {
      sinon.stub(attestationClient, 'getOutstanding').resolves([])

      expect(connector.attestClaim('', 'Y2xhaW0=', 'approve'))
        .to.eventually.be.rejected
        .and.to.be.and.instanceOf(Error)
        .and.have.property('message', 'Attestation request for "Y2xhaW0=" could not be found')
    })

    it('should not be able to reattest a none existing claim', function () {
      sinon.stub(trustchainClient, 'getBlocksForUser').resolves([])
      sinon.stub(attestationClient, 'getOutstanding').resolves([{ attributeName: 'some_claim', peerMid: 'owner', metadata: '' }])

      expect(connector.reattestClaim('', '1234', 'nope'))
        .to.eventually.be.rejected
        .and.to.be.and.instanceOf(Error)
        .and.have.property('message', 'Attribute with hash "1234" could not be found')
    })

    describe('should give an error when a invalid link is given', async function () {
      const invalidLinks = [
        { input: { 'attest': 'link:discipl:ipv8:reference' }, description: 'Without a indicator', error: 'Could not extract a valid reference from the given claim' },
        { input: { 'attest': 'link:discipl:ipv8:perm:1234:second' }, description: 'Too long reference', error: 'Could not extract a valid reference from the given claim' },
        { input: { 'attest': 'link:discipl:ipv8:invalid:reference' }, description: 'Invalid indicator', error: 'Unknown link indirector: invalid' }
      ]

      invalidLinks.forEach((link) => {
        it(link.description, () => {
          const invalidLink = link.input

          expect(connector.claim('owner_mid', 'approved', invalidLink, 'attester_mid'))
            .to.eventually.be.rejected
            .and.to.be.and.instanceOf(Error)
            .and.have.property('message', link.error)
        })
      })
    })

    it('should get the latest claim made by a did', async function () {
      sinon.stub(trustchainClient, 'getBlocksForUser').resolves([{ hash: 'abcde' }, { hash: 'fghi' }] as TrustchainBlock[])

      const lastClaim = await connector.getLatestClaim('irrelevant')
      expect(lastClaim).to.eq('link:discipl:ipv8:perm:abcde')
    })

    it('should get a calim by a given link', async function () {
      // eslint-disable-next-line @typescript-eslint/camelcase
      sinon.stub(trustchainClient, 'getBlock').resolves({ hash: 'abcde', previous_hash: 'abcde_prev_hash', transaction: { name: 'my_attribute' } } as TrustchainBlock)

      const link = 'link:discipl:ipv8:perm:abcde'
      const claim = await connector.get(link)

      expect(claim.previous).to.eq('link:discipl:ipv8:perm:abcde_prev_hash')
      expect(claim.data).to.eq('my_attribute')
    })

    it('should get a calim of a given temporary link', async function () {
      const link = 'link:discipl:ipv8:temp:eydzb21lJzonb2JqZWN0J30='
      const claim = await connector.get(link)

      expect(claim.previous).to.eq(null)
      expect(claim.data).to.eq("{'some':'object'}")
    })

    it('should throw an error when a invalid link is given', function () {
      expect(connector.get('link:discipl:ipv8:eydzb21lJzonb2JqZWN0J30='))
        .to.eventually.be.rejected
        .and.to.be.and.instanceOf(Error)
        .and.have.property('message', 'Could not extract a valid reference from the given claim')

      expect(connector.get('link:discipl:ipv8:invalid:eydzb21lJzonb2JqZWN0J30='))
        .to.eventually.be.rejected
        .and.to.be.and.instanceOf(Error)
        .and.have.property('message', 'Unknown link indirector: invalid')
    })

    it('should wait for the verification result to be available', async function () {
      connector.VERIFICATION_REQUEST_RETRY_TIMEOUT_S = 0.1
      sinon.stub(attestationClient, 'getVerificationOutput').resolves([{ attributeHash: 'abcde', attributeValue: 'approve', match: 100 }, { attributeHash: 'fghi', attributeValue: 'nope', match: 0 }])
      const result = await connector.waitForVerificationResult('abcde')

      expect(result).to.deep.eq({ attributeHash: 'abcde', attributeValue: 'approve', match: 100 })
    })

    it('should retry to get the verification result if no result is available yet', async function () {
      connector.VERIFICATION_REQUEST_RETRY_TIMEOUT_S = 0.1
      sinon.stub(attestationClient, 'getVerificationOutput')
        .onFirstCall().resolves([{ attributeHash: 'fghi', attributeValue: 'nope', match: 0 }])
        .onSecondCall().resolves([{ attributeHash: 'abcde', attributeValue: 'approve', match: 100 }, { attributeHash: 'fghi', attributeValue: 'nope', match: 0 }])

      const result = await connector.waitForVerificationResult('abcde')
      expect(result).to.deep.eq({ attributeHash: 'abcde', attributeValue: 'approve', match: 100 })
    })
  })

  describe('verify', () => {
    it('should be able to verify a claim', async function () {
      sinon.stub(connector, 'extractPeerFromDid').returns({ mid: 'attestor_mid', publicKey: '' })
      sinon.stub(trustchainClient, 'getBlocksForUser').resolves([{ hash: 'abcde', transaction: { name: 'my_attribute', hash: '\u0084Kf\u0096\u00e9xvb\u007f\rw\u001a\u0014\u009a\u00c8f\u00d4&gx' } }, { hash: 'fghi' }] as TrustchainBlock[])
      sinon.mock(attestationClient).expects('verify').once().withArgs('attestor_mid', 'hEtmlul4dmJ/DXcaFJrIZtQmZ3g=', 'approve')
      sinon.stub(connector, 'waitForVerificationResult').resolves({ attributeHash: 'hEtmlul4dmJ/DXcaFJrIZtQmZ3g=', attributeValue: 'approve', match: 0.99 })

      connector.verify('attestor_did', { 'approve': 'link:discipl:ipv8:perm:abcde' }, 'verified_did')
    })

    it('should throw an error when an invalid attestation is given', function () {
      expect(connector.verify('attestor_id', {}, 'verifier_did'))
        .to.eventually.be.rejected
        .and.to.be.and.instanceOf(Error)
        .and.have.property('message', 'Unexpected attestation object: {}')
    })

    it('should throw an error when a invalid link is given', function () {
      sinon.stub(connector, 'extractPeerFromDid').returns({ mid: '', publicKey: '' })

      expect(connector.verify('did:discipl:ipv8:1', { 'attestaion': 'link:discipl:ipv8:invalid' }, 'verifier_did'))
        .to.eventually.be.rejected
        .and.to.be.and.instanceOf(Error)
        .and.have.property('message', 'Could not extract a valid reference from the given link')
    })

    it('should not verify a claim with a temporary link', function () {
      sinon.stub(connector, 'extractPeerFromDid').returns({ mid: '', publicKey: '' })

      expect(connector.verify('did:discipl:ipv8:1', { 'attestaion': 'link:discipl:ipv8:temp:1234' }, 'verifier_did'))
        .to.eventually.be.rejected
        .and.to.be.and.instanceOf(Error)
        .and.have.property('message', 'Only an attestation refering to a permanent link can be verified')
    })
  })
})
