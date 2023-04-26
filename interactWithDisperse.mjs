import Web3 from 'web3';
import inquirer from 'inquirer';
import fs from 'fs';
import { parse } from 'csv-string';


// 在csv中写入配置
const config = fs.readFileSync('config.csv', 'utf-8');
const [providerUrl, privateKey, contractAddress] = parse(config, {delimiter: ','})[0];

const abi = JSON.parse(fs.readFileSync('./disperseAbi.json', 'utf-8'));

const web3 = new Web3(new Web3.providers.HttpProvider(providerUrl));

const account = web3.eth.accounts.privateKeyToAccount(privateKey);
web3.eth.accounts.wallet.add(account);
web3.eth.defaultAccount = account.address;

const disperseContract = new web3.eth.Contract(abi, contractAddress);

async function main() {
  const { functionChoice } = await inquirer.prompt([
    {
      type: 'list',
      name: 'functionChoice',
      message: '请选择要调用的函数:',
      choices: ['disperseEther', 'disperseToken', 'disperseTokenSimple']
    }
  ]);

  const { recipientsInput, values } = await inquirer.prompt([
    {
      type: 'input',
      name: 'recipientsInput',
      message: '请输入收件人地址，用逗号分隔:',
      filter: (input) => input.split(',').map((address) => address.trim())
    },
    {
      type: 'input',
      name: 'values',
      message: '请输入对应的以太币或代币值，用逗号分隔:',
      filter: (input) =>
        input
          .split(',')
          .map((value) => web3.utils.toWei(value.trim(), 'ether'))
    }
  ]);

  let tokenAddress;
  if (functionChoice !== 'disperseEther') {
    const response = await inquirer.prompt([
      {
        type: 'input',
        name: 'tokenAddress',
        message: '请输入ERC20代币合约地址:'
      }
    ]);
    tokenAddress = response.tokenAddress;
  }
    const { confirmTransaction } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirmTransaction',
      message: '确认发送交易吗?'
    }
  ]);

  if (!confirmTransaction) {
    console.log('交易已取消');
    return;
  }

  // 获取推荐的 Gas Price
  const gasPrice = await web3.eth.getGasPrice();

  // 设置优先费用（Priority Fee）
  const priorityFee = web3.utils.toWei('1', 'gwei'); // 1 gwei 的优先费用

async function disperseEther(recipients, values, gasPrice, priorityFee) {
  const gasLimit = await disperseContract.methods
    .disperseEther(recipients, values)
    .estimateGas({ from: account.address, value: values.reduce((a, b) => web3.utils.toBN(a).add(web3.utils.toBN(b)), web3.utils.toBN(0)) });

  const totalValue = values.reduce((a, b) => web3.utils.toBN(a).add(web3.utils.toBN(b)), web3.utils.toBN(0));

  const tx = {
    to: contractAddress,
    gas: gasLimit,
    data: disperseContract.methods.disperseEther(recipients, values).encodeABI(),
    value: totalValue,
    maxPriorityFeePerGas: priorityFee,
    maxFeePerGas: web3.utils.toBN(gasPrice).add(web3.utils.toBN(priorityFee)),
  };

  const signedTx = await web3.eth.accounts.signTransaction(tx, privateKey);
  const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
  console.log('Transaction Receipt:', receipt);
}

async function disperseToken(tokenAddress, recipients, values, gasPrice, priorityFee) {
  const gasLimit = await disperseContract.methods
    .disperseToken(tokenAddress, recipients, values)
    .estimateGas({ from: account.address });

  const tx = {
    to: contractAddress,
    gas: gasLimit,
    data: disperseContract.methods.disperseToken(tokenAddress, recipients, values).encodeABI(),
    maxPriorityFeePerGas: priorityFee,
    maxFeePerGas: web3.utils.toBN(gasPrice).add(web3.utils.toBN(priorityFee)),
  };

  const signedTx = await web3.eth.accounts.signTransaction(tx, privateKey);
  const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
  console.log('Transaction Receipt:', receipt);
}

async function disperseTokenSimple(tokenAddress, recipients, values, gasPrice, priorityFee) {
  const gasLimit = await disperseContract.methods
    .disperseTokenSimple(tokenAddress, recipients, values)
    .estimateGas({ from: account.address });

  const tx = {
    to: contractAddress,
    gas: gasLimit,
    data: disperseContract.methods.disperseTokenSimple(tokenAddress, recipients, values).encodeABI(),
    maxPriorityFeePerGas: priorityFee,
    maxFeePerGas: web3.utils.toBN(gasPrice).add(web3.utils.toBN(priorityFee)),
  };

  const signedTx = await web3.eth.accounts.signTransaction(tx, privateKey);
  const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
  console.log('Transaction Receipt:', receipt);
}

  if (functionChoice === 'disperseEther') {
    await disperseEther(recipientsInput, values, gasPrice, priorityFee);
  } else if (functionChoice === 'disperseToken') {
    await disperseToken(tokenAddress, recipientsInput, values, gasPrice, priorityFee);
  } else if (functionChoice === 'disperseTokenSimple') {
    await disperseTokenSimple(tokenAddress, recipientsInput, values, gasPrice, priorityFee);
  }
}

main();

