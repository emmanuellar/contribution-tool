import { CommonResponse } from 'interfaces';

export interface GetContributeServiceResponse extends CommonResponse {
  url: string;
  error?: string;
  isPDF?: boolean;
}
export interface PostContributeServiceResponse extends CommonResponse {
  url?: string;
  error?: string;
}
