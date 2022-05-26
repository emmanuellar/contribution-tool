import { CommonResponse } from 'interfaces';

export interface GetServiceResponse {
  status: 'ok' | 'ko';
  message?: string;
}

export interface GetServiceVerifyResponse extends CommonResponse {
  error?: string;
  snapshot?: string;
  version?: string;
  mimeType?: string;
}
