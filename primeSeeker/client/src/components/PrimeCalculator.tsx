import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { AlertCircle, Calculator, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

function isPrime(num: number): boolean {
  if (num < 2) return false;
  if (num === 2) return true;
  if (num % 2 === 0) return false;
  for (let i = 3; i <= Math.sqrt(num); i += 2) {
    if (num % i === 0) return false;
  }
  return true;
}

function findNextPrimes(start: number, count: number): number[] {
  const primes: number[] = [];
  let current = start + 1;
  while (primes.length < count) {
    if (isPrime(current)) {
      primes.push(current);
    }
    current++;
  }
  return primes;
}

export default function PrimeCalculator() {
  const [inputValue, setInputValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [primes, setPrimes] = useState<number[] | null>(null);
  const [inputNumber, setInputNumber] = useState<number | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  const validateAndCalculate = () => {
    setError(null);
    setPrimes(null);
    setInputNumber(null);

    const trimmed = inputValue.trim();

    if (trimmed === "") {
      setError("請輸入一個數字");
      return;
    }

    if (!/^-?\d+(\.\d+)?$/.test(trimmed)) {
      setError("請輸入有效的數字");
      return;
    }

    const num = parseFloat(trimmed);

    if (!Number.isFinite(num)) {
      setError("數值超出範圍");
      return;
    }

    if (!Number.isInteger(num)) {
      setError("請輸入整數，不接受小數");
      return;
    }

    if (num <= 0) {
      setError("請輸入正整數（大於 0 的整數）");
      return;
    }

    if (num > Number.MAX_SAFE_INTEGER) {
      setError("數值過大，請輸入較小的正整數");
      return;
    }

    setIsCalculating(true);
    
    setTimeout(() => {
      const result = findNextPrimes(num, 3);
      setPrimes(result);
      setInputNumber(num);
      setIsCalculating(false);
    }, 300);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      validateAndCalculate();
    }
  };

  const handleClear = () => {
    setInputValue("");
    setError(null);
    setPrimes(null);
    setInputNumber(null);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <Calculator className="h-8 w-8 text-primary" />
            <CardTitle className="text-2xl font-semibold">質數計算器</CardTitle>
          </div>
          <CardDescription className="text-base">
            輸入正整數，計算大於該數的三個最接近質數
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <Label htmlFor="number-input" className="text-sm font-medium">
              輸入正整數
            </Label>
            <div className="flex gap-3">
              <Input
                id="number-input"
                type="text"
                inputMode="numeric"
                placeholder="例如：10"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                className="text-lg"
                autoFocus
                data-testid="input-number"
              />
              <Button 
                onClick={validateAndCalculate} 
                disabled={isCalculating}
                className="px-6"
                data-testid="button-calculate"
              >
                {isCalculating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "計算質數"
                )}
              </Button>
              <Button 
                variant="outline" 
                onClick={handleClear}
                data-testid="button-clear"
              >
                清除
              </Button>
            </div>
          </div>

          {error && (
            <Alert variant="destructive" data-testid="alert-error">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {primes && inputNumber !== null && (
            <div className="space-y-4" data-testid="results-section">
              <p className="text-sm text-muted-foreground text-center">
                大於 <span className="font-semibold text-foreground">{inputNumber.toLocaleString()}</span> 的三個最接近質數：
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {primes.map((prime, index) => (
                  <Card key={prime} className="text-center" data-testid={`card-prime-${index}`}>
                    <CardContent className="pt-6 pb-6">
                      <p className="text-xs text-muted-foreground mb-1">第 {index + 1} 個質數</p>
                      <p className="text-2xl font-semibold text-primary">
                        {prime.toLocaleString()}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          <div className="text-center text-xs text-muted-foreground pt-4 border-t">
            <p>質數是只能被 1 和自身整除的正整數（大於 1）</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
