import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/api/request', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
  },
}));

import request from '@/api/request';
import accessDeclarationApi from '@/api/access-declaration';
import externalPartyEvaluationApi from '@/api/external-party-evaluation';
import laundryRecordApi from '@/api/laundry-record';
import visitorAccessDeclarationApi from '@/api/visitor-access-declaration';

describe('accessDeclarationApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (request.get as ReturnType<typeof vi.fn>).mockResolvedValue({ data: [] });
    (request.post as ReturnType<typeof vi.fn>).mockResolvedValue({ data: {} });
    (request.patch as ReturnType<typeof vi.fn>).mockResolvedValue({ data: {} });
  });

  it('calls GET /access-declarations for list', async () => {
    await accessDeclarationApi.getList();
    expect(request.get).toHaveBeenCalledWith('/access-declarations', { params: { declaration_type: undefined, status: undefined } });
  });

  it('calls GET /access-declarations with filters', async () => {
    await accessDeclarationApi.getList('visitor_health', 'pending');
    expect(request.get).toHaveBeenCalledWith('/access-declarations', {
      params: { declaration_type: 'visitor_health', status: 'pending' },
    });
  });

  it('calls GET /access-declarations/:id for one record', async () => {
    await accessDeclarationApi.getOne('decl-1');
    expect(request.get).toHaveBeenCalledWith('/access-declarations/decl-1');
  });

  it('calls POST /access-declarations to create', async () => {
    const payload = {
      company_id: 'c1',
      declaration_type: 'visitor_health' as const,
      subject_type: 'visitor',
      declaration_content: { checked: true },
      declared_at: '2026-05-30T00:00:00Z',
    };
    await accessDeclarationApi.create(payload);
    expect(request.post).toHaveBeenCalledWith('/access-declarations', payload);
  });

  it('calls PATCH /access-declarations/:id/approve', async () => {
    await accessDeclarationApi.approve('decl-1', { approver_id: 'u1', conclusion: 'approved' });
    expect(request.patch).toHaveBeenCalledWith('/access-declarations/decl-1/approve', {
      approver_id: 'u1',
      conclusion: 'approved',
    });
  });

  it('calls PATCH /access-declarations/:id/expire', async () => {
    await accessDeclarationApi.expire('decl-1');
    expect(request.patch).toHaveBeenCalledWith('/access-declarations/decl-1/expire', {});
  });

  it('calls POST /access-declarations/:id/visitor-links to link visitor', async () => {
    await accessDeclarationApi.linkToVisitor('decl-1', 'visit-1');
    expect(request.post).toHaveBeenCalledWith('/access-declarations/decl-1/visitor-links', {
      visitor_record_id: 'visit-1',
    });
  });
});

describe('externalPartyEvaluationApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (request.get as ReturnType<typeof vi.fn>).mockResolvedValue({ data: [] });
    (request.post as ReturnType<typeof vi.fn>).mockResolvedValue({ data: {} });
  });

  it('calls GET /external-parties/evaluations for list', async () => {
    await externalPartyEvaluationApi.getList();
    expect(request.get).toHaveBeenCalledWith('/external-parties/evaluations');
  });

  it('calls GET /external-parties/:id/evaluations for party evaluations', async () => {
    await externalPartyEvaluationApi.getByParty('party-1');
    expect(request.get).toHaveBeenCalledWith('/external-parties/party-1/evaluations');
  });

  it('calls POST /external-parties/:id/evaluations to create', async () => {
    const payload = {
      evaluation_type: 'logistics' as const,
      evaluation_date: '2026-05-30',
      result: 'pass' as const,
    };
    await externalPartyEvaluationApi.create('party-1', payload);
    expect(request.post).toHaveBeenCalledWith('/external-parties/party-1/evaluations', payload);
  });
});

describe('laundryRecordApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (request.get as ReturnType<typeof vi.fn>).mockResolvedValue({ data: [] });
    (request.post as ReturnType<typeof vi.fn>).mockResolvedValue({ data: {} });
  });

  it('calls GET /laundry-records for list', async () => {
    await laundryRecordApi.getList();
    expect(request.get).toHaveBeenCalledWith('/laundry-records', { params: undefined });
  });

  it('calls GET /laundry-records with status filter', async () => {
    await laundryRecordApi.getList('submitted');
    expect(request.get).toHaveBeenCalledWith('/laundry-records', { params: { status: 'submitted' } });
  });

  it('calls GET /laundry-records/:id for one record', async () => {
    await laundryRecordApi.getOne('rec-1');
    expect(request.get).toHaveBeenCalledWith('/laundry-records/rec-1');
  });

  it('calls POST /laundry-records to create', async () => {
    const payload = {
      company_id: 'c1',
      work_date: '2026-05-30',
      operator_id: 'u1',
      items: [{ garment_type: 'uniform', quantity: 5, action: 'wash', result: 'clean' }],
    };
    await laundryRecordApi.create(payload);
    expect(request.post).toHaveBeenCalledWith('/laundry-records', payload);
  });

  it('calls POST /laundry-records/:id/submit', async () => {
    await laundryRecordApi.submit('rec-1');
    expect(request.post).toHaveBeenCalledWith('/laundry-records/rec-1/submit', {});
  });

  it('calls POST /laundry-records/:id/verify', async () => {
    await laundryRecordApi.verify('rec-1', true);
    expect(request.post).toHaveBeenCalledWith('/laundry-records/rec-1/verify', { pass: true });
  });
});

describe('visitorAccessDeclarationApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (request.get as ReturnType<typeof vi.fn>).mockResolvedValue({ data: [] });
    (request.post as ReturnType<typeof vi.fn>).mockResolvedValue({ data: {} });
  });

  it('calls POST /access-declarations/:id/visitor-links to link', async () => {
    await visitorAccessDeclarationApi.linkDeclarationToVisitor('decl-1', 'visit-1');
    expect(request.post).toHaveBeenCalledWith('/access-declarations/decl-1/visitor-links', {
      visitor_record_id: 'visit-1',
    });
  });

  it('calls GET /visitor-records/:id/access-declarations', async () => {
    await visitorAccessDeclarationApi.getDeclarationsByVisitor('visit-1');
    expect(request.get).toHaveBeenCalledWith('/visitor-records/visit-1/access-declarations');
  });
});
