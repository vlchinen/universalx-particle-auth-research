# UniversalX / Particle Network Research

Research project focused on analyzing and documenting the authentication, smart account, and transaction workflow used by UniversalX and Particle Network's Account Abstraction infrastructure.

## Overview

This repository contains research and implementation notes gathered while studying UniversalX's wallet authentication flow, smart account architecture, and transaction lifecycle.

The goal of this project was to better understand how modern Account Abstraction systems coordinate:

* Wallet-based authentication
* Smart Account generation
* Session authorization
* Asset management
* Transaction creation workflows

This repository serves as a technical research reference and portfolio project demonstrating Web3 infrastructure analysis and API workflow investigation.

---

## Research Scope

### Authentication Flow

Analysis of the login process used by UniversalX, including:

* Wallet signature authentication
* Device binding
* Session initialization
* Access token acquisition
* Smart Account association

Documentation:

* `01-authentication-flow.md`

---

### Smart Account Analysis

Investigation of Particle Network's Smart Account architecture and address derivation process.

Topics include:

* Smart Account discovery
* Account Abstraction integration
* Owner account relationships
* RPC interactions

Documentation:

* `02-smart-account-analysis.md`

---

### API Observations

Collection of observed API patterns and request structures used throughout the UniversalX application.

Topics include:

* Authentication endpoints
* Asset retrieval
* Transaction creation
* Request structure analysis
* Session lifecycle observations

Documentation:

* `03-api-observations.md`

---

### Workflow Automation Research

Prototype implementations demonstrating interaction with documented APIs and workflows.

Files:

* `universalx-auth.js`
* `universalx-trading-flow.js`

These files are intended to demonstrate architectural understanding and workflow orchestration rather than provide production-ready implementations.

---

## High-Level Architecture

```text
Wallet
   │
   ▼
User Signature
   │
   ▼
Authentication API
   │
   ▼
Session Initialization
   │
   ▼
Smart Account Resolution
   │
   ▼
Asset Queries
   │
   ▼
Transaction Creation
   │
   ▼
Authorization Layer
```

---

## Technologies

* Node.js
* JavaScript (ES Modules)
* Ethers.js
* Axios
* Account Abstraction
* EVM Smart Accounts
* JSON-RPC
* REST APIs

---

## Repository Structure

```text
.
├── README.md
├── 01-authentication-flow.md
├── 02-smart-account-analysis.md
├── 03-api-observations.md
├── universalx-auth.js
└── universalx-trading-flow.js
```

---

## Key Findings

* UniversalX relies on Particle Network Smart Accounts as its primary account abstraction layer.
* Authentication combines wallet ownership verification with device-specific session information.
* Smart Account resolution occurs before transaction creation.
* Transaction creation and transaction authorization are separate stages within the workflow.
* Asset management and transaction execution are coordinated through multiple API layers.

---

## Excluded Components

Certain implementation details have intentionally been excluded from the public repository.

Examples include:

* Proprietary authorization builders
* Request authentication signature generation
* Internal transaction authorization components
* Private credentials and configuration values

These exclusions are intentional and do not affect the educational value of the research material.

---

## Educational Purpose

This repository was created to document observations and improve understanding of modern Web3 infrastructure, Account Abstraction systems, and authentication workflows.

The focus is on technical research, system understanding, and software engineering exploration.

---

## Disclaimer

This repository is provided for educational and research purposes only.

No private credentials, production secrets, proprietary signing logic, or restricted infrastructure components are included.
