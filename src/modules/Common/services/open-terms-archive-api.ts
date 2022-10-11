export const SERVICES_URL =
  'https://opentermsarchive.org/data/api/list_services/v1/?multiple_versions_only=false';

import axios from 'axios';

export type Service = string;
export type DocumentType = string;

export interface Services {
  [key: string]: DocumentType[];
}

export const getServices = async () => {
  try {
    const { data } = await axios.get<Services>(SERVICES_URL);
    return Object.keys(data)
      .sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' }))
      .reduce((acc: Services, key) => ({ ...acc, [key]: data[key] }), {});
  } catch (e) {
    console.error(e);
    return {};
  }
};

export const getService: any = async (serviceName: string) => {
  const services = await getServices();
  const service = services[serviceName];
  return service;
};
