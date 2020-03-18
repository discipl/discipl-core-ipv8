# Example attestation flow
The following steps describe a fictional situation between a bank, a customer and the CJIB (Central Judicial Collection Agency, or dutch: Centraal Jusitieel Incossobureau). The customer wants to apply for a loan and needs prove that he has no debts. The JIB can give the prove and the bank will be able to verify this.

## Customer asks for prove of no debt
The first communication is between the customer and the CJIB.

### 0 - Initial setup
Both peers (the customer and CJIB) can see each other in the attestation network. They are identified as:

_customer_
```
t2l+ESHvaYsz8psxv5u+GpBA9e0=
```
_cjib_
```
0Jwy2oSmkJFmR22MexNzZW7bSus=
```

Since we will use HTTP calls and characters like `=` and `+` are special characters, the identifiers must be urlencoded.

_customer (urlencoded)_
```
t2l%2BESHvaYsz8psxv5u%2BGpBA9e0%3D
```
_cjib (urlencoded)_
```
0Jwy2oSmkJFmR22MexNzZW7bSus%3D
```
### 1 - Ask for attestation
The customer asks the CJIB to confirm he has no debts, so it asks _attestation_ for the claim `i_have_no_debt`.

```
POST http://localhost:14410/attestation?type=request&mid=0Jwy2oSmkJFmR22MexNzZW7bSus%3D&attribute_name=i_have_no_debt
```

### 2 - CJIB attests the claim
The CJIB will attest the claim with a value, in this case `approved`.

The value needs to be both base64 and urlencoded. So it will be `YXBwcm92ZWQ%3D%0A`
```
http://localhost:14411/attestation?type=attest&mid=aQVwz9aRMRypGwBkaxGRSdQs80c%3D&attribute_name=i_have_no_debt&attribute_value=YXBwcm92ZWQ%3D%0A
```

### 3 - Customer receives claim
The CJIB now confirmed the claim `i_have_no_debt` with the value `approved`.

```json
GET http://localhost:14410/attestation?type=attributes

[
    [
        "i_have_no_debt", // attribute
        "hdi3G02DnQyIHSswGNEgB6ciBTA=", // hash
        {},
        "0Jwy2oSmkJFmR22MexNzZW7bSus=" // attestor
    ]
]
```

## Bank asks for prove of no debt
With the attested claim `i_have_no_debt` the customer can now apply by the bank. The bank will ask the customer if he has a `i_have_no_debt` claim attested the CJIB.

### 0 - Initial setup
Both peers (the bank and customer) can see each other in the attestation network. They are identified as:

_bank (urlencoded)_
```
t2l%2BESHvaYsz8psxv5u%2BGpBA9e0%3D
```
_cjib (urlencoded)_
```
P0hSobcH%2B%2BeiGT6Hhl6xqSN%2BKQ0%3D
```

### 1 - Bank asks for verification
The bank asks the customer for prove of no debt.

```json
// http://localhost:14412/attestation?type=verification_output

{
    "5Sg2iYByO+cwUhB370coTmcR36Y=": [
        [
            "YXBwcm92ZWQ=",
            0.9999847412109375
        ]
    ]
}
```
_This step must be taken in between 10 seconds of the last step_
```
http://localhost:14410/attestation?type=allow_verify&mid=P0hSobcH%2B%2BeiGT6Hhl6xqSN%2BKQ0%3D&attribute_name=i_have_no_debt
```

### Step 3 - Bank has verification
The bank has now verification that the customer has a claim `i_have_no_debt` with the corresponding value `approved`.

```json
// http://localhost:14412/attestation?type=verification_output

{
    "5Sg2iYByO+cwUhB370coTmcR36Y=": [
        [
            "YXBwcm92ZWQ=",
            0.9999847412109375
        ]
    ]
}
```