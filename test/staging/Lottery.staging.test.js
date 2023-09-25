const { network, getNamedAccounts, deployments, ethers } = require("hardhat");
const {
    developmentChains,
    networkConfig,
} = require("../../helper-hardhat.config");
const { assert, expect } = require("chai");

developmentChains.includes(network.name)
    ? describe.skip
    : describe("Lottery Staging Tests", () => {
          let lottery, entryFee, deployer;

          beforeEach(async () => {
              deployer = (await getNamedAccounts()).deployer;
              lottery = await ethers.getContract("Lottery", deployer);
              entryFee = await lottery.getEntryFee();
          });

          describe("fulfillRandomWords", () => {
              it("works with live chainlink keepers and chainlink vrf, we get a random winner", async () => {
                  const startingTimeStamp = await lottery.getLatestTimeStamp();
                  const accounts = await ethers.getSigners();

                  await new Promise(async (resolve, reject) => {
                      lottery.once("WinnerPicked", async () => {
                          console.log("WinnerPicked event fired!");
                          try {
                              const recentWinner =
                                  await lottery.getRecentWinner();
                              const lotteryState =
                                  await lottery.getLotteryState();
                              const winnerEndingBalance =
                                  await accounts[0].provider.getBalance(
                                      accounts[0]
                                  );
                              const endingTimeStamp =
                                  await lottery.getLatestTimeStamp();

                              await expect(lottery.getPlayer(0)).to.be.reverted;
                              assert.equal(
                                  recentWinner.toString(),
                                  accounts[0].address
                              );
                              assert.equal(lotteryState, 0);
                              assert.equal(
                                  winnerEndingBalance.toString(),
                                  (winnerStartingBalance + entryFee).toString()
                              );
                              assert(endingTimeStamp > startingTimeStamp);
                          } catch (e) {
                              console.log(e);
                              reject(e);
                          }
                          resolve();
                        });
                        const tx = await lottery.enterLottery({
                            value: entryFee,
                        });
                        await tx.wait(1);
                        console.log("Ok, time to wait...");
                        const winnerStartingBalance =
                            await accounts[0].provider.getBalance(accounts[0]);
                  });
              });
          });
      });
