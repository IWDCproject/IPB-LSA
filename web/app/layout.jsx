import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SmoothScroller from "./_components/SmoothScroller";
import BlurProvider from "@/components/BlurProvider";
import NextTopLoader from "nextjs-toploader";

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body>
        <NextTopLoader
          color="#1e3a8a"
          height={3}
          showSpinner={false}
          easing="ease"
          speed={200}
          crawlSpeed={100}
          initialPosition={0.4}
        />
        <BlurProvider>
          <SmoothScroller>
            <Header />
            <main>{children}</main>
            {/* <Footer /> */}
          </SmoothScroller>
        </BlurProvider>
      </body>
    </html>
  );
}