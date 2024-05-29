import WordArray from "crypto-js/lib-typedarrays";
import "isomorphic-unfetch";
import Cookies from "js-cookie";

import { AuthResponse, PKCEConfig, TokenResponse } from "./typings";

const handleFetchResponse = async (res: Response) => {
  // 200 response
  /* c8 ignore next 8 */
  try {
    if (res.ok) {
      return await res?.json();
    }
  } catch (e) {}
  // very hard to test error handling
  const error: ErrorHttp = new Error(res.statusText); // non-2xx HTTP responses into errors
  error.status = res.status;
  // return something instead of throwing error so that down the line, we can process all errors in 1 place
  return error;
};

export const commonHeaders = {
  Accept: "application/json",
  "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
};

export default class PKCEWrapper {
  private config: Required<PKCEConfig>;
  private codeStore: PKCEConfig["code_store"] = "cookie";
  private stateKey = "pkce_state";
  private refreshTokenKey = "refresh_token";
  private expiresAtKey = "expires_at";

  constructor(config: PKCEConfig) {
    this.config = Object.assign({}, config) as typeof this.config;
    if (!config.storage) {
      this.config.storage = localStorage;
    }
    if (!config.code_length) {
      this.config.code_length = 43;
    }
    // little hack to allow overriding of <value>Key in order to allow multiple instances with different sets of state + tokens
    // such as multiple Authz Servers
    Object.keys(this.config).forEach((x) => {
      if (x.endsWith("Key") && Object.hasOwn(this, x)) {
        const y = x as unknown as Exclude<keyof PKCEWrapper, "expiresAt">;
        // @ts-ignore
        this[y] = this.config[y as keyof PKCEConfig];
      }
    });

    // immediately generate or reuse code verifier
    this.getCodeVerifier();
  }

  /**
   * Generate the authorize url
   */
  public getAuthorizeUrl(
    additionalParams: { state?: string; [key: string]: unknown } = {},
  ) {
    const params = {
      response_type: "code,id_token",
      redirect_uri: this.config.redirect_uri,
      state: this.getState(additionalParams?.state ?? null) ?? "",
      code_challenge: this.generateCodeChallenge(),
      scope: this.config.requested_scopes,
      ...additionalParams,
    };
    const queryString = new URLSearchParams(params).toString();

    return `${this.config.authz_uri}?${queryString}`;
  }

  /**
   * Given the return url, get a token from the oauth server
   */
  public async exchangeForAccessToken(
    url: string,
    additionalParams: object = {},
    cors = false,
  ): Promise<TokenResponse> {
    const authResponse = await this.parseAuthResponseUrl(url);
    const response = await fetch(this.config.token_uri, {
      method: "POST",
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code: String(authResponse.code),
        redirect_uri: this.config.redirect_uri,
        code_verifier: this.getCodeVerifier() ?? "",
        ...additionalParams,
      }),
      headers: commonHeaders,
      ...(cors
        ? {
            credentials: "include",
            mode: "cors",
          }
        : {}),
    });
    return handleFetchResponse(response);
  }

  /**
   * Given a refresh token, return a new token from the oauth server
   */
  public async refreshAccessToken(
    refreshToken?: string,
  ): Promise<TokenResponse> {
    const response = await fetch(this.config.token_uri, {
      method: "POST",
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken ?? this.getRefreshToken() ?? "",
      }),
      headers: commonHeaders,
    });
    return handleFetchResponse(response);
  }
  /**
   * generate code verifier by storing in cookie
   */
  public getCodeVerifier(generate = true): string | null {
    const isSSL =
      typeof location !== "undefined" && location?.protocol.startsWith("https");
    const codeVerifierKey = `app.txs.${this.getState()}`;
    const getNewCode = () =>
      WordArray.random(this.config.code_length).toString();
    let v: string | null | undefined;
    if (isSSL && this.codeStore === "cookie") {
      v = Cookies.get(codeVerifierKey);
      // generate unique cookie if not there
      if (!v && generate) {
        // generate code verifier and store
        v = getNewCode();
        Cookies.set(codeVerifierKey, v, {
          sameSite: "Strict",
          secure: true,
        });
      }
    } else {
      // fallback to storage if not on SSL or not cookie mode
      v = this.getStore().getItem(codeVerifierKey);
      if (!v && generate) {
        v = getNewCode();
        this.getStore().setItem(codeVerifierKey, v);
      }
    }
    return v ?? null;
  }
  /**
   * remove code verifier
   */
  public removeCodeVerifier(): void {
    const isSSL =
      typeof location !== "undefined" && location?.protocol.startsWith("https");
    const codeVerifierKey = `app.txs.${this.getState()}`;
    if (isSSL && this.codeStore === "cookie") {
      Cookies.remove(codeVerifierKey);
    } else {
      // fallback to storage if not on SSL or not cookie mode
      this.getStore().removeItem(codeVerifierKey);
    }
  }

  public generateCodeChallenge(): string {
    return WordArray.random(this.config.code_length).toString();
  }

  /**
   * Get the current state or generate a new one
   */
  private getState(explicit: string | null = null) {
    // either explicitlly set, or not yet set (in which case, we generate a random string)
    if (explicit !== null || this.getStore().getItem(this.stateKey) === null) {
      this.getStore().setItem(
        this.stateKey,
        explicit ?? WordArray.random(20).toString(),
      );
    }

    return this.getStore().getItem(this.stateKey);
  }

  /**
   * Get the current refresh token
   */
  public getRefreshToken() {
    return this.getStore().getItem(this.refreshTokenKey);
  }
  /**
   * Get the current refresh token
   */
  public setRefreshToken(token: string) {
    this.getStore().setItem(this.refreshTokenKey, token);
  }

  get expiresAt() {
    return Number(this.getStore().getItem(this.expiresAtKey));
  }

  set expiresAt(ts: number) {
    this.getStore().setItem(this.expiresAtKey, String(ts));
  }

  /**
   * Get the query params as json from a auth response url
   */
  private parseAuthResponseUrl(url: string) {
    const params = new URL(url).searchParams;
    return this.validateAuthResponse({
      error: params.get("error"),
      query: params.get("query"),
      state: params.get("state"),
      code: params.get("code"),
    });
  }

  /**
   * Validates params from auth response
   */
  private validateAuthResponse(queryParams: AuthResponse) {
    return new Promise<AuthResponse>((resolve, reject) => {
      if (queryParams.error) {
        return reject({ error: queryParams.error });
      }

      if (queryParams.state !== this.getState()) {
        return reject({ error: "Invalid State" });
      }

      return resolve(queryParams);
    });
  }

  /**
   * Get the storage in use
   */
  private getStore() {
    return this.config.storage;
  }
  /**
   * helper function to verify .storage is working, with a callback to clean up
   */
  public testStore(key: string): () => void {
    if ([this.stateKey].includes(key)) {
      throw RangeError(`This Storage key ${key} is reserved internally`);
    }
    this.getStore().setItem(key, "dummy");
    return () => {
      this.getStore().removeItem(key);
    };
  }
}
