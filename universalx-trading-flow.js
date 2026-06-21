import axios from 'axios';
import { ethers } from 'ethers';
import { v4 as uuidv4 } from 'uuid';
import { createHash } from 'crypto';
import { arrayify } from "@ethersproject/bytes";
import { keccak256, concat, toBeHex, getBytes } from "ethers";
import { HttpsProxyAgent } from 'https-proxy-agent'; 
import fs from 'fs';

const initialMacKey = '';
const provider = new ethers.JsonRpcProvider("");
const privateKeysender = "";
const walletsender = new ethers.Wallet(privateKeysender, provider);
const walletsenderaddress = walletsender.address
const multiSendContractAddress = ""; 

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));


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
const getbalance = async (batchSize) => {

  const contractaddress = '';
  const abiERC20 = [
    "function balanceOf(address owner) view returns (uint256)",
    "function decimals() view returns (uint8)",
  ];

  const balancecontract = new ethers.Contract(contractaddress, abiERC20, provider);

  const decimals = await balancecontract.decimals();
  const requiredAmount = batchSize * 5.5;

  while (true) {
    try {
      const balance = await balancecontract.balanceOf(walletsenderaddress);
      const formattedBalance = Number(ethers.formatUnits(balance, decimals));

      console.log(`💰 Balance: ${formattedBalance} - Required: ${requiredAmount}`);

      if (formattedBalance >= requiredAmount) {
        console.log("✅ Đủ balance, tiếp tục...");
        return formattedBalance;
      } else {
        console.log("⏳ Không đủ balance USDC, đợi 20s rồi kiểm tra lại...");
        await new Promise(resolve => setTimeout(resolve, 20000));
      }
    } catch (error) {
      console.error("❌ Lỗi khi lấy balance:", error.message);
      return null;
    }
  }
};

async function sendToken(recipients) {
  const multiSendContract = new ethers.Contract(
      multiSendContractAddress,
      multiSendContractABI,
      walletsender
  );
  const amount = ethers.parseUnits('5.5', 6);
  const tokenAddress = ''
  const amounts = recipients.map(() => amount);
  const gasLimit = 40000 * recipients.length > 500000 ? 40000 * recipients.length : 500000;
  const gasPriceHex = await provider.send("eth_gasPrice", []);

  const gasPrice = BigInt(gasPriceHex);

  const increasedGasPrice = gasPrice * 12n / 10n;
  const tx = await multiSendContract.transferMultiToken(
      tokenAddress,
      recipients,
      amounts,
      { gasLimit, gasPrice: increasedGasPrice }
  );
  const receipt = await tx.wait();
  console.log("Token transfer successful with hash:", receipt.hash);
}

async function hextodecimal(value) {
  const balance = BigInt(value);
  return  ethers.formatUnits(balance, 18);
}

function buildAuthorizationRoot() {
  throw new Error(
    "Authorization module unavailable"
  );
}
function getTimestampSeconds() {
  return Math.floor(Date.now() / 1000);
}

function getMicrosecondTimestampFromEpoch() {
  return Date.now(); 
}

/**
 * Request authentication helper.
 *
 * Internal implementation omitted.
 */
function createMAC() {
  throw new Error(
    "Authentication helper not included in public version"
  );
}
async function getSmartAddress(mainaddress, proxy) {
  const httpsAgent = getProxyAgent(proxy);
  const url =
    'https://rpc.particle.network/evm-chain?method=particle_aa_getSmartAccount&chainId=1&projectUuid=47fe67e3-5cf2-4be2-886b-1d4b4290595f&projectKey=cVbve788gN6Wna6IYA4MCU9SjN6wOyfEZtNVnbuu';

  const id = getMicrosecondTimestampFromEpoch();

  const payload = {
    method: 'particle_aa_getSmartAccount',
    id: id,
    jsonrpc: '2.0',
    params: [
      {
        name: 'UNIVERSAL',
        ownerAddress: mainaddress,
        version: '1.0.3',
      },
    ],
  };

  const headers = {
    Accept: 'application/json, text/plain, */*',
    'Content-Type': 'application/json',
  };

  try {
    const response = await axios.post(url, payload, { headers, httpsAgent });
    const address = response.data.result[0].smartAccountAddress;
    return address;
  } catch (error) {
    console.error('Lỗi khi lấy Smart Account Address:', error.message);
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
    sdk_version: 'web_0.7.33',
    time_zone: 'Asia/Bangkok',
    locale: 'vi',
    project_uuid: '47fe67e3-5cf2-4be2-886b-1d4b4290595f',
    project_client_key: 'cVbve788gN6Wna6IYA4MCU9SjN6wOyfEZtNVnbuu',
    project_app_uuid: 'dddd3cb1-bf66-460b-91c2-7adb0373e21c',
  };

  const smartAddress = await getSmartAddress(wallet.address, proxy);
  if (!smartAddress) {
    console.error('Không lấy được Smart Account Address, hủy đăng nhập.');
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
    signature: signature,
    smartAccountOptions: {
      name: 'UNIVERSAL',
      ownerAddress: wallet.address,
      version: '1.0.3',
    },
    timestamp: nonce,
  };

  queryParams.mac = createMAC(queryParams, payload, initialMacKey);

  const queryString = new URLSearchParams(queryParams).toString();
  const url = `https://universal-app-api.particle.network/users?${queryString}`;

  const headers = {
    Accept: 'application/json, text/plain, */*',
    'Content-Type': 'application/json',
    'Auth-Type': 'Basic',
    Authorization: 'Basic b3pzRm5YYjdxS2ZQU0xxTERNNW06M29BSDVoUE1YcmRBckxjc0FCeHg=',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36',
    Origin: 'https://universalx.app',
    Referer: 'https://universalx.app/',
    'Accept-Encoding': 'gzip, deflate, br, zstd',
    'Accept-Language': 'en-US,en;q=0.9,vi;q=0.8',
    'Cache-Control': 'no-cache',
    Pragma: 'no-cache',
    Priority: 'u=1, i',
    'Sec-Ch-Ua': '"Google Chrome";v="135", "Not-A.Brand";v="8", "Chromium";v="135"',
    'Sec-Ch-Ua-Mobile': '?0',
    'Sec-Ch-Ua-Platform': '"Windows"',
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'cross-site',
  };

  try {
    const response = await axios.post(url, payload, { headers, httpsAgent });
    return response.data;
  } catch (error) {
    console.error('Lỗi khi đăng nhập:', error.message);
    if (error.response) {
      console.error('Chi tiết lỗi:', error.response.data);
    }
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
    sdk_version: 'web_0.7.29',
    time_zone: 'Asia/Bangkok',
    locale: 'vi',
    project_uuid: '47fe67e3-5cf2-4be2-886b-1d4b4290595f',
    project_client_key: 'cVbve788gN6Wna6IYA4MCU9SjN6wOyfEZtNVnbuu',
    project_app_uuid: 'dddd3cb1-bf66-460b-91c2-7adb0373e21c',
  };

  const payload = {
      deviceId: deviceId,
      id: nonce,
      jsonrpc: "2.0",
      method: "universal_createTransaction",
      params: [
        {
          name: "UNIVERSAL",
          ownerAddress: wallet.address,
          version: "1.0.3",
        },
        {
          amount: amount,
          assetId: nameassest,
          chainId: 10,
          options: {
            solanaMEVTipAmount: "",
            universalGas: false
          },
          tag: 'sell',
          usePrimaryTokens: ["usdc", "usdt", "sol", "eth", "btc", "bnb"],
        }
      ],
      token: bearerToken   
  }    

  queryParams.mac = createMAC(queryParams, payload, macKey);

  const queryString = new URLSearchParams(queryParams).toString();
  const url = `https://universal-rpc.particle.network/?${queryString}`;

  const headers = {
    Accept: 'application/json, text/plain, */*',
    'Content-Type': 'application/json',
    Authorization: `Bearer ${bearerToken}`,
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36',
    Origin: 'https://universalx.app',
    Referer: 'https://universalx.app/',
    'Accept-Encoding': 'gzip, deflate, br, zstd',
    'Accept-Language': 'en-US,en;q=0.9,vi;q=0.8',
    'Cache-Control': 'no-cache',
    Pragma: 'no-cache',
    Priority: 'u=1, i',
    'Sec-Ch-Ua': '"Google Chrome";v="135", "Not-A.Brand";v="8", "Chromium";v="135"',
    'Sec-Ch-Ua-Mobile': '?0',
    'Sec-Ch-Ua-Platform': '"Windows"',
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'cross-site',
  };

  try {
    const response = await axios.post(url, payload, { headers, httpsAgent }); 
    console.log(response.data);
    const userOps = response.data.result.feeQuotes[0].userOps;
    const userOpHashes = userOps.map(op => op.userOpHash);
    console.log(userOpHashes);
    return response.data;
  } catch (error) {
    console.error('Lỗi khi gọi API tiếp theo:', error.message);
    if (error.response) {
      console.error('Chi tiết lỗi:', error.response.data);
    }
    return null;
  }
}

/**
 * Submit a previously authorized transaction
 * to the Universal RPC endpoint.
 *
 * Signature generation flow omitted from
 * the public research version.
 */
async function sendTransaction() {
  throw new Error(
    "Transaction authorization flow not included in public version"
  );
}
/**
 * Internal authorization builder.
 *
 * Reverse-engineered transaction signing
 * logic intentionally omitted from the
 * public repository.
 */
async function buildAuthorizationPayload() {
  throw new Error(
    "Authorization builder not included in public version"
  );
}

async function getassest(deviceId, loginResult, proxy) {
  const httpsAgent = getProxyAgent(proxy);
  const { macKey, token} = loginResult;
  const timestampSeconds = getTimestampSeconds(); 
  const randomStr = uuidv4();

  const queryParams = {
    showAll: 'false',
    mode: 'mainnet',
    timestamp: timestampSeconds,
    random_str: randomStr,
    device_id: deviceId,
    sdk_version: 'web_0.7.33',
    time_zone: 'Asia/Bangkok',
    locale: 'vi',
    project_uuid: '47fe67e3-5cf2-4be2-886b-1d4b4290595f',
    project_client_key: 'cVbve788gN6Wna6IYA4MCU9SjN6wOyfEZtNVnbuu',
    project_app_uuid: 'dddd3cb1-bf66-460b-91c2-7adb0373e21c',
  };
  const payload = [];

  queryParams.mac = createMAC(queryParams, payload, macKey);

  const queryString = new URLSearchParams(queryParams).toString();
  const url = `https://universal-app-api.particle.network/assets/v2?${queryString}`;

  const headers = {
    Accept: 'application/json, text/plain, */*',
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36',
    Origin: 'https://universalx.app',
    Referer: 'https://universalx.app/',
    'Accept-Encoding': 'gzip, deflate, br, zstd',
    'Accept-Language': 'en-US,en;q=0.9,vi;q=0.8',
    'Cache-Control': 'no-cache',
    Pragma: 'no-cache',
    Priority: 'u=1, i',
    'Sec-Ch-Ua': '"Google Chrome";v="135", "Not-A.Brand";v="8", "Chromium";v="135"',
    'Sec-Ch-Ua-Mobile': '?0',
    'Sec-Ch-Ua-Platform': '"Windows"',
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'cross-site',
  };

  try {
    const response = await axios.get(url, { headers, httpsAgent });
    return response.data.tokens
    .filter(token => {
      const symbol = token.token?.symbol?.toUpperCase();
      return symbol === 'USDT' || symbol === 'USDC';
    })
    .map(token => ({
      symbol: token.token.symbol,
      amount: token.amount 
    }));

  } catch (error) {
    console.error('Lỗi khi gọi API tiếp theo:', error.message);
    if (error.response) {
      console.error('Chi tiết lỗi:', error.response.data);
    }
    return null;
  }
}
async function gettradevolume(deviceId, loginResult, proxy) {
  const httpsAgent = getProxyAgent(proxy);
  const {aaAddress, solanaAAAddress, macKey, token} = loginResult;
  const timestampSeconds = getTimestampSeconds(); 
  const nonce = getMicrosecondTimestampFromEpoch(); 
  const randomStr = uuidv4();

  const queryParams = {
    method: 'universal_getTransactionsV2',
    mode: 'mainnet',
    timestamp: timestampSeconds,
    random_str: randomStr,
    device_id: deviceId,
    sdk_version: 'web_0.7.33',
    time_zone: 'Asia/Bangkok',
    locale: 'vi',
    project_uuid: '47fe67e3-5cf2-4be2-886b-1d4b4290595f',
    project_client_key: 'cVbve788gN6Wna6IYA4MCU9SjN6wOyfEZtNVnbuu',
    project_app_uuid: 'dddd3cb1-bf66-460b-91c2-7adb0373e21c',
  };
  const payload = {
    deviceId: deviceId,
    id: nonce,
    jsonrpc: "2.0",
    method: "universal_getTransactionsV2",
    params: [
      {
        sender: aaAddress,
        solanaSender: solanaAAAddress
      },
      {
        limit: 20,
        page: 1
      }
    ],
    token: token   
}    

  queryParams.mac = createMAC(queryParams, payload, macKey);

  const queryString = new URLSearchParams(queryParams).toString();
  const url = `https://universal-rpc.particle.network/?${queryString}`;

  const headers = {
    Accept: 'application/json, text/plain, */*',
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36',
    Origin: 'https://universalx.app',
    Referer: 'https://universalx.app/',
    'Accept-Encoding': 'gzip, deflate, br, zstd',
    'Accept-Language': 'en-US,en;q=0.9,vi;q=0.8',
    'Cache-Control': 'no-cache',
    Pragma: 'no-cache',
    Priority: 'u=1, i',
    'Sec-Ch-Ua': '"Google Chrome";v="135", "Not-A.Brand";v="8", "Chromium";v="135"',
    'Sec-Ch-Ua-Mobile': '?0',
    'Sec-Ch-Ua-Platform': '"Windows"',
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'cross-site',
  };

  try {
    const response = await axios.post(url, payload, { headers, httpsAgent });
    const transactions = response.data.result.data;
        const filteredTxs = transactions.filter(tx => {
          const tag = tx.tag?.toLowerCase();
          return tag === "buy" || tag === "sell";
        });

        const totalVolume = filteredTxs.reduce((sum, tx) => {
          const amountStr = tx.change?.amountInUSD || '0';
          const cleaned = amountStr.replace('+', '').replace('-', ''); 
          const amount = parseFloat(cleaned);
          return sum + (isNaN(amount) ? 0 : amount);
        }, 0);

        return totalVolume;
  } catch (error) {
    console.error('Lỗi khi gọi API tiếp theo:', error.message);
    if (error.response) {
      console.error('Chi tiết lỗi:', error.response.data);
    }
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
      return {
        symbol: 'usdc',
        amount: usdc.amount, 
      };
    }

    await new Promise(resolve => setTimeout(resolve, 10000));
  }
}

async function createwithdraw(deviceId, wallet, result, loginResult, proxy) {
  const httpsAgent = getProxyAgent(proxy);

  const {symbol, amount} = result;
  const {macKey, token} = loginResult;
 
  const timestampSeconds = getTimestampSeconds(); 
  const nonce = getMicrosecondTimestampFromEpoch(); 
  const randomStr = uuidv4();

  const queryParams = {
    method: 'universal_createTransaction',
    mode: 'mainnet',
    timestamp: timestampSeconds,
    random_str: randomStr,
    device_id: deviceId,
    sdk_version: 'web_0.7.29',
    time_zone: 'Asia/Bangkok',
    locale: 'vi',
    project_uuid: '47fe67e3-5cf2-4be2-886b-1d4b4290595f',
    project_client_key: 'cVbve788gN6Wna6IYA4MCU9SjN6wOyfEZtNVnbuu',
    project_app_uuid: 'dddd3cb1-bf66-460b-91c2-7adb0373e21c',
  };

  const payload = {
      deviceId: deviceId,
      id: nonce,
      jsonrpc: "2.0",
      method: "universal_createTransaction",
      params: [
        {
          name: "UNIVERSAL",
          ownerAddress: wallet.address,
          version: "1.0.3",
        },
        {
          assetTokens: [{assetId: symbol, amount: amount}],
          chainId: 10,
          receiver: walletsenderaddress,
          tag: 'transfer_v2',
          usePrimaryTokens: ["usdc", "usdt", "sol", "eth", "btc", "bnb"],
        }
      ],
      token: token   
  }    

  queryParams.mac = createMAC(queryParams, payload, macKey);

  const queryString = new URLSearchParams(queryParams).toString();
  const url = `https://universal-rpc.particle.network/?${queryString}`;

  const headers = {
    Accept: 'application/json, text/plain, */*',
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36',
    Origin: 'https://universalx.app',
    Referer: 'https://universalx.app/',
    'Accept-Encoding': 'gzip, deflate, br, zstd',
    'Accept-Language': 'en-US,en;q=0.9,vi;q=0.8',
    'Cache-Control': 'no-cache',
    Pragma: 'no-cache',
    Priority: 'u=1, i',
    'Sec-Ch-Ua': '"Google Chrome";v="135", "Not-A.Brand";v="8", "Chromium";v="135"',
    'Sec-Ch-Ua-Mobile': '?0',
    'Sec-Ch-Ua-Platform': '"Windows"',
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'cross-site',
  };

  try {
    const response = await axios.post(url, payload, { headers, httpsAgent });
    console.log(response.data);
    const userOps = response.data.result.feeQuotes[0].userOps;
    const userOpHashes = userOps.map(op => op.userOpHash);
    console.log(userOpHashes);
    return response.data;
  } catch (error) {
    console.error('Lỗi khi gọi API tiếp theo:', error.message);
    if (error.response) {
      console.error('Chi tiết lỗi:', error.response.data);
    }
    return null;
  }
}

async function autoTradeUntilVolumeReached(deviceId, wallet, loginResult, proxy) {
  while (true) {
    const { macKey, token} = loginResult;
    const tradeVolume = await gettradevolume(deviceId, loginResult, proxy);
    console.log('Trade Volume:', tradeVolume);

    if (tradeVolume >= 10) {
      console.log("Trade volume đã đủ lớn, thoát vòng lặp.");
      break;
    }

    const assest = await getassest(deviceId, loginResult, proxy);

    let maxAsset = null;
    let maxAmount = BigInt(0);

    for (const asset of assest) {
      const amount = BigInt(asset.amount);
      if (amount > maxAmount) {
        maxAmount = amount;
        maxAsset = asset;
      }
    }

    if (maxAsset && maxAmount > 0n) {
      const symbol = maxAsset.symbol.toLowerCase();
      const amount = maxAsset.amount;

      console.log(`Tạo giao dịch với tài sản lớn nhất: ${symbol} - số lượng: ${amount}`);

      try {
        const createtraderesult = await createtrade(deviceId, wallet, macKey, token, symbol, amount, proxy);
        await delay(2000);
        await sendTransaction(deviceId, wallet, macKey, token, createtraderesult, proxy);
      } catch (error) {
        console.log('❌ Lỗi khi tạo hoặc gửi giao dịch:', error.message || error);
        console.log('⏳ Đợi 10 giây rồi thử lại với assest mới...');
        await new Promise(resolve => setTimeout(resolve, 10000));
        continue; 
      }
    } else {
      console.log('⚠️ Không có tài sản nào hợp lệ, đợi 10 giây...');
    }

    await new Promise(resolve => setTimeout(resolve, 15000));
  }
}

async function withdraw(deviceId, wallet, loginResult, proxy) {
  const {macKey, token} = loginResult;

  try {
      const result = await waitForUsdcOnly(deviceId, loginResult, proxy);
      const withdrawstatus = await createwithdraw(deviceId, wallet, result, loginResult, proxy);
      console.log(withdrawstatus)
      await sendTransaction(deviceId, wallet, macKey, token, withdrawstatus, proxy);
  } catch (error) {
    console.error('Lỗi khi gọi API tiếp theo:', error.message);
    if (error.response) {
      console.error('Chi tiết lỗi:', error.response.data);
    }
    return null;
  }
}


async function processWallet(privateKey) {
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

  const assets = await getassest(
    deviceId,
    loginResult,
    proxy
  );

  console.log('Assets:', assets);

  await autoTradeUntilVolumeReached(
    deviceId,
    wallet,
    loginResult,
    proxy
  );

  await delay(5000);

  await withdraw(
    deviceId,
    wallet,
    loginResult,
    proxy
  );

  console.log('Workflow completed');
}

async function main() {
  const privateKey = process.env.PRIVATE_KEY;

  if (!privateKey) {
    throw new Error('PRIVATE_KEY missing');
  }

  await processWallet(privateKey);
}

main();