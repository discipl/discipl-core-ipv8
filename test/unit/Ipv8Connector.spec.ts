import Ipv8Connector from '../../src/Ipv8Connector'
import { Ipv8AttestationClient } from '../../src/client/Ipv8AttestationClient'
import sinon from 'sinon'
import { use, expect, assert } from 'chai'
import chaiAsPromised from 'chai-as-promised'
import { Ipv8TrustchainClient } from '../../src/client/Ipv8TrustchainClient'
import { TrustchainBlock } from '../../src/types/ipv8'
import stringify from 'json-stable-stringify'
import { Base64Utils } from '../../src/utils/base64'
import { take } from 'rxjs/operators'
import { Subscription } from 'rxjs'
use(chaiAsPromised)

/* eslint-disable @typescript-eslint/camelcase */
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

  it('should let the configure method override the default options', function () {
    connector.configure('', {
      VERIFICATION_REQUEST_MAX_RETRIES: 1,
      VERIFICATION_REQUEST_RETRY_TIMEOUT_MS: 2,
      VERIFICATION_MINIMAl_MATCH: 0.3,
      OBSERVE_VERIFICATION_POLL_INTERVAL_MS: 4
    })

    expect(connector.VERIFICATION_REQUEST_MAX_RETRIES).to.be.equal(1)
    expect(connector.VERIFICATION_REQUEST_RETRY_TIMEOUT_MS).to.be.equal(2)
    expect(connector.VERIFICATION_MINIMAl_MATCH).to.be.equal(0.3)
    expect(connector.OBSERVE_VERIFICATION_POLL_INTERVAL_MS).to.be.equal(4)
  })

  it('should extract a IPv8 peer from a did', function () {
    const peer = connector.extractPeerFromDid('did:discipl:ipv8:TGliTmFDTFBLOr9RfLABIXfhJnwrgCte+jlI6tLsYbJsv/wH02LHnt8bLnkj04C4cmE819iQ3YahSwaUecb3vd4Wb9ms+LnHSpU=')

    expect(peer.mid).to.eq('CMiUkO4Ef81KfZA/lPg2U6K14ms=')
    expect(peer.publicKey).to.eq('4c69624e61434c504b3abf517cb0012177e1267c2b802b5efa3948ead2ec61b26cbffc07d362c79edf1b2e7923d380b872613cd7d890dd86a14b069479c6f7bdde166fd9acf8b9c74a95')
  })

  it('should throw an error when another string than a DID is given', function () {
    expect(() => connector.extractPeerFromDid('nope')).to.throw('The given string "nope" is not a valid DID')
  })

  describe('getDidOfClaim', function () {
    const sandbox = sinon.createSandbox()

    it('should get the did of a claim with a permanent link', async function () {
      sandbox.stub(trustchainClient, 'getBlock').withArgs('abcde').resolves({ link_public_key: '7075626b6579' } as TrustchainBlock)

      const did = await connector.getDidOfClaim('link:discipl:ipv8:perm:abcde')
      expect(did).to.be.eq('did:discipl:ipv8:cHVia2V5')
    })

    it('should give "null" when a temporary link is given', async function () {
      const did = await connector.getDidOfClaim('link:discipl:ipv8:temp:abcde')
      expect(did).to.be.eq(null)
    })

    it('should throw and error when a invalid link is given', async function () {
      expect(connector.getDidOfClaim('nope'))
        .to.eventually.be.rejected
        .and.to.be.instanceOf(Error)
        .and.have.property('message', 'Could not extract a valid reference from the given link')

      expect(connector.getDidOfClaim('link:discipl:ipv8:nope'))
        .to.eventually.be.rejected
        .and.to.be.instanceOf(Error)
        .and.have.property('message', 'Could not extract a valid reference from the given link')

      expect(connector.getDidOfClaim('link:discipl:ipv8:nope:abcde'))
        .to.eventually.be.rejected
        .and.to.be.instanceOf(Error)
        .and.have.property('message', 'Unknown link indicator: nope')
    })
  })

  describe('claim', function () {
    const sandbox = sinon.createSandbox()

    beforeEach(() => {
      sandbox.stub(connector, 'extractPeerFromDid').returns({ mid: 'attester_mid', publicKey: 'pubkey' })
    })

    it('should be able to create a new claim with a string as data', async function () {
      sandbox.restore()
      sandbox.stub(connector, 'extractPeerFromDid').returns({ mid: 'base64mid', publicKey: 'pubkey' })
      sandbox.mock(attestationClient).expects('requestAttestation').once().withArgs('ZGF0YQ==', 'base64mid')

      const link = await connector.claim('owner_mid', 'irrelevant', 'data', 'attester_mid')

      expect(link).to.eq('link:discipl:ipv8:temp:ZGF0YQ==')
    })

    it('should be able to create a new claim with a object as data', async function () {
      sandbox.restore()
      sandbox.stub(connector, 'extractPeerFromDid').returns({ mid: 'base64mid', publicKey: 'pubkey' })
      sandbox.mock(attestationClient).expects('requestAttestation').once().withArgs('eyJuZWVkIjoiYmVlciJ9', 'base64mid')

      const link = await connector.claim('owner_mid', 'irrelevant', { 'need': 'beer' }, 'attester_mid')

      expect(link).to.eq('link:discipl:ipv8:temp:eyJuZWVkIjoiYmVlciJ9')
    })

    it('should be able to attest a claim that has not been attested before', async function () {
      const attributeName = Base64Utils.toBase64(stringify({ 'need': 'beer' }))
      sandbox.stub(attestationClient, 'requestAttestation').resolves()
      sandbox.stub(attestationClient, 'getOutstanding').resolves([{ attributeName: attributeName, peerMid: 'attribute_owner_mid', metadata: '' }])
      sandbox.mock(attestationClient).expects('attest').once().withArgs(attributeName, 'approve', 'attribute_owner_mid').resolves()
      sandbox.mock(trustchainClient).expects('getBlocksForUser').once().withArgs('pubkey').resolves([{ transaction: { name: attributeName }, hash: '1234' }])

      const link = await connector.claim('attribute_owner_mid', 'irrelevant', { 'need': 'beer' }, 'attester_mid')
      const attestLink = await connector.claim('attester_mid', 'irrelevant', { 'approve': link }, 'attester_mid')

      expect(attestLink).to.eq('link:discipl:ipv8:perm:1234')
    })

    it('should be able to reattest a existing claim', async function () {
      sandbox.mock(attestationClient).expects('getOutstanding').once().resolves([{ attributeName: stringify({ 'need': 'beer' }), peerMid: 'ownerMid', hash: 'abcde' }])
      sandbox.mock(trustchainClient).expects('getBlocksForUser').twice().withArgs('pubkey').resolves([{ transaction: { name: stringify({ 'need': 'beer' }) }, hash: '1234' }])
      sandbox.mock(attestationClient).expects('attest').once().withArgs(stringify({ 'need': 'beer' }), 'extra_approve', 'ownerMid')

      const attestLink = await connector.claim('owner_mid', 'irrelevant', { 'extra_approve': 'link:discipl:ipv8:perm:1234' }, 'attester_mid')

      expect(attestLink).to.eq('link:discipl:ipv8:perm:1234')
    })

    it('should not be able to attest a none existing claim', async function () {
      sandbox.stub(attestationClient, 'getOutstanding').resolves([])

      const result = connector.attestTemporaryLink('', 'Y2xhaW0=', 'approve')

      return assert.isRejected(result, /Attestation request for "Y2xhaW0=" could not be found/)
    })

    it('should not be able to reattest a none existing claim', async function () {
      sandbox.stub(trustchainClient, 'getBlocksForUser').resolves([])
      sandbox.stub(attestationClient, 'getOutstanding').resolves([{ attributeName: 'some_claim', peerMid: 'owner', metadata: '' }])

      const result = connector.attestPermanentLink('', '1234', 'nope')

      return assert.isRejected(result, /Attribute with hash "1234" could not be found/)
    })

    describe('should give an error when a invalid link is given', async function () {
      const invalidLinks = [
        { input: { 'attest': 'link:discipl:ipv8:reference' }, description: 'Without a indicator', error: 'Could not extract a valid reference from the given claim' },
        { input: { 'attest': 'link:discipl:ipv8:perm:1234:second' }, description: 'Too long reference', error: 'Could not extract a valid reference from the given claim' },
        { input: { 'attest': 'link:discipl:ipv8:invalid:reference' }, description: 'Invalid indicator', error: 'Unknown link indicator: invalid' }
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
      sandbox.stub(trustchainClient, 'getBlocksForUser').resolves([{ hash: 'abcde' }, { hash: 'fghi' }] as TrustchainBlock[])

      const lastClaim = await connector.getLatestClaim('irrelevant')
      expect(lastClaim).to.eq('link:discipl:ipv8:perm:abcde')
    })

    it('should get a calim by a given link', async function () {
      // eslint-disable-next-line @typescript-eslint/camelcase
      sandbox.stub(trustchainClient, 'getBlock').resolves({ hash: 'abcde', previous_hash: 'abcde_prev_hash', transaction: { name: 'my_attribute' } } as TrustchainBlock)

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
        .and.have.property('message', 'Unknown link indicator: invalid')
    })

    it('should wait for the verification result to be available', async function () {
      connector.VERIFICATION_REQUEST_RETRY_TIMEOUT_MS = 100
      sandbox.stub(attestationClient, 'getVerificationOutput').resolves([{ attributeHash: 'abcde', attributeValue: 'approve', match: 100 }, { attributeHash: 'fghi', attributeValue: 'nope', match: 0 }])
      const result = await connector.waitForVerificationResult('abcde')

      expect(result).to.deep.eq({ attributeHash: 'abcde', attributeValue: 'approve', match: 100 })
    })

    it('should retry to get the verification result if no result is available yet', async function () {
      connector.VERIFICATION_REQUEST_RETRY_TIMEOUT_MS = 10
      const stub = sandbox.stub(attestationClient, 'getVerificationOutput')
        .onFirstCall().resolves([{ attributeHash: 'fghi', attributeValue: 'nope', match: 0 }])
        .onSecondCall().resolves([{ attributeHash: 'abcde', attributeValue: 'approve', match: 100 }, { attributeHash: 'fghi', attributeValue: 'nope', match: 0 }])

      const result = await connector.waitForVerificationResult('abcde')
      expect(stub.callCount).to.be.eq(2, 'Two calls to the IPv8 node are expected')
      expect(result).to.deep.eq({ attributeHash: 'abcde', attributeValue: 'approve', match: 100 })
    })

    it('should not exeed the maximum retries', async function () {
      connector.VERIFICATION_REQUEST_RETRY_TIMEOUT_MS = 10
      connector.VERIFICATION_REQUEST_MAX_RETRIES = 2
      const mock = sandbox.mock(attestationClient)
      mock.expects('getVerificationOutput')
        .thrice()
        .resolves([])

      expect(connector.waitForVerificationResult('abcde'))
        .to.eventually.be.rejected
        .and.to.be.and.instanceOf(Error)
        .and.have.property('message', 'No verification result received. The peer rejected the verification request or is offline')
    })
  })

  describe('verify', () => {
    const sandbox = sinon.createSandbox()

    it('should be able to verify a claim', async function () {
      sandbox.stub(connector, 'extractPeerFromDid')
        .withArgs('attestor_did').returns({ mid: 'attestor_mid', publicKey: 'attestor_pubkey' })
        .withArgs('verifier_did').returns({ mid: 'verifier_mid', publicKey: 'verifier_pubkey' })
      sandbox.stub(trustchainClient, 'getBlocksForUser')
        .resolves([{ hash: 'abcde', transaction: { name: 'my_attribute', hash: '\u0084Kf\u0096\u00e9xvb\u007f\rw\u001a\u0014\u009a\u00c8f\u00d4&gx' }, public_key: 'attestor_pubkey', link_public_key: 'verifier_pubkey', linked: { hash: 'verifier_abcde' } }, { hash: 'fghi', linked: { hash: 'verifier_fghi' } }] as TrustchainBlock[])
      sandbox.mock(attestationClient).expects('verify').once().withArgs('attestor_mid', 'hEtmlul4dmJ/DXcaFJrIZtQmZ3g=', 'approve')
      sandbox.stub(connector, 'waitForVerificationResult').resolves({ attributeHash: 'hEtmlul4dmJ/DXcaFJrIZtQmZ3g=', attributeValue: 'approve', match: 0.99 })

      connector.verify('attestor_did', { 'approve': 'link:discipl:ipv8:perm:verifier_abcde' }, 'verifier_did')
    })

    it('should not verify a claim if the attestor did not attest it', function () {
      sandbox.stub(connector, 'extractPeerFromDid')
        .withArgs('wrong_did').returns({ mid: 'wrong_mid', publicKey: 'wrong_pubkey' })
        .withArgs('verifier_did').returns({ mid: 'verifier_mid', publicKey: 'verifier_pubkey' })
      sandbox.stub(trustchainClient, 'getBlocksForUser')
        .resolves([{ hash: 'abcde', transaction: { name: 'my_attribute', hash: '\u0084Kf\u0096\u00e9xvb\u007f\rw\u001a\u0014\u009a\u00c8f\u00d4&gx' }, public_key: 'attestor_pubkey', link_public_key: 'verifier_pubkey', linked: { hash: 'verifier_abcde' } }, { hash: 'fghi', linked: { hash: 'verifier_fghi' } }] as TrustchainBlock[])

      expect(connector.verify('wrong_did', { 'approve': 'link:discipl:ipv8:perm:abcde' }, 'verifier_did'))
        .to.eventually.be.eq(null)
    })

    it('should throw an error when an invalid attestation is given', function () {
      expect(connector.verify('attestor_id', {}, 'verifier_did'))
        .to.eventually.be.rejected
        .and.to.be.and.instanceOf(Error)
        .and.have.property('message', 'Unexpected attestation object: {}')
    })

    it('should throw an error when a invalid link is given', function () {
      sandbox.stub(connector, 'extractPeerFromDid').returns({ mid: '', publicKey: '' })

      expect(connector.verify('did:discipl:ipv8:1', { 'attestaion': 'link:discipl:ipv8:invalid' }, 'verifier_did'))
        .to.eventually.be.rejected
        .and.to.be.and.instanceOf(Error)
        .and.have.property('message', 'Could not extract a valid reference from the given link')
    })

    it('should not verify a claim with a temporary link', function () {
      sandbox.stub(connector, 'extractPeerFromDid').returns({ mid: '', publicKey: '' })

      expect(connector.verify('did:discipl:ipv8:1', { 'attestaion': 'link:discipl:ipv8:temp:1234' }, 'verifier_did'))
        .to.eventually.be.rejected
        .and.to.be.and.instanceOf(Error)
        .and.have.property('message', 'Only an attestation refering to a permanent link can be verified')
    })
  })

  describe('observeVerificationRequests', function () {
    const sandbox = sinon.createSandbox()

    beforeEach(function () {
      sandbox.stub(connector, 'extractPeerFromDid')
        .withArgs('some_did').returns({ mid: 'abcde', publicKey: '' })
        .withArgs('did').returns({ mid: 'efghi', publicKey: '' })
      sandbox.stub(attestationClient, 'getPeers').resolves(['abcde', 'efghi'])
    })

    it('should emit when a new outstanding request is available', async function () {
      sandbox.stub(attestationClient, 'getOutstandingVerify').resolves([{ name: 'request', peerMid: 'abcde' }, { name: 'request', peerMid: 'fghij' }])
      sandbox.stub(trustchainClient, 'getBlocksForUser').resolves([{ transaction: { name: 'request' }, hash: 'block_hash', previous_hash: 'prev_hash', public_key: '7075625f6b6579' } as TrustchainBlock])

      const observeResult = await connector.observeVerificationRequests('did')
      const res = observeResult.observable.pipe(take(1)).toPromise()

      expect(res).to.eventually.deep.eq({ claim: { data: 'request', previous: 'link:discipl:ipv8:perm:prev_hash' }, verifier: { did: null, mid: 'abcde' }, did: 'did:discipl:ipv8:cHViX2tleQ==', link: 'link:discipl:ipv8:perm:block_hash' })
    })

    it('should filter on did', async function () {
      sandbox.stub(attestationClient, 'getOutstandingVerify').resolves([{ name: 'request', peerMid: 'abcde' }, { name: 'request', peerMid: 'fghij' }])
      sandbox.stub(trustchainClient, 'getBlocksForUser').resolves([{ transaction: { name: 'request' }, hash: 'block_hash', previous_hash: 'prev_hash', public_key: '7075625f6b6579' } as TrustchainBlock])

      const observeResult = await connector.observeVerificationRequests('did', { did: 'some_did' })
      const res = observeResult.observable.pipe(take(1)).toPromise()

      expect(res).to.eventually.deep.eq({ claim: { data: 'request', previous: 'link:discipl:ipv8:perm:prev_hash' }, verifier: { did: null, mid: 'abcde' }, did: 'did:discipl:ipv8:cHViX2tleQ==', link: 'link:discipl:ipv8:perm:block_hash' })
    })

    it('should not emit when no outstanding requests are found', function (done) {
      this.slow(250)
      connector.OBSERVE_VERIFICATION_POLL_INTERVAL_MS = 10

      sandbox.stub(attestationClient, 'getOutstandingVerify')
        .returns(Promise.resolve([]))

      let subscription: Subscription
      const results = []
      connector.observeVerificationRequests('did').then(res => {
        subscription = res.observable.subscribe(val => results.push(val))
      })

      setTimeout(() => {
        subscription.unsubscribe()
        expect(results).to.have.lengthOf(0)
        done()
      })
    })

    it('readyPromise should resolve if the observing did is found in the network', async function () {
      this.timeout(100)
      const observeResult = await connector.observeVerificationRequests('did')

      return assert.isFulfilled(observeResult.readyPromise, 'The readyPromise was not fulfilled')
    })
  })
})
