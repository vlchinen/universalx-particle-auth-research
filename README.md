# UniversalX / Particle Network Research

A breakdown of UniversalX's wallet authentication and Account Abstraction flow, documented while building automation around the platform.

## Overview

UniversalX uses Particle Network's Account Abstraction infrastructure: instead of authenticating an EVM wallet directly, the platform derives a Smart Account from the wallet and authenticates that instead. This repository documents how that flow works and what it takes to automate it.

## What This Covers

- **Authentication flow** — wallet signature → Smart Account resolution → SIWE-style signing → session creation
- **Smart Account resolution** — how a Particle Network Smart Account address is derived from an EVM wallet owner address
- **API request patterns** — request structure, MAC-based request signing (conceptual), session lifecycle

Documentation:
- `01-authentication-flow.md` — request structure and MAC authentication concept
- `02-smart-account-analysis.md` — full authentication flow walkthrough
- `03-api-observations.md` — Smart Account derivation flow and findings

## Approach

This came out of the same kind of process as my other automation projects: observe the real requests in the browser, figure out what each one needs as input, build a script attempt, and adjust based on what the API accepted or rejected. The MAC-based request signing step took the most iteration to get right.

## Reference Implementation

`universalx-auth.js` illustrates the shape of the authentication flow (Smart Account resolution → message signing → session request). Project identifiers, the MAC signature generation, and live endpoints have been replaced with placeholders or removed — this is a structural reference, not a working, drop-in client.

## High-Level Flow

```text
EVM Wallet
   │
   ▼
Smart Account Resolution (Particle Network RPC)
   │
   ▼
SIWE-style Message Signing
   │
   ▼
MAC-signed Authentication Request
   │
   ▼
Authenticated Session
```

## Excluded Components

Intentionally left out of this repository:

- MAC signature generation logic
- Project-specific credentials and identifiers
- Live API endpoints
- Any production trading/withdrawal automation built on top of this flow

These exclusions don't affect the educational value of the research — the goal here is documenting the architecture, not shipping a usable bypass tool.

## Disclaimer

This repository is provided for educational and research purposes only. No private credentials, production secrets, proprietary signing logic, or restricted infrastructure components are included.