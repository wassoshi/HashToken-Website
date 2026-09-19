import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useHashCalculator } from "@/hooks/use-hash-calculator";
import { MAX_BROWSER_ATTEMPTS } from "@/lib/hash-calculator";
import { Calculator, Settings, CheckCircle, Info, Copy, Download, Trash2, StopCircle, AlertTriangle } from "lucide-react";

interface HashSolution {
  inputValue: string;
  calculatedHash: string;
  hashValue: string;
  isValid: boolean;
}

interface ContractState {
  maxValue: string;
  prevHash: string;
  expectedAttempts: string;
}

const DEMO_MAX_VALUE = "57896044618658097711785492504343953926634992332820282019728792003956564819967";
const DEMO_PREV_HASH = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";

export default function HashCalculator() {
  const [maxValue, setMaxValue] = useState("");
  const [prevHash, setPrevHash] = useState("");
  const [maxSolutions, setMaxSolutions] = useState("5");
  const [searchMethod, setSearchMethod] = useState("random");
  const { toast } = useToast();

  const { data: contractState, isLoading: contractStateLoading } = useQuery<ContractState>({
    queryKey: ['/api/contract/state'],
    queryFn: async () => {
      const response = await fetch('/api/contract/state');
      if (!response.ok) throw new Error('Contract state is unavailable');
      return response.json();
    },
    staleTime: 60_000,
  });

  const {
    isCalculating,
    progress,
    solutions,
    attempts,
    rate,
    elapsedTime,
    startCalculation,
    stopCalculation,
    clearResults,
    exportResults
  } = useHashCalculator();

  const handleStartCalculation = () => {
    if (!maxValue || !prevHash) {
      toast({
        title: "Missing Parameters",
        description: "Please enter both max_value and prev_hash from the contract",
        variant: "destructive"
      });
      return;
    }

    // Validate max_value format (decimal or hex)
    if (!maxValue.match(/^0x[0-9a-fA-F]+$/) && !maxValue.match(/^[0-9]+$/)) {
      toast({
        title: "Invalid Max Value",
        description: "Max value must be a decimal number or hex string (0x...)",
        variant: "destructive"
      });
      return;
    }

    // prev_hash is a bytes32 value: exactly 64 hexadecimal characters.
    if (!prevHash.match(/^0x[0-9a-fA-F]{64}$/)) {
      toast({
        title: "Invalid Previous Hash", 
        description: "Previous hash must be a 32-byte hex value starting with 0x",
        variant: "destructive"
      });
      return;
    }

    try {
      const max = BigInt(maxValue);
      const expectedAttempts = Number(BigInt(1) << BigInt(256)) / Number(max);
      if (expectedAttempts > MAX_BROWSER_ATTEMPTS * 10) {
        toast({
          title: "Live mining is not practical in a browser",
          description: `This setting needs roughly ${expectedAttempts.toExponential(2)} attempts on average. Load the demonstration values to see the algorithm work safely.`,
          variant: "destructive",
        });
        return;
      }
    } catch {
      toast({
        title: "Invalid Max Value",
        description: "Max value could not be interpreted as an integer.",
        variant: "destructive",
      });
      return;
    }

    startCalculation({
      maxValue,
      prevHash,
      maxSolutions: parseInt(maxSolutions),
      searchMethod
    });
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied!",
        description: "Hash value copied to clipboard",
      });
    } catch (err) {
      toast({
        title: "Copy Failed",
        description: "Failed to copy to clipboard",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2 flex items-center justify-center gap-3">
            <Calculator className="text-red-500" size={40} />
            HashToken Mining Simulator
          </h1>
          <p className="text-slate-300 text-lg">Explore the original minting algorithm without pretending a browser can mine at today&apos;s difficulty</p>
        </div>

        <div className="mb-6 rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-100">
          This is an educational simulator. The live contract currently requires about{' '}
          <strong>{contractState ? Number.parseFloat(contractState.expectedAttempts).toExponential(2) : 'quadrillions of'} attempts</strong>{' '}
          on average, far beyond a normal browser session. Use the demonstration preset to see a valid result.
        </div>

        {/* Input Section */}
        <Card className="mb-6 bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="text-red-500" size={20} />
              Contract Parameters
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="maxValue">Max Value</Label>
                <Input
                  id="maxValue"
                  placeholder="e.g., 57896044618658097711785492504343953926634992332820282019728792003956564819967"
                  value={maxValue}
                  onChange={(e) => setMaxValue(e.target.value)}
                  className="bg-slate-900 border-slate-600 text-white placeholder:text-slate-400"
                />
                <p className="text-xs text-slate-400 flex items-center gap-1">
                  <Info size={12} />
                  Get this value by calling max_value() on the contract (decimal or hex format)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="prevHash">Previous Hash</Label>
                <Input
                  id="prevHash"
                  placeholder="e.g., 0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
                  value={prevHash}
                  onChange={(e) => setPrevHash(e.target.value)}
                  className="bg-slate-900 border-slate-600 text-white placeholder:text-slate-400"
                />
                <p className="text-xs text-slate-400 flex items-center gap-1">
                  <Info size={12} />
                  Get this value by calling prev_hash() on the contract (64-character hex string)
                </p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="maxSolutions">Max Solutions</Label>
                <Select value={maxSolutions} onValueChange={setMaxSolutions}>
                  <SelectTrigger className="bg-slate-900 border-slate-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-600">
                    <SelectItem value="1" className="text-white hover:bg-slate-700">1 Solution</SelectItem>
                    <SelectItem value="5" className="text-white hover:bg-slate-700">5 Solutions</SelectItem>
                    <SelectItem value="10" className="text-white hover:bg-slate-700">10 Solutions</SelectItem>
                    <SelectItem value="20" className="text-white hover:bg-slate-700">20 Solutions</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="searchMethod">Search Method</Label>
                <Select value={searchMethod} onValueChange={setSearchMethod}>
                  <SelectTrigger className="bg-slate-900 border-slate-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-600">
                    <SelectItem value="incremental" className="text-white hover:bg-slate-700">Incremental Search</SelectItem>
                    <SelectItem value="random" className="text-white hover:bg-slate-700">Random Search</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Button
                onClick={handleStartCalculation}
                disabled={isCalculating}
                className="min-w-[220px] flex-1 bg-red-600 hover:bg-red-700 text-white"
              >
                <Calculator className="mr-2" size={16} />
                Run Simulation
              </Button>

              {isCalculating && (
                <Button
                  onClick={stopCalculation}
                  variant="outline"
                  className="border-slate-600 text-slate-300"
                >
                  <StopCircle className="mr-2" size={16} />
                  Stop
                </Button>
              )}

              <Button
                onClick={() => {
                  if (!contractState) return;
                  setMaxValue(contractState.maxValue);
                  setPrevHash(contractState.prevHash);
                }}
                disabled={contractStateLoading || !contractState || isCalculating}
                variant="outline"
                className="border-slate-600 text-slate-300 hover:bg-slate-700"
              >
                <Settings className="mr-2" size={16} />
                Load Live Parameters
              </Button>
              
              <Button
                onClick={() => {
                  setMaxValue(DEMO_MAX_VALUE);
                  setPrevHash(DEMO_PREV_HASH);
                }}
                variant="outline"
                className="border-slate-600 text-slate-300 hover:bg-slate-700"
              >
                <Settings className="mr-2" size={16} />
                Load Demo (50% chance)
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Progress Section */}
        {isCalculating && (
          <Card className="mb-6 bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-500"></div>
                Calculating Hash Values
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-300">Progress</span>
                <span className="text-sm text-slate-300">{attempts.toLocaleString()} attempts</span>
              </div>

              <Progress value={progress} className="w-full" />
              <p className="text-xs text-slate-400">The simulator stops automatically after {MAX_BROWSER_ATTEMPTS.toLocaleString()} attempts.</p>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-900 p-3 rounded-lg text-center">
                  <div className="text-sm text-slate-400">Attempts</div>
                  <div className="text-lg font-semibold text-red-400">{attempts.toLocaleString()}</div>
                </div>
                <div className="bg-slate-900 p-3 rounded-lg text-center">
                  <div className="text-sm text-slate-400">Solutions</div>
                  <div className="text-lg font-semibold text-green-400">{solutions.length}</div>
                </div>
                <div className="bg-slate-900 p-3 rounded-lg text-center">
                  <div className="text-sm text-slate-400">Rate</div>
                  <div className="text-lg font-semibold text-yellow-400">{rate.toLocaleString()} /s</div>
                </div>
                <div className="bg-slate-900 p-3 rounded-lg text-center">
                  <div className="text-sm text-slate-400">Time</div>
                  <div className="text-lg font-semibold text-slate-300">{elapsedTime}s</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Results Section */}
        {solutions.length > 0 && (
          <Card className="mb-6 bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="text-green-500" size={20} />
                Valid Hash Solutions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {solutions.map((solution, index) => (
                <div key={index} className="bg-slate-900 p-4 rounded-lg border border-slate-700">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <span className="bg-green-500 text-black px-2 py-1 rounded text-xs font-semibold">
                        VALID
                      </span>
                      <span className="text-sm text-slate-400">Solution #{index + 1}</span>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => copyToClipboard(solution.inputValue)}
                      className="bg-red-600 hover:bg-red-700 text-white"
                    >
                      <Copy className="mr-1" size={12} />
                      Copy
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <label className="text-xs text-slate-400 uppercase tracking-wide">
                        Input Value (bytes32)
                      </label>
                      <div className="bg-gray-900 p-3 rounded mt-1 text-green-400 break-all font-mono text-sm">
                        {solution.inputValue}
                      </div>
                    </div>

                    <div>
                      <label className="text-xs text-slate-400 uppercase tracking-wide">
                        Calculated Hash
                      </label>
                      <div className="bg-gray-900 p-3 rounded mt-1 text-blue-400 break-all font-mono text-sm">
                        {solution.calculatedHash}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-slate-400">Hash Value:</span>
                        <span className="ml-2 text-blue-400 font-mono">{solution.hashValue}</span>
                      </div>
                      <div>
                        <span className="text-slate-400">Verification:</span>
                        <span className="ml-2 text-green-400 flex items-center gap-1">
                          <CheckCircle size={12} />
                          Hash ≤ Max Value
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              <div className="flex gap-4">
                <Button
                  onClick={exportResults}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Download className="mr-2" size={16} />
                  Export Results
                </Button>
                <Button
                  onClick={clearResults}
                  variant="outline"
                  className="border-slate-600 text-slate-300"
                >
                  <Trash2 className="mr-2" size={16} />
                  Clear Results
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Status Section */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="text-blue-400" size={20} />
              Status & Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center text-slate-300">
              <div className="w-2 h-2 bg-blue-400 rounded-full mr-2"></div>
              {isCalculating ? "Calculating hash values..." : "Ready to calculate hash values. Enter contract parameters above."}
            </div>

            {maxValue && (
              <div className="bg-yellow-900/30 border border-yellow-600/50 p-4 rounded-lg">
                <h4 className="font-semibold text-yellow-400 mb-2 flex items-center gap-2">
                  <AlertTriangle size={16} />
                  Difficulty Analysis
                </h4>
                <div className="text-sm text-yellow-300">
                  {(() => {
                    try {
                      const maxVal = BigInt(maxValue);
                      const expectedAttempts = Number(BigInt(1) << BigInt(256)) / Number(maxVal);
                      const probability = 1.0 / expectedAttempts;
                      
                      if (expectedAttempts > 1000000000) {
                        return `Very high difficulty: roughly ${expectedAttempts.toExponential(2)} attempts expected (${(probability * 100).toExponential(2)}% success per attempt). This simulator will not run an impractical live search.`;
                      } else if (expectedAttempts > 1000000) {
                        return `High difficulty: Expected ~${(expectedAttempts / 1000000).toFixed(1)}M attempts needed. Your contract's max_value is restrictive (${(probability * 100).toFixed(6)}% success rate).`;
                      } else if (expectedAttempts > 10000) {
                        return `Medium difficulty: Expected ~${(expectedAttempts / 1000).toFixed(0)}K attempts needed.`;
                      } else {
                        return `Low difficulty: Expected ~${expectedAttempts.toFixed(0)} attempts needed.`;
                      }
                    } catch {
                      return 'Invalid max_value format.';
                    }
                  })()}
                </div>
              </div>
            )}

            <div className="bg-slate-900 p-4 rounded-lg">
              <h4 className="font-semibold text-yellow-400 mb-2 flex items-center gap-2">
                <AlertTriangle size={16} />
                Important Notes
              </h4>
              <ul className="space-y-1 text-sm text-slate-300">
                <li>• “Load Live Parameters” retrieves current values directly from Ethereum</li>
                <li>• The calculation finds values where hash ≤ max_value (valid for minting)</li>
                <li>• Values are calculated using keccak256 (same as contract's sha3)</li>
                <li>• The demonstration preset is intentionally easy and is not valid for the live contract</li>
                <li>• No transaction is created and no wallet is connected</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="mt-8 text-center text-slate-400">
          <p className="text-sm flex items-center justify-center gap-2">
            <CheckCircle size={16} />
            Educational browser simulation — no wallet connection or transaction submission
          </p>
        </div>
      </div>
    </div>
  );
}
