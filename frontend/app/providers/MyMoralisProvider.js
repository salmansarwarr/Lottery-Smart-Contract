"use client";

import { MoralisProvider } from "react-moralis";

const MyMoralisProvider = ({ children }) => {
    return (
        <MoralisProvider initializeOnMount={false}>{children}</MoralisProvider>
    );
};

export default MyMoralisProvider;
