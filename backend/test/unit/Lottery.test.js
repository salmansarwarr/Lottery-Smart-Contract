const { network, getNamedAccounts, deployments, ethers } = require("hardhat");
const {
    developmentChains,
    networkConfig,
} = require("../../helper-hardhat.config");
const { assert, expect } = require("chai");

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Lottery Uint Tests", () => {
          let lottery, vrfCoordinatorV2Mock, entryFee, deployer, interval;
          const chainId = network.config.chainId;

          beforeEach(async () => {
              deployer = (await getNamedAccounts()).deployer;
              await deployments.fixture(["all"]);
              lottery = await ethers.getContract("Lottery", deployer);
              entryFee = await lottery.getEntryFee();
              interval = await lottery.getInterval();
              vrfCoordinatorV2Mock = await ethers.getContract(
                  "VRFCoordinatorV2Mock",
                  deployer
              );
          });

          describe("constructor", () => {
              it("intializes the lottery correctly", async () => {
                  const lotteryState = await lottery.getLotteryState();
                  const interval = await lottery.getInterval();
                  assert.equal(lotteryState.toString(), 0);
                  assert.equal(
                      interval.toString(),
                      networkConfig[chainId]["interval"]
                  );
              });
          });

          describe("enterLottery", () => {
              it("reverts when you don't pay enough", async () => {
                  await expect(
                      lottery.enterLottery()
                  ).to.be.revertedWithCustomError(
                      lottery,
                      "Lottery__notEnoughEthEntered"
                  );
              });
              it("records players when they enter", async () => {
                  await lottery.enterLottery({ value: entryFee });
                  const playerFromContract = await lottery.getPlayer(0);
                  assert.equal(playerFromContract, deployer);
              });
              it("emits event on enter", async () => {
                  await expect(
                      lottery.enterLottery({ value: entryFee })
                  ).to.emit(lottery, "LotteryEnter");
              });
              it("doesn't allow entrance when lottery is calculating", async () => {
                  await lottery.enterLottery({ value: entryFee });

                  await network.provider.send("evm_increaseTime", [
                      Number(interval) + 1,
                  ]);
                  await network.provider.send("evm_mine", []);

                  await lottery.performUpkeep("0x");
                  await expect(
                      lottery.enterLottery({ value: entryFee })
                  ).to.be.revertedWithCustomError(lottery, "Lottery__NotOpen");
              });
          });

          describe("checkUpKeep", () => {
              it("returns false if people haven't sent any ETH", async () => {
                  await network.provider.send("evm_increaseTime", [
                      Number(interval) + 1,
                  ]);
                  await network.provider.send("evm_mine", []);
                  const { upKeepNeeded } =
                      await lottery.checkUpkeep.staticCall("0x");
                  assert(!upKeepNeeded);
              });
              it("returns false if lottery isn't open", async () => {
                  await lottery.enterLottery({ value: entryFee });

                  await network.provider.send("evm_increaseTime", [
                      Number(interval) + 1,
                  ]);
                  await network.provider.send("evm_mine", []);
                  await lottery.performUpkeep("0x");
                  const lotteryState = await lottery.getLotteryState();
                  const { upKeepNeeded } =
                      await lottery.checkUpkeep.staticCall("0x");
                  assert.equal(lotteryState, "1");
                  assert(!upKeepNeeded);
              });
              it("returns false if enough time hasn't passed", async () => {
                  await lottery.enterLottery({ value: entryFee });
                  await network.provider.send("evm_increaseTime", [
                      Number(interval) - 5,
                  ]);
                  await network.provider.send("evm_mine", []);
                  const { upKeepNeeded } =
                      await lottery.checkUpkeep.staticCall("0x");
                  assert(!upKeepNeeded);
              });
              it("returns true if enough time has passed, has players, eth, and is open", async () => {
                  await lottery.enterLottery({ value: entryFee });
                  await network.provider.send("evm_increaseTime", [
                      Number(interval) + 1,
                  ]);
                  await network.provider.send("evm_mine", []);
                  const { upKeepNeeded } =
                      await lottery.checkUpkeep.staticCall("0x");
                  assert(upKeepNeeded);
              });
          });

          describe("performUpKeep", () => {
              it("it can only run when checkUpKeep returns true", async () => {
                  await lottery.enterLottery({ value: entryFee });
                  await network.provider.send("evm_increaseTime", [
                      Number(interval) + 1,
                  ]);
                  await network.provider.send("evm_mine", []);
                  const tx = await lottery.performUpkeep("0x");
                  assert(tx);
              });

              it("reverts when checkupKeep returns false", async () => {
                  await expect(
                      lottery.performUpkeep("0x")
                  ).to.be.revertedWithCustomError(
                      lottery,
                      "Lottery__UpKeepNotNeeded"
                  );
              });

              it("updates the raffle state, emits an event and calls the coordinator", async () => {
                  await lottery.enterLottery({ value: entryFee });
                  await network.provider.send("evm_increaseTime", [
                      Number(interval) + 1,
                  ]);
                  await network.provider.send("evm_mine", []);
                  const tx = await lottery.performUpkeep("0x");
                  const txReciept = await tx.wait(1);
                  const requestId = txReciept.logs[1].args.requestId;
                  const lotteryState = await lottery.getLotteryState();
                  assert(Number(requestId) > 0);
                  assert(lotteryState.toString(), "1");
              });
          });

          describe("fulfillRandomWords", () => {
              beforeEach(async () => {
                  await lottery.enterLottery({ value: entryFee });
                  await network.provider.send("evm_increaseTime", [
                      Number(interval) + 1,
                  ]);
                  await network.provider.send("evm_mine", []);
              });

              it("can only be called after performUpKeep", async () => {
                  await expect(
                      vrfCoordinatorV2Mock.fulfillRandomWords(0, lottery.target)
                  ).to.be.reverted;
              });

              it("picks a winner, resets a lottery and sends money", async () => {
                  const additionalEntrants = 3;
                  const startingAccountIndex = 1;
                  const accounts = await ethers.getSigners();
                  for (
                      let i = startingAccountIndex;
                      i < startingAccountIndex + additionalEntrants;
                      i++
                  ) {
                      const connectedAccount = lottery.connect(accounts[i]);
                      await connectedAccount.enterLottery({ value: entryFee });
                  }
                  const startingTimeStamp = await lottery.getLatestTimeStamp();

                  await new Promise(async (resolve, reject) => {
                      lottery.once("WinnerPicked", async () => {
                          console.log("Found the event!");
                          try {
                              const lotteryState =
                                  await lottery.getLotteryState();
                              const endingTimeStamp =
                                  await lottery.getLatestTimeStamp();
                              const numPlayers =
                                  await lottery.getNumberOfPlayers();
                              const winnerEndingBalance =
                                  await accounts[1].provider.getBalance(
                                      accounts[1]
                                  );
                              const expectedEndingBalance = winnerStartingBalance + (entryFee*3n) + entryFee;
                              assert.equal(numPlayers.toString(), "0");
                              assert.equal(lotteryState.toString(), "0");
                              assert(endingTimeStamp > startingTimeStamp);
                              assert.equal(winnerEndingBalance.toString(), expectedEndingBalance.toString());
                          } catch (e) {
                              reject(e);
                          }
                          resolve();
                      });
                      const winnerStartingBalance =
                          await accounts[1].provider.getBalance(accounts[1]);
                      const tx = await lottery.performUpkeep("0x");
                      const txRecipet = await tx.wait(1);
                      await vrfCoordinatorV2Mock.fulfillRandomWords(
                          txRecipet.logs[1].args.requestId,
                          lottery.target
                      );
                  });
              });
          });
      });
