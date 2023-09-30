"use client";

import { NotificationProvider } from "web3uikit";

const MyNotificationProvider = ({ children }) => {
    return <NotificationProvider>{children}</NotificationProvider>;
};

export default MyNotificationProvider;
