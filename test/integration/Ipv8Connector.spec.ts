import { expect, assert } from 'chai'
import { Ipv8DockerUtil } from './util/ipv8docker'
import Ipv8Connector from '../../src/Ipv8Connector'

describe('Ipv8Connector.ts', function () {
  this.beforeAll(function (done) {
    this.timeout(1200000)
    Ipv8DockerUtil.startIpv8Container()
      .then(() => Ipv8DockerUtil.waitForContainersToBeReady().then(() => done()))
  })

  this.afterAll(function (done) {
    Ipv8DockerUtil.killIpv8Container().then(() => done())
  })

  const peers = {
    'employee': { did: 'did:discipl:ipv8:TGliTmFDTFBLOvA8oRxG5J1f/JeQeKE4KC0u7xyhzmngxCceiI9myNc8k8yrHXuJ4H/QRNuyNAZ8TVvphqRPNQv4cP559EjFHu4=', url: 'http://localhost:14410' },
    'employer': { did: 'did:discipl:ipv8:TGliTmFDTFBLOkIpAS07E+9CKrYuGIe3ubFRoMUNOxWObE55uIhsm2xmc/sfb/+lrDGjrjdPBkkE3ALxCFQ+KmTB6BM2NJLyaHY=', url: 'http://localhost:14411' },
    'brewer': { did: 'did:discipl:ipv8:TGliTmFDTFBLOlsQV6DPeSbncCghFrYd86NJTqDEpHSOCeuIZZW3ggI1x5BkFx3CwYzvZqyFxHPmIdJGUhY2bJkzj2Fg6YTeeUw=', url: 'http://localhost:14412' }
  }

  it('should claim something', async function () {
    this.slow(2000)
    this.timeout(3000)
    const employeeConnector = new Ipv8Connector()
    const employerConnector = new Ipv8Connector()
    employeeConnector.configure(peers.employee.url)
    employerConnector.configure(peers.employer.url)

    const tempLink = await employeeConnector.claim(peers.employee.did, '', { timeFor: 'beer' }, peers.employer.did)
    expect(tempLink).to.eq('link:discipl:ipv8:temp:eyJ0aW1lRm9yIjoiYmVlciJ9')

    await employerConnector.claim(peers.employer.did, '', { 'eyJ0aW1lRm9yIjoiYmVlciJ9': 'link:discipl:ipv8:temp:eyJ0aW1lRm9yIjoiYmVlciJ9' }, 'approve')
    const attestedAttributes = await fetch(`${peers.employer.url}/attestation?type=attributes&mid=safeqEkAA2ouwLQ2dayMRWEfsH0%3D`).then(res => res.json()).then(res => res.shift())

    expect(attestedAttributes).to.have.not.ordered.members([
      'eyJ0aW1lRm9yIjoiYmVlciJ9',
      {},
      'K1ifTZ++hPN4UqU24rSc/czfYZY='
    ])
  })

  it('should get the claim of a permanent link', async function () {
    const employeeConnector = new Ipv8Connector()
    employeeConnector.configure(peers.employee.url)

    const claim = await employeeConnector.get('link:discipl:ipv8:perm:862e9a4aa832a9a9d386a2e5002f7fb863c700605ce3e82876be81a2a606275f')
    expect(claim.previous).to.eq('link:discipl:ipv8:perm:3030303030303030303030303030303030303030303030303030303030303030')
    expect(claim.data).to.eq('time_for_beer')
  })

  it('should get the claim of a temporary link', async function () {
    const employeeConnector = new Ipv8Connector()
    employeeConnector.configure(peers.employee.url)

    const claim = await employeeConnector.get('link:discipl:ipv8:temp:eyJ0aW1lRm9yIjoiYmVlciJ9')
    expect(claim.data).to.eq('{"timeFor":"beer"}')
    expect(claim.previous).to.eq(null)
  })

  it('should be able to verify an attested claim', function (done) {
    this.slow(5000)
    this.timeout(10000)
    const brewerConnector = new Ipv8Connector()
    const employeeConnector = new Ipv8Connector()
    brewerConnector.configure(peers.brewer.url)
    employeeConnector.configure(peers.employee.url)

    employeeConnector.observeVerificationRequests(peers.employee.did, { did: peers.brewer.did }).then(result => {
      const subscription = result.observable.subscribe({
        next: c => {
          employeeConnector.ipv8AttestationClient.allowVerify('eGU/YRXWJB18VQf8UbOoIhW9+xM=', c.claim.data)
          subscription.unsubscribe()
        },
        error: e => assert.fail('Error when observing:' + e.message)
      })
    })

    brewerConnector.verify(peers.employee.did, { 'approve': 'link:discipl:ipv8:perm:862e9a4aa832a9a9d386a2e5002f7fb863c700605ce3e82876be81a2a606275f' }, peers.employer.did)
      .then(link => expect(link).to.eq('link:discipl:ipv8:perm:862e9a4aa832a9a9d386a2e5002f7fb863c700605ce3e82876be81a2a606275f'))
      .then(() => done())
  })
})
