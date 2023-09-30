const {ethers,network} = require("hardhat")
const fs = require('fs');
require('dotenv').config()

const FRONTEND_ADDRESSES_FILE = '/home/salman/hardhat/hardhat-lottery/frontend/app/constants/contractAddresses.json';
const FRONTEND_ABI_FILE = '/home/salman/hardhat/hardhat-lottery/frontend/app/constants/contractAbi.json';

module.exports = async () => {
    if(process.env.UPDATE_FRONTEND) {
        const lottery = await ethers.getContract("Lottery")
        console.log("Updating frontend");  
        await updateContractAddresses();
        await updateAbi();
    }
}

const updateAbi = async () => {
    const lottery = await ethers.getContract("Lottery");
    fs.writeFileSync(FRONTEND_ABI_FILE, JSON.stringify(lottery.interface.fragments));
    console.log('updated abi!');
}

const updateContractAddresses = async () => {
    const lottery = await ethers.getContract("Lottery");
    const chainId = network.config.chainId.toString();
    const currentAddresses = JSON.parse(fs.readFileSync(FRONTEND_ADDRESSES_FILE, 'utf8'));
    if(chainId in currentAddresses) {
        if(!currentAddresses[chainId].includes(lottery.target)) {
            currentAddresses[chainId].push(lottery.target);
        }
    } else {
        currentAddresses[chainId] = [lottery.target]
    }
    fs.writeFileSync(FRONTEND_ADDRESSES_FILE, JSON.stringify(currentAddresses));
    console.log('updated address!')
}

module.exports.tags = ['all', 'frontend']