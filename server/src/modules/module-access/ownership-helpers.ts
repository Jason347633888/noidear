import { PrismaService } from '../../prisma/prisma.service';
import { OwnershipContext } from './ownership-context';

/**
 * Returns the list of user IDs whose departmentId is in the given dept list.
 * Returns [] when deptIds is empty or undefined.
 */
export async function userIdsInDepts(
  prisma: PrismaService,
  deptIds: string[] | undefined,
): Promise<string[]> {
  if (!deptIds || deptIds.length === 0) return [];
  const rows = await prisma.user.findMany({
    where: { departmentId: { in: deptIds } },
    select: { id: true },
  });
  return rows.map((r: { id: string }) => r.id);
}

/**
 * Returns the list of ProductionBatch IDs visible to the given ownership context.
 * admin → undefined (no filter); user → batches where leader_id = userId;
 * leader → batches where leader_id IN members of managed departments.
 * Returns [] if the effective member/batch list is empty (early-exit).
 */
export async function visibleProductionBatchIds(
  prisma: PrismaService,
  o: OwnershipContext,
): Promise<string[] | undefined> {
  if (o.roleCode === 'admin') return undefined; // no filter
  if (o.roleCode === 'user') {
    const rows = await prisma.productionBatch.findMany({
      where: { leader_id: o.userId },
      select: { id: true },
    });
    return rows.map((b: { id: string }) => b.id);
  }
  // leader
  const depts = o.managedDepartmentIds ?? [];
  if (depts.length === 0) return [];
  const members = await userIdsInDepts(prisma, depts);
  if (members.length === 0) return [];
  const rows = await prisma.productionBatch.findMany({
    where: { leader_id: { in: members } },
    select: { id: true },
  });
  return rows.map((b: { id: string }) => b.id);
}
