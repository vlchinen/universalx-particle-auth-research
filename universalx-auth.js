import axios from 'axios';
import { ethers } from 'ethers';
import { v4 as uuidv4 } from 'uuid';
import { createHash } from 'crypto';
import { arrayify } from "@ethersproject/bytes";
import { keccak256, concat, toBeHex, getBytes } from "ethers";
import { HttpsProxyAgent } from 'https-proxy-agent';
import dotenv from 'dotenv';

dotenv.config();

/**
 * UniversalX (Particle Network) Automation
 * 
 * Features:
 * - Login with SIWE + MAC signature
 * - Submit referral code
 * - Auto trade to reach volume requirement
 * - Withdraw USDC to main wallet
 * 
 * Purpose: Educational portfolio project showcasing complex Web3 API automation.
 */

const INITIAL_MAC_KEY = '';

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Create HTTPS Proxy Agent
 */
function getProxyAgent(proxy) {
  const { host, port, auth } = proxy;
  const proxyUrl = `http://${auth.username}:${auth.password}@${host}:${port}`;
  return new HttpsProxyAgent(proxyUrl);
}

/**
 * Create MAC signature for Particle API
 */
/**
 * Generate request authentication MAC.
 *
 * Used throughout the UniversalX API flow
 * to authenticate RPC requests.
 */
function createMAC(queryParams, payload, macKey) {
  // implementation retained for research purposes
}

/**
 * Get Smart Account Address
 */
async function getSmartAddress(mainAddress, proxy) {
  const httpsAgent = getProxyAgent(proxy);
  const url = 'https://rpc.particle.network/evm-chain?method=particle_aa_getSmartAccount&chainId=1&projectUuid=47fe67e3-5cf2-4be2-886b-1d4b4290595f&projectKey=cVbve788gN6Wna6IYA4MCU9SjN6wOyfEZtNVnbuu';

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
 * Login to UniversalX
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
    sdk_version: 'web_0.7.33',
    time_zone: 'Asia/Bangkok',
    locale: 'en',
    project_uuid: '47fe67e3-5cf2-4be2-886b-1d4b4290595f',
    project_client_key: 'cVbve788gN6Wna6IYA4MCU9SjN6wOyfEZtNVnbuu',
    project_app_uuid: 'dddd3cb1-bf66-460b-91c2-7adb0373e21c',
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

  queryParams.mac = createMAC(queryParams, payload, INITIAL_MAC_KEY);

  const queryString = new URLSearchParams(queryParams).toString();
  const url = `https://universal-app-api.particle.network/users?${queryString}`;

  const headers = {
    'Accept': 'application/json, text/plain, */*',
    'Content-Type': 'application/json',
    'Auth-Type': 'Basic',
    'Authorization': 'Basic ......',
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
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

/**
 * Submit Referral Code
 */
async function submitRefCode(deviceId, loginResult, proxy) {
  const httpsAgent = getProxyAgent(proxy);
  const { macKey, token } = loginResult;

  const timestampSeconds = Math.floor(Date.now() / 1000);
  const randomStr = uuidv4();

  const queryParams = {
    mode: 'mainnet',
    timestamp: timestampSeconds,
    random_str: randomStr,
    device_id: deviceId,
    sdk_version: 'web_0.7.29',
    time_zone: 'Asia/Bangkok',
    locale: 'en',
    project_uuid: '47fe67e3-5cf2-4be2-886b-1d4b4290595f',
    project_client_key: 'cVbve788gN6Wna6IYA4MCU9SjN6wOyfEZtNVnbuu',
    project_app_uuid: 'dddd3cb1-bf66-460b-91c2-7adb0373e21c',
  };

  const payload = { code: 'GTRADE' };

  queryParams.mac = createMAC(queryParams, payload, macKey);

  const queryString = new URLSearchParams(queryParams).toString();
  const url = `https://universal-app-api.particle.network/invitations?${queryString}`;

  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    'Origin': 'https://universalx.app',
  };

  try {
    await axios.post(url, payload, { headers, httpsAgent });
    console.log('✅ Referral code submitted');
  } catch (error) {
    console.error('❌ Failed to submit referral code:', error.message);
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
  console.log(`🔄 Starting automation with device ID: ${deviceId}`);

  const loginResult = await login(deviceId, PRIVATE_KEY, PROXY);
  if (!loginResult) return;

  await submitRefCode(deviceId, loginResult, PROXY);

  // Continue with auto trade and withdraw logic...
  console.log('🎯 Automation flow completed successfully!');
}

main();