# Trustchain VS attestation attributes
De data die wordt weergegeven in de trustchain is verglijkbaar met die van de attestation output.

_trustchain_
```json
{
    "blocks": [
        {
            "transaction": {
                "hash": "Q©Ú¿~ÝEðJHçwÏtõ"
            },
            "public_key": "4c69624e61434c504b3abf517cb0012177e1267c2b802b5efa3948ead2ec61b26cbffc07d362c79edf1b2e7923d380b872613cd7d890dd86a14b069479c6f7bdde166fd9acf8b9c74a95"
        }
    ]
}

```
_attestation_
```json
[
    [
        "attribute_name",
        "Uanav37dikWT8EpI5493z5aAdPU=", // same as the transaction "hash", only ISO8859-1 and base64 encoded
        {},
        "PpzMr2mxieH+MhdhXdd6yqPcAiY=" // same as "public_key", only b64encode(sha1(b.link_public_key).digest()).decode('utf-8'))
    ]
]
```