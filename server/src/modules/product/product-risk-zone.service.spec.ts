import { NotFoundException } from '@nestjs/common';
import { ProductRiskZoneService } from './product-risk-zone.service';

const COMPANY_ID = 'company-test';
const PRODUCT_ID = 'prod-001';
const ZONE_ID = 'zone-001';

const makeZone = (overrides: Record<string, unknown> = {}) => ({
  id: ZONE_ID,
  company_id: COMPANY_ID,
  product_id: PRODUCT_ID,
  risk_zone: 'HIGH_CARE',
  basis: 'BRCGS 8.0 clause 4.3',
  effective_from: new Date('2026-01-01'),
  effective_to: null,
  status: 'active',
  approvalInstanceId: null,
  created_at: new Date(),
  ...overrides,
});

describe('ProductRiskZoneService', () => {
  let service: ProductRiskZoneService;

  const mockPrisma = {
    productRiskZone: {
      create: jest.fn(),
      updateMany: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    product: {
      findFirst: jest.fn(),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ProductRiskZoneService(mockPrisma as any);
  });

  // ── setProductRiskZone ────────────────────────────────────────────────────

  describe('setProductRiskZone', () => {
    it('retires existing active zones and creates a new active zone', async () => {
      mockPrisma.product.findFirst.mockResolvedValue({ id: PRODUCT_ID, company_id: COMPANY_ID });
      mockPrisma.productRiskZone.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.productRiskZone.create.mockResolvedValue(makeZone());

      const result = await service.setProductRiskZone(PRODUCT_ID, COMPANY_ID, {
        risk_zone: 'HIGH_CARE',
        basis: 'BRCGS 8.0 clause 4.3',
        effective_from: '2026-01-01',
      });

      expect(mockPrisma.productRiskZone.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            product_id: PRODUCT_ID,
            company_id: COMPANY_ID,
            status: 'active',
          }),
        }),
      );
      expect(mockPrisma.productRiskZone.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'active',
            effective_from: expect.any(Date),
            basis: 'BRCGS 8.0 clause 4.3',
          }),
        }),
      );
      expect(result.status).toBe('active');
      expect(result.risk_zone).toBe('HIGH_CARE');
    });

    it('stores BRCGS risk zone, basis, effective period, and optional approvalInstanceId', async () => {
      mockPrisma.product.findFirst.mockResolvedValue({ id: PRODUCT_ID, company_id: COMPANY_ID });
      mockPrisma.productRiskZone.updateMany.mockResolvedValue({ count: 0 });
      mockPrisma.productRiskZone.create.mockResolvedValue(
        makeZone({ approvalInstanceId: 'approval-001', effective_to: new Date('2027-01-01') }),
      );

      const result = await service.setProductRiskZone(PRODUCT_ID, COMPANY_ID, {
        risk_zone: 'HIGH_CARE',
        basis: 'BRCGS 8.0',
        effective_from: '2026-01-01',
        effective_to: '2027-01-01',
        approvalInstanceId: 'approval-001',
      });

      expect(mockPrisma.productRiskZone.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            approvalInstanceId: 'approval-001',
          }),
        }),
      );
      expect(result.approvalInstanceId).toBe('approval-001');
    });

    it('throws NotFoundException when product does not exist', async () => {
      mockPrisma.product.findFirst.mockResolvedValue(null);

      await expect(
        service.setProductRiskZone(PRODUCT_ID, COMPANY_ID, {
          risk_zone: 'HIGH_CARE',
          effective_from: '2026-01-01',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('does not require risk_zone to be a Product field', async () => {
      // risk zone is standalone — no product join field "risk_zone" required
      mockPrisma.product.findFirst.mockResolvedValue({ id: PRODUCT_ID, company_id: COMPANY_ID });
      mockPrisma.productRiskZone.updateMany.mockResolvedValue({ count: 0 });
      const created = makeZone();
      mockPrisma.productRiskZone.create.mockResolvedValue(created);

      const result = await service.setProductRiskZone(PRODUCT_ID, COMPANY_ID, {
        risk_zone: 'AMBIENT',
        effective_from: '2026-05-01',
      });

      // result is a standalone record, not embedded on Product
      expect(result).not.toHaveProperty('product');
      expect(result.product_id).toBe(PRODUCT_ID);
    });
  });

  // ── getCurrentProductRiskZone ─────────────────────────────────────────────

  describe('getCurrentProductRiskZone', () => {
    it('returns the active zone for a product', async () => {
      mockPrisma.productRiskZone.findFirst.mockResolvedValue(makeZone());

      const result = await service.getCurrentProductRiskZone(PRODUCT_ID, COMPANY_ID);

      expect(result).not.toBeNull();
      expect(result?.status).toBe('active');
      expect(mockPrisma.productRiskZone.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            product_id: PRODUCT_ID,
            company_id: COMPANY_ID,
            status: 'active',
          }),
        }),
      );
    });

    it('returns null when no active zone exists', async () => {
      mockPrisma.productRiskZone.findFirst.mockResolvedValue(null);

      const result = await service.getCurrentProductRiskZone(PRODUCT_ID, COMPANY_ID);

      expect(result).toBeNull();
    });
  });

  // ── listProductRiskZoneHistory ────────────────────────────────────────────

  describe('listProductRiskZoneHistory', () => {
    it('returns all zone records ordered by effective_from desc', async () => {
      const zones = [
        makeZone({ id: 'zone-2', status: 'retired', effective_from: new Date('2025-01-01') }),
        makeZone({ id: 'zone-1', status: 'active', effective_from: new Date('2026-01-01') }),
      ];
      mockPrisma.productRiskZone.findMany.mockResolvedValue(zones);

      const result = await service.listProductRiskZoneHistory(PRODUCT_ID, COMPANY_ID);

      expect(result).toHaveLength(2);
      expect(mockPrisma.productRiskZone.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            product_id: PRODUCT_ID,
            company_id: COMPANY_ID,
          }),
          orderBy: expect.objectContaining({ effective_from: 'desc' }),
        }),
      );
    });

    it('returns empty array when no history exists', async () => {
      mockPrisma.productRiskZone.findMany.mockResolvedValue([]);

      const result = await service.listProductRiskZoneHistory(PRODUCT_ID, COMPANY_ID);

      expect(result).toEqual([]);
    });

    it('includes both active and retired zones in history', async () => {
      const zones = [
        makeZone({ status: 'active' }),
        makeZone({ id: 'zone-old', status: 'retired' }),
      ];
      mockPrisma.productRiskZone.findMany.mockResolvedValue(zones);

      const result = await service.listProductRiskZoneHistory(PRODUCT_ID, COMPANY_ID);

      const statuses = result.map((z) => z.status);
      expect(statuses).toContain('active');
      expect(statuses).toContain('retired');
    });
  });
});
