import sys
import requests
import json 

try:
    peers_request = requests.get('http://localhost:14410/attestation?type=peers')
    attributes_request = requests.get('http://localhost:14410/attestation?type=attributes')

    if peers_request.status_code != 200 or attributes_request.status_code != 200:
        exit(1)

    peers = json.loads(peers_request.text)

    if 'K1ifTZ++hPN4UqU24rSc/czfYZY=' not in peers or 'eGU/YRXWJB18VQf8UbOoIhW9+xM=' not in peers:
        exit(1)

    attributes = json.loads(attributes_request.text)[0]

    if attributes[0] != 'time_for_beer':
        exit(1)

except:
    exit(1)
