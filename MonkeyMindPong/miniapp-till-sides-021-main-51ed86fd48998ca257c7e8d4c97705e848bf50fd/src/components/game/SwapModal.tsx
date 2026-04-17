'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAccount, useBalance, useReadContract, useSendTransaction } from 'wagmi';
import { createPublicClient, http, fallback, encodeFunctionData, parseEther, formatEther, formatUnits, parseUnits, encodeAbiParameters, parseAbiParameters } from 'viem';
import { base } from 'wagmi/chains';
import { X, ArrowUpDown, Loader2, ExternalLink, ChevronDown, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';

// ── Contract Addresses ──────────────────────────────────────────────────────
const TOKEN_ADDRESS   = '0x8938f93554bcaebafc18c64b85551146e0bfc8c1' as const;
const WETH_ADDRESS    = '0x4200000000000000000000000000000000000006' as const;
const QUOTER_ADDRESS  = '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a' as const;
const ROUTER_ADDRESS  = '0x2626664c2603336E57B271c5C0b26F421741e481' as const;
const POOL_FEES       = [10000, 3000, 500, 100];

// ── Fallback RPC Client ─────────────────────────────────────────────────────
const publicClient = createPublicClient({
  chain: base,
  transport: fallback([
    http('https://mainnet.base.org'),
    http('https://base.llamarpc.com'),
    http('https://1rpc.io/base'),
    http('https://base.drpc.org'),
  ]),
});

// ── ABIs ────────────────────────────────────────────────────────────────────
const ERC20_ABI = [
  { name: 'balanceOf', type: 'function', stateMutability: 'view',
    inputs: [{ name: 'owner', type: 'address' }], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'allowance', type: 'function', stateMutability: 'view',
    inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }] },
  { name: 'approve', type: 'function', stateMutability: 'nonpayable',
    inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }],
    outputs: [{ name: '', type: 'bool' }] },
  { name: 'decimals', type: 'function', stateMutability: 'view',
    inputs: [], outputs: [{ name: '', type: 'uint8' }] },
] as const;

const QUOTER_ABI = [
  {
    name: 'quoteExactInputSingle',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{
      name: 'params', type: 'tuple',
      components: [
        { name: 'tokenIn',            type: 'address' },
        { name: 'tokenOut',           type: 'address' },
        { name: 'amountIn',           type: 'uint256' },
        { name: 'fee',                type: 'uint24'  },
        { name: 'sqrtPriceLimitX96',  type: 'uint160' },
      ],
    }],
    outputs: [
      { name: 'amountOut',                type: 'uint256' },
      { name: 'sqrtPriceX96After',        type: 'uint160' },
      { name: 'initializedTicksCrossed',  type: 'uint32'  },
      { name: 'gasEstimate',              type: 'uint256' },
    ],
  },
] as const;

const ROUTER_ABI = [
  {
    name: 'exactInputSingle',
    type: 'function',
    stateMutability: 'payable',
    inputs: [{
      name: 'params', type: 'tuple',
      components: [
        { name: 'tokenIn',            type: 'address' },
        { name: 'tokenOut',           type: 'address' },
        { name: 'fee',                type: 'uint24'  },
        { name: 'recipient',          type: 'address' },
        { name: 'amountIn',           type: 'uint256' },
        { name: 'amountOutMinimum',   type: 'uint256' },
        { name: 'sqrtPriceLimitX96',  type: 'uint160' },
      ],
    }],
    outputs: [{ name: 'amountOut', type: 'uint256' }],
  },
  {
    name: 'unwrapWETH9',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      { name: 'amountMinimum', type: 'uint256' },
      { name: 'recipient',     type: 'address' },
    ],
    outputs: [],
  },
  {
    name: 'multicall',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      { name: 'deadline', type: 'uint256' },
      { name: 'data',     type: 'bytes[]' },
    ],
    outputs: [{ name: 'results', type: 'bytes[]' }],
  },
] as const;

// ── Types ───────────────────────────────────────────────────────────────────
interface SwapModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// ── Component ───────────────────────────────────────────────────────────────
export function SwapModal({ isOpen, onClose }: SwapModalProps) {
  const { address, isConnected } = useAccount();
  const { sendTransactionAsync } = useSendTransaction();

  const [isBuy, setIsBuy]               = useState(true);
  const [inputAmount, setInputAmount]   = useState('');
  const [quoteAmount, setQuoteAmount]   = useState('');
  const [bestFee, setBestFee]           = useState<number>(3000);
  const [slippage, setSlippage]         = useState(5);
  const [isQuoting, setIsQuoting]       = useState(false);
  const [isSwapping, setIsSwapping]     = useState(false);
  const [isApproving, setIsApproving]   = useState(false);
  const [txHash, setTxHash]             = useState<string | null>(null);
  const [tokenDecimals, setTokenDecimals] = useState(18);
  const [needsApproval, setNeedsApproval] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Balances ──────────────────────────────────────────────────────────────
  const { data: ethBalance } = useBalance({ address, query: { enabled: !!address && isOpen } });
  const { data: tokenBalance } = useBalance({
    address,
    token: TOKEN_ADDRESS,
    query: { enabled: !!address && isOpen },
  });
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: TOKEN_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: address ? [address, ROUTER_ADDRESS] : undefined,
    query: { enabled: !!address && isOpen && !isBuy },
  });

  // ── Check decimals once ────────────────────────────────────────────────────
  useEffect(() => {
    publicClient.readContract({
      address: TOKEN_ADDRESS,
      abi: ERC20_ABI,
      functionName: 'decimals',
    }).then((d) => setTokenDecimals(Number(d))).catch(() => {});
  }, []);

  // ── Check approval need ────────────────────────────────────────────────────
  useEffect(() => {
    if (isBuy || !inputAmount || !allowance) { setNeedsApproval(false); return; }
    try {
      const amt = parseUnits(inputAmount, tokenDecimals);
      setNeedsApproval(BigInt(allowance.toString()) < amt);
    } catch { setNeedsApproval(false); }
  }, [isBuy, inputAmount, allowance, tokenDecimals]);

  // ── Quote fetching ─────────────────────────────────────────────────────────
  const fetchQuote = useCallback(async (amount: string) => {
    if (!amount || Number(amount) <= 0) { setQuoteAmount(''); return; }
    setIsQuoting(true);
    try {
      const tokenIn  = isBuy ? WETH_ADDRESS  : TOKEN_ADDRESS;
      const tokenOut = isBuy ? TOKEN_ADDRESS : WETH_ADDRESS;
      const decimalsIn = isBuy ? 18 : tokenDecimals;
      const amountIn = parseUnits(amount, decimalsIn);

      const results = await Promise.allSettled(
        POOL_FEES.map((fee) =>
          publicClient.simulateContract({
            address: QUOTER_ADDRESS,
            abi: QUOTER_ABI,
            functionName: 'quoteExactInputSingle',
            args: [{ tokenIn, tokenOut, amountIn, fee, sqrtPriceLimitX96: BigInt(0) }],
          })
        )
      );

      let best: bigint = BigInt(0);
      let bestFeeFound = 3000;
      for (let i = 0; i < results.length; i++) {
        const r = results[i];
        if (r.status === 'fulfilled') {
          const out = r.value.result[0] as bigint;
          if (out > best) { best = out; bestFeeFound = POOL_FEES[i]; }
        }
      }

      if (best > BigInt(0)) {
        setBestFee(bestFeeFound);
        const decimalsOut = isBuy ? tokenDecimals : 18;
        setQuoteAmount(Number(formatUnits(best, decimalsOut)).toFixed(6));
      } else {
        setQuoteAmount('');
      }
    } catch {
      setQuoteAmount('');
    } finally {
      setIsQuoting(false);
    }
  }, [isBuy, tokenDecimals]);

  const handleAmountChange = (val: string) => {
    setInputAmount(val);
    setQuoteAmount('');
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchQuote(val), 500);
  };

  const handleMax = () => {
    const bal = isBuy ? ethBalance : tokenBalance;
    if (!bal) return;
    const amt = isBuy
      ? (Number(formatEther(bal.value)) * 0.9).toFixed(8)
      : formatUnits(bal.value, tokenDecimals);
    handleAmountChange(amt);
  };

  // ── Approve ────────────────────────────────────────────────────────────────
  const handleApprove = async () => {
    if (!address) return;
    setIsApproving(true);
    try {
      const data = encodeFunctionData({
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [ROUTER_ADDRESS, parseUnits('1000000000', tokenDecimals)],
      });
      const hash = await sendTransactionAsync({ to: TOKEN_ADDRESS, data, chainId: base.id });
      toast.success('Approval sent!');
      await publicClient.waitForTransactionReceipt({ hash: hash as `0x${string}` });
      await refetchAllowance();
      toast.success('Approval confirmed!');
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Approval failed');
    } finally {
      setIsApproving(false);
    }
  };

  // ── Swap ───────────────────────────────────────────────────────────────────
  const handleSwap = async () => {
    if (!address || !inputAmount || !quoteAmount) return;
    setIsSwapping(true);
    setTxHash(null);
    try {
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 1800);
      const slippageBps = BigInt(Math.floor((100 - slippage) * 100));

      if (isBuy) {
        // ETH -> TOKEN
        const amountIn  = parseEther(inputAmount);
        const amountOut = parseUnits(quoteAmount, tokenDecimals);
        const minOut    = (amountOut * slippageBps) / BigInt(10000);

        const swapData = encodeFunctionData({
          abi: ROUTER_ABI,
          functionName: 'exactInputSingle',
          args: [{
            tokenIn: WETH_ADDRESS, tokenOut: TOKEN_ADDRESS,
            fee: bestFee, recipient: address,
            amountIn, amountOutMinimum: minOut, sqrtPriceLimitX96: BigInt(0),
          }],
        });
        const callData = encodeFunctionData({
          abi: ROUTER_ABI,
          functionName: 'multicall',
          args: [deadline, [swapData]],
        });
        const hash = await sendTransactionAsync({
          to: ROUTER_ADDRESS, value: amountIn, data: callData, chainId: base.id,
        });
        setTxHash(hash as string);
      } else {
        // TOKEN -> ETH
        const amountIn  = parseUnits(inputAmount, tokenDecimals);
        const amountOut = parseEther(quoteAmount);
        const minOut    = (amountOut * slippageBps) / BigInt(10000);

        const swapData = encodeFunctionData({
          abi: ROUTER_ABI,
          functionName: 'exactInputSingle',
          args: [{
            tokenIn: TOKEN_ADDRESS, tokenOut: WETH_ADDRESS,
            fee: bestFee, recipient: ROUTER_ADDRESS,
            amountIn, amountOutMinimum: BigInt(0), sqrtPriceLimitX96: BigInt(0),
          }],
        });
        const unwrapData = encodeFunctionData({
          abi: ROUTER_ABI,
          functionName: 'unwrapWETH9',
          args: [minOut, address],
        });
        const callData = encodeFunctionData({
          abi: ROUTER_ABI,
          functionName: 'multicall',
          args: [deadline, [swapData, unwrapData]],
        });
        const hash = await sendTransactionAsync({
          to: ROUTER_ADDRESS, data: callData, chainId: base.id,
        });
        setTxHash(hash as string);
      }

      toast.success('Swap submitted!');
      setInputAmount('');
      setQuoteAmount('');
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message.slice(0, 80) : 'Swap failed');
    } finally {
      setIsSwapping(false);
    }
  };

  if (!isOpen) return null;

  const ethBal = ethBalance ? Number(formatEther(ethBalance.value)).toFixed(5) : '–';
  const tokBal = tokenBalance ? Number(formatUnits(tokenBalance.value, tokenDecimals)).toFixed(2) : '–';
  const fromLabel = isBuy ? 'ETH' : 'MONK';
  const toLabel   = isBuy ? 'MONK' : 'ETH';
  const fromBal   = isBuy ? ethBal  : tokBal;
  const toBal     = isBuy ? tokBal  : ethBal;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="w-full max-w-md rounded-2xl pixel-border bg-card overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <TrendingUp className="text-primary" size={18} />
            <span className="font-pixel text-xs text-primary tracking-wide">SWAP $MONK</span>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Buy / Sell toggle */}
          <div className="flex gap-2">
            {['Buy', 'Sell'].map((mode) => (
              <button
                key={mode}
                onClick={() => { setIsBuy(mode === 'Buy'); setInputAmount(''); setQuoteAmount(''); }}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                  (mode === 'Buy') === isBuy
                    ? 'bg-primary text-primary-foreground glow-yellow'
                    : 'bg-muted text-muted-foreground hover:text-foreground'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>

          {/* From */}
          <div className="bg-muted rounded-xl p-4 space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>You pay</span>
              <span>Balance: {fromBal}</span>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min="0"
                placeholder="0.00"
                value={inputAmount}
                onChange={(e) => handleAmountChange(e.target.value)}
                className="flex-1 bg-transparent text-2xl font-bold text-foreground placeholder-muted-foreground outline-none"
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={handleMax}
                  className="text-xs text-primary hover:text-primary/80 font-bold px-2 py-1 rounded bg-primary/10"
                >
                  MAX
                </button>
                <div className="flex items-center gap-1.5 bg-background px-3 py-1.5 rounded-lg">
                  <span className="text-sm font-bold text-foreground">{fromLabel}</span>
                  <ChevronDown size={12} className="text-muted-foreground" />
                </div>
              </div>
            </div>
          </div>

          {/* Swap direction icon */}
          <div className="flex justify-center">
            <button
              onClick={() => { setIsBuy(!isBuy); setInputAmount(''); setQuoteAmount(''); }}
              className="p-2 rounded-full bg-muted hover:bg-primary/20 transition-colors text-muted-foreground hover:text-primary"
            >
              <ArrowUpDown size={16} />
            </button>
          </div>

          {/* To */}
          <div className="bg-muted rounded-xl p-4 space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>You receive</span>
              <span>Balance: {toBal}</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1 text-2xl font-bold text-foreground">
                {isQuoting ? (
                  <span className="flex items-center gap-2 text-muted-foreground text-base">
                    <Loader2 size={16} className="animate-spin" />
                    Quoting...
                  </span>
                ) : (
                  quoteAmount || <span className="text-muted-foreground">0.00</span>
                )}
              </div>
              <div className="flex items-center gap-1.5 bg-background px-3 py-1.5 rounded-lg">
                <span className="text-sm font-bold text-foreground">{toLabel}</span>
              </div>
            </div>
          </div>

          {/* Slippage */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Slippage tolerance</span>
            <div className="flex gap-1">
              {[1, 3, 5].map((s) => (
                <button
                  key={s}
                  onClick={() => setSlippage(s)}
                  className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                    slippage === s ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-primary/20'
                  }`}
                >
                  {s}%
                </button>
              ))}
            </div>
          </div>

          {/* Fee tier badge */}
          {quoteAmount && (
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Best pool fee</span>
              <span className="text-primary font-mono">{(bestFee / 10000).toFixed(2)}%</span>
            </div>
          )}

          {/* TX hash */}
          {txHash && (
            <a
              href={`https://basescan.org/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-accent hover:underline"
            >
              <ExternalLink size={12} />
              View on Basescan
            </a>
          )}

          {/* Action button */}
          {!isConnected ? (
            <p className="text-center text-sm text-muted-foreground py-2">Connect wallet to swap</p>
          ) : needsApproval ? (
            <button
              onClick={handleApprove}
              disabled={isApproving}
              className="w-full py-3 rounded-xl bg-accent text-accent-foreground font-bold text-sm transition-all hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2 glow-blue"
            >
              {isApproving && <Loader2 size={16} className="animate-spin" />}
              {isApproving ? 'Approving...' : `Approve $MONK`}
            </button>
          ) : (
            <button
              onClick={handleSwap}
              disabled={isSwapping || isQuoting || !inputAmount || !quoteAmount}
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm transition-all hover:opacity-90 disabled:opacity-40 flex items-center justify-center gap-2 glow-yellow"
            >
              {isSwapping && <Loader2 size={16} className="animate-spin" />}
              {isSwapping ? 'Swapping...' : `${isBuy ? 'Buy' : 'Sell'} $MONK`}
            </button>
          )}

          {/* Token info */}
          <p className="text-center text-xs text-muted-foreground">
            $MONK on Base •{' '}
            <a
              href={`https://basescan.org/token/${TOKEN_ADDRESS}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:underline"
            >
              {TOKEN_ADDRESS.slice(0, 6)}...{TOKEN_ADDRESS.slice(-4)}
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
