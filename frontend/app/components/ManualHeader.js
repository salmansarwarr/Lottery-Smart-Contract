"use client";

import { useEffect } from "react";
import { useMoralis } from "react-moralis";

const ManualHeader = () => {
    const {
        enableWeb3,
        account,
        isWeb3Enabled,
        Moralis,
        deactivateWeb3,
        isWeb3EnableLoading,
    } = useMoralis();

    useEffect(() => {
        if (isWeb3Enabled) return;
        if (localStorage.getItem("connected") == "inject") {
            enableWeb3();
        }
    }, [isWeb3Enabled]);

    useEffect(() => {
        Moralis.onAccountChanged((account) => {
            if (!account) {
                localStorage.removeItem("connected");
                deactivateWeb3();
            }
        });
    }, []);

    return (
        <div className="p-5 border-b-2">
            {account ? (
                <div className="ml-auto py-2 px-4">
                    Connected to {account.slice(0, 6)}...
                    {account.slice(account.length - 4)}
                </div>
            ) : (
                <button
                    onClick={async () => {
                        await enableWeb3();
                        localStorage.setItem("connected", "inject");
                    }}
                    disabled={isWeb3EnableLoading}
                    className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded ml-auto"
                >
                    Connect
                </button>
            )}
        </div>
    );
};

export default ManualHeader;
