export interface AuthChallengeRequest {
  email: string;
}

export interface AuthChallengeResponse {
  challengeId: string;
  expiresInSeconds: number;
  resendAvailableInSeconds: number;
  devMode?: boolean;
  devOtpCode?: string;
}

export interface CreateSessionRequest {
  challengeId: string;
  code: string;
}

export type SessionInfo =
  | {
      authenticated: false;
    }
  | {
      authenticated: true;
      email: string;
    };
