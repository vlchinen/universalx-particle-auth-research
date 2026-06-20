# UniversalX Authentication Flow Notes


## Objective

Analyze how UniversalX authenticates an EVM wallet
and establishes an authenticated application session.


## Flow Overview


### 1. Wallet Initialization

The process starts with an EVM wallet address.

The wallet is used as the owner identity for
Particle Network Smart Account generation.


### 2. Smart Account Resolution

The application requests a Smart Account address
based on:

- Owner wallet address
- Smart Account name
- Version information


The Smart Account acts as the application-level
wallet identity.


### 3. SIWE Authentication

A structured message is generated containing:

- Smart Account address
- Nonce
- Device identifier
- Authentication statement


The message is signed using the EVM private key.


### 4. API Authentication

The signed payload is submitted together with:

- Timestamp
- Device ID
- Project identifiers
- MAC signature


The backend validates the request before creating
an authenticated session.


## Conclusion

UniversalX combines traditional wallet signature
authentication with account abstraction infrastructure.