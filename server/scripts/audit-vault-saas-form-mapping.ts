import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, relative } from 'node:path';

export interface VaultFormRef {
  department: string;
  formName: string;
  code: string;
  path: string;
}

export interface MappingAuditResult {
  totalVaultForms: number;
  totalSaasMappingFiles: number;
  missingInSaas: VaultFormRef[];
  codeMismatches: Array<VaultFormRef & { mappedCode: string }>;
}

const FORM_CODE_PATTERN = /GRSS-[A-Z]+-JL-\d+/;

const walkMarkdown = (root: string): string[] => {
  if (!existsSync(root)) return [];

  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const path = join(root, entry.name);
    if (entry.isDirectory()) return walkMarkdown(path);
    return entry.isFile() && entry.name.endsWith('.md') ? [path] : [];
  });
};

const extractCode = (content: string): string => {
  return content.match(FORM_CODE_PATTERN)?.[0] || '';
};

const escapeRegExp = (value: string): string => {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

const parseVaultForms = (vaultRoot: string): VaultFormRef[] => {
  return walkMarkdown(vaultRoot).map((path) => {
    const parts = relative(vaultRoot, path).split('/');
    const fileName = parts[parts.length - 1];
    const content = readFileSync(path, 'utf8');

    return {
      department: parts[0] || '',
      formName: fileName.replace(/\.md$/, ''),
      code: extractCode(content),
      path,
    };
  });
};

const listSaasMappingFiles = (saasRoot: string): string[] => {
  return walkMarkdown(saasRoot).filter((path) => path.includes('03-字段映射表'));
};

const readSaasContent = (saasRoot: string): string => {
  return listSaasMappingFiles(saasRoot)
    .map((path) => readFileSync(path, 'utf8'))
    .join('\n');
};

const findMappedCode = (formName: string, saasContent: string): string => {
  const pattern = new RegExp(
    `${escapeRegExp(formName)}[^\\n]*?(GRSS-[A-Z]+-JL-\\d+)`,
  );
  return saasContent.match(pattern)?.[1] || '';
};

export const auditVaultSaasMapping = (
  vaultRoot: string,
  saasRoot: string,
): MappingAuditResult => {
  const vaultForms = parseVaultForms(vaultRoot);
  const saasContent = readSaasContent(saasRoot);
  const missingInSaas = vaultForms.filter(
    (form) => !saasContent.includes(form.formName),
  );
  const codeMismatches = vaultForms.flatMap((form) => {
    if (!form.code || !saasContent.includes(form.formName)) return [];

    const mappedCode = findMappedCode(form.formName, saasContent);
    return mappedCode && mappedCode !== form.code ? [{ ...form, mappedCode }] : [];
  });

  return {
    totalVaultForms: vaultForms.length,
    totalSaasMappingFiles: listSaasMappingFiles(saasRoot).length,
    missingInSaas,
    codeMismatches,
  };
};

const toMarkdown = (result: MappingAuditResult): string => {
  return [
    '# Form Validation Mapping Audit',
    '',
    `- Vault forms: ${result.totalVaultForms}`,
    `- SaaS mapping files: ${result.totalSaasMappingFiles}`,
    `- Missing in SaaS mapping: ${result.missingInSaas.length}`,
    `- Code mismatches: ${result.codeMismatches.length}`,
    '',
    '## Missing In SaaS Mapping',
    ...result.missingInSaas.map(
      (item) => `- ${item.department} / ${item.formName} / ${item.code || 'NO_CODE'}`,
    ),
    '',
    '## Code Mismatches',
    ...result.codeMismatches.map(
      (item) =>
        `- ${item.department} / ${item.formName}: vault=${item.code}, saas=${item.mappedCode}`,
    ),
    '',
  ].join('\n');
};

if (require.main === module) {
  const vaultRoot =
    process.argv[2] ||
    '/Users/jiashenglin/Desktop/mybrain/文件管理体系/当前公司/04-记录表单';
  const saasRoot =
    process.argv[3] || '/Users/jiashenglin/Desktop/mybrain/SaaS产品构思';
  const output =
    process.argv[4] || 'docs/superpowers/reports/form-validation-audit.md';
  const result = auditVaultSaasMapping(vaultRoot, saasRoot);

  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, toMarkdown(result));
}
