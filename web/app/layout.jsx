import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SmoothScroller from "./_components/SmoothScroller";
import BlurProvider from "@/components/BlurProvider";

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body>
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