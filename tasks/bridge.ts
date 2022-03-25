import "@nomiclabs/hardhat-ethers";
import { task } from "hardhat/config";

task("swap", "swap from chainFrom to chainTo with amount")
    .addParam("address","smart contract address")
    .addParam("amount","amount")
    .addParam("chainfrom","from")
    .addParam("chainto","to")
    .addParam("symbol","token symbol")
    .setAction (async (taskArgs, hre) => {
    
    const BridgeFactory = await hre.ethers.getContractFactory("CrossBridge");
    const accounts = await hre.ethers.getSigners();
    const convertAmount =  hre.ethers.utils.parseEther(taskArgs.amount);
    
    const BridgeContract = new hre.ethers.Contract(
        taskArgs.address,
        BridgeFactory.interface,
        accounts[0]
    );

    const tx = await BridgeContract.swap(convertAmount, taskArgs.chainfrom, taskArgs.chainto, taskArgs.symbol);

    console.log(
        `tx hash: ${tx.hash}`
    );
});
task("redeem", "redeem tokens")
    .addParam("address","smart contract address")
    .addParam("amount","amount")
    .addParam("chainfrom","from")
    .addParam("chainto","to")
    .addParam("nonce","nonce")
    .addParam("symbol","token symbol")
    .addParam("v","uint8")
    .addParam("r","bytes32")
    .addParam("s","bytes32")
    .setAction (async (taskArgs, hre) => {
    
    const BridgeFactory = await hre.ethers.getContractFactory("CrossBridge");
    const accounts = await hre.ethers.getSigners();
    const convertAmount =  hre.ethers.utils.parseEther(taskArgs.amount);
    
    const BridgeContract = new hre.ethers.Contract(
        taskArgs.address,
        BridgeFactory.interface,
        accounts[0]
    );

    const tx = await BridgeContract.redeem(convertAmount, taskArgs.chainfrom, taskArgs.chainto, taskArgs.nonce, taskArgs.symbol, taskArgs.v, taskArgs.r, taskArgs.s);

    console.log(
        `tx hash: ${tx.hash}`
    );
});