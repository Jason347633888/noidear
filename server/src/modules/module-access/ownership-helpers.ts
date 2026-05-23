import { PrismaService } from '../../prisma/prisma.service';

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
