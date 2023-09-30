import MyMoralisProvider from "./providers/MyMoralisProvider";
import "./globals.css";
import { Inter } from "next/font/google";
import MyNotificationProvider from "./providers/MyNotificationProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
    title: "Smart Contract Lottery",
    description: "A Smart Contract Lottery website",
};

export default function RootLayout({ children }) {
    return (
        <html lang="en">
            <body className={inter.className}>
                <MyMoralisProvider>
                    <MyNotificationProvider>{children}</MyNotificationProvider>
                </MyMoralisProvider>
            </body>
        </html>
    );
}
