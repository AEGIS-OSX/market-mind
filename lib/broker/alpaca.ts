import "server-only";

// The single broker client. Nothing else in this codebase talks to Alpaca.
//
// MODE IS RESOLVED FROM THE ENVIRONMENT AT CONSTRUCTION AND NEVER FROM A
// REQUEST. A caller cannot ask for live by sending {"mode":"live"} in a body;
// the only way this process reaches api.alpaca.markets is if the server's own
// ALPACA_MODE says live and live credentials are present in its environment.
//
// Credentials are read from process.env only. They are never logged, never
// returned in a response, and never written to the database.

export type AlpacaMode = "paper" | "live";

const BASE_URLS: Record<AlpacaMode, string> = {
  paper: "https://paper-api.alpaca.markets",
  live: "https://api.alpaca.markets",
};

// Paper and live credentials are separate variables on purpose: a paper key
// cannot be silently promoted to live by flipping one string.
const KEY_ENV: Record<AlpacaMode, { id: string; secret: string }> = {
  paper: { id: "ALPACA_PAPER_KEY_ID", secret: "ALPACA_PAPER_SECRET" },
  live: { id: "ALPACA_API_KEY", secret: "ALPACA_API_SECRET" },
};

/** Network failure, timeout, or 5xx. The request's outcome is UNKNOWN. */
export class AlpacaTransportError extends Error {
  readonly kind = "transport";
  constructor(message: string, public status?: number) {
    super(message);
    this.name = "AlpacaTransportError";
  }
}

/** A definite 4xx answer from the broker. The request did NOT take effect. */
export class AlpacaHttpError extends Error {
  readonly kind = "http";
  constructor(
    public status: number,
    /** The broker's response body, verbatim. Stored as-is; never paraphrased. */
    public body: string,
    public parsed: Record<string, unknown> | null
  ) {
    super(`Alpaca HTTP ${status}: ${body}`);
    this.name = "AlpacaHttpError";
  }
  /** Alpaca's "client_order_id must be unique" code. */
  get isDuplicateClientOrderId(): boolean {
    return this.status === 422 && this.parsed?.code === 40010001;
  }
}

export interface SubmitOrderParams {
  symbol: string;
  qty: number;
  side: "buy" | "sell";
  type: "market" | "limit";
  time_in_force: "day" | "gtc" | "ioc" | "fok" | "opg" | "cls";
  client_order_id: string;
  limit_price?: number;
}

const TIMEOUT_MS = 15_000;

export class AlpacaClient {
  constructor(
    public readonly mode: AlpacaMode,
    private readonly baseUrl: string,
    private readonly keyId: string,
    private readonly secret: string
  ) {}

  private async request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<T> {
    let res: Response;
    try {
      res = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers: {
          "APCA-API-KEY-ID": this.keyId,
          "APCA-API-SECRET-KEY": this.secret,
          "Content-Type": "application/json",
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        cache: "no-store",
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch (e) {
      // Timeout or network failure: we do not know whether the broker saw it.
      throw new AlpacaTransportError(e instanceof Error ? e.message : String(e));
    }

    const text = await res.text();

    if (res.status >= 500) {
      // Server-side failure is equally indeterminate.
      throw new AlpacaTransportError(`upstream ${res.status}: ${text}`, res.status);
    }
    if (!res.ok) {
      let parsed: Record<string, unknown> | null = null;
      try {
        parsed = JSON.parse(text);
      } catch {
        /* keep the raw body */
      }
      throw new AlpacaHttpError(res.status, text, parsed);
    }

    return (text ? JSON.parse(text) : null) as T;
  }

  getAccount() {
    return this.request<Record<string, unknown>>("GET", "/v2/account");
  }

  getClock() {
    return this.request<Record<string, unknown>>("GET", "/v2/clock");
  }

  getAssets(params: { status?: string; asset_class?: string } = {}) {
    const q = new URLSearchParams(params as Record<string, string>).toString();
    return this.request<Record<string, unknown>[]>(
      "GET",
      `/v2/assets${q ? `?${q}` : ""}`
    );
  }

  getPositions() {
    return this.request<Record<string, unknown>[]>("GET", "/v2/positions");
  }

  getOpenOrders() {
    return this.request<Record<string, unknown>[]>(
      "GET",
      "/v2/orders?status=open&nested=false"
    );
  }

  /**
   * The reconciliation primitive. After a duplicate-id rejection or an
   * indeterminate submit, this is how we learn what the broker actually has.
   */
  getOrderByClientOrderId(clientOrderId: string) {
    return this.request<Record<string, unknown>>(
      "GET",
      `/v2/orders:by_client_order_id?client_order_id=${encodeURIComponent(clientOrderId)}`
    );
  }

  submitOrder(params: SubmitOrderParams) {
    return this.request<Record<string, unknown>>("POST", "/v2/orders", params);
  }

  cancelOrder(orderId: string) {
    return this.request<null>("DELETE", `/v2/orders/${encodeURIComponent(orderId)}`);
  }

  cancelAll() {
    return this.request<Record<string, unknown>[]>("DELETE", "/v2/orders");
  }

  /** Account-level halt: suspends all trading for this account at the broker. */
  setTradingSuspended(suspended: boolean) {
    return this.request<Record<string, unknown>>("PATCH", "/v2/account/configurations", {
      suspend_trade: suspended,
    });
  }
}

export interface AlpacaResolution {
  client: AlpacaClient | null;
  /** Why there is no client, when there is none. */
  reason?: string;
  mode?: AlpacaMode;
}

/**
 * Build the client from the environment. Returns a reason instead of a client
 * when the environment is not completely configured -- callers refuse rather
 * than falling back to anything.
 */
export function resolveAlpacaClient(): AlpacaResolution {
  const raw = process.env.ALPACA_MODE;
  if (raw !== "paper" && raw !== "live") {
    return {
      client: null,
      reason: `Server broker mode is not configured for trading (ALPACA_MODE=${
        raw ? `"${raw}"` : "unset"
      }, expected "paper" or "live").`,
    };
  }
  const mode: AlpacaMode = raw;
  const env = KEY_ENV[mode];
  const keyId = process.env[env.id];
  const secret = process.env[env.secret];
  const missing = [
    !keyId || keyId === "" ? env.id : null,
    !secret || secret === "" ? env.secret : null,
  ].filter(Boolean);
  if (missing.length > 0) {
    return {
      client: null,
      mode,
      reason: `Broker credentials for ${mode} mode are absent or empty: ${missing.join(", ")}.`,
    };
  }
  return {
    client: new AlpacaClient(mode, BASE_URLS[mode], keyId as string, secret as string),
    mode,
  };
}
