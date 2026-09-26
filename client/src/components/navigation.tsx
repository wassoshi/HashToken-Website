import { Link, useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Hash } from "lucide-react";
import hashTokenLogo from "@assets/image_1757206689096.png";

export function Navigation() {
  const [location] = useLocation();
  const isHome = location === "/";
  
  return (
    <nav className="sticky top-0 z-50 border-b bg-background/90 backdrop-blur-xl supports-[backdrop-filter]:bg-background/75">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="group flex items-center gap-2.5" aria-label="HashToken overview">
          <img
            src={hashTokenLogo}
            alt=""
            className="h-8 w-8 rounded-full object-cover ring-1 ring-red-500/40 transition-transform group-hover:scale-105"
          />
          <span className="text-lg font-semibold tracking-tight">HashToken</span>
          <Badge variant="outline" className="text-xs">HTK</Badge>
        </Link>

        <div className="flex items-center gap-1 sm:gap-2">
          {isHome ? (
            <>
              <a href="#about" className="hidden rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground sm:block">
                How it works
              </a>
              <a href="#history" className="hidden rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground sm:block">
                Mining history
              </a>
              <Button variant="outline" size="sm" asChild>
                <Link href="/hash-calculator">
                  <Hash className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Simulator</span>
                </Link>
              </Button>
            </>
          ) : (
            <Button variant="outline" size="sm" asChild>
              <Link href="/">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to overview
              </Link>
            </Button>
          )}
        </div>
      </div>
    </nav>
  );
}
