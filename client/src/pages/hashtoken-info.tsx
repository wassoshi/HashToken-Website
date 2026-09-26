import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Activity,
  Archive,
  ArrowRight,
  Coins,
  Cpu,
  Database,
  ExternalLink,
  Gauge,
  Hash,
  ShieldCheck,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import hashTokenLogo from "@assets/image_1757206689096.png";

interface ContractState {
  blockNumber: number;
  maxValue: string;
  prevHash: string;
  totalSupply: string;
  expectedAttempts: string;
  difficulty: string;
  totalMints?: number;
  transactionCount?: number;
  isOffline?: boolean;
}

interface MintEvent {
  id: number;
  blockNumber: number;
  transactionHash: string;
  minter: string;
  timestamp: string;
  difficulty?: string;
  expectedAttempts?: string;
}

interface SyncStatus {
  status: "ready" | "syncing" | "error";
  eventCount: number;
  checkpointBlock: number | null;
  recentCheckpointBlock?: number | null;
  historyCheckpointBlock?: number | null;
  historyComplete?: boolean;
  historyLastError?: string | null;
  lastSuccessfulSyncAt: string | null;
  lastAttemptAt: string | null;
  lastError: string | null;
}

interface TimelinePoint {
  month: string;
  count: number;
}

const CONTRACT_ADDRESS = "0xE5544a2A5fA9b175da60D8Eec67adD5582bB31b0";
const CONTRACT_URL = `https://etherscan.io/address/${CONTRACT_ADDRESS}`;
const COINGECKO_URL = "https://www.coingecko.com/en/coins/hashtoken";
const REPOSITORY_URL = "https://github.com/wassoshi/HashToken-Website";

export default function HashTokenInfo() {
  const [showAllMintEvents, setShowAllMintEvents] = useState(false);

  const { data: contractState, isLoading: stateLoading } = useQuery<ContractState>({
    queryKey: ['/api/contract/state'],
    refetchInterval: 60 * 60 * 1000, // Refresh hourly
    staleTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    gcTime: 0, // Don't cache old data
  });

  const { data: mintEvents, isLoading: eventsLoading } = useQuery<MintEvent[]>({
    queryKey: ['/api/contract/mint-events'],
    queryFn: () => fetch('/api/contract/mint-events?limit=50').then(res => res.json()),
    refetchInterval: 60 * 60 * 1000, // Refresh hourly
    staleTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
  });

  const { data: miners } = useQuery<Array<{address: string, count: number}>>({
    queryKey: ['/api/contract/miners'],
    queryFn: () => fetch('/api/contract/miners').then(res => res.json()),
    refetchInterval: 60 * 60 * 1000, // Refresh hourly
    staleTime: 60 * 60 * 1000,
  });

  const { data: forecastData } = useQuery<{
    currentMintCount: number;
    currentMaxValue: string;
    currentExpectedAttempts: string;
    currentDifficulty: string;
    forecasts: Array<{
      tokenNumber: number;
      expectedAttempts: string;
      difficulty: string;
      maxValue: string;
    }>;
  }>({
    queryKey: ['/api/contract/forecast'],
    queryFn: () => fetch('/api/contract/forecast').then(res => res.json()),
    refetchInterval: 60 * 60 * 1000, // Refresh hourly
    staleTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
  });

  const { data: syncStatus } = useQuery<SyncStatus>({
    queryKey: ['/api/contract/sync-status'],
    queryFn: () => fetch('/api/contract/sync-status').then(res => res.json()),
    refetchInterval: 60 * 60 * 1000,
    staleTime: 60 * 60 * 1000,
  });

  const { data: timeline } = useQuery<TimelinePoint[]>({
    queryKey: ['/api/contract/timeline'],
    queryFn: async () => {
      const response = await fetch('/api/contract/timeline');
      if (!response.ok) throw new Error('Timeline is unavailable');
      return response.json();
    },
    staleTime: 60 * 60 * 1000,
  });

  const timelineSummary = useMemo(() => {
    const points = timeline ?? [];
    const total = points.reduce((sum, point) => sum + point.count, 0);
    const peak = points.reduce<TimelinePoint | null>(
      (currentPeak, point) => !currentPeak || point.count > currentPeak.count ? point : currentPeak,
      null,
    );

    return {
      points,
      total,
      peak,
      maxCount: peak?.count ?? 0,
    };
  }, [timeline]);

  const formatTimelineMonth = (month: string) => {
    const [year, monthNumber] = month.split('-').map(Number);
    return new Intl.DateTimeFormat('en', { month: 'short', year: 'numeric' }).format(
      new Date(Date.UTC(year, monthNumber - 1, 1)),
    );
  };

  const getTimelineBarWidth = (count: number) => {
    if (timelineSummary.maxCount <= 0) return '0%';
    const scaledWidth = Math.log10(count + 1) / Math.log10(timelineSummary.maxCount + 1);
    return `${Math.max(scaledWidth * 100, 4)}%`;
  };

  const formatLargeNumber = (num: string): string => {
    try {
      const bigNum = BigInt(num);
      const numStr = bigNum.toString();
      
      if (numStr.length > 18) {
        return `${numStr.slice(0, 3)}.${numStr.slice(3, 6)}...E${numStr.length - 1}`;
      } else if (numStr.length > 12) {
        return `${numStr.slice(0, 3)}.${numStr.slice(3, 6)}...E${numStr.length - 1}`;
      } else if (numStr.length > 6) {
        return `${numStr.slice(0, 3)}.${numStr.slice(3, 6)}...`;
      }
      return numStr;
    } catch {
      return num;
    }
  };

  const formatTokenAmount = (amount: string): string => {
    try {
      // The totalSupply from our API is already the correct number of tokens
      const num = parseInt(amount);
      return num.toLocaleString();
    } catch {
      return amount;
    }
  };

  const formatExpectedAttempts = (attempts: string): string => {
    try {
      // Handle scientific notation
      const num = parseFloat(attempts);
      if (num >= 1e15) {
        return `${(num / 1e15).toFixed(1)}Q`;
      } else if (num >= 1e12) {
        return `${(num / 1e12).toFixed(1)}T`;
      } else if (num >= 1e9) {
        return `${(num / 1e9).toFixed(1)}B`;
      } else if (num >= 1e6) {
        return `${(num / 1e6).toFixed(1)}M`;
      } else if (num >= 1e3) {
        return `${(num / 1e3).toFixed(1)}K`;
      }
      return num.toFixed(0);
    } catch {
      return attempts;
    }
  };

  const formatMinerAddress = (address: string): string => {
    if (address.length < 14) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getEstimatedAttempts = (event: MintEvent, eventIndex: number): string | null => {
    if (event.expectedAttempts) return event.expectedAttempts;
    if (!contractState?.expectedAttempts) return null;

    const currentAttempts = Number.parseFloat(contractState.expectedAttempts);
    if (!Number.isFinite(currentAttempts)) return null;

    // Each successful mint increases the expected work by about 1%. The API
    // returns newest-first, so step backward from the current next-mint value.
    const estimatedAttempts = currentAttempts / Math.pow(1.01, eventIndex + 1);
    return estimatedAttempts.toExponential();
  };

  const indexedCount = syncStatus?.eventCount ?? contractState?.transactionCount ?? 0;
  const totalMintCount = contractState ? Number.parseInt(contractState.totalSupply, 10) : 0;
  const missingHistoryCount = Math.max(totalMintCount - indexedCount, 0);
  const historyCoverage = totalMintCount > 0 ? (indexedCount / totalMintCount) * 100 : 0;
  const visibleMintEvents = showAllMintEvents ? (mintEvents ?? []) : (mintEvents ?? []).slice(0, 12);
  const topMiners = (miners ?? []).slice(0, 10);

  if (stateLoading) {
    return (
      <div className="container mx-auto space-y-8 px-4 py-10">
        <div className="mx-auto max-w-3xl space-y-4 text-center">
          <div className="mx-auto h-24 w-24 animate-pulse rounded-full bg-muted" />
          <h1 className="text-4xl font-bold">HashToken (HTK)</h1>
          <p className="text-muted-foreground">Loading current Ethereum contract data…</p>
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((item) => (
            <div key={item} className="h-48 animate-pulse rounded-lg border bg-muted/30" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-7xl space-y-10 px-4 py-6 md:py-8">
      <section id="overview" className="hero-surface relative overflow-hidden rounded-3xl border border-red-500/20 px-6 py-10 shadow-2xl shadow-red-950/10 md:px-10 md:py-14">
        <div className="relative z-10 grid items-center gap-10 lg:grid-cols-[minmax(0,1.25fr)_minmax(18rem,0.75fr)]">
          <div className="space-y-6">
            <Badge variant="outline" className="border-red-500/40 bg-red-500/10 px-3 py-1 text-red-300">
              Ethereum · deployed June 17, 2016
            </Badge>
            <div className="space-y-4">
              <h1 className="max-w-3xl text-5xl font-bold tracking-[-0.04em] sm:text-6xl lg:text-7xl">
                HashToken <span className="text-red-500">HTK</span>
              </h1>
              <p className="max-w-2xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
                An early Ethereum token with proof-of-work issuance encoded in its contract.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button size="lg" asChild>
                <a href="#history">
                  <Archive className="mr-2 h-4 w-4" />
                  Explore mining history
                </a>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <a href="#about">
                  How it works
                  <ArrowRight className="ml-2 h-4 w-4" />
                </a>
              </Button>
            </div>
          </div>

          <div className="mx-auto w-full max-w-sm">
            <div className="relative rounded-3xl border border-white/10 bg-black/30 p-5 shadow-2xl backdrop-blur">
              <div className="absolute -inset-8 -z-10 rounded-full bg-red-500/15 blur-3xl" />
              <div className="flex items-center gap-4 border-b border-white/10 pb-5">
                <img
                  src={hashTokenLogo}
                  alt="HashToken logo"
                  className="h-20 w-20 rounded-full object-cover ring-1 ring-red-500/50"
                />
                <div>
                  <div className="text-xs font-medium uppercase tracking-[0.2em] text-red-300">Contract parameters</div>
                  <div className="mt-1 text-2xl font-semibold">Proof-of-work issuance</div>
                </div>
              </div>
              <dl className="divide-y divide-white/10 py-2 text-sm">
                <div className="flex items-center justify-between gap-4 py-3">
                  <dt className="text-muted-foreground">Hash function</dt>
                  <dd className="font-medium">Keccak-256</dd>
                </div>
                <div className="flex items-center justify-between gap-4 py-3">
                  <dt className="text-muted-foreground">Mint reward</dt>
                  <dd className="font-medium">1 HTK</dd>
                </div>
                <div className="flex items-center justify-between gap-4 py-3">
                  <dt className="text-muted-foreground">Target adjustment</dt>
                  <dd className="font-mono font-medium text-red-400">max_value × 0.99</dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </section>

      {contractState && (
        <Card className="overflow-hidden border-border/80 bg-card/60 shadow-lg shadow-black/10">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4">
            <div className="p-6">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Database className="h-4 w-4 text-emerald-400" />
                Current supply
              </div>
              <div className="mt-3 text-4xl font-semibold tracking-tight tabular-nums">
                {formatTokenAmount(contractState.totalSupply)}
              </div>
              <div className="mt-1 text-sm text-muted-foreground">HTK · one token per successful mint</div>
            </div>
            <div className="border-t p-6 sm:border-l sm:border-t-0">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Gauge className="h-4 w-4 text-red-400" />
                Work expected for next mint
              </div>
              <div className="mt-3 text-4xl font-semibold tracking-tight text-red-400 tabular-nums">
                {formatExpectedAttempts(contractState.expectedAttempts)}
              </div>
              <div className="mt-1 text-sm text-muted-foreground">hash attempts on average</div>
            </div>
            <div className="border-t p-6 lg:border-l lg:border-t-0">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Archive className="h-4 w-4 text-blue-400" />
                Mining history indexed
              </div>
              <div className="mt-3 text-4xl font-semibold tracking-tight tabular-nums">
                {historyCoverage.toFixed(1)}%
              </div>
              <div className="mt-1 text-sm text-muted-foreground">
                {indexedCount.toLocaleString()} of {totalMintCount.toLocaleString()} mint events
              </div>
            </div>
            <div className="border-t p-6 sm:border-l lg:border-t-0">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Activity className="h-4 w-4 text-emerald-400" />
                Status
              </div>
              <div className="mt-3 text-3xl font-semibold tracking-tight">
                {syncStatus?.status === "syncing" ? "Syncing" : syncStatus?.status === "error" ? "Delayed" : "Current"}
              </div>
              <div className="mt-1 text-sm text-muted-foreground">
                {syncStatus?.lastSuccessfulSyncAt
                  ? `updated ${formatDistanceToNow(new Date(syncStatus.lastSuccessfulSyncAt), { addSuffix: true })}`
                  : "Ethereum index status"}
              </div>
            </div>
          </div>
          {syncStatus && (
            <div className="flex flex-col gap-2 border-t bg-muted/10 px-6 py-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
              <span className="inline-flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${syncStatus.status === "error" ? "bg-amber-400" : "bg-emerald-400"}`} />
                {syncStatus.status === "syncing" ? "Ethereum indexing is running" : "Recent Ethereum data is current"}
                {syncStatus.lastSuccessfulSyncAt && ` · checked ${formatDistanceToNow(new Date(syncStatus.lastSuccessfulSyncAt), { addSuffix: true })}`}
              </span>
              {missingHistoryCount > 0 && (
                <span>{missingHistoryCount.toLocaleString()} older events remain in archival recovery</span>
              )}
            </div>
          )}
        </Card>
      )}

      <section id="about" className="scroll-mt-24 rounded-3xl border bg-card/40 p-6 md:p-10">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:items-start">
          <div className="space-y-5">
            <div className="text-xs font-semibold uppercase tracking-[0.22em] text-red-400">Historical context</div>
            <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">Scarcity through computational work</h2>
            <p className="text-base leading-7 text-muted-foreground md:text-lg">
              Deployed during Ethereum&apos;s first year, HashToken is an early example of token issuance governed by computational
              work. It has no fixed supply cap. Instead, mining difficulty increases after every successful mint, causing the
              expected work for successive tokens to grow exponentially. This creates natural scarcity through proof of work.
            </p>
            <a
              href={`${CONTRACT_URL}#code`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-medium text-blue-400 transition-colors hover:text-blue-300 hover:underline"
            >
              <ShieldCheck className="h-4 w-4" />
              Read the 2016 contract source
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>

          <div>
            <h3 className="mb-4 text-lg font-semibold">Minting sequence</h3>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border bg-background/70 p-5">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400">
                  <Cpu className="h-5 w-5" />
                </div>
                <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">01 · Search</div>
                <h4 className="mt-1 font-semibold">Find a valid hash</h4>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Search for a Keccak-256 result below the current target.
                </p>
              </div>
              <div className="rounded-2xl border bg-background/70 p-5">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
                  <Coins className="h-5 w-5" />
                </div>
                <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">02 · Mint</div>
                <h4 className="mt-1 font-semibold">Issue one HTK</h4>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Submit the valid solution to the contract&apos;s <code>mint()</code> function.
                </p>
              </div>
              <div className="rounded-2xl border border-red-500/20 bg-red-500/[0.04] p-5">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10 text-red-400">
                  <Gauge className="h-5 w-5" />
                </div>
                <div className="text-xs font-medium uppercase tracking-wide text-red-300">03 · Adjust</div>
                <h4 className="mt-1 font-semibold">Increase the difficulty</h4>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  The contract increases the difficulty for the next mint.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border bg-muted/10 px-5 py-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="font-semibold">External resources</h3>
            <p className="mt-1 text-sm text-muted-foreground">Contract, token, and market references.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild>
              <a href={CONTRACT_URL} target="_blank" rel="noopener noreferrer">
                <img src="/brands/etherscan.png" alt="" aria-hidden="true" className="mr-2 h-4 w-4 rounded-sm" />
                Etherscan <ExternalLink className="ml-2 h-3.5 w-3.5 text-muted-foreground" />
              </a>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <a href={COINGECKO_URL} target="_blank" rel="noopener noreferrer">
                <img src="/brands/coingecko.png" alt="" aria-hidden="true" className="mr-2 h-4 w-4 rounded-sm" />
                CoinGecko <ExternalLink className="ml-2 h-3.5 w-3.5 text-muted-foreground" />
              </a>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <a href="https://dexscreener.com/ethereum/0x01c0aeaee4f9b9417237aef3556bc1d7bd00ec52" target="_blank" rel="noopener noreferrer">
                <img src="/brands/dexscreener.png" alt="" aria-hidden="true" className="mr-2 h-4 w-4 rounded-sm" />
                DexScreener <ExternalLink className="ml-2 h-3.5 w-3.5 text-muted-foreground" />
              </a>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <a href="https://app.uniswap.org/explore/tokens/ethereum/0xE5544a2A5fA9b175da60D8Eec67adD5582bB31b0" target="_blank" rel="noopener noreferrer">
                <img src="/brands/uniswap.svg" alt="" aria-hidden="true" className="mr-2 h-4 w-4" />
                Uniswap <ExternalLink className="ml-2 h-3.5 w-3.5 text-muted-foreground" />
              </a>
            </Button>
          </div>
        </div>
      </section>

      {/* Main Content Tabs */}
      <Tabs defaultValue="mining" className="w-full scroll-mt-24" id="history">
        <TabsList className="grid h-auto w-full grid-cols-3 rounded-xl border bg-card/60 p-1">
          <TabsTrigger value="mining" className="py-2.5 text-xs sm:text-sm">Mining history</TabsTrigger>
          <TabsTrigger value="analytics" className="py-2.5 text-xs sm:text-sm">Analytics</TabsTrigger>
          <TabsTrigger value="calculator" className="py-2.5 text-xs sm:text-sm">Simulator</TabsTrigger>
        </TabsList>

        <TabsContent value="calculator" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Hash className="h-5 w-5" />
                <span>Educational Mining Simulator</span>
              </CardTitle>
              <CardDescription>Learn about HashToken mining with our interactive calculator</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center space-y-4">
                <div className="space-y-2">
                  <p className="text-muted-foreground">
                    Explore the Keccak-256 search process with demonstration parameters. Live contract values are shown for
                    comparison, but the simulator does not claim that a browser can mine at today&apos;s difficulty.
                  </p>
                  <div className="flex items-center justify-center space-x-2 text-sm text-muted-foreground">
                    <Hash className="h-4 w-4" />
                    <span>No wallet connection and no transaction submission</span>
                  </div>
                </div>
                <div className="flex justify-center">
                  <Button asChild size="lg">
                    <a href="/hash-calculator">
                      <Hash className="h-4 w-4 mr-2" />
                      Open Mining Simulator
                    </a>
                  </Button>
                </div>
              </div>
              
              <Separator />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="font-medium">Simulator Features</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Live contract parameters</li>
                    <li>• Difficulty analysis</li>
                    <li>• Safe demonstration difficulty</li>
                    <li>• Educational explanations</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium">Learn About</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Keccak-256 hashing</li>
                    <li>• Proof-of-work mining</li>
                    <li>• Difficulty progression</li>
                    <li>• Expected attempts</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mining" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Mining history</CardTitle>
              <CardDescription>
                Recent mint events. Estimated attempts are probability-based, not an exact count of failed hashes.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {eventsLoading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : mintEvents && mintEvents.length > 0 ? (
                <div className="mx-auto w-full max-w-4xl">
                  <div className="mb-2 hidden grid-cols-[minmax(0,1fr)_auto_auto] gap-6 px-4 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground md:grid">
                    <span>Mint event</span>
                    <span className="text-right">Estimated work</span>
                    <span className="text-right">Miner / transaction</span>
                  </div>
                  <div className="divide-y rounded-lg border bg-muted/10">
                  {visibleMintEvents.map((event, eventIndex) => {
                    const estimatedAttempts = getEstimatedAttempts(event, eventIndex);
                    return (
                    <div key={event.id} className="px-4 py-3 transition-colors first:rounded-t-lg last:rounded-b-lg hover:bg-muted/30">
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-center md:gap-6">
                        <div className="flex min-w-0 items-center gap-2.5">
                          <Badge variant="outline" className="shrink-0">
                            Block {event.blockNumber.toLocaleString()}
                          </Badge>
                          <span className="truncate text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(event.timestamp), { addSuffix: true })}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-3 md:block md:min-w-[88px] md:text-right">
                          <div className="text-xs text-muted-foreground">Estimated attempts</div>
                          <div className="rounded-md bg-red-500/10 px-2 py-1 font-semibold text-red-500 md:mt-1 md:inline-block">
                            {estimatedAttempts ? formatExpectedAttempts(estimatedAttempts) : 'N/A'}
                          </div>
                        </div>
                        <div className="flex min-w-0 items-center justify-between gap-3 md:justify-end">
                          <a
                            href={`https://etherscan.io/address/${event.minter}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={event.minter}
                            className="truncate text-xs text-muted-foreground hover:text-foreground hover:underline"
                          >
                            {formatMinerAddress(event.minter)}
                          </a>
                          <a
                            href={`https://etherscan.io/tx/${event.transactionHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex shrink-0 items-center gap-1 text-xs text-blue-500 hover:underline"
                          >
                            <ExternalLink className="h-3 w-3" />
                            Tx
                          </a>
                        </div>
                      </div>
                    </div>
                    );
                  })}
                  </div>
                  {mintEvents.length > 12 && (
                    <div className="mt-4 flex justify-center">
                      <Button variant="ghost" size="sm" onClick={() => setShowAllMintEvents((current) => !current)}>
                        {showAllMintEvents ? 'Show fewer events' : `Show ${mintEvents.length - 12} more events`}
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No mining events found</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="overflow-hidden">
            <CardHeader className="border-b bg-muted/10">
              <CardTitle>Difficulty projection</CardTitle>
              <CardDescription className="mt-1">Expected hash attempts at selected future token numbers.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {forecastData ? (
                <div className="grid grid-cols-2 divide-x divide-y sm:grid-cols-4 sm:divide-y-0">
                  <div className="bg-red-500/[0.04] p-5">
                    <div className="text-xs uppercase tracking-wide text-red-300">Current</div>
                    <div className="mt-1 text-sm font-medium">Token #{forecastData.currentMintCount}</div>
                    <div className="mt-4 text-2xl font-semibold text-red-400">
                      {formatExpectedAttempts(forecastData.currentExpectedAttempts)}
                    </div>
                    <div className="text-xs text-muted-foreground">expected attempts</div>
                  </div>
                  {forecastData.forecasts.map((forecast) => (
                    <div key={forecast.tokenNumber} className="p-5">
                      <div className="text-xs uppercase tracking-wide text-muted-foreground">
                        +{forecast.tokenNumber - forecastData.currentMintCount} mints
                      </div>
                      <div className="mt-1 text-sm font-medium">Token #{forecast.tokenNumber}</div>
                      <div className="mt-4 text-2xl font-semibold">
                        {formatExpectedAttempts(forecast.expectedAttempts)}
                      </div>
                      <div className="text-xs text-muted-foreground">expected attempts</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex h-32 items-center justify-center">
                  <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-primary" />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="mt-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Mining Statistics */}
            <Card>
              <CardHeader>
                <CardTitle>Mining Statistics</CardTitle>
                <CardDescription>Key metrics about HashToken mining</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {contractState && (
                  <div className="grid grid-cols-1 gap-4">
                    <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                      <span className="text-sm font-medium">Current Max Value:</span>
                      <span className="text-sm font-mono">{formatLargeNumber(contractState.maxValue)}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                      <span className="text-sm font-medium">Expected Attempts:</span>
                      <span className="text-sm font-bold text-orange-500">
                        {formatExpectedAttempts(contractState.expectedAttempts)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                      <span className="text-sm font-medium">Total Mints:</span>
                      <span className="text-sm">{contractState.totalMints?.toLocaleString() || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                      <span className="text-sm font-medium">Current Block:</span>
                      <span className="text-sm font-mono">{contractState.blockNumber.toLocaleString()}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Difficulty Analysis */}
            <Card>
              <CardHeader>
                <CardTitle>Difficulty Analysis</CardTitle>
                <CardDescription>Understanding HashToken mining difficulty</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="p-3 bg-muted rounded-lg">
                    <h4 className="font-medium mb-2">Mining Mechanism</h4>
                    <p className="text-sm text-muted-foreground">
                      HashToken uses a proof-of-work system where miners must find a hash value less than or equal to max_value.
                    </p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <h4 className="font-medium mb-2">Difficulty Progression</h4>
                    <p className="text-sm text-muted-foreground">
                      After each successful mint, max_value decreases by 1%, making subsequent mints exponentially harder.
                    </p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <h4 className="font-medium mb-2">Contract context</h4>
                    <p className="text-sm text-muted-foreground">
                      The contract was deployed in 2016 and implements token issuance with progressively increasing computational work.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Mint Activity by Month</CardTitle>
              <CardDescription>Recovered on-chain mint events, shown with exact monthly counts</CardDescription>
            </CardHeader>
            <CardContent>
              {timelineSummary.points.length > 0 ? (
                <div className="space-y-6">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-lg border bg-muted/20 p-4">
                      <div className="text-xs uppercase tracking-wide text-muted-foreground">Indexed events</div>
                      <div className="mt-1 text-2xl font-semibold">{timelineSummary.total.toLocaleString()}</div>
                    </div>
                    <div className="rounded-lg border bg-muted/20 p-4">
                      <div className="text-xs uppercase tracking-wide text-muted-foreground">Peak month</div>
                      <div className="mt-1 text-lg font-semibold">
                        {timelineSummary.peak ? formatTimelineMonth(timelineSummary.peak.month) : 'N/A'}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {timelineSummary.peak?.count.toLocaleString() ?? 0} mints
                      </div>
                    </div>
                    <div className="rounded-lg border bg-muted/20 p-4">
                      <div className="text-xs uppercase tracking-wide text-muted-foreground">Active months</div>
                      <div className="mt-1 text-2xl font-semibold">{timelineSummary.points.length}</div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {timelineSummary.points.map((point) => (
                      <div key={point.month} className="grid grid-cols-[5.5rem_minmax(0,1fr)_3.5rem] items-center gap-3">
                        <span className="text-xs font-medium text-muted-foreground">{formatTimelineMonth(point.month)}</span>
                        <div
                          className="h-3 overflow-hidden rounded-full bg-muted"
                          role="img"
                          aria-label={`${formatTimelineMonth(point.month)}: ${point.count.toLocaleString()} mints`}
                        >
                          <div
                            className="h-full rounded-full bg-red-500"
                            style={{ width: getTimelineBarWidth(point.count) }}
                          />
                        </div>
                        <span className="text-right text-sm font-semibold tabular-nums">{point.count.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>

                  <p className="text-center text-xs text-muted-foreground">
                    Bar lengths use a logarithmic scale so quieter months remain visible; the numbers are exact.
                  </p>
                </div>
              ) : (
                <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">Loading activity timeline…</div>
              )}
              {missingHistoryCount > 0 && (
                <p className="mt-3 text-center text-xs text-muted-foreground">
                  This chart covers {historyCoverage.toFixed(1)}% of known mints; archival recovery is still in progress.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Mining Activity Analysis */}
          <Card>
            <CardHeader>
              <CardTitle>Mining Activity Analysis</CardTitle>
              <CardDescription>Recent mining activity and miner distribution</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {miners?.length || 'N/A'}
                    </div>
                    <div className="text-sm text-muted-foreground">Indexed Miners</div>
                  </div>
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {contractState?.totalMints?.toLocaleString() || 'N/A'}
                    </div>
                    <div className="text-sm text-muted-foreground">Total Mints</div>
                  </div>
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <div className="text-2xl font-bold text-orange-600">
                      {mintEvents && mintEvents.length > 0 ? 
                        new Date(mintEvents[0].timestamp).toLocaleDateString() : 'N/A'
                      }
                    </div>
                    <div className="text-sm text-muted-foreground">Latest Mint</div>
                  </div>
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">
                      {contractState ? formatExpectedAttempts(contractState.expectedAttempts) : 'N/A'}
                    </div>
                    <div className="text-sm text-muted-foreground">Expected Work</div>
                  </div>
                </div>

                <Alert>
                  <Activity className="h-4 w-4" />
                  <AlertDescription>
                    The contract reports {contractState?.totalMints?.toLocaleString() || 'N/A'} total mints since 2016.
                    The indexed miner statistics below currently cover {indexedCount.toLocaleString()} recovered events.
                  </AlertDescription>
                </Alert>

                <div className="space-y-3">
                  <h4 className="font-medium">Indexed Miners by Activity</h4>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {topMiners.length > 0 ? (
                      topMiners.map((miner, index) => (
                        <div key={miner.address} className="flex justify-between items-center p-2 bg-muted rounded">
                          <div className="flex items-center space-x-2">
                            <span className="text-xs text-muted-foreground w-6">#{index + 1}</span>
                            <a 
                              href={`https://etherscan.io/address/${miner.address}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm font-mono hover:text-blue-600 dark:hover:text-blue-400 transition-colors underline decoration-dotted underline-offset-2"
                            >
                              {miner.address.slice(0, 6)}...{miner.address.slice(-4)}
                            </a>
                          </div>
                          <span className="text-sm font-bold">{miner.count.toLocaleString()} mints</span>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-4 text-muted-foreground">
                        Loading miners...
                      </div>
                    )}
                  </div>
                  {miners && miners.length > topMiners.length && (
                    <p className="text-center text-xs text-muted-foreground">
                      Showing the 10 most active of {miners.length.toLocaleString()} indexed miners.
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>


      </Tabs>

      <footer className="border-t py-8 text-center text-xs leading-relaxed text-muted-foreground">
        <p>
          Contract state is read from Ethereum. Mint history is reconstructed from on-chain events and stored in the website database.
          The coverage indicator shows whether the index is complete.
        </p>
        <p className="mt-2">This website provides contract and historical data. It is not financial advice.</p>
        <p className="mt-3">
          <a href={REPOSITORY_URL} target="_blank" rel="noopener noreferrer" className="hover:text-foreground hover:underline">
            Website source and methodology ↗
          </a>
        </p>
      </footer>
    </div>
  );
}
