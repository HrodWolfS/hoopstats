import { Suspense } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/top-bar";
import { Footer } from "@/components/layout/footer";
import { CommandPalette } from "@/components/ui/command-palette";
import { PageTransition } from "@/components/ui/page-transition";

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
      {/* Sidebar desktop (md+) */}
      <Suspense
        fallback={<div className="hidden md:block w-[220px] shrink-0" />}
      >
        <Sidebar />
      </Suspense>

      {/* Contenu principal */}
      <main className="flex-1 min-w-0 md:pl-[220px] flex flex-col">
        <Suspense
          fallback={<div className="h-14 border-b border-white/[0.06]" />}
        >
          <TopBar />
        </Suspense>
        <div className="px-4 md:px-8 lg:px-12 py-6 md:py-8 max-w-[1400px] mx-auto w-full flex-1">
          <PageTransition>{children}</PageTransition>
        </div>
        <Footer />
      </main>

      <CommandPalette />
    </div>
  );
}
