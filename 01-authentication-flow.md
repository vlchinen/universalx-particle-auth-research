# API Observations


## Authentication Request Structure

Observed API requests contain:

- Query parameters
- Device identifier
- Timestamp
- Random request value
- Project identifiers
- MAC signature


## MAC Authentication

Requests are signed by generating a SHA256 hash
from sorted request parameters and payload data.


General structure:

Request Data

+

MAC Key

|

v

Sorted Payload

|

v

SHA256 Hash

|

v

MAC Signature



## Purpose

The MAC layer provides additional request
validation beyond normal wallet signature
authentication.


## Findings

The authentication flow combines:

- Cryptographic wallet ownership proof
- Application session validation
- Request integrity verification