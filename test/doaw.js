const { expect } = require("chai");
const { ethers } = require("hardhat");
const { deployContracts, correctPrice, maxSupply, splitterAddress } = require("../scripts/utils.js");
const { MerkleTree } = require('merkletreejs')
const { merkleAddresses } = require("../merkleAddresses.js");

describe("NFT Tests", function () {
  this.timeout(50000000);

  it("has the correct metadata and splitter and start date", async () => {
    const { nft, metadata } = await deployContracts();

    const metadataAddress = await nft.metadata();
    expect(metadataAddress).to.equal(metadata.address);
    const contractSplitterAddress = await nft.splitter()
    expect(contractSplitterAddress).to.equal(splitterAddress);

    const startDate = await nft.startdate()
    const actualStartDate = "Tue Nov 14 2023 18:00:00 GMT+0000"
    const actualStartDateInUnixTime = Date.parse(actualStartDate) / 1000
    expect(startDate).to.equal(actualStartDateInUnixTime)

    const premint = await nft.premint()
    const actualPremint = "Tue Nov 14 2023 15:00:00 GMT+0000"
    const actualPremintInUnixTime = Date.parse(actualPremint) / 1000
    expect(premint).to.equal(actualPremintInUnixTime)

  })

  it("onlyOwner functions are really only Owner", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const { nft } = await deployContracts();

    await expect(nft.connect(addr1).setMetadata(addr1.address))
      .to.be.revertedWith("Ownable: caller is not the owner");

    await expect(nft.connect(addr1).setSplitter(addr1.address))
      .to.be.revertedWith("Ownable: caller is not the owner");

    await expect(nft.connect(addr1).setPause(false))
      .to.be.revertedWith("Ownable: caller is not the owner");

    await expect(nft.connect(addr1).setPrice(ethers.utils.parseEther("0.1")))
      .to.be.revertedWith("Ownable: caller is not the owner");

    await expect(nft.connect(addr1).setRoyaltyPercentage(addr1.address, 1))
      .to.be.revertedWith("Ownable: caller is not the owner");

    await expect(nft.connect(addr1).setStartdate(0))
      .to.be.revertedWith("Ownable: caller is not the owner");

    await expect(nft.connect(addr1).setPremint(0))
      .to.be.revertedWith("Ownable: caller is not the owner");

    await expect(nft.connect(addr1).setMerkleRoot("0xcedaa7d5476066e2c0ccb625e3e66e2e88db2ec3bdb457c3bd92faf5913cee0a"))
      .to.be.revertedWith("Ownable: caller is not the owner");


    await expect(nft.setMetadata(addr1.address))
      .to.not.be.reverted;

    await expect(nft.setSplitter(addr1.address))
      .to.not.be.reverted;

    await expect(nft.setPause(false))
      .to.not.be.reverted;

    await expect(nft.setPrice(ethers.utils.parseEther("0.1")))
      .to.not.be.reverted;

    await expect(nft.setRoyaltyPercentage(addr1.address, 1))
      .to.not.be.reverted;

    await expect(nft.setStartdate(0))
      .to.not.be.reverted;

    await expect(nft.setPremint(0))
      .to.not.be.reverted;

    await expect(nft.setMerkleRoot("0xcedaa7d5476066e2c0ccb625e3e66e2e88db2ec3bdb457c3bd92faf5913cee0a"))
      .to.not.be.reverted;
  })

  it("has the correct max supply", async function () {
    const { nft } = await deployContracts();
    const maxSupply_ = await nft.MAX_SUPPLY();
    expect(maxSupply_).to.equal(maxSupply);
  })

  it("has all the correct interfaces", async () => {
    const interfaces = [
      { name: "ERC165", id: "0x01ffc9a7", supported: true },
      { name: "ERC721", id: "0x80ac58cd", supported: true },
      { name: "ERC721Metadata", id: "0x5b5e139f", supported: true },
      { name: "ERC721Enumerable", id: "0x780e9d63", supported: false },
      { name: "ERC2981", id: "0x2a55205a", supported: true },
      { name: "ERC20", id: "0x36372b07", supported: false },
    ]

    for (let i = 0; i < interfaces.length; i++) {
      const { name, id, supported } = interfaces[i];
      const { nft } = await deployContracts();
      const supportsInterface = await nft.supportsInterface(id);
      expect(name + supportsInterface).to.equal(name + supported);
    }
  })


  it("emits 'EthMoved' events when eth is moved", async () => {
    const [owner, addr1] = await ethers.getSigners();
    const { nft, metadata } = await deployContracts();

    // set splitter to metadata address which cannot recive eth
    await nft.setSplitter(metadata.address)
    await nft.setPause(false)
    await nft.setStartdate(0)

    const balanceBefore = await ethers.provider.getBalance(nft.address);
    expect(balanceBefore).to.equal(0);

    // mint will succeed but the EthMoved event will show the eth transfer failed
    tx = nft['mint()']({ value: correctPrice })
    await expect(tx)
      .to.emit(nft, "EthMoved")
      .withArgs(metadata.address, false, "0x", correctPrice);

    // nft still has the eth
    const balanceAfter = await ethers.provider.getBalance(nft.address);
    expect(balanceAfter).to.equal(correctPrice);

    // only owner can call recoverUnsuccessfulMintPayment
    await expect(nft.connect(addr1).recoverUnsuccessfulMintPayment(addr1.address))
      .to.be.revertedWith("Ownable: caller is not the owner");

    // get the balance of the eventual recipient
    const balanceOfAddr1Before = await ethers.provider.getBalance(addr1.address);

    // recover eth stuck in nft and send to addr1 using owner address
    tx = nft.recoverUnsuccessfulMintPayment(addr1.address)
    await expect(tx)
      .to.emit(nft, "EthMoved")
      .withArgs(addr1.address, true, "0x", correctPrice);

    const balanceOfAddr1After = await ethers.provider.getBalance(addr1.address);
    expect(balanceOfAddr1After.sub(balanceOfAddr1Before)).to.equal(correctPrice);
  })


  it("fails to adminMint when not owner", async function () {
    const [owner, addr1, addr2, addr3, addr4] = await ethers.getSigners();
    const { nft } = await deployContracts();
    await expect(nft.connect(addr3).adminMint(addr3.address, 1))
      .to.be.revertedWith("Ownable: caller is not the owner");
  });


  it("revert:Splitter not set", async function () {
    const [owner] = await hre.ethers.getSigners();
    const NFT = await ethers.getContractFactory("NFT");
    await expect(NFT.deploy(owner.address, ethers.constants.AddressZero))
      .to.be.reverted;
  });

  it("sends money to splitter correctly", async function () {
    const [owner, splitter, addr2, addr3, addr4] = await ethers.getSigners();
    const { nft } = await deployContracts();
    await nft.setPause(false);
    await nft.setStartdate(0)
    await nft.connect(addr3)['mint()']({ value: correctPrice });
    expect(await nft.ownerOf(1)).to.equal(addr3.address);
    var splitterBalance = await ethers.provider.getBalance(splitterAddress);
    expect(splitterBalance == correctPrice);
  });

  it("has the correct royalty info", async () => {
    const [acct1, acct2, acct3] = await ethers.getSigners();
    const { nft } = await deployContracts();
    await nft.setPause(false)
    await nft.setStartdate(0)
    await nft['mint()']({ value: correctPrice });
    const splitter = await nft.splitter();
    const royaltyInfo = await nft.royaltyInfo(1, correctPrice);

    // royalty amount is 10% of the correctPrice
    const royaltyAmount = correctPrice.div(10);

    expect(royaltyInfo[0]).to.equal(splitter);
    expect(royaltyInfo[1]).to.equal(royaltyAmount);

    // change the royalty percentage to 20% and confirm it works
    await nft.setRoyaltyPercentage(acct3.address, 2000)

    const newRoyaltyInfo = await nft.royaltyInfo(1, correctPrice);
    // royalty amount is 20% of the correctPrice
    const newRoyaltyAmount = correctPrice.div(5);

    expect(newRoyaltyInfo[0]).to.equal(acct3.address);
    expect(newRoyaltyInfo[1]).to.equal(newRoyaltyAmount);
  })

  it("must be unpaused", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const { nft } = await deployContracts();
    await nft.setPause(true);
    await nft.setStartdate(0)
    await expect(nft.connect(addr1)['mint()']({ value: correctPrice }))
      .to.be.revertedWith("PAUSED");
  });

  //
  // Minting tests
  //

  it("succeeds to mint", async function () {
    const [owner] = await ethers.getSigners();
    const { nft } = await deployContracts();
    await expect(nft['mint()']({ value: correctPrice }))
      .to.emit(nft, "Transfer")
      .to.be.revertedWith("PAUSED")

    await nft.setPause(false);
    await nft.setStartdate(0)
    await expect(nft['mint()']({ value: correctPrice }))
      .to.emit(nft, "Transfer")
      .withArgs(ethers.constants.AddressZero, owner.address, 1)
  })

  it("succeeds to mint with fallback method", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const { nft } = await deployContracts();
    await nft.setPause(false);
    await nft.setStartdate(0)

    const correctPrice = await nft.price()
    // send ether to an address
    await expect(addr2.sendTransaction({ to: nft.address, value: correctPrice }))
      .to.emit(nft, "Transfer")
      .withArgs(ethers.constants.AddressZero, addr2.address, 1)

    const balance = await nft.balanceOf(addr2.address);
    expect(balance).to.equal(1);

  })


  it("succeeds to mint with explicit recipient", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const { nft } = await deployContracts();
    await expect(nft['mint(address)'](addr1.address, { value: correctPrice }))
      .to.be.revertedWith("PAUSED")

    await nft.setPause(false);
    await nft.setStartdate(0)
    await expect(nft['mint(address)'](addr1.address, { value: correctPrice }))
      .to.emit(nft, "Transfer")
      .withArgs(ethers.constants.AddressZero, addr1.address, 1)
  })

  it("succeeds to mint with explicit quantity", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const { nft } = await deployContracts();
    await expect(nft.connect(addr1)['mint(uint256)'](1, { value: correctPrice }))
      .to.be.revertedWith("PAUSED")

    await nft.setPause(false);
    await nft.setStartdate(0)
    await expect(nft.connect(addr1)['mint(uint256)'](1, { value: correctPrice }))
      .to.emit(nft, "Transfer")
      .withArgs(ethers.constants.AddressZero, addr1.address, 1)
  })

  it("succeeds to mint with explicit recipient and quantity", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const { nft } = await deployContracts();
    await expect(nft['mint(address,uint256)'](addr1.address, 1, { value: correctPrice }))
      .to.be.revertedWith("PAUSED")

    await nft.setPause(false);
    await nft.setStartdate(0)
    await expect(nft['mint(address,uint256)'](addr1.address, 1, { value: correctPrice }))
      .to.emit(nft, "Transfer")
      .withArgs(ethers.constants.AddressZero, addr1.address, 1)
  })

  it("succeeds to batch mint", async function () {
    const [owner, addr2] = await ethers.getSigners();
    const { nft } = await deployContracts();
    await nft.setPause(false);
    await nft.setStartdate(0)
    await expect(nft['mint(uint256)'](5, { value: correctPrice.mul(5) }))
      .to.emit(nft, "Transfer")
      .withArgs(ethers.constants.AddressZero, owner.address, 1)
      .withArgs(ethers.constants.AddressZero, owner.address, 2)
      .withArgs(ethers.constants.AddressZero, owner.address, 3)
      .withArgs(ethers.constants.AddressZero, owner.address, 4)
      .withArgs(ethers.constants.AddressZero, owner.address, 5)


    await expect(nft.connect(addr2)['mint(uint256)'](3, { value: correctPrice.mul(3) }))
      .to.emit(nft, "Transfer")
      .withArgs(ethers.constants.AddressZero, addr2.address, 6)
      .withArgs(ethers.constants.AddressZero, addr2.address, 7)
      .withArgs(ethers.constants.AddressZero, addr2.address, 8)

    await expect(nft['mint(uint256)'](2, { value: correctPrice.mul(2) }))
      .to.be.revertedWith("CAN'T MINT BESIDES QUANTITY OF 1, 3 OR 5")

    await expect(nft['mint(uint256)'](3, { value: correctPrice.mul(5) }))
      .to.emit(nft, "Transfer")
      .withArgs(ethers.constants.AddressZero, owner.address, 9)
      .withArgs(ethers.constants.AddressZero, owner.address, 10)
      .withArgs(ethers.constants.AddressZero, owner.address, 11)

    await expect(nft['mint(uint256)'](5, { value: correctPrice.mul(3) }))
      .to.be.revertedWith("WRONG PRICE")
  })

  it("token ID is correctly correlated", async function () {
    const { nft } = await deployContracts();
    await nft.setPause(false);
    await nft.setStartdate(0)
    await nft['mint()']({ value: correctPrice });
    const tokenID = await nft.totalSupply()
    expect(tokenID).to.equal(1);
  })

  it("validate second mint event", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const { nft } = await deployContracts();
    await nft.setPause(false)
    await nft.setStartdate(0)
    await expect(nft['mint()']({ value: correctPrice }))
      .to.emit(nft, "Transfer")
      .withArgs(ethers.constants.AddressZero, owner.address, 1);
    await expect(nft.connect(addr1)['mint()']({ value: correctPrice }))
      .to.emit(nft, "Transfer")
      .withArgs(ethers.constants.AddressZero, addr1.address, 2);
  });

  it("checks whether mint fails with wrong price and succeeds even when price = 0", async function () {
    const [owner] = await ethers.getSigners();
    const { nft } = await deployContracts();
    await nft.setPause(false);
    await nft.setStartdate(0)
    await expect(nft['mint()']())
      .to.be.revertedWith("WRONG PRICE");
    await nft.setPrice("0")

    await expect(nft['mint()']()).to.emit(nft, "Transfer")
      .withArgs(ethers.constants.AddressZero, owner.address, 1);
  });

  it("adminMint from owner address", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const { nft } = await deployContracts();
    await nft.adminMint(addr1.address, 1);
    expect(await nft.ownerOf(1)).to.equal(addr1.address);
  });

  it("mints out and throws an error afterwards", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const { nft } = await deployContracts();
    await nft.setPrice(0)
    const maxSupply_ = await nft.MAX_SUPPLY();
    await nft.setPause(false)
    await nft.setStartdate(0)

    for (let i = 0; i < maxSupply_; i++) {
      await nft['mint()']();
    }

    await expect(nft['mint()']())
      .to.be.revertedWith("MAX SUPPLY REACHED");

    await expect(nft['mint(uint256)'](3))
      .to.be.revertedWith("MAX SUPPLY REACHED");

  })

  it("almost mints out then tries to mint more than are left", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const { nft } = await deployContracts();
    const price = await nft.price()
    await nft.setPrice(0)
    const maxSupply_ = await nft.MAX_SUPPLY();
    await nft.setPause(false)
    await nft.setStartdate(0)

    const triesToBuy = 5
    const leftover = 2

    for (let i = 0; i < maxSupply_.sub(leftover); i++) {
      await nft['mint()']();
    }
    await nft.setPrice(price)
    await nft.setSplitter(addr2.address)

    const splitter = await nft.splitter()
    expect(splitter).to.not.equal(splitterAddress)

    const cost = price.mul(triesToBuy)
    const correctCost = price.mul(leftover)

    const ethBalanceBefore = await ethers.provider.getBalance(addr1.address);
    const splitterBalanceBefore = await ethers.provider.getBalance(splitter);

    // tries to mint 5, but in fact only mints the remaining 2
    // sends enough money to pay for 5 but is refunded the difference
    const tx = await nft.connect(addr1)['mint(uint256)'](triesToBuy, { value: cost })
    const receipt = await tx.wait()
    // console.log({ logs: receipt.logs.map(l => l.topics.map(t => t.indexOf('0x0000000000000000000000000') > -1 ? BigInt(t) : t)) })
    // console.log({ addr1: addr1.address, splitter, correctPrice, cost, correctCost, calc: cost.sub(correctCost) })
    // await expect(tx)
    //   .to.emit(nft, "EthMoved")
    //   .withArgs(splitter, true, "0x", correctPrice)
    //   .withArgs(addr1.address, true, "0x", cost.sub(correctCost))

    const splitterBalanceAfter = await ethers.provider.getBalance(splitter);
    expect(splitterBalanceAfter.sub(splitterBalanceBefore)).to.equal(correctCost)

    const balance = await nft.balanceOf(addr1.address);
    expect(balance).to.equal(leftover);

    const gasUsed = receipt.gasUsed
    const gasPrice = await tx.gasPrice
    const gasCost = gasUsed.mul(gasPrice)

    const ethBalanceAfter = await ethers.provider.getBalance(addr1.address);

    const ethSpent = ethBalanceBefore.sub(ethBalanceAfter).sub(gasCost)
    const spent = ethers.utils.formatEther(ethSpent.toString(), 'ether')
    const correctSpent = ethers.utils.formatEther(correctCost.toString(), 'ether')
    expect(spent.toString()).to.equal(correctSpent.toString())
  })

  it.skip("contract contains correct merkle root", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const { nft } = await deployContracts();

    // last export of merkleAddresses was 0
    expect(merkleAddresses.length).to.equal(0)
    const tree = new MerkleTree(
      merkleAddresses.map(ethers.utils.keccak256),
      ethers.utils.keccak256,
      { sortPairs: true },
    );

    const daowRoot = await nft.merkleRoot()
    const treeRoot = "0x" + tree.getRoot().toString('hex')
    expect(daowRoot).to.equal(treeRoot);
  })

  it("correctly mints using allowlist created for tests", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const { nft } = await deployContracts();

    const addresses = [owner.address, addr1.address]

    const tree = new MerkleTree(
      addresses.map(ethers.utils.keccak256),
      ethers.utils.keccak256,
      { sortPairs: true },
    );

    const newRoot = "0x" + tree.getRoot().toString('hex')
    await nft.setMerkleRoot(newRoot)

    const contractRoot = await nft.merkleRoot()
    expect(contractRoot).to.equal(newRoot);

    const hashedAddress = ethers.utils.keccak256(owner.address);
    const hexProof = tree.getHexProof(hashedAddress);

    await nft.setPrice(0)
    await nft.setPause(false)
    await nft.setPremint(0)

    await expect(nft.mintAllowList(1, hexProof))
      .to.emit(nft, "Transfer")

    const balance = await nft.balanceOf(owner.address);
    expect(balance).to.equal(1);

    const failHashedAddress = ethers.utils.keccak256(addr2.address);
    const failHexProof = tree.getHexProof(failHashedAddress);
    await expect(nft.connect(addr2).mintAllowList(1, failHexProof))
      .to.be.revertedWith("You are not on the allowlist");
  })

  it("correctly mints using allowlist created for tests after premint period", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const { nft } = await deployContracts();
    await nft.setPause(false)
    await nft.setPrice(0)

    const addresses = [owner.address, addr1.address]

    const tree = new MerkleTree(
      addresses.map(ethers.utils.keccak256),
      ethers.utils.keccak256,
      { sortPairs: true },
    );

    const newRoot = "0x" + tree.getRoot().toString('hex')
    await nft.setMerkleRoot(newRoot)

    const hashedAddress = ethers.utils.keccak256(owner.address);
    const hexProof = tree.getHexProof(hashedAddress);

    const now = (await ethers.provider.getBlock('latest')).timestamp;
    const oneweek = 604800
    const premint = now + oneweek
    await nft.setPremint(premint)

    const newpremint = await nft.premint()
    expect(newpremint).to.equal(premint);

    const timeUntilPremint = premint - now
    await ethers.provider.send('evm_increaseTime', [timeUntilPremint])

    await expect(nft.mintAllowList(1, hexProof))
      .to.emit(nft, "Transfer")
      .withArgs(ethers.constants.AddressZero, owner.address, 1)

  })



  it("correctly allows minting after start time", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const { nft } = await deployContracts();
    // get current block time
    const blockTime = (await ethers.provider.getBlock('latest')).timestamp;

    // add 1 day to block time
    const startTime = blockTime + 86400
    await nft.setStartdate(startTime)
    await nft.setPause(false)
    await nft.setPrice(0)
    await expect(nft['mint()']())
      .to.be.revertedWith("PAUSED");
    await ethers.provider.send('evm_increaseTime', [86401])
    await expect(nft['mint()']()).to.emit(nft, "Transfer")
      .to.emit(nft, "Transfer")
  })

  //
  // TransferFrom tests
  //

  it("allows for tokens to be queried by owner no matter the order of minting by 1", async function () {
    const signers = await ethers.getSigners();
    const { nft } = await deployContracts();
    await nft.setPause(false)
    await nft.setStartdate(0)
    let counts = []
    for (let i = 0; i < maxSupply; i++) {
      const signer = signers[i % signers.length]
      await nft.connect(signer)['mint()']({ value: correctPrice });
      counts[i % signers.length] = counts[i % signers.length] ? counts[i % signers.length] + 1 : 1
    }
    for (let i = 0; i < signers.length; i++) {
      const signer = signers[i]
      const tokens = await nft.tokensOfOwner(signer.address)
      expect(tokens.length).to.equal(counts[i])
    }
  })

  it("allows for tokens to be queried by owner no matter the order of minting by 3", async function () {
    const signers = await ethers.getSigners();
    const { nft } = await deployContracts();
    await nft.setPause(false)
    await nft.setStartdate(0)
    let counts = []
    for (let i = 0; i < (maxSupply / 3); i++) {
      const signer = signers[i % signers.length]
      await nft.connect(signer)['mint(uint256)'](3, { value: correctPrice.mul(3) });
      counts[i % signers.length] = counts[i % signers.length] ? counts[i % signers.length] + 3 : 3
    }
    for (let i = 0; i < signers.length; i++) {
      const signer = signers[i]
      const tokens = await nft.tokensOfOwner(signer.address)
      expect(tokens.length).to.equal(counts[i])
    }
  })

});
