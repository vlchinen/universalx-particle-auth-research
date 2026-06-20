# UniversalX Smart Account Analysis

## Objective

Research the Smart Account generation mechanism used by UniversalX through
Particle Network Account Abstraction infrastructure.

The investigation focuses on the relationship between:

- EVM wallet ownership
- Particle Network Smart Account derivation
- UniversalX authentication flow
- Account abstraction architecture


## Smart Account Flow

The authentication process does not directly authenticate the user's EVM
externally owned account.

Instead, UniversalX derives a Smart Account address from the original wallet.

Flow:

EVM Wallet Address
|
v
Particle Network RPC
|
v
particle_aa_getSmartAccount
|
v
Universal Smart Account Address
|
v
SIWE Message Signing
|
v
UniversalX Authentication


## Observed Implementation

The prototype uses Particle Network RPC endpoint:

- particle_aa_getSmartAccount

Input parameters:

- ownerAddress
- Smart Account name
- Smart Account version

Example configuration:

- Name: UNIVERSAL
- Version: 1.0.3


## Research Findings

The authentication process requires:

- Original EVM wallet private key
- Derived Smart Account address
- Signed authentication message
- Particle API MAC signature


The Smart Account acts as the application-level identity while ownership
is proven through the connected EVM wallet signature.


## Technical Challenges

Main challenges:

- Understanding Particle Network Account Abstraction flow
- Reconstructing Smart Account derivation requests
- Reverse engineering API authentication headers
- Understanding MAC signature generation


## Conclusion

UniversalX authentication combines traditional wallet signatures with
Account Abstraction infrastructure.

The wallet address provides ownership verification while the Smart Account
provides the application identity used by UniversalX.