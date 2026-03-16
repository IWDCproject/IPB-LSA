import "./globals.css";
import Header from "@/components/Header";

export const metadata = {
  title: "IPB Lucky Sport & Arts",
  description: "Platform kompetisi olahraga dan seni IPB University",
};

export default function RootLayout({ children }) {
  return (
    <html lang="id" className="h-full">
      <body className="h-full flex flex-col">
        <Header />
        <main className="flex-1 flex flex-col min-h-0">
          {children}
        </main>
      </body>
    </html>
  );
}