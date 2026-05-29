import request from './request';

export interface CompanyTenant {
  id: string;
  name: string;
  timezone: string;
  retentionPolicy: string;
  status: string;
  profile?: CompanyProfile | null;
}

export interface CompanyProfile {
  id: string;
  company_id: string;
  legalName?: string | null;
  unifiedSocialCreditCode?: string | null;
  manufacturerName?: string | null;
  manufacturerAddress?: string | null;
  manufacturerPhone?: string | null;
  originPlace?: string | null;
  foodProductionLicense?: string | null;
}

export function getCompany(companyId: string) {
  return request.get<CompanyTenant>(`/companies/${companyId}`);
}

export function saveCompanyProfile(companyId: string, data: Partial<CompanyProfile>) {
  return request.put<CompanyProfile>(`/companies/${companyId}/profile`, data);
}
