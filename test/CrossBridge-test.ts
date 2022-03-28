import { expect } from "chai";
import { ethers } from "hardhat";
import { ContractReceipt } from "ethers";
import {Token, Token__factory, CrossBridge, CrossBridge__factory} from "../typechain";

describe("CrossBridge-tests", function () {
  
  let token1: Token;
  let token2: Token;
  let crossBridge1: CrossBridge;
  let crossBridge2: CrossBridge;

  beforeEach(async () => {
    const [owner, user1, user2] = await ethers.getSigners();
    const tokenFactory = await ethers.getContractFactory("Token",owner) as Token__factory;
    const bridgeFactory = await ethers.getContractFactory("CrossBridge", owner) as CrossBridge__factory;

    const toMint = ethers.utils.parseEther("1");

    token1 = await tokenFactory.deploy("TestToken1","STT");
    token2 = await tokenFactory.deploy("TestToken2","STT");

    crossBridge1 = await bridgeFactory.deploy(2);
    crossBridge2 = await bridgeFactory.deploy(2);

    await token1.deployed();
    await token2.deployed();
    await crossBridge1.deployed();
    await crossBridge2.deployed();

    await crossBridge1.connect(owner).includeToken("STT", token1.address);
    await crossBridge2.connect(owner).includeToken("STT", token2.address);
    await crossBridge1.connect(owner).addValidator(owner.address);
    await crossBridge2.connect(owner).addValidator(owner.address);
    await crossBridge1.connect(owner).updateChainById(2);
    await crossBridge2.connect(owner).updateChainById(2);

    await token1.connect(owner).mint(user1.address, toMint);
    await token1.connect(owner).addAdmin(crossBridge1.address);
    await token2.connect(owner).addAdmin(crossBridge2.address);
  });

  it("includeToken, excludeToken, addValidator", async function () {
    const [owner, user1] = await ethers.getSigners();

    await expect(
      crossBridge1.connect(user1).includeToken("STT1", user1.address)
    ).to.be.revertedWith("CrossBridge::includeToken:Caller is not an admin");

    await expect(
      crossBridge1.connect(user1).addValidator(user1.address)
    ).to.be.revertedWith("CrossBridge::addValidator:Caller is not an admin");

    await expect(
      crossBridge1.connect(user1).excludeToken("STT")
    ).to.be.revertedWith("CrossBridge::excludeToken:Caller is not an admin");
    
    await expect(
      crossBridge1.connect(user1).updateChainById(2)
    ).to.be.revertedWith("CrossBridge::updateChainById:Caller is not an admin");

    await crossBridge1.connect(owner).excludeToken("STT");
    await crossBridge1.connect(owner).updateChainById(2);
  });

  it("swap, redeem", async function () {
    const [owner, user1] = await ethers.getSigners();
    const toSwap = ethers.utils.parseEther("1");

    await expect(
      crossBridge1.connect(user1).swap(toSwap, 1, "STT")
    ).to.be.revertedWith("CrossBridge::swap:chainId not supported");

    await expect(
      crossBridge1.connect(user1).swap(toSwap, 2, "STT1")
    ).to.be.revertedWith("CrossBridge::swap:token not supported");

    await expect(
      crossBridge1.connect(user1).swap(toSwap, 2, "STT")
    ).to.be.revertedWith("CrossBridge::swap:insufficient allowance");

    await token1.connect(user1).approve(crossBridge1.address, toSwap);
    const tx = await crossBridge1.connect(user1).swap(toSwap, 2, "STT");
    
    let receipt: ContractReceipt = await tx.wait();
    const event = receipt.events?.find(event => event.event === "swapInitialized");
    const nonce = event?.args!['nonce'];

    const msg = ethers.utils.solidityKeccak256(
      ["address", "uint256","uint64","uint64","uint256","string"],
      [user1.address, toSwap, 2, 2, nonce, "STT"]
    );
    
    let signature = await owner.signMessage(ethers.utils.arrayify(msg));
    let sig = await ethers.utils.splitSignature(signature);
    
    await crossBridge2.connect(user1).redeem(toSwap, 2, nonce, "STT", sig.v, sig.r, sig.s);

    expect(await token2.balanceOf(user1.address)).to.equal(toSwap);

    await expect(
      crossBridge2.connect(user1).redeem(toSwap, 2, nonce, "STT", sig.v, sig.r, sig.s)
    ).to.be.revertedWith("CrossBridge::redeem:hash was used");

    const newNonce = nonce + 1;
    const msg2 = ethers.utils.solidityKeccak256(
      ["address", "uint256","uint64","uint64","uint256","string"],
      [user1.address, toSwap, 2, 2, newNonce, "STT"]
    );
    let signature2 = await user1.signMessage(ethers.utils.arrayify(msg2));
    let sig2 = await ethers.utils.splitSignature(signature2);
    
    await expect(
      crossBridge2.connect(user1).redeem(toSwap, 2, newNonce, "STT", sig2.v, sig2.r, sig2.s)
    ).to.be.revertedWith("CrossBridge::redeem:signature not valid");
  });

});
