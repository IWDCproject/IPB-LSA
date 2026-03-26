import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SmoothScroller from "./_components/SmoothScroller";

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body>
        <SmoothScroller>
          <Header />
          <main>{children}</main>
          {/* <Footer /> */}
        </SmoothScroller>
      </body>
    </html>
  );
}