import { Ipv8DockerUtil } from '../util/ipv8docker'
import { Ipv8TrustchainClient } from '../../../src/client/Ipv8TrustchainClient'
import { expect } from 'chai'

describe('Ipv8TrustchainClient.ts', function () {
  this.beforeAll(function (done) {
    this.timeout(30000)
    Ipv8DockerUtil.startIpv8Container()
      .then(() => Ipv8DockerUtil.waitForContainersToBeReady().then(() => done()))
  })

  this.afterAll(function (done) {
    Ipv8DockerUtil.killIpv8Container().then(() => done())
  })

  let trustchainClient: Ipv8TrustchainClient

  beforeEach(function () {
    trustchainClient = new Ipv8TrustchainClient('http://localhost:14410')
  })

  it('should get all trustchain blocks', async function () {
    const res = await trustchainClient.getBlocksForUser('4c69624e61434c504b3af03ca11c46e49d5ffc979078a138282d2eef1ca1ce69e0c4271e888f66c8d73c93ccab1d7b89e07fd044dbb234067c4d5be986a44f350bf870fe79f448c51eee')

    expect(res.length).to.eq(1)
    expect(res.pop().hash).to.eq('862e9a4aa832a9a9d386a2e5002f7fb863c700605ce3e82876be81a2a606275f')
  })

  it('should get the specified block from the trustchain', async function () {
    const res = await trustchainClient.getBlock('862e9a4aa832a9a9d386a2e5002f7fb863c700605ce3e82876be81a2a606275f')

    expect(res.hash).to.eq('862e9a4aa832a9a9d386a2e5002f7fb863c700605ce3e82876be81a2a606275f')
    expect(res.previous_hash).to.eq('3030303030303030303030303030303030303030303030303030303030303030')
  })
})
