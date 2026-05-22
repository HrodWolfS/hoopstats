import { Suspense } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/top-bar";
import { Footer } from "@/components/layout/footer";

export function generateStaticParams() {
  return [{ locale: "fr" }];
}

export default function LocaleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex">
      <Sidebar />
      <main className="flex-1 min-w-0 pl-[220px] flex flex-col">
        <Suspense
          fallback={<div className="h-14 border-b border-white/[0.06]" />}
        >
          <TopBar />
        </Suspense>
        <div className="px-8 lg:px-12 py-8 max-w-[1400px] mx-auto w-full flex-1">
          {children}
        </div>
        <Footer />
      </main>
    </div>
  );
}
