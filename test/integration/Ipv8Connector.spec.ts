import { expect, assert, use } from 'chai'
import chaiAsPromised from 'chai-as-promised'
import { Ipv8DockerUtil } from './util/ipv8docker'
import Ipv8Connector from '../../src/Ipv8Connector'
use(chaiAsPromised)

describe('Ipv8Connector.ts', function () {
  this.beforeAll(function (done) {
    this.timeout(120000)

    Ipv8DockerUtil.startIpv8Container()
      .then(() => Ipv8DockerUtil.waitForContainersToBeReady())
      .then(() => done())
      .catch(e => assert.fail(e))
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

    const claim = await employeeConnector.get('link:discipl:ipv8:perm:4145d2dc63874fe601b8d8cd3efbfd07edff1a04eadee019be2490505ad4ec26')
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

  it('should get the did of the owner of a claim', async function () {
    const employeeConnector = new Ipv8Connector()
    employeeConnector.configure(peers.employee.url)

    const did = await employeeConnector.getDidOfClaim('link:discipl:ipv8:perm:4145d2dc63874fe601b8d8cd3efbfd07edff1a04eadee019be2490505ad4ec26')
    expect(did).to.eq(peers.employee.did)
  })

  it('should be able to verify an attested claim', function (done) {
    this.slow(5000)
    this.timeout(10000)
    const brewerConnector = new Ipv8Connector()
    const employeeConnector = new Ipv8Connector()
    brewerConnector.configure(peers.brewer.url)
    employeeConnector.configure(peers.employee.url)

    employeeConnector.observeVerificationRequests(peers.employee.did, { did: peers.brewer.did })
      .then(result => {
        assert.isFulfilled(result.readyPromise, "The 'readyPromise' was not fullfilled")
        return result
      })
      .then(result => {
        const subscription = result.observable.subscribe({
          next: c => {
            employeeConnector.ipv8AttestationClient.allowVerify('eGU/YRXWJB18VQf8UbOoIhW9+xM=', c.claim.data)
            subscription.unsubscribe()
          },
          error: e => assert.fail('Error when observing:' + e.message)
        })
      })

    brewerConnector.verify(peers.employer.did, { 'approve': 'link:discipl:ipv8:perm:4145d2dc63874fe601b8d8cd3efbfd07edff1a04eadee019be2490505ad4ec26' }, peers.employer.did)
      .then(link => expect(link).to.eq('link:discipl:ipv8:perm:4145d2dc63874fe601b8d8cd3efbfd07edff1a04eadee019be2490505ad4ec26'))
      .then(() => done())
  })
})
