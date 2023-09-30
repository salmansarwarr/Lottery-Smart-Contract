"use client";

import { useWeb3Contract, useMoralis } from "react-moralis";
import { abi, addresses } from "../constants";
import { useEffect, useState } from "react";
import { ethers } from "ethers";
import { useNotification } from "web3uikit";

const LotteryEntrance = () => {
    const { chainId: chainIdHex, isWeb3Enabled } = useMoralis();
    const chainId = parseInt(chainIdHex);
    const lotteryAddress = chainId in addresses ? addresses[chainId][0] : null;
    const [entryFee, setEntryFee] = useState("0");
    const [numPlayers, setNumPlayers] = useState("0");
    const [recentWinner, setRecentWinner] = useState("0");

    const dispatch = useNotification();

    const { runContractFunction: getEntryFee } = useWeb3Contract({
        abi: abi,
        contractAddress: lotteryAddress,
        functionName: "getEntryFee",
        params: {},
    });

    const { runContractFunction: getNumberOfPlayers } = useWeb3Contract({
        abi: abi,
        contractAddress: lotteryAddress,
        functionName: "getNumberOfPlayers",
        params: {},
    });

    const { runContractFunction: getRecentWinner } = useWeb3Contract({
        abi: abi,
        contractAddress: lotteryAddress,
        functionName: "getRecentWinner",
        params: {},
    });

    const {
        runContractFunction: enterLottery,
        isLoading,
        isFetching,
    } = useWeb3Contract({
        abi: abi,
        contractAddress: lotteryAddress,
        functionName: "enterLottery",
        params: {},
        msgValue: entryFee,
    });

    const updateUI = async () => {
        try {
            setEntryFee((await getEntryFee()).toString());
            setNumPlayers((await getNumberOfPlayers()).toString());
            setRecentWinner((await getRecentWinner()).toString());
        } catch (error) {
            console.log(error);
        }
    };

    useEffect(() => {
        if (isWeb3Enabled) {
            updateUI();
        }
    }, [isWeb3Enabled]);

    const handleSuccess = async (tx) => {
        await tx.wait(1);
        handleNewNotification(tx);
        updateUI();
    };

    const handleNewNotification = () => {
        dispatch({
            type: "info",
            message: "Transaction Completed!",
            position: "topR",
        });
    };

    return (
        <div className="p-5">
            <h1 className="py-4 px-4 font-bold text-3xl">Lottery</h1>
            {lotteryAddress ? (
                <div>
                    <button
                        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded ml-auto"
                        onClick={async () => {
                            await enterLottery({
                                onSuccess: handleSuccess,
                                onError: (error) => console.log(error),
                            });
                        }}
                        disabled={isLoading || isFetching}
                    >
                        {isLoading || isFetching ? (
                            <div className="animate-spin spinner-border h-8 w-8 border-b-2 rounded-full"></div>
                        ) : (
                            "Enter Lottery"
                        )}
                    </button>
                    <div className="mt-4">
                        <span className="font-semibold">Entry Fee: </span>
                        {ethers.formatUnits(entryFee, "ether")} ETH
                    </div>
                    <div>
                        {" "}
                        <span className="font-semibold">
                            Number of players:{" "}
                        </span>{" "}
                        {numPlayers}
                    </div>
                    <div>
                        {" "}
                        <span className="font-semibold">
                            Recent Winner:{" "}
                        </span>{" "}
                        {recentWinner}
                    </div>
                </div>
            ) : (
                <div>No Lottery Adress detected!</div>
            )}
        </div>
    );
};

export default LotteryEntrance;
