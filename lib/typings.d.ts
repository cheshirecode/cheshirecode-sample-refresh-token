export interface AuthResponse {
  error: string | null;
  query: string | null;
  state: string | null;
  code: string | null;
}

export interface PKCEConfig {
  /**
   * client_id if Auth Server requires it
   */
  client_id?: string;
  /**
   * the URL for SPA redirect
   */
  redirect_uri: string;
  /**
   * Authorization Server base URL
   */
  authz_uri: string;
  token_uri: string;
  requested_scopes: string;
  storage?: Storage;
  /**
   * length of code_challenge
   */
  code_length?: number;
  /**
   * where to store code_*
   */
  code_store?: "cookie" | "StorageAPI";
  /**
   * keys for persisting certain items in Storage to be overwritten
   */
  stateKey?: string;
  refreshTokenKey?: string;
  expiresAtKey?: string;
}

export interface TokenResponse {
  access_token: string;
  expires_at: number;
  refresh_token: string;
  token_type: string;
  scope: string;
}
