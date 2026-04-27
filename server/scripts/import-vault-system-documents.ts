import { createHash, randomUUID } from 'crypto';
import { readFileSync, statSync } from 'fs';
import { basename, dirname, extname, join, relative } from 'path';
import { globSync } from 'glob';
import { Prisma, PrismaClient } from '@prisma/client';

const VAULT_ROOT = '/Users/jiashenglin/Desktop/mybrain/文件管理体系/当前公司';

const FOLDERS = {
  '01': { name: '管理手册', documentType: 'MANUAL', level: 1 },
  '02': { name: '程序文件', documentType: 'PROCEDURE', level: 2 },
  '03': { name: '作业指导书', documentType: 'WORK_INSTRUCTION', level: 3 },
  '05': { name: '公司文件', documentType: 'COMPANY_FILE', level: 3 },
  '06': { name: '外来文件', documentType: 'EXTERNAL_FILE', level: 3 },
} as const;

type SourceFolder = keyof typeof FOLDERS;

const FOLDER_NAMES: Record<SourceFolder, string> = {
  '01': '01-管理手册',
  '02': '02-程序文件',
  '03': '03-作业指导书',
  '05': '05-公司文件',
  '06': '06-外来文件',
};

const EXCLUDED_NAMES = new Set(['.DS_Store']);
const EXCLUDED_SUFFIXES = ['.bak', '.bak_heading', '.bak2', '.base'];

interface ImportCandidate {
  sourceFolder: SourceFolder;
  absolutePath: string;
  relativePath: string;
  title: string;
  number: string;
  contentMd: string | null;
  contentHash: string;
  fileSize: number;
  fileType: string;
  ownerDepartment?: string;
  effectiveDate?: Date;
  reviewDueDate?: Date;
  externalSource?: string;
  externalExpiresAt?: Date;
  metadata: Prisma.InputJsonObject;
}

const prisma = new PrismaClient();

function isApplyMode() {
  return process.argv.includes('--apply');
}

function isExcluded(path: string) {
  const name = basename(path);
  if (EXCLUDED_NAMES.has(name)) return true;
  return EXCLUDED_SUFFIXES.some((suffix) => name.endsWith(suffix));
}

function readTextIfMarkdown(path: string) {
  if (extname(path).toLowerCase() !== '.md') return null;
  return readFileSync(path, 'utf-8');
}

function sha1(input: string | Buffer) {
  return createHash('sha1').update(input).digest('hex');
}

function parseFrontmatter(content: string | null): Record<string, string> {
  if (!content) return {};
  const match = content.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!match) return {};

  const result: Record<string, string> = {};
  for (const rawLine of match[1].split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('- ')) continue;
    const sep = line.indexOf(':');
    if (sep === -1) continue;
    const key = line.slice(0, sep).trim();
    const value = line
      .slice(sep + 1)
      .trim()
      .replace(/^["']|["']$/g, '');
    if (key && value) result[key] = value;
  }
  return result;
}

function extractH1(content: string | null) {
  return content?.match(/^#\s+(.+)$/m)?.[1]?.trim();
}

function stripNumberPrefix(title: string) {
  return title
    .replace(/^GRSS-[A-Z]+-(?:ZD|WL)-\d+\s+/, '')
    .replace(/^CX-\d+\s+/, '')
    .trim();
}

function inferNumber(path: string, sourceFolder: SourceFolder, frontmatter: Record<string, string>) {
  if (frontmatter['编号']) return frontmatter['编号'];

  const fileName = basename(path, extname(path));
  const grss = fileName.match(/GRSS-[A-Z]+-(?:ZD|WL)-\d+/);
  if (grss) return grss[0];
  const cx = fileName.match(/^CX-\d+/);
  if (cx) return `GRSS-${cx[0]}`;

  return `VAULT-${sourceFolder}-${sha1(relative(VAULT_ROOT, path)).slice(0, 8).toUpperCase()}`;
}

function parseDate(value?: string) {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function parseReviewDue(effectiveDate?: Date, reviewFrequency?: string) {
  if (!effectiveDate || !reviewFrequency?.includes('年')) return undefined;
  const due = new Date(effectiveDate);
  due.setFullYear(due.getFullYear() + 1);
  return due;
}

function fileType(path: string) {
  const ext = extname(path).toLowerCase();
  if (ext === '.md') return 'text/markdown';
  if (ext === '.pdf') return 'application/pdf';
  if (ext === '.base') return 'application/octet-stream';
  return 'application/octet-stream';
}

function ownerDepartmentFor(path: string, sourceFolder: SourceFolder, frontmatter: Record<string, string>) {
  if (frontmatter['负责部门']) return frontmatter['负责部门'];
  if (sourceFolder === '03' || sourceFolder === '06') {
    return basename(dirname(path));
  }
  if (sourceFolder === '05') return '公司';
  return undefined;
}

function buildMetadata(
  sourceFolder: SourceFolder,
  frontmatter: Record<string, string>,
  relativePath: string,
  contentHash: string,
): Prisma.InputJsonObject {
  const base = {
    vaultRoot: VAULT_ROOT,
    sourcePath: relativePath,
    contentHash,
    vaultVersion: frontmatter['版本'],
    retention: frontmatter['保存年限'],
    reviewer: frontmatter['审核人'],
    approver: frontmatter['批准人'],
  };

  if (sourceFolder === '01') return { ...base, systemScope: '食品安全与质量管理体系' };
  if (sourceFolder === '02') return { ...base, processArea: frontmatter['负责部门'] ?? '体系程序' };
  if (sourceFolder === '03') return { ...base, department: frontmatter['负责部门'] ?? relativePath.split('/')[1] };
  if (sourceFolder === '05') return { ...base, organizationScope: frontmatter['适用范围'] ?? '公司内部' };
  return {
    ...base,
    externalSource: frontmatter['发布机构'] ?? frontmatter['标准号'] ?? '外部来源',
    applicableScope: frontmatter['适用范围'] ?? '公司适用外来文件',
  };
}

function collectCandidates(): ImportCandidate[] {
  const candidates: ImportCandidate[] = [];

  for (const sourceFolder of Object.keys(FOLDERS) as SourceFolder[]) {
    const folderPath = join(VAULT_ROOT, FOLDER_NAMES[sourceFolder]);
    const files = globSync('**/*', { cwd: folderPath, absolute: true, nodir: true }).sort();

    for (const path of files) {
      if (isExcluded(path)) continue;

      const contentMd = readTextIfMarkdown(path);
      const rawBytes = readFileSync(path);
      const contentHash = sha1(rawBytes);
      const frontmatter = parseFrontmatter(contentMd);
      const relativePath = relative(VAULT_ROOT, path);
      const title = stripNumberPrefix(
        frontmatter['title'] ?? extractH1(contentMd) ?? basename(path, extname(path)),
      );
      const effectiveDate = parseDate(frontmatter['生效日期']);

      candidates.push({
        sourceFolder,
        absolutePath: path,
        relativePath,
        title,
        number: inferNumber(path, sourceFolder, frontmatter),
        contentMd,
        contentHash,
        fileSize: statSync(path).size,
        fileType: fileType(path),
        ownerDepartment: ownerDepartmentFor(path, sourceFolder, frontmatter),
        effectiveDate,
        reviewDueDate: parseReviewDue(effectiveDate, frontmatter['复审频率']),
        externalSource: sourceFolder === '06' ? (frontmatter['发布机构'] ?? frontmatter['标准号']) : undefined,
        metadata: buildMetadata(sourceFolder, frontmatter, relativePath, contentHash),
      });
    }
  }

  return candidates;
}

async function findAdminUserId() {
  const admin = await prisma.user.findFirst({
    where: { OR: [{ username: 'admin' }, { role: 'admin' }] },
    select: { id: true },
  });
  if (!admin) throw new Error('找不到管理员用户，无法设置 Document.creatorId');
  return admin.id;
}

async function upsertCandidate(candidate: ImportCandidate, creatorId: string) {
  const config = FOLDERS[candidate.sourceFolder];
  const lineageKey = `vault:${candidate.relativePath}`;
  const existing = await prisma.document.findFirst({
    where: {
      OR: [{ lineage_key: lineageKey }, { number: candidate.number }],
    },
    select: { id: true },
  });

  const data = {
    level: config.level,
    number: candidate.number,
    title: candidate.title,
    filePath: candidate.absolutePath,
    fileName: basename(candidate.absolutePath),
    fileSize: candidate.fileSize,
    fileType: candidate.fileType,
    status: 'effective',
    creatorId,
    content: { sourcePath: candidate.relativePath, contentHash: candidate.contentHash },
    document_type: config.documentType,
    source_folder: candidate.sourceFolder,
    owner_department: candidate.ownerDepartment,
    tags: [config.name],
    metadata: candidate.metadata,
    external_source: candidate.externalSource,
    external_expires_at: candidate.externalExpiresAt,
    lineage_key: lineageKey,
    effective_date: candidate.effectiveDate,
    review_due_date: candidate.reviewDueDate,
    content_md: candidate.contentMd,
  };

  if (existing) {
    await prisma.document.update({ where: { id: existing.id }, data });
    return 'updated';
  }

  await prisma.document.create({ data: { id: `doc_${randomUUID()}`, ...data } });
  return 'created';
}

async function main() {
  const apply = isApplyMode();
  const candidates = collectCandidates();
  const byFolder = candidates.reduce<Record<string, number>>((acc, item) => {
    acc[item.sourceFolder] = (acc[item.sourceFolder] ?? 0) + 1;
    return acc;
  }, {});

  console.log(`${apply ? 'APPLY' : 'DRY-RUN'}: 准备导入 ${candidates.length} 个体系文件`);
  console.log('按目录统计:', byFolder);
  console.log('排除规则: .bak, .bak_heading, .bak2, .base, .DS_Store；04-记录表单未纳入扫描');

  if (!apply) {
    for (const item of candidates.slice(0, 20)) {
      console.log(`${item.sourceFolder} ${item.number} ${item.title} <- ${item.relativePath}`);
    }
    if (candidates.length > 20) console.log(`... 另有 ${candidates.length - 20} 个文件`);
    return;
  }

  const creatorId = await findAdminUserId();
  let created = 0;
  let updated = 0;
  for (const candidate of candidates) {
    const result = await upsertCandidate(candidate, creatorId);
    if (result === 'created') created++;
    if (result === 'updated') updated++;
  }
  console.log(`导入完成: created=${created}, updated=${updated}, total=${candidates.length}`);
}

main()
  .catch((error) => {
    console.error('体系文件导入失败:', error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
