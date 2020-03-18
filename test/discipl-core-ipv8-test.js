// let vows = require('vows')
// let assert = require('assert')
// let ipv8Connector = require('../index.js')
// let connector = new ipv8Connector()
// var tmpSsid = null
// var attest_id = null

// let suite = vows.describe('discipl-core-ipv8').addBatch({
//   'getName() ' : {
//     topic : 'ipv8',
//     ' returns "ipv8"' : function (topic) {
//       assert.equal(connector.getName(), topic)
//       tmpSsid = null
//     },
//     ' and default ipv8 service URL is set ' : function (topic) {
//       assert.equal(connector.ipv8ServiceURL, 'http://localhost:8086/attestation')
//     }
//   }}).addBatch({
//   'newSsid()' : {
//     topic : function () {
//       vows = this
//       connector.newSsid().then(function (res) {
//         tmpSsid = res
//         vows.callback(null, res)
//       }).catch(function (err) {
//         vows.callback(err, null)
//       })
//     },
//     ' returns a proper ssid object though with empty keys' : function (err, ssid) {
//         assert.equal(err, null)
//         assert.equal(ssid.pubkey, null)
//         assert.equal(ssid.privkey, null)
//     }
//   }}).addBatch({
//   'get() without arguments' : {
//     topic : function () {
//       vows = this
//       connector.get().then(function (res) {
//         vows.callback(null, res)
//       }).catch(function (err) {
//         vows.callback(err, null)
//       })
//     },
//     ' returns a result object with both data as previous null as the current target peer does not have any attributes yet' : function (err, res) {
//         assert.equal(err, null)
//         assert.equal(res.data, null)
//         assert.equal(res.previous, null)
//     }
//   }}).addBatch({
//   'get(peers) ' : {
//     topic : function () {
//       vows = this
//       connector.get('peers').then(function (res) {
//         if(res.data[0] != 'rZvL7BqYKKrnbdsWfRDk1DMTtG0=') { // ignore this peer
//           tmpSsid.pubkey = res.data[0] // set attester mid in tmpSsid
//         } else {
//           tmpSsid.pubkey = res.data[1]
//         }
//         console.log('Attester mid: '+tmpSsid.pubkey)
//         vows.callback(null, res)
//       }).catch(function (err) {
//         vows.callback(err, null)
//       })
//     },
//     ' returns a result object withprevious null and some peer mids as data ' : function (err, res) {
//         assert.equal(err, null)
//         assert.equal(res.data.length > 1, true)
//         console.log(res.data)
//         assert.equal(res.previous, null)
//     }
//   }}).addBatch({
//   'claim(needAttest) and subsequent attester : get(outstanding)' : {
//     topic : function () {
//       vows = this
//       connector.claim(tmpSsid, {'needAttest':'isAllowedBeer'}).then(function (res) {
//         connector.configure({
//         url : 'http://localhost:8087/attestation'
//         })
//         connector.get('outstanding', tmpSsid.pubkey).then(function (res) {
//           vows.callback(null, res)
//         })
//       }).catch(function (err) {
//         vows.callback(err, null)
//       })
//     },
//     ' returns pending request' : function (err, res) {
//         assert.equal(err, null)
//         console.log(JSON.stringify(res))
//         assert.equal(res.data[0][1], 'isAllowedBeer')
//         attest_id = tmpSsid.pubkey
//         tmpSsid.pubkey = res.data[0][0] // tmpSsid is owner mid now
//     }
//   }}).addBatch({
//   'attester : claim(owner_mid, {isAllowedBeer:0%-only}) and subsequent get(attribute isAllowedBeer, owner_mid)' : {
//     topic : function () {
//       vows = this
//       connector.claim(tmpSsid, {'isAllowedBeer':'0%-only'}).then(function (res) {
//         connector.get(res, tmpSsid.pubkey).then(function (res) {
//           vows.callback(null, res)
//         }).catch(function (err) {
//           vows.callback(err, null)
//         })
//       }).catch(function (err) {
//         vows.callback(err, null)
//       })
//     },
//     ' returns a reference to the attribute with the hash (proof) ' : function (err, response) {
//         assert.equal(err, null)
//         assert.notEqual(response, null)
//         assert.notEqual(response, '')
//         console.log('proof: '+response)
//     }
//   }}).addBatch({
//   'verifier : verify {isAllowedBeer:0%-only} success' : {
//     topic : function () {
//       vows = this
//       connector.configure({url:'http://localhost:8088/attestation'})
//       connector.verify(tmpSsid, {'isAllowedBeer':'0%-only'}).then(function (res) {
//         vows.callback(null, res)
//       }).catch(function (err) {
//         vows.callback(err, null)
//       })
//     },
//     ' returns true' : function (err, res) {
//         assert.equal(err, null)
//         assert.equal(res, true)
//     }
//   }}).addBatch({
//   'verifier : verify {isAllowedBeer:yes} fail' : {
//     topic : function () {
//       vows = this
//       connector.configure({url:'http://localhost:8088/attestation'})
//       connector.verify(tmpSsid, {'isAllowedBeer':'yes'}).then(function (res) {
//         vows.callback(null, res)
//       }).catch(function (err) {
//         vows.callback(err, null)
//       })
//     },
//     ' returns false' : function (err, res) {
//         assert.equal(err, null)
//         assert.equal(res, false)
//     }
//   }}).addBatch({
//   'claim(needAttest) and subsequent attester : get(outstanding) (2)' : {
//     topic : function () {
//       vows = this
//       connector.configure({url:'http://localhost:8086/attestation'})
//       tmpSsid.pubkey = attest_id
//       connector.claim(tmpSsid, {'needAttest':'isAllowedBeer'}).then(function (res) {
//         connector.configure({
//         url : 'http://localhost:8087/attestation'
//         })
//         connector.get('outstanding', tmpSsid.pubkey).then(function (res) {
//           vows.callback(null, res)
//         })
//       }).catch(function (err) {
//         vows.callback(err, null)
//       })
//     },
//     ' returns pending request' : function (err, res) {
//         assert.equal(err, null)
//         console.log(JSON.stringify(res))
//         assert.equal(res.data[0][1], 'isAllowedBeer')
//         attest_id = tmpSsid.pubkey
//         tmpSsid.pubkey = res.data[0][0] // tmpSsid is owner mid now
//     }
//   }}).addBatch({
//   'attester : claim(owner_mid, {isAllowedBeer:yes}) and subsequent get(attribute isAllowedBeer, owner_mid) (2)' : {
//     topic : function () {
//       vows = this
//       connector.configure({url:'http://localhost:8087/attestation'})
//       connector.claim(tmpSsid, {'isAllowedBeer':'yes'}).then(function (res) {
//         connector.get(res, tmpSsid.pubkey).then(function (res) {
//           vows.callback(null, res)
//         })
//       }).catch(function (err) {
//         vows.callback(err, null)
//       })
//     },
//     ' returns a reference to the attribute with the hash (proof) ' : function (err, response) {
//       assert.equal(err, null)
//       assert.notEqual(response, null)
//       assert.notEqual(response, '')
//       console.log('proof: '+response)
//     }
//   }}).addBatch({
//   'getLatestClaim()' : {
//     topic : function () {
//       vows = this
//       connector.getLatestClaim(tmpSsid).then(function (res) {
//         vows.callback(null, res)
//       }).catch(function (err) {
//         vows.callback(err, null)
//       })
//     },
//     ' returns null' : function (err, res) {
//         assert.equal(err, null)
//         assert.equal(res, null)
//     }
//   }}).addBatch({
//   'verifier : verify {isAllowedBeer:0%-only} fail' : {
//     topic : function () {
//       vows = this
//       connector.configure({url:'http://localhost:8088/attestation'})
//       connector.verify(tmpSsid, {'isAllowedBeer':'0%-only'}).then(function (res) {
//         vows.callback(null, res)
//       }).catch(function (err) {
//         vows.callback(err, null)
//       })
//     },
//     ' returns false' : function (err, res) {
//         assert.equal(err, null)
//         assert.equal(res, false)
//     }
//   }}).addBatch({
//   'verifier : verify {isAllowedBeer:yes} success' : {
//     topic : function () {
//       vows = this
//       connector.configure({url:'http://localhost:8088/attestation'})
//       connector.verify(tmpSsid, {'isAllowedBeer':'yes'}).then(function (res) {
//         vows.callback(null, res)
//       }).catch(function (err) {
//         vows.callback(err, null)
//       })
//     },
//     ' returns true' : function (err, res) {
//         assert.equal(err, null)
//         assert.equal(res, true)
//     }
//   }}).export(module)
