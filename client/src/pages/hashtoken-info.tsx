import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ComposedChart, Bar, Line, Legend } from 'recharts';
import { ExternalLink, RefreshCw, Hash, TrendingUp, Activity, Database, DollarSign, Archive, Github, ShieldCheck } from "lucide-react";
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
const REPOSITORY_URL = "https://github.com/wassoshi/HashToken-Website";

export default function HashTokenInfo() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const queryClient = useQueryClient();

  const { data: contractState, isLoading: stateLoading, refetch: refetchState } = useQuery<ContractState>({
    queryKey: ['/api/contract/state'],
    refetchInterval: 60 * 60 * 1000, // Refresh hourly
    staleTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    gcTime: 0, // Don't cache old data
  });

  const { data: mintEvents, isLoading: eventsLoading, refetch: refetchMintEvents } = useQuery<MintEvent[]>({
    queryKey: ['/api/contract/mint-events'],
    queryFn: () => fetch('/api/contract/mint-events?limit=50').then(res => res.json()),
    refetchInterval: 60 * 60 * 1000, // Refresh hourly
    staleTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
  });

  const { data: miners, refetch: refetchMiners } = useQuery<Array<{address: string, count: number}>>({
    queryKey: ['/api/contract/miners'],
    queryFn: () => fetch('/api/contract/miners').then(res => res.json()),
    refetchInterval: 60 * 60 * 1000, // Refresh hourly
    staleTime: 60 * 60 * 1000,
  });

  const { data: priceData, refetch: refetchPrice } = useQuery<{
    priceUsd: string;
    priceNative: string;
    priceChange24h: number;
    liquidity: number;
    volume24h: number;
    marketCap: number;
    pairAddress: string;
    dexId: string;
    baseToken: any;
    quoteToken: any;
  }>({
    queryKey: ['/api/contract/price'],
    queryFn: () => fetch('/api/contract/price').then(res => res.json()),
    refetchInterval: 60 * 60 * 1000, // Refresh hourly
    staleTime: 60 * 60 * 1000,
  });

  const { data: forecastData, refetch: refetchForecast } = useQuery<{
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

  const { data: syncStatus, refetch: refetchSyncStatus } = useQuery<SyncStatus>({
    queryKey: ['/api/contract/sync-status'],
    queryFn: () => fetch('/api/contract/sync-status').then(res => res.json()),
    refetchInterval: 60 * 60 * 1000,
    staleTime: 60 * 60 * 1000,
  });

  const { data: timeline, refetch: refetchTimeline } = useQuery<TimelinePoint[]>({
    queryKey: ['/api/contract/timeline'],
    queryFn: async () => {
      const response = await fetch('/api/contract/timeline');
      if (!response.ok) throw new Error('Timeline is unavailable');
      return response.json();
    },
    staleTime: 60 * 60 * 1000,
  });

  const timelineWithCumulativeSupply = useMemo(() => {
    let cumulative = 0;
    return (timeline ?? []).map((point) => {
      cumulative += point.count;
      return { ...point, cumulative };
    });
  }, [timeline]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      // Refresh the displayed data. Blockchain indexing runs safely in the
      // background on the server rather than being triggered by public users.
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['/api/contract/state'] }),
        queryClient.invalidateQueries({ queryKey: ['/api/contract/mint-events'] }),
        queryClient.invalidateQueries({ queryKey: ['/api/contract/miners'] }),
        queryClient.invalidateQueries({ queryKey: ['/api/contract/price'] }),
        queryClient.invalidateQueries({ queryKey: ['/api/contract/forecast'] }),
        queryClient.invalidateQueries({ queryKey: ['/api/contract/timeline'] }),
      ]);
      
      // Also explicitly refetch to ensure immediate updates
      await Promise.all([
        refetchState(),
        refetchMintEvents(),
        refetchMiners(),
        refetchPrice(),
        refetchForecast(),
        refetchSyncStatus(),
        refetchTimeline(),
      ]);
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setIsRefreshing(false);
    }
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

  const getDifficultyColor = (difficulty: string): string => {
    try {
      const diff = parseFloat(difficulty);
      if (diff >= 90) return "bg-red-500";
      if (diff >= 70) return "bg-orange-500";
      if (diff >= 50) return "bg-yellow-500";
      return "bg-green-500";
    } catch {
      return "bg-gray-500";
    }
  };

  const indexedCount = syncStatus?.eventCount ?? contractState?.transactionCount ?? 0;
  const totalMintCount = contractState ? Number.parseInt(contractState.totalSupply, 10) : 0;
  const missingHistoryCount = Math.max(totalMintCount - indexedCount, 0);
  const historyCoverage = totalMintCount > 0 ? (indexedCount / totalMintCount) * 100 : 0;

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
    <div className="container mx-auto px-4 py-8 space-y-8">
      <section id="overview" className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-red-500/10 via-background to-background px-6 py-10 md:px-10 md:py-14">
        <div className="absolute right-6 top-6">
          <Button
            onClick={handleRefresh}
            disabled={isRefreshing}
            size="sm"
            variant="ghost"
            className="text-muted-foreground"
            aria-label="Refresh displayed data"
          >
            <RefreshCw className={`h-4 w-4 sm:mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh data</span>
          </Button>
        </div>

        <div className="mx-auto flex max-w-4xl flex-col items-center gap-6 text-center md:flex-row md:text-left">
          <img
            src={hashTokenLogo}
            alt="HashToken logo"
            className="h-24 w-24 rounded-full object-cover ring-1 ring-red-500/50 md:h-28 md:w-28"
          />
          <div className="space-y-4">
            <Badge variant="outline" className="border-red-500/40 bg-red-500/10 text-red-300">
              Ethereum · deployed June 17, 2016
            </Badge>
            <div>
              <h1 className="text-4xl font-bold tracking-tight md:text-5xl">HashToken (HTK)</h1>
              <p className="mt-3 max-w-2xl text-lg leading-relaxed text-muted-foreground">
                An early Ethereum experiment in self-limiting proof-of-work issuance, where every successful mint makes the next token harder to produce.
              </p>
            </div>
            <div className="flex flex-col justify-center gap-3 sm:flex-row md:justify-start">
              <Button asChild>
                <a href={CONTRACT_URL} target="_blank" rel="noopener noreferrer">
                  <ShieldCheck className="mr-2 h-4 w-4" />
                  Verify on Etherscan
                </a>
              </Button>
              <Button variant="outline" asChild>
                <a href="#history">
                  <Archive className="mr-2 h-4 w-4" />
                  Explore mining history
                </a>
              </Button>
              <Button variant="ghost" asChild>
                <a href={REPOSITORY_URL} target="_blank" rel="noopener noreferrer">
                  <Github className="mr-2 h-4 w-4" />
                  Website source
                </a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Key Metrics - Moved Above Educational Content */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {/* Current Supply */}
        {contractState && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-base">
                <Database className="h-4 w-4" />
                <span>Current Supply</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center space-y-2">
                <div className="text-4xl font-bold text-green-600">
                  {formatTokenAmount(contractState.totalSupply)}
                </div>
                <div className="text-sm text-muted-foreground">HTK Tokens</div>
                <div className="text-xs text-muted-foreground">1 token per successful mint</div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Expected Attempts */}
        {contractState && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-base">
                <Hash className="h-4 w-4" />
                <span>Expected Attempts</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center space-y-2">
                <div className="text-4xl font-bold text-red-500">
                  {formatExpectedAttempts(contractState.expectedAttempts)}
                </div>
                <div className="text-sm text-muted-foreground">For Next Mint</div>
                <div className="text-xs text-muted-foreground">Based on current difficulty</div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Live Price */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-base">
              <TrendingUp className="h-4 w-4" />
              <span>Live Price</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center space-y-2">
              {priceData && priceData.priceUsd ? (
                <>
                  <div className="text-4xl font-bold text-blue-600">
                    ${parseFloat(priceData.priceUsd).toFixed(2)}
                  </div>
                  <div className="text-sm text-muted-foreground">USD per HTK · DexScreener</div>
                  {priceData.priceNative && (
                    <div className="text-xs text-muted-foreground">
                      {parseFloat(priceData.priceNative).toFixed(6)} ETH
                    </div>
                  )}
                  {priceData.priceChange24h && (
                    <div className={`text-xs ${priceData.priceChange24h >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {priceData.priceChange24h >= 0 ? '+' : ''}{priceData.priceChange24h.toFixed(2)}% (24h)
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center space-y-2">
                  <div className="text-2xl font-bold text-muted-foreground">No Active Trading</div>
                  <div className="text-sm text-muted-foreground">Historic collectible token</div>
                  <div className="text-xs text-muted-foreground">
                    <a href="https://dexscreener.com/ethereum/0x01c0aeaee4f9b9417237aef3556bc1d7bd00ec52" 
                       target="_blank" 
                       rel="noopener noreferrer"
                       className="text-blue-500 hover:underline">
                      View on DexScreener
                    </a>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Market Cap */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-base">
              <DollarSign className="h-4 w-4" />
              <span>Estimated Market Cap</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center space-y-2">
              {priceData && priceData.priceUsd && contractState ? (
                <>
                  <div className="text-4xl font-bold text-purple-600">
                    ${Math.round(parseFloat(priceData.priceUsd) * parseInt(contractState.totalSupply)).toLocaleString()}
                  </div>
                  <div className="text-sm text-muted-foreground">On-chain supply × live price</div>
                  <div className="text-xs text-muted-foreground">
                    {formatTokenAmount(contractState.totalSupply)} × ${parseFloat(priceData.priceUsd).toFixed(2)}
                  </div>
                </>
              ) : (
                <div className="text-center space-y-2">
                  <div className="text-2xl font-bold text-muted-foreground">N/A</div>
                  <div className="text-sm text-muted-foreground">No price data</div>
                  <div className="text-xs text-muted-foreground">
                    Requires active trading pairs
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {syncStatus && (
        <Alert className={missingHistoryCount > 0 ? "border-amber-500/40 bg-amber-500/5" : "border-emerald-500/40 bg-emerald-500/5"}>
          <Activity className="h-4 w-4" />
          <AlertDescription className="space-y-2">
            <div>
              <strong>{syncStatus.status === "syncing" ? "Ethereum indexing is running." : "Recent Ethereum data is current."}</strong>{' '}
              {indexedCount.toLocaleString()} of {totalMintCount.toLocaleString()} mint events are indexed
              {totalMintCount > 0 && ` (${historyCoverage.toFixed(1)}% coverage)`}.
              {syncStatus.lastSuccessfulSyncAt && ` Last checked ${formatDistanceToNow(new Date(syncStatus.lastSuccessfulSyncAt), { addSuffix: true })}.`}
            </div>
            {missingHistoryCount > 0 && (
              <div className="text-xs text-muted-foreground">
                {missingHistoryCount.toLocaleString()} older events remain to be recovered from archival Ethereum data. Existing records and new mints are preserved.
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}

      <section className="mx-auto max-w-4xl space-y-6">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-semibold">A 2016 Ethereum experiment</h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            HashToken was deployed on <strong>June 17, 2016</strong>. Its verified contract encodes a self-limiting proof-of-work
            minting rule: every successful mint reduces the target by 1%, progressively increasing the expected computational
            work required for the next token. Current historical research identifies it as the earliest known Ethereum token
            to use this particular issuance model.
          </p>
          <div className="flex flex-wrap justify-center gap-3 text-sm">
            <a href={CONTRACT_URL} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
              Verified contract ↗
            </a>
            <span className="text-muted-foreground">·</span>
            <a href={`${CONTRACT_URL}#code`} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
              Source code ↗
            </a>
            <span className="text-muted-foreground">·</span>
            <a href={REPOSITORY_URL} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
              Website methodology ↗
            </a>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 text-left md:grid-cols-2">
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">How It Works</h3>
            <ul className="list-disc space-y-2 pl-5 text-muted-foreground">
              <li><strong>Self-limiting PoW:</strong> issuance becomes progressively harder rather than ending at a fixed cap.</li>
              <li><strong>Dynamic target:</strong> each mint multiplies <code>max_value</code> by 99/100.</li>
              <li><strong>Keccak-256:</strong> candidate values are combined with the previous winning hash.</li>
              <li><strong>One-token reward:</strong> each valid solution creates one HTK.</li>
            </ul>
          </div>

          <div className="space-y-3">
            <h3 className="text-lg font-semibold">Minting rule</h3>
            <ol className="list-decimal space-y-2 pl-5 text-muted-foreground">
              <li>Find a value where <code>keccak256(value, prev_hash) ≤ max_value</code>.</li>
              <li>Submit the value to the contract&apos;s <code>mint()</code> function.</li>
              <li>The successful miner receives one HTK.</li>
              <li>The contract records the new hash and makes the next mint harder.</li>
            </ol>
          </div>
        </div>
      </section>





      {/* Trading & Contract Information */}
      <section id="contract" className="grid scroll-mt-24 grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Additional Price Info - Only show if we have price data */}
        {priceData && priceData.priceUsd && (
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <TrendingUp className="h-5 w-5" />
                  <span>Market Data</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center space-y-2">
                    <div className="text-2xl font-bold">
                      ${priceData.liquidity ? (priceData.liquidity / 1000).toFixed(1) + 'K' : 'N/A'}
                    </div>
                    <div className="text-sm text-muted-foreground">Liquidity</div>
                    <div className="text-xs text-muted-foreground">Total pool liquidity</div>
                  </div>
                  <div className="text-center space-y-2">
                    <div className="text-2xl font-bold">
                      ${priceData.volume24h ? (
                        priceData.volume24h >= 1000 ? 
                          (priceData.volume24h / 1000).toFixed(1) + 'K' : 
                          priceData.volume24h.toFixed(0)
                      ) : 'N/A'}
                    </div>
                    <div className="text-sm text-muted-foreground">Volume (24h)</div>
                    <div className="text-xs text-muted-foreground">Trading volume</div>
                  </div>
                  <div className="text-center space-y-2">
                    <div className="text-2xl font-bold">
                      ${contractState ? 
                        Math.round(parseFloat(priceData.priceUsd) * parseInt(contractState.totalSupply)).toLocaleString() : 
                        'N/A'}
                    </div>
                    <div className="text-sm text-muted-foreground">Estimated Market Cap</div>
                    <div className="text-xs text-muted-foreground">On-chain supply × DexScreener price</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Trading & Contract Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <ExternalLink className="h-5 w-5" />
              <span>Contract & Market Links</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Contract Address */}
            <div className="space-y-2">
              <div className="text-sm font-medium">Contract Address</div>
              <a 
                href={CONTRACT_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-500 hover:underline flex items-center space-x-1"
              >
                <span>0xE5544a...31b0</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>

            <Separator />

            {/* Trading Links */}
            <div className="space-y-2">
              <div className="text-sm font-medium">Trading</div>
              <div className="space-y-2">
                <a 
                  href="https://app.uniswap.org/explore/tokens/ethereum/0xE5544a2A5fA9b175da60D8Eec67adD5582bB31b0"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-2 bg-muted rounded hover:bg-muted/80 transition-colors"
                >
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs font-bold">U</span>
                    </div>
                    <span className="text-sm">Uniswap</span>
                  </div>
                  <ExternalLink className="h-3 w-3" />
                </a>
                <a 
                  href="https://www.dextools.io/app/en/ether/pair-explorer/0x01c0aeaee4f9b9417237aef3556bc1d7bd00ec52?t=1752147961143"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-2 bg-muted rounded hover:bg-muted/80 transition-colors"
                >
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs font-bold">D</span>
                    </div>
                    <span className="text-sm">DexTools</span>
                  </div>
                  <ExternalLink className="h-3 w-3" />
                </a>
                <a 
                  href="https://dexscreener.com/ethereum/0x01c0aeaee4f9b9417237aef3556bc1d7bd00ec52"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-2 bg-muted rounded hover:bg-muted/80 transition-colors"
                >
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs font-bold">S</span>
                    </div>
                    <span className="text-sm">DexScreener</span>
                  </div>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>

            <Separator />

            {/* Token Info */}
            <div className="space-y-2">
              <div className="text-sm font-medium">Token Details</div>
              <div className="space-y-1 text-sm text-muted-foreground">
                <div>Symbol: HTK</div>
                <div>Decimals: 16</div>
                <div>Created: June 17, 2016</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Main Content Tabs */}
      <Tabs defaultValue="mining" className="w-full scroll-mt-24" id="history">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="mining">Mining History</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="calculator">Mining Simulator</TabsTrigger>
        </TabsList>

        <TabsContent value="calculator" className="space-y-6">
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

        <TabsContent value="mining" className="space-y-6">
          {/* Difficulty Forecast - Moved to top */}
          <Card>
            <CardHeader>
              <CardTitle>Difficulty Forecast</CardTitle>
              <CardDescription>Expected attempts for future token numbers</CardDescription>
            </CardHeader>
            <CardContent>
              {forecastData ? (
                <div className="space-y-4">
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <div className="text-sm text-muted-foreground">Current Token #{forecastData.currentMintCount}</div>
                    <div className="text-lg font-bold text-blue-500">
                      {formatExpectedAttempts(forecastData.currentExpectedAttempts)}
                    </div>
                    <div className="text-xs text-muted-foreground">Expected attempts</div>
                  </div>
                  
                  <div className="space-y-3">
                    {forecastData.forecasts.map((forecast, index) => (
                      <div key={index} className="flex justify-between items-center p-3 border rounded-lg">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">Token #{forecast.tokenNumber}</span>
                          <span className="text-xs text-muted-foreground">
                            +{forecast.tokenNumber - forecastData.currentMintCount} from current
                          </span>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-bold text-orange-500">
                            {formatExpectedAttempts(forecast.expectedAttempts)}
                          </div>
                          <div className="text-xs text-muted-foreground">expected attempts</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="text-xs text-muted-foreground text-center mt-4 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                    💡 Each mint increases difficulty by ~1%, requiring exponentially more computational work
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Mining History</CardTitle>
              <CardDescription>
                Recent mining events · estimated attempts are probability-based, not an exact count of failed hashes
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
                  {mintEvents.map((event, eventIndex) => {
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
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No mining events found</p>
                </div>
              )}
            </CardContent>
          </Card>


        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
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
                    <h4 className="font-medium mb-2">Historical Context</h4>
                    <p className="text-sm text-muted-foreground">
                      The verified 2016 contract provides an unusually early example of Ethereum-based issuance governed by progressively increasing computational work.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Indexed Mint Activity</CardTitle>
              <CardDescription>Monthly mint events recovered from Ethereum, with the cumulative indexed total</CardDescription>
            </CardHeader>
            <CardContent>
              {timelineWithCumulativeSupply.length > 0 ? (
                <div className="h-[340px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={timelineWithCumulativeSupply} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis
                        dataKey="month"
                        minTickGap={28}
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                      />
                      <YAxis
                        yAxisId="monthly"
                        allowDecimals={false}
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                      />
                      <YAxis
                        yAxisId="cumulative"
                        orientation="right"
                        allowDecimals={false}
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                      />
                      <Tooltip
                        contentStyle={{
                          background: 'hsl(var(--popover))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                      />
                      <Legend />
                      <Bar yAxisId="monthly" dataKey="count" name="Mints in month" fill="#ef4444" radius={[3, 3, 0, 0]} />
                      <Line yAxisId="cumulative" type="monotone" dataKey="cumulative" name="Indexed total" stroke="#60a5fa" dot={false} strokeWidth={2} />
                    </ComposedChart>
                  </ResponsiveContainer>
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
                    {miners && miners.length > 0 ? (
                      miners.map((miner, index) => (
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
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>


      </Tabs>

      <footer className="border-t py-8 text-center text-xs leading-relaxed text-muted-foreground">
        <p>
          Contract state is read from Ethereum. Mint history is reconstructed from on-chain events and stored in the website database;
          the coverage indicator above shows whether that index is complete. Market data is supplied by DexScreener.
        </p>
        <p className="mt-2">This website is an informational historical resource, not financial advice.</p>
      </footer>
    </div>
  );
}
