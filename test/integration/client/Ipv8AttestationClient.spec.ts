import { expect, assert } from 'chai'
import { Ipv8AttestationClient } from '../../../src/client/Ipv8AttestationClient'
import { Ipv8DockerUtil } from '../util/ipv8docker'

describe('Ipv8AttestationClient.ts', function () {
  this.beforeAll(function (done) {
    this.timeout(60000)
    Ipv8DockerUtil.startIpv8Container()
      .then(() => Ipv8DockerUtil.waitForContainersToBeReady().then(() => done()))
  })

  this.afterAll(function (done) {
    Ipv8DockerUtil.killIpv8Container().then(() => done())
  })

  const peers = {
    'employee': { mid: 'safeqEkAA2ouwLQ2dayMRWEfsH0=', url: 'http://localhost:14410' },
    'employer': { mid: 'K1ifTZ++hPN4UqU24rSc/czfYZY=', url: 'http://localhost:14411' },
    'brewer': { mid: 'eGU/YRXWJB18VQf8UbOoIhW9+xM=', url: 'http://localhost:14412' }
  }

  it('should get all peers', async function () {
    const attestationClient = new Ipv8AttestationClient(peers.employee.url)
    const resPeers = await attestationClient.getPeers()

    assert.include(resPeers, peers.employer.mid)
    assert.include(resPeers, peers.brewer.mid)
  })

  it('should retreive all attested attributes', async function () {
    const attestationClient = new Ipv8AttestationClient(peers.employee.url)
    const res = await attestationClient.getAttributes()

    expect(res.length).to.eq(1, 'unexpected amount of attested attributes')
    expect(res[0].name).to.eq('time_for_beer')
    expect(res[0].metadata).to.deep.eq({ kind: 'IPA' })
    expect(res[0].attestor).to.eq(peers.employer.mid)
  })

  it('should retreive all attested attributes filtered by mid', async function () {
    const attestationClient = new Ipv8AttestationClient(peers.employer.url)
    const res = await attestationClient.getAttributes(peers.employee.mid)

    expect(res.length).to.eq(1, 'unexpected amount of attested attributes')
    expect(res[0].name).to.eq('time_for_beer')
    expect(res[0].metadata).to.deep.eq({ kind: 'IPA' })
    expect(res[0].attestor).to.eq(peers.employer.mid)
  })

  it('should be able to verify the value of an attribute', async function () {
    this.slow(1200)
    this.timeout(2000)

    // Ask for verification
    const brewerAttestationClient = new Ipv8AttestationClient(peers.brewer.url)
    const verifyResult = await brewerAttestationClient.verify(peers.employee.mid, 'c0Tgk2k404E5b0XfOz9MrsVlv0Q=', 'approve')
    expect(verifyResult).to.deep.equal({ success: true }, 'Unexpected result when asking for verification')

    await new Promise((resolve) => setTimeout(resolve, 100))

    // Get outstanding verifications
    const employeeAttestationClient = new Ipv8AttestationClient(peers.employee.url)
    const outstandingResult = await employeeAttestationClient.getOutstandingVerify()
    expect(outstandingResult).to.deep.equal([{ peerMid: 'eGU/YRXWJB18VQf8UbOoIhW9+xM=', name: 'time_for_beer' }],
      'Unexpected result when getting outstanding verifcation requests')

    // Allow verification. The order of execution for these calls is imporant so a chaining style is used
    return employeeAttestationClient.allowVerify('eGU/YRXWJB18VQf8UbOoIhW9+xM=', 'time_for_beer')
      .then(res => expect(res).to.deep.equal({ success: true }, 'unexpected  result when allowing verification'))
      // IPv8 needs some time to verify the attestation
      .then(() => new Promise(resolve => setTimeout(resolve, 400)))
      .then(() => brewerAttestationClient.getVerificationOutput())
      .then(res => expect(res).to.deep.equal([{
        attributeHash: 'c0Tgk2k404E5b0XfOz9MrsVlv0Q=',
        attributeValue: 'YXBwcm92ZQ==',
        match: 0.9999847412109375
      }], 'unexpected verification outcome'))
  })

  it('should be able to request and attest an attribute', async function () {
    this.slow(1000)
    const employeeAttestationClient = new Ipv8AttestationClient(peers.employee.url)
    await employeeAttestationClient.requestAttestation('time_for_coffee', peers.employer.mid)
    await employeeAttestationClient.requestAttestation('time_for_thee', peers.employer.mid, { kind: 'Mint' })

    const employerAttestationClient = new Ipv8AttestationClient(peers.employer.url)
    const outstandingResult = await employerAttestationClient.getOutstanding()

    expect(outstandingResult.length).to.eq(2, 'unexpected amount of outstanding attestation requests')
    expect(outstandingResult[0]).to.deep.equal({
      attributeName: 'time_for_coffee',
      metadata: 'e30=',
      peerMid: 'safeqEkAA2ouwLQ2dayMRWEfsH0='
    }, 'unexpected outstanding request for attestation')
    expect(outstandingResult[1]).to.deep.equal({
      attributeName: 'time_for_thee',
      metadata: 'eyJraW5kIjogIk1pbnQifQ==',
      peerMid: 'safeqEkAA2ouwLQ2dayMRWEfsH0='
    }, 'unexpected outstanding request for attestation')

    const attestRes = await employerAttestationClient.attest('time_for_coffee', 'agree', peers.employee.mid)
    expect(attestRes).to.deep.equal({ success: true })
  })
})
