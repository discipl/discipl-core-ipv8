const CryptoJS = require('crypto-js')
const BaseConnector = require('discipl-core-baseconnector')
const querystring = require('querystring')
const rp = require('request-promise-native')

module.exports = class ipv8Connector extends BaseConnector {

  constructor() {
    super()
    this.ipv8ServiceURL = 'http://localhost:8086/attestation'
  }

  configure(connectionSettings) {
    this.ipv8ServiceURL = connectionSettings.url
  }

  async makeIPV8Request(query) {
    let postTypes = ['request','attest','verify']
    let method = 'GET'
    if(postTypes.includes(query.type)) {
      method = 'POST'
    }
    let options = {
      method : method,
      uri : this.ipv8ServiceURL,
      qs : query,
      json : true
    }
    return await rp(options)
  }

  getName() {
    return "ipv8"
  }

  async getSsidOfClaim(reference) {
      return null
  }

  async getLatestClaim(ssid) {
    return null
  }

  async newSsid() {
    return {'pubkey':null, 'privkey':null}
  }

  async claim(ssid, data) {
    let dlay = async ms => new Promise(resolve => setTimeout(resolve, ms))
    let name = Object.keys(data)[0]
    let mid = ssid.pubkey
    let value = data[name]
    if(name == 'needAttest') {
      await this.makeIPV8Request({attribute_name:value, type:'request', mid:mid})
    } else {
      let b64value = CryptoJS.enc.Base64.stringify(CryptoJS.enc.Utf8.parse(JSON.stringify(value)))
      await this.makeIPV8Request({attribute_name:name, type:'attest', attribute_value:b64value, mid:mid})
      await dlay(2000) // wait a little now
      return name
    }
    return null
  }

  async get(reference, ssid = null) {
    let getTypes = ['peers','outstanding','attributes','verification_output']
    let type = reference
    let qs = null
    let data = null
    if(getTypes.includes(type)) {
      qs = {type:type}
      if(type == 'attributes' && ssid != null) {
        qs['mid'] = ssid
      }
      data = await this.makeIPV8Request(qs)
    } else {
      let attributes = await this.get('attributes', ssid)
      if(attributes.data) {
        for(let attr in attributes.data) {
          if(attributes.data[attr][0] == reference) {
            data = attributes.data[attr][1]
            break
          }
        }
      }
    }
    return {'data':data, 'previous':null}
  }

  async verify(ssid, data) {
    let result = null
    let reference = Object.keys(data)[0]
    let mid = ssid.pubkey
    let response = await this.get(reference, mid)
    let hash = response.data
    let values = data[reference]
    let b64values = CryptoJS.enc.Base64.stringify(CryptoJS.enc.Utf8.parse(JSON.stringify(values)))
    await this.makeIPV8Request({attribute_values:b64values, type:'verify', mid:mid, attribute_hash:hash})
    let dlay = ms => new Promise(resolve => setTimeout(resolve, ms))
    do {
      await dlay(4000) // wait a little
      result = await this.get('verification_output')
    } while(result.data == null || result.data.length == 0)
    if(result.data[hash][0][1] > 0.999) {
      return true
    }
    return false
  }

  async subscribe(ssid) {
    return null
  }

}
