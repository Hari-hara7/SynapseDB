"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Database,
  Layers,
  Search,
  UploadCloud,
  Sparkles,
  Network,
  Wand2,
  TableProperties,
  Gauge,
  Menu,
  X,
  ChevronRight,
  Home,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "Home", href: "/", icon: Home },
  { name: "Smart Query", href: "/smart-query", icon: Sparkles, badge: "New" },
  { name: "Query Pipeline", href: "/query-pipeline", icon: Gauge, badge: "Production" },
  { name: "SQL Generator", href: "/query-generator", icon: Wand2 },
  { name: "Query Executor", href: "/query-executor", icon: TableProperties },
  { name: "Hybrid Query", href: "/hybrid", icon: Layers },
  { name: "Document Search", href: "/query", icon: Search },
  { name: "Upload Files", href: "/upload-enhanced", icon: UploadCloud },
  { name: "Data Ingestion", href: "/ingestion", icon: Database },
  { name: "Database", href: "/db", icon: Network },
];

export function Navbar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-black/95 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          
          {/* Logo (Left Corner) */}
          <Link href="/" className="flex items-center gap-2 text-white">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-white/20 to-white/5 border border-white/20">
              <Database className="size-5" />
            </div>
            <span className="text-lg font-semibold">SynapseDB</span>
          </Link>

          {/* Desktop Navigation (Centered) */}
          <div className="hidden lg:flex flex-1 justify-center">
            <div className="flex items-center space-x-1">
              {navigation.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      "group relative flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all",
                      isActive
                        ? "bg-white/10 text-white"
                        : "text-white/60 hover:bg-white/5 hover:text-white"
                    )}
                  >
                    <item.icon className="size-4 flex-shrink-0" />
                    <span className="hidden xl:inline">{item.name}</span>
                    {item.badge && (
                      <span
                        className={cn(
                          "hidden xl:inline rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider",
                          item.badge === "New"
                            ? "bg-emerald-500/20 text-emerald-300"
                            : "bg-purple-500/20 text-purple-300"
                        )}
                      >
                        {item.badge}
                      </span>
                    )}
                    {isActive && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white" />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Right Corner (Mobile Menu Button) */}
          <div className="flex lg:hidden">
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-lg p-2 text-white/80 hover:bg-white/10 hover:text-white"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <span className="sr-only">Open main menu</span>
              {mobileMenuOpen ? (
                <X className="size-6" aria-hidden="true" />
              ) : (
                <Menu className="size-6" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-white/10 bg-black/95 backdrop-blur-xl">
          <div className="space-y-1 px-4 pb-3 pt-2">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center justify-between rounded-lg px-3 py-2.5 text-base font-medium transition-all",
                    isActive
                      ? "bg-white/10 text-white"
                      : "text-white/60 hover:bg-white/5 hover:text-white"
                  )}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <div className="flex items-center gap-3">
                    <item.icon className="size-5" />
                    <span>{item.name}</span>
                    {item.badge && (
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                          item.badge === "New"
                            ? "bg-emerald-500/20 text-emerald-300"
                            : "bg-purple-500/20 text-purple-300"
                        )}
                      >
                        {item.badge}
                      </span>
                    )}
                  </div>
                  {isActive && <ChevronRight className="size-5" />}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </nav>
  );
}
