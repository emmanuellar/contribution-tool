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
}
