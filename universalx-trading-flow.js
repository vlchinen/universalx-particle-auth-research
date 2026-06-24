import axios from 'axios';
import { ethers } from 'ethers';
import { v4 as uuidv4 } from 'uuid';
import { HttpsProxyAgent } from 'https-proxy-agent';
import dotenv from 'dotenv';

dotenv.config();

/**
 * UniversalX (Particle Network) — Full Automation Flow
 *
 * End-to-end automation pipeline: login → check assets → auto-trade until
 * a volume target is reached → withdraw remaining balance → multi-send
 * deposits to multiple wallets via a custom multi-send contract.
 *
 * Project identifiers, the MAC signature generator, the authorization
 * payload builder, and live API credentials have been removed/replaced
 * with placeholders — this illustrates the workflow shape, not a working,
 * drop-in client.
 *
 * Purpose: Educational portfolio project showcasing Web3 automation patterns
 * (multi-step API orchestration, retry logic, on-chain batch transfers).
 */

const PARTICLE_RPC_BASE = process.env.PARTICLE_RPC_URL || 'https://rpc.particle.network/evm-chain';
const UNIVERSALX_API_BASE = process.env.UNIVERSALX_API_URL || 'https://universal-app-api.example.com';
const UNIVERSALX_RPC_BASE = process.env.UNIVERSALX_RPC_URL || 'https://universal-rpc.example.com';

const PROJECT_CONFIG = {
  uuid: process.env.PROJECT_UUID || '<project-uuid>',
  clientKey: process.env.PROJECT_CLIENT_KEY || '<project-client-key>',
  appUuid: process.env.PROJECT_APP_UUID || '<project-app-uuid>',
};

// Server-side API credential — never hardcode this. Loaded from env only.
const API_BASIC_AUTH = process.env.UNIVERSALX_BASIC_AUTH || '<basic-auth-not-set>';

const provider = new ethers.JsonRpcProvider(process.env.RPC_URL || '');
const walletsender = new ethers.Wallet(process.env.SENDER_PRIVATE_KEY || ethers.Wallet.createRandom().privateKey, provider);
const walletsenderaddress = walletsender.address;
const multiSendContractAddress = process.env.MULTISEND_CONTRACT_ADDRESS || '<multisend-contract-address>';
const usdcContractAddress = process.env.USDC_CONTRACT_ADDRESS || '<usdc-contract-address>';

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

function getProxyAgent(proxy) {
  const { host, port, auth } = proxy;
  const proxyUrl = `http://${auth.username}:${auth.password}@${host}:${port}`;
  return new HttpsProxyAgent(proxyUrl);
}

function getCommonHeaders(extra = {}) {
  return {
    Accept: 'application/json, text/plain, */*',
    'Content-Type': 'application/json',
    Origin: 'https://universalx.app',
    Referer: 'https://universalx.app/',
    ...extra,
  };
}

const multiSendContractABI = [
  {
    inputs: [
      { internalType: 'address payable[]', name: 'recipients', type: 'address[]' },
      { internalType: 'uint256[]', name: 'amounts', type: 'uint256[]' },
    ],
    name: 'transferMulti',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address payable', name: 'tokenAddress', type: 'address' },
      { internalType: 'address payable[]', name: 'recipients', type: 'address[]' },
      { internalType: 'uint256[]', name: 'amounts', type: 'uint256[]' },
    ],
    name: 'transferMultiToken',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
];

/**
 * Wait until the sender wallet holds enough USDC to fund a batch deposit.
 */
const getbalance = async (batchSize) => {
  const abiERC20 = [
    'function balanceOf(address owner) view returns (uint256)',
    'function decimals() view returns (uint8)',
  ];

  const balancecontract = new ethers.Contract(usdcContractAddress, abiERC20, provider);
  const decimals = await balancecontract.decimals();
  const requiredAmount = batchSize * 5.5;

  while (true) {
    try {
      const balance = await balancecontract.balanceOf(walletsenderaddress);
      const formattedBalance = Number(ethers.formatUnits(balance, decimals));

      console.log(`💰 Balance: ${formattedBalance} - Required: ${requiredAmount}`);

      if (formattedBalance >= requiredAmount) {
        console.log('✅ Enough balance, continuing...');
        return formattedBalance;
      } else {
        console.log('⏳ Insufficient USDC balance, waiting 20s before checking again...');
        await delay(20000);
      }
    } catch (error) {
      console.error('❌ Error fetching balance:', error.message);
      return null;
    }
  }
};

/**
 * Batch-deposit USDC to multiple recipient wallets via a multi-send contract.
 */
async function sendToken(recipients) {
  const multiSendContract = new ethers.Contract(multiSendContractAddress, multiSendContractABI, walletsender);
  const amount = ethers.parseUnits('5.5', 6);
  const amounts = recipients.map(() => amount);
  const gasLimit = Math.max(40000 * recipients.length, 500000);
  const gasPriceHex = await provider.send('eth_gasPrice', []);
  const gasPrice = BigInt(gasPriceHex);
  const increasedGasPrice = (gasPrice * 12n) / 10n;

  const tx = await multiSendContract.transferMultiToken(usdcContractAddress, recipients, amounts, {
    gasLimit,
    gasPrice: increasedGasPrice,
  });
  const receipt = await tx.wait();
  console.log('Token transfer successful with hash:', receipt.hash);
}

function getTimestampSeconds() {
  return Math.floor(Date.now() / 1000);
}

function getMicrosecondTimestampFromEpoch() {
  return Date.now();
}

/**
 * Request authentication helper — internal implementation omitted.
 * See docs/01-authentication-flow.md for the conceptual MAC structure.
 */
function createMAC() {
  throw new Error('Authentication helper not included in public version');
}

async function getSmartAddress(mainaddress, proxy) {
  const httpsAgent = getProxyAgent(proxy);
  const url = `${PARTICLE_RPC_BASE}?method=particle_aa_getSmartAccount&chainId=1&projectUuid=${PROJECT_CONFIG.uuid}&projectKey=${PROJECT_CONFIG.clientKey}`;

  const payload = {
    method: 'particle_aa_getSmartAccount',
    id: getMicrosecondTimestampFromEpoch(),
    jsonrpc: '2.0',
    params: [{ name: 'UNIVERSAL', ownerAddress: mainaddress, version: '1.0.3' }],
  };

  try {
    const response = await axios.post(url, payload, { headers: getCommonHeaders(), httpsAgent });
    return response.data.result[0].smartAccountAddress;
  } catch (error) {
    console.error('Error fetching Smart Account Address:', error.message);
    return null;
  }
}

async function login(deviceId, privateKey, proxy) {
  const wallet = new ethers.Wallet(privateKey);
  const httpsAgent = getProxyAgent(proxy);

  const timestampSeconds = getTimestampSeconds();
  const nonce = getMicrosecondTimestampFromEpoch();
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
  if (!smartAddress) {
    console.error('Failed to get Smart Account Address, aborting login.');
    return null;
  }

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

  const headers = getCommonHeaders({
    'Auth-Type': 'Basic',
    Authorization: `Basic ${API_BASIC_AUTH}`,
  });

  try {
    const response = await axios.post(url, payload, { headers, httpsAgent });
    return response.data;
  } catch (error) {
    console.error('Error during login:', error.message);
    if (error.response) console.error('Error details:', error.response.data);
    return null;
  }
}

async function createtrade(deviceId, wallet, macKey, bearerToken, nameassest, amount, proxy) {
  const httpsAgent = getProxyAgent(proxy);
  const timestampSeconds = getTimestampSeconds();
  const nonce = getMicrosecondTimestampFromEpoch();
  const randomStr = uuidv4();

  const queryParams = {
    method: 'universal_createTransaction',
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

  const payload = {
    deviceId,
    id: nonce,
    jsonrpc: '2.0',
    method: 'universal_createTransaction',
    params: [
      { name: 'UNIVERSAL', ownerAddress: wallet.address, version: '1.0.3' },
      {
        amount,
        assetId: nameassest,
        chainId: 10,
        options: { solanaMEVTipAmount: '', universalGas: false },
        tag: 'sell',
        usePrimaryTokens: ['usdc', 'usdt', 'sol', 'eth', 'btc', 'bnb'],
      },
    ],
    token: bearerToken,
  };

  queryParams.mac = createMAC(queryParams, payload, macKey);

  const queryString = new URLSearchParams(queryParams).toString();
  const url = `${UNIVERSALX_RPC_BASE}/?${queryString}`;

  const headers = getCommonHeaders({ Authorization: `Bearer ${bearerToken}` });

  try {
    const response = await axios.post(url, payload, { headers, httpsAgent });
    const userOps = response.data.result.feeQuotes[0].userOps;
    const userOpHashes = userOps.map(op => op.userOpHash);
    console.log(userOpHashes);
    return response.data;
  } catch (error) {
    console.error('Error calling create trade API:', error.message);
    if (error.response) console.error('Error details:', error.response.data);
    return null;
  }
}

async function getassest(deviceId, loginResult, proxy) {
  const httpsAgent = getProxyAgent(proxy);
  const { macKey, token } = loginResult;
  const timestampSeconds = getTimestampSeconds();
  const randomStr = uuidv4();

  const queryParams = {
    showAll: 'false',
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

  const payload = [];
  queryParams.mac = createMAC(queryParams, payload, macKey);

  const queryString = new URLSearchParams(queryParams).toString();
  const url = `${UNIVERSALX_API_BASE}/assets/v2?${queryString}`;

  const headers = getCommonHeaders({ Authorization: `Bearer ${token}` });

  try {
    const response = await axios.get(url, { headers, httpsAgent });
    return response.data.tokens
      .filter(t => ['USDT', 'USDC'].includes(t.token?.symbol?.toUpperCase()))
      .map(t => ({ symbol: t.token.symbol, amount: t.amount }));
  } catch (error) {
    console.error('Error fetching assets:', error.message);
    if (error.response) console.error('Error details:', error.response.data);
    return null;
  }
}

async function gettradevolume(deviceId, loginResult, proxy) {
  const httpsAgent = getProxyAgent(proxy);
  const { aaAddress, solanaAAAddress, macKey, token } = loginResult;
  const timestampSeconds = getTimestampSeconds();
  const nonce = getMicrosecondTimestampFromEpoch();
  const randomStr = uuidv4();

  const queryParams = {
    method: 'universal_getTransactionsV2',
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

  const payload = {
    deviceId,
    id: nonce,
    jsonrpc: '2.0',
    method: 'universal_getTransactionsV2',
    params: [{ sender: aaAddress, solanaSender: solanaAAAddress }, { limit: 20, page: 1 }],
    token,
  };

  queryParams.mac = createMAC(queryParams, payload, macKey);

  const queryString = new URLSearchParams(queryParams).toString();
  const url = `${UNIVERSALX_RPC_BASE}/?${queryString}`;

  const headers = getCommonHeaders({ Authorization: `Bearer ${token}` });

  try {
    const response = await axios.post(url, payload, { headers, httpsAgent });
    const transactions = response.data.result.data;

    const filteredTxs = transactions.filter(tx => {
      const tag = tx.tag?.toLowerCase();
      return tag === 'buy' || tag === 'sell';
    });

    return filteredTxs.reduce((sum, tx) => {
      const amountStr = tx.change?.amountInUSD || '0';
      const cleaned = amountStr.replace('+', '').replace('-', '');
      const amount = parseFloat(cleaned);
      return sum + (isNaN(amount) ? 0 : amount);
    }, 0);
  } catch (error) {
    console.error('Error fetching trade volume:', error.message);
    if (error.response) console.error('Error details:', error.response.data);
    return null;
  }
}

async function waitForUsdcOnly(deviceId, loginResult, proxy) {
  while (true) {
    const assets = await getassest(deviceId, loginResult, proxy);

    const usdt = assets.find(a => a.symbol === 'USDT');
    const usdc = assets.find(a => a.symbol === 'USDC');

    const usdtAmount = BigInt(usdt?.amount || '0x00');
    const usdcAmount = BigInt(usdc?.amount || '0x00');

    if (usdtAmount === 0n && usdcAmount > 0n) {
      return { symbol: 'usdc', amount: usdc.amount };
    }

    await delay(10000);
  }
}

async function createwithdraw(deviceId, wallet, result, loginResult, proxy) {
  const httpsAgent = getProxyAgent(proxy);
  const { symbol, amount } = result;
  const { macKey, token } = loginResult;

  const timestampSeconds = getTimestampSeconds();
  const nonce = getMicrosecondTimestampFromEpoch();
  const randomStr = uuidv4();

  const queryParams = {
    method: 'universal_createTransaction',
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

  const payload = {
    deviceId,
    id: nonce,
    jsonrpc: '2.0',
    method: 'universal_createTransaction',
    params: [
      { name: 'UNIVERSAL', ownerAddress: wallet.address, version: '1.0.3' },
      {
        assetTokens: [{ assetId: symbol, amount }],
        chainId: 10,
        receiver: walletsenderaddress,
        tag: 'transfer_v2',
        usePrimaryTokens: ['usdc', 'usdt', 'sol', 'eth', 'btc', 'bnb'],
      },
    ],
    token,
  };

  queryParams.mac = createMAC(queryParams, payload, macKey);

  const queryString = new URLSearchParams(queryParams).toString();
  const url = `${UNIVERSALX_RPC_BASE}/?${queryString}`;

  const headers = getCommonHeaders({ Authorization: `Bearer ${token}` });

  try {
    const response = await axios.post(url, payload, { headers, httpsAgent });
    const userOps = response.data.result.feeQuotes[0].userOps;
    const userOpHashes = userOps.map(op => op.userOpHash);
    console.log(userOpHashes);
    return response.data;
  } catch (error) {
    console.error('Error creating withdraw transaction:', error.message);
    if (error.response) console.error('Error details:', error.response.data);
    return null;
  }
}

/**
 * Submit a signed UserOperation produced by createtrade/createwithdraw.
 * Internal implementation omitted — see disclaimer above.
 */
async function sendTransaction() {
  throw new Error('Transaction submission helper not included in public version');
}

async function autoTradeUntilVolumeReached(deviceId, wallet, loginResult, proxy, volumeTarget = 10) {
  while (true) {
    const { macKey, token } = loginResult;
    const tradeVolume = await gettradevolume(deviceId, loginResult, proxy);
    console.log('Current Trade Volume:', tradeVolume);

    if (tradeVolume >= volumeTarget) {
      console.log('Trade volume has reached the target, exiting loop.');
      break;
    }

    const assets = await getassest(deviceId, loginResult, proxy);

    let maxAsset = null;
    let maxAmount = 0n;

    for (const asset of assets) {
      const amount = BigInt(asset.amount);
      if (amount > maxAmount) {
        maxAmount = amount;
        maxAsset = asset;
      }
    }

    if (maxAsset && maxAmount > 0n) {
      const symbol = maxAsset.symbol.toLowerCase();
      const amount = maxAsset.amount;

      console.log(`Creating trade with largest asset: ${symbol} - Amount: ${amount}`);

      try {
        const createtraderesult = await createtrade(deviceId, wallet, macKey, token, symbol, amount, proxy);
        await delay(2000);
        await sendTransaction(deviceId, wallet, macKey, token, createtraderesult, proxy);
      } catch (error) {
        console.error('Error creating or sending transaction:', error.message || error);
        console.log('Waiting 10 seconds before retrying with new asset...');
        await delay(10000);
        continue;
      }
    } else {
      console.log('No valid assets found, waiting 10 seconds...');
    }

    await delay(15000);
  }
}

async function withdraw(deviceId, wallet, loginResult, proxy) {
  const { macKey, token } = loginResult;

  try {
    const result = await waitForUsdcOnly(deviceId, loginResult, proxy);
    const withdrawstatus = await createwithdraw(deviceId, wallet, result, loginResult, proxy);
    console.log('Withdraw transaction created:', withdrawstatus);
    await sendTransaction(deviceId, wallet, macKey, token, withdrawstatus, proxy);
  } catch (error) {
    console.error('Error during withdrawal process:', error.message);
    if (error.response) console.error('Error details:', error.response.data);
  }
}

async function processWallet(privateKey, proxy) {
  const deviceId = uuidv4();
  const wallet = new ethers.Wallet(privateKey);

  let loginResult = null;
  while (!loginResult) {
    loginResult = await login(deviceId, privateKey, proxy);
    if (!loginResult) {
      console.log('Retry login in 10 seconds...');
      await delay(10000);
    }
  }

  const assets = await getassest(deviceId, loginResult, proxy);
  console.log('Assets:', assets);

  await autoTradeUntilVolumeReached(deviceId, wallet, loginResult, proxy);
  await delay(5000);
  await withdraw(deviceId, wallet, loginResult, proxy);

  console.log('✅ Workflow completed successfully');
}

async function main() {
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    throw new Error('PRIVATE_KEY environment variable is missing');
  }

  const proxy = { /* your proxy object */ };
  await processWallet(privateKey, proxy);
}

main().catch(console.error);