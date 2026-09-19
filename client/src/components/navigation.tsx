import { Link, useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ExternalLink, Github, Hash } from "lucide-react";

const CONTRACT_URL = "https://etherscan.io/address/0xE5544a2A5fA9b175da60D8Eec67adD5582bB31b0";
const REPOSITORY_URL = "https://github.com/wassoshi/HashToken-Website";

export function Navigation() {
  const [location] = useLocation();
  const isHome = location === "/";
  
  return (
    <nav className="sticky top-0 z-50 border-b bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/75">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2" aria-label="HashToken overview">
          <Hash className="h-6 w-6 text-red-500" />
          <span className="text-lg font-semibold">HashToken</span>
          <Badge variant="outline" className="text-xs">HTK</Badge>
        </Link>

        <div className="flex items-center gap-1 sm:gap-2">
          {isHome ? (
            <>
              <a href="#history" className="hidden rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground sm:block">
                History
              </a>
              <a href="#contract" className="hidden rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground sm:block">
                Contract
              </a>
              <Button variant="ghost" size="sm" asChild>
                <a href={REPOSITORY_URL} target="_blank" rel="noopener noreferrer" aria-label="View HashToken website source on GitHub">
                  <Github className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Source</span>
                </a>
              </Button>
              <Button size="sm" asChild>
                <a href={CONTRACT_URL} target="_blank" rel="noopener noreferrer">
                  <span className="hidden sm:inline">Verified contract</span>
                  <ExternalLink className="h-4 w-4 sm:ml-2" />
                </a>
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
