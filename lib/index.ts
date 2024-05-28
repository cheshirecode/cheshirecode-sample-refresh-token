import WordArray from "crypto-js/lib-typedarrays";
import "isomorphic-unfetch";
import Cookies from "js-cookie";

import { AuthResponse, PKCEConfig, TokenResponse } from "./typings";

const handleFetchResponse = async (res: Response) => {
  // 200 response
  /* c8 ignore next 8 */
  if (res.ok) {
    return await res?.json();
  }
  // very hard to test error handling
  const error = new Error(res.statusText); // non-2xx HTTP responses into errors
  error.info = await res?.text();
  error.message = error.message || error.info;
  error.status = res.status;
  // return something instead of throwing error so that down the line, we can process all errors in 1 place
  return error;
};

export default class PKCEWrapper {
  private config: Required<PKCEConfig>;
  private codeStore: PKCEConfig["code_store"] = "cookie";
  private stateKey = "pkce_state";
  private refreshTokenKey = "refresh_token";

  constructor(config: PKCEConfig) {
    this.config = Object.assign({}, config) as typeof this.config;
    if (!config.storage) {
      this.config.storage = localStorage;
    }
    if (!config.code_length) {
      this.config.code_length = 43;
    }
    // immediately generate or reuse code verifier
    this.generateCodeVerifier();
  }

  /**
   * Generate the authorize url
   * @param  {object} additionalParams include additional parameters in the query
   * @return Promise<string>
   */
  public getAuthorizeUrl(
    additionalParams: { state?: string; [key: string]: unknown } = {},
  ): string {
    const params = {
      response_type: "code,id_token",
      redirect_uri: this.config.redirect_uri,
      state: this.getState(additionalParams?.state ?? null) ?? "",
      code_challenge: this.generateCodeChallenge(),
      client_id: this.config.client_id,
      scope: this.config.requested_scopes,
      ...additionalParams,
    };
    const queryString = new URLSearchParams(params).toString();

    return `${this.config.authz_uri}?${queryString}`;
  }

  /**
   * Given the return url, get a token from the oauth server
   * @param  url current urlwith params from server
   * @param  {object} additionalParams include additional parameters in the request body
   * @return {Promise<TokenResponse>}
   */
  public async exchangeForAccessToken(
    url: string,
    additionalParams: object = {},
  ): Promise<TokenResponse> {
    const authResponse = await this.parseAuthResponseUrl(url);
    const response = await fetch(this.config.token_uri, {
      method: "POST",
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code: String(authResponse.code),
        client_id: this.config.client_id,
        redirect_uri: this.config.redirect_uri,
        code_verifier: this.generateCodeVerifier(),
        ...additionalParams,
      }),
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
      },
      // always allow CORS
      credentials: "include",
      mode: "cors",
    });
    return handleFetchResponse(response);
  }

  /**
   * Given a refresh token, return a new token from the oauth server
   * @param  refreshTokens current refresh token from server
   * @return {Promise<TokenResponse>}
   */
  public async refreshAccessToken(
    refreshToken: string,
  ): Promise<TokenResponse> {
    const response = await fetch(this.config.token_uri, {
      method: "POST",
      body: new URLSearchParams({
        grant_type: "refresh_token",
        client_id: this.config.client_id,
        refresh_token: refreshToken,
      }),
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
      },
    });
    return handleFetchResponse(response);
  }
  /**
   * generate code verifier by storing in cookie
   */
  public generateCodeVerifier(): string {
    const isSSL =
      typeof location !== "undefined" && location?.protocol.startsWith("https");
    const codeVerifierKey = `app.txs.${this.getState()}`;
    const getNewCode = () =>
      WordArray.random(this.config.code_length).toString();
    let v: string | undefined | null;
    if (isSSL && this.codeStore === "cookie") {
      v = Cookies.get(codeVerifierKey);
      // generate unique cookie if not there
      if (!v) {
        // generate code verifier and store
        v = getNewCode();
        Cookies.set(codeVerifierKey, v, {
          sameSite: isSSL ? "Strict" : "Lax",
          secure: isSSL,
        });
      }
    } else {
      // fallback to storage if not on SSL or not cookie mode
      v = this.getStore().getItem(codeVerifierKey);
      if (!v) {
        v = getNewCode();
        this.getStore().setItem(codeVerifierKey, v);
      }
    }
    return v;
  }

  public generateCodeChallenge(): string {
    return WordArray.random(this.config.code_length).toString();
  }

  /**
   * Get the current state or generate a new one
   * @return {string}
   */
  private getState(explicit: string | null = null): string | null {
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
   * @return {string}
   */
  public getRefreshToken() {
    return this.getStore().getItem(this.refreshTokenKey);
  }
  /**
   * Get the current refresh token
   * @return {string}
   */
  public setRefreshToken(token: string): string {
    this.getStore().setItem(this.refreshTokenKey, token);
  }

  /**
   * Get the query params as json from a auth response url
   * @param  {string} url a url expected to have AuthResponse params
   * @return {Promise<AuthResponse>}
   */
  private parseAuthResponseUrl(url: string): Promise<AuthResponse> {
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
   * @param  {AuthResponse} queryParams
   * @return {Promise<AuthResponse>}
   */
  private validateAuthResponse(
    queryParams: AuthResponse,
  ): Promise<AuthResponse> {
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
   * @return {Storage}
   */
  private getStore(): Storage {
    return this.config.storage;
  }
  /**
   * helper function to verify .storage is working, with a callback to clean up
   * @param key
   * @returns
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
