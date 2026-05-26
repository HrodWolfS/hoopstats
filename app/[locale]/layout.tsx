import { Suspense } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/top-bar";
import { Footer } from "@/components/layout/footer";
import { CommandPalette } from "@/components/ui/command-palette";
import { PageTransition } from "@/components/ui/page-transition";
import { SidebarProvider } from "@/components/layout/sidebar-context";
import { MainWrapper } from "@/components/layout/main-wrapper";

export function generateStaticParams() {
  return [{ locale: "fr" }];
}

export default function LocaleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex">
        {/* Sidebar desktop (md+) */}
        <Suspense
          fallback={<div className="hidden md:block w-[220px] shrink-0" />}
        >
          <Sidebar />
        </Suspense>

        {/* Contenu principal */}
        <MainWrapper>
          <Suspense
            fallback={<div className="h-14 border-b border-white/[0.06]" />}
          >
            <TopBar />
          </Suspense>
          <div className="px-4 md:px-8 lg:px-12 py-6 md:py-8 max-w-[1400px] mx-auto w-full flex-1">
            <PageTransition>{children}</PageTransition>
          </div>
          <Footer />
        </MainWrapper>

        <CommandPalette />
      </div>
    </SidebarProvider>
  );
}
