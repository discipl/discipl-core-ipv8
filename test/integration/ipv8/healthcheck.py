import sys
import requests
import json 

try:
    peers_request0 = requests.get('http://localhost:14410/attestation?type=peers')
    peers_request1 = requests.get('http://localhost:14411/attestation?type=peers')
    peers_request2 = requests.get('http://localhost:14412/attestation?type=peers')
    attributes_request = requests.get('http://localhost:14410/attestation?type=attributes')

    if peers_request0.status_code != 200 or attributes_request.status_code != 200:
        exit(1)

    if peers_request1.status_code != 200:
        exit(1)

    if peers_request2.status_code != 200:
        exit(1)

    peers0 = json.loads(peers_request0.text)
    peers1 = json.loads(peers_request1.text)
    peers2 = json.loads(peers_request2.text)

    if 'K1ifTZ++hPN4UqU24rSc/czfYZY=' not in peers0 or 'eGU/YRXWJB18VQf8UbOoIhW9+xM=' not in peers0:
        exit(1)

    if 'safeqEkAA2ouwLQ2dayMRWEfsH0=' not in peers1 or 'eGU/YRXWJB18VQf8UbOoIhW9+xM=' not in peers1:
        exit(1)

    if 'safeqEkAA2ouwLQ2dayMRWEfsH0=' not in peers2 or 'K1ifTZ++hPN4UqU24rSc/czfYZY=' not in peers2:
        exit(1)

    attributes = json.loads(attributes_request.text)[0]

    if attributes[0] != 'time_for_beer':
        exit(1)

except:
    exit(1)
