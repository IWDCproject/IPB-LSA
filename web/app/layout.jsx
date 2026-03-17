import "./globals.css";
import Header from "@/components/Header";

export const metadata = {
  title: "IPB Lucky Sport & Arts",
  description: "Platform kompetisi olahraga dan seni IPB University",
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body>
        <Header />
        <main>
          {children}
        </main>
      </body>
    </html>
  );
}