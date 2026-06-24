import axios from 'axios';
import { ethers } from 'ethers';
import { v4 as uuidv4 } from 'uuid';
import { HttpsProxyAgent } from 'https-proxy-agent';
import dotenv from 'dotenv';

dotenv.config();

/**
 * UniversalX (Particle Network) Authentication Flow — Reference Implementation
 *
 * Demonstrates the structure of UniversalX's authentication flow:
 * - Resolve a Particle Network Smart Account from an EVM wallet address
 * - Sign a SIWE-style message proving wallet ownership
 * - Exchange the signed payload for an authenticated session
 *
 * Project identifiers, MAC signature generation, and live endpoints have
 * been replaced with placeholders / removed — this file illustrates the
 * workflow shape, not a working, drop-in client.
 *
 * Purpose: Educational portfolio project showcasing Web3 API automation patterns.
 */

const PARTICLE_RPC_BASE = process.env.PARTICLE_RPC_URL || 'https://rpc.particle.network/evm-chain';
const UNIVERSALX_API_BASE = process.env.UNIVERSALX_API_URL || 'https://universal-app-api.example.com';

const PROJECT_CONFIG = {
  uuid: process.env.PROJECT_UUID || '<project-uuid>',
  clientKey: process.env.PROJECT_CLIENT_KEY || '<project-client-key>',
  appUuid: process.env.PROJECT_APP_UUID || '<project-app-uuid>',
};

/**
 * Create HTTPS Proxy Agent
 */
function getProxyAgent(proxy) {
  const { host, port, auth } = proxy;
  const proxyUrl = `http://${auth.username}:${auth.password}@${host}:${port}`;
  return new HttpsProxyAgent(proxyUrl);
}

/**
 * Generate request authentication MAC.
 *
 * The real implementation signs sorted query params + payload with a
 * session-scoped MAC key (SHA256-based). Intentionally omitted here —
 * see docs/01-authentication-flow.md for the conceptual structure.
 */
function createMAC(queryParams, payload, macKey) {
  throw new Error('Not implemented in this reference version — see docs for the conceptual flow.');
}

/**
 * Resolve the Particle Network Smart Account address for a given EVM wallet.
 */
async function getSmartAddress(mainAddress, proxy) {
  const httpsAgent = getProxyAgent(proxy);
  const url = `${PARTICLE_RPC_BASE}?method=particle_aa_getSmartAccount&chainId=1&projectUuid=${PROJECT_CONFIG.uuid}&projectKey=${PROJECT_CONFIG.clientKey}`;

  const payload = {
    method: 'particle_aa_getSmartAccount',
    id: Date.now(),
    jsonrpc: '2.0',
    params: [{ name: 'UNIVERSAL', ownerAddress: mainAddress, version: '1.0.3' }],
  };

  try {
    const response = await axios.post(url, payload, { headers: { 'Content-Type': 'application/json' }, httpsAgent });
    return response.data.result[0].smartAccountAddress;
  } catch (error) {
    console.error('❌ Failed to get Smart Account Address:', error.message);
    return null;
  }
}

/**
 * Authenticate with UniversalX using a SIWE-style signed message.
 *
 * Note: createMAC() is not implemented here, so this function illustrates
 * the request shape rather than producing a valid authenticated session.
 */
async function login(deviceId, privateKey, proxy) {
  const wallet = new ethers.Wallet(privateKey);
  const httpsAgent = getProxyAgent(proxy);

  const timestampSeconds = Math.floor(Date.now() / 1000);
  const nonce = Date.now();
  const randomStr = uuidv4();

  const queryParams = {
    mode: 'mainnet',
    timestamp: timestampSeconds,
    random_str: randomStr,
    device_id: deviceId,
    time_zone: 'Asia/Bangkok',
    locale: 'en',
    project_uuid: PROJECT_CONFIG.uuid,
    project_client_key: PROJECT_CONFIG.clientKey,
    project_app_uuid: PROJECT_CONFIG.appUuid,
  };

  const smartAddress = await getSmartAddress(wallet.address, proxy);
  if (!smartAddress) return null;

  const message = `Welcome to UniversalX!
Click to sign up or log in to the dApp.

This request will not trigger a blockchain transaction or cost any gas fees.

UniversalX address:
${smartAddress}

Nonce:
${nonce}

Device ID:
${deviceId}`;

  const signature = await wallet.signMessage(message);

  const payload = {
    loginType: 'evm',
    signature,
    smartAccountOptions: { name: 'UNIVERSAL', ownerAddress: wallet.address, version: '1.0.3' },
    timestamp: nonce,
  };

  // MAC generation intentionally not implemented — see disclaimer above.
  queryParams.mac = createMAC(queryParams, payload, '<mac-key>');

  const queryString = new URLSearchParams(queryParams).toString();
  const url = `${UNIVERSALX_API_BASE}/users?${queryString}`;

  const headers = {
    'Accept': 'application/json, text/plain, */*',
    'Content-Type': 'application/json',
    'Origin': 'https://universalx.app',
    'Referer': 'https://universalx.app/',
  };

  try {
    const response = await axios.post(url, payload, { headers, httpsAgent });
    console.log('✅ Login successful');
    return response.data;
  } catch (error) {
    console.error('❌ Login failed:', error.message);
    return null;
  }
}

async function main() {
  const PRIVATE_KEY = process.env.PRIVATE_KEY;
  const PROXY = { /* your proxy object */ };

  if (!PRIVATE_KEY) {
    console.error('❌ PRIVATE_KEY is required in .env');
    return;
  }

  const deviceId = uuidv4();
  console.log(`🔄 Starting authentication flow with device ID: ${deviceId}`);

  const loginResult = await login(deviceId, PRIVATE_KEY, PROXY);
  if (!loginResult) return;

  console.log('🎯 Flow completed.');
}

main();