const { network, ethers } = require("hardhat");
const {
    developmentChains,
    networkConfig,
} = require("../helper-hardhat.config");
const { verify } = require("../utils/verify");

module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy, log } = deployments;
    const { deployer } = await getNamedAccounts();
    const chainId = network.config.chainId;
    let vrfV2CoordinatorAddress, subscriptionId;
    const VRF_SUB_FUND_AMOUNT = ethers.parseEther("5");
    log("ChainId: ", chainId);

    if (developmentChains.includes(network.name)) {
        vrfV2CoordinatorMock = await ethers.getContract("VRFCoordinatorV2Mock");
        vrfV2CoordinatorAddress = vrfV2CoordinatorMock.target;
        const transactionResponse =
            await vrfV2CoordinatorMock.createSubscription();

        const transactionReciept = await transactionResponse.wait(1);
        subscriptionId = transactionReciept.logs[0].args.subId;
        await vrfV2CoordinatorMock.fundSubscription(
            subscriptionId,
            VRF_SUB_FUND_AMOUNT
        );
    } else {
        vrfV2CoordinatorAddress = networkConfig[chainId]["vrfCoordinatorV2"];
        subscriptionId = networkConfig[chainId]["subscriptionId"];
    }

    const entryFee = networkConfig[chainId]["entryFee"];
    const keyHash = networkConfig[chainId]["keyHash"];
    const callbackGasLimit = networkConfig[chainId]["callbackGasLimit"];
    const interval = networkConfig[chainId]["interval"];

    const args = [
        vrfV2CoordinatorAddress,
        entryFee,
        keyHash,
        subscriptionId,
        callbackGasLimit,
        interval,
    ];
    const lottery = await deploy("Lottery", {
        from: deployer,
        args,
        log: true,
        waitConfirmations: network.config.blockConfirmations || 1,
    });
    log(`Lottery deployed at ${lottery.address}`);

    if (
        !developmentChains.includes(network.name) &&
        process.env.ETHERSCAN_API_KEY
    ) {
        await verify(lottery.address, args);
    }

    if (developmentChains.includes(network.name)) {
        await vrfV2CoordinatorMock.addConsumer(subscriptionId, lottery.address);

        log("Consumer is added");
    }

    log("-------------------------------------------");
};

module.exports.tags = ["all", "lottery"];
