import { CommonResponse } from 'interfaces';
import { OTAJson } from '../services/open-terms-archive';

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
export interface GetServiceFilesResponse extends CommonResponse {
  error?: string;
  declaration?: OTAJson;
  destination?: string;
}

export interface GetContributeServiceResponse extends CommonResponse {
  url: string;
  snapshotUrl?: string;
  error?: string;
  isPDF?: boolean;
}
export interface PostContributeServiceResponse extends CommonResponse {
  url?: string;
  error?: string;
}
