import request from './request';

// =========================================================================
// Types
// =========================================================================

export interface VisitorAccessDeclaration {
  visitor_record_id: string;
  access_declaration_id: string;
  declaration_type: string;
}

export interface VisitorAccessDeclarationDetail extends VisitorAccessDeclaration {
  visitorRecord?: {
    id: string;
    visitor_name: string;
    visit_date: string;
    organization: string | null;
  } | null;
  accessDeclaration?: {
    id: string;
    declaration_type: string;
    status: string;
    declared_at: string;
  } | null;
}

// =========================================================================
// API functions
// =========================================================================

const visitorAccessDeclarationApi = {
  linkDeclarationToVisitor(accessDeclarationId: string, visitorRecordId: string) {
    return request.post<void>(
      `/access-declarations/${accessDeclarationId}/visitor-links`,
      { visitor_record_id: visitorRecordId },
    );
  },

  getDeclarationsByVisitor(visitorRecordId: string) {
    return request.get<VisitorAccessDeclaration[]>(
      `/visitor-records/${visitorRecordId}/access-declarations`,
    );
  },
};

export default visitorAccessDeclarationApi;
