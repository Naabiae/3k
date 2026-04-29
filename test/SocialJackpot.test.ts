import { expect } from "chai";
import { network } from "hardhat";

describe("SocialJackpot Feature", function () {
  let ethers: any;
  let mockERC20: any;
  let jackpot: any;
  
  let owner: any;
  let feeRecipient: any;
  let p1: any, p2: any, p3: any, p4: any;
  let signers: any[];

  before(async function() {
    const net = await network.getOrCreate();
    ethers = net.ethers;
  });

  beforeEach(async function () {
    signers = await ethers.getSigners();
    owner = signers[0];
    feeRecipient = signers[5];
    p1 = signers[1];
    p2 = signers[2];
    p3 = signers[3];
    p4 = signers[4];

    const MockERC20 = await ethers.getContractFactory("MockERC20");
    mockERC20 = await MockERC20.deploy("Mock USDC", "USDC");
    await mockERC20.waitForDeployment();

    const SocialJackpot = await ethers.getContractFactory("SocialJackpot");
    jackpot = await SocialJackpot.deploy(feeRecipient.address);
    await jackpot.waitForDeployment();

    // Mint funds and approve
    for (let i = 1; i <= 4; i++) {
        await mockERC20.mint(signers[i].address, ethers.parseUnits("100", 18));
        await mockERC20.connect(signers[i]).approve(await jackpot.getAddress(), ethers.MaxUint256);
    }
  });

  it("should create a room correctly", async function () {
    expect(await jackpot.feeRecipient()).to.equal(feeRecipient.address);
    expect(await jackpot.PLATFORM_FEE_BPS()).to.equal(200n);

    const tx = await jackpot.connect(p1).createRoom(
        await mockERC20.getAddress(),
        ethers.parseUnits("10", 18),
        4, // 4 max participants
        2  // 2 winners
    );
    const receipt = await tx.wait();
    
    // Check state
    const room = await jackpot.rooms(0);
    expect(room.creator).to.equal(p1.address);
    expect(room.entryFee).to.equal(ethers.parseUnits("10", 18));
    expect(room.maxParticipants).to.equal(4n);
    expect(room.numWinners).to.equal(2n);
    expect(room.state).to.equal(0n); // Open
  });

  it("should handle full entry and voting phase transition", async function () {
    await jackpot.createRoom(await mockERC20.getAddress(), ethers.parseUnits("10", 18), 4, 2);

    await jackpot.connect(p1).enterRoom(0, "Vote for me P1");
    await jackpot.connect(p2).enterRoom(0, "Vote for me P2");
    await jackpot.connect(p3).enterRoom(0, "Vote for me P3");
    
    let room = await jackpot.rooms(0);
    expect(room.state).to.equal(0n); // Still Open

    // Last person enters
    await jackpot.connect(p4).enterRoom(0, "Vote for me P4");

    room = await jackpot.rooms(0);
    expect(room.state).to.equal(1n); // Voting
  });

  it("should resolve winners and split pot correctly", async function () {
    await jackpot.createRoom(await mockERC20.getAddress(), ethers.parseUnits("10", 18), 4, 2);

    await jackpot.connect(p1).enterRoom(0, "P1");
    await jackpot.connect(p2).enterRoom(0, "P2");
    await jackpot.connect(p3).enterRoom(0, "P3");
    await jackpot.connect(p4).enterRoom(0, "P4");

    const p1BalBefore = await mockERC20.balanceOf(p1.address); // 90
    const p2BalBefore = await mockERC20.balanceOf(p2.address); // 90
    const p3BalBefore = await mockERC20.balanceOf(p3.address); // 90

    // P1 votes for P2
    await jackpot.connect(p1).vote(0, p2.address);
    // P2 votes for P1
    await jackpot.connect(p2).vote(0, p1.address);
    // P3 votes for P1
    await jackpot.connect(p3).vote(0, p1.address);
    // P4 votes for P2
    const feeRecipientBalBefore = await mockERC20.balanceOf(feeRecipient.address);

    // This should trigger resolveRoom.
    // Votes: P1(2), P2(2), P3(0), P4(0). Total pot: 40. Top 2 winners are P1 and P2.
    // Platform gets 2% (0.8), winners split the remaining 39.2 and get 19.6 each.
    await jackpot.connect(p4).vote(0, p2.address);

    const room = await jackpot.rooms(0);
    expect(room.state).to.equal(2n); // Closed

    const p1BalAfter = await mockERC20.balanceOf(p1.address);
    const p2BalAfter = await mockERC20.balanceOf(p2.address);
    const p3BalAfter = await mockERC20.balanceOf(p3.address);
    const feeRecipientBalAfter = await mockERC20.balanceOf(feeRecipient.address);

    // P1 and P2 should have received 19.6 each after the 2% platform fee
    expect(p1BalAfter - p1BalBefore).to.equal(ethers.parseUnits("19.6", 18));
    expect(p2BalAfter - p2BalBefore).to.equal(ethers.parseUnits("19.6", 18));
    expect(feeRecipientBalAfter - feeRecipientBalBefore).to.equal(ethers.parseUnits("0.8", 18));
    
    // P3 gets nothing
    expect(p3BalAfter).to.equal(p3BalBefore);
  });
});
