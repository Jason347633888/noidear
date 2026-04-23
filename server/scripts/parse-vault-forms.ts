import * as fs from 'fs';
import * as path from 'path';
import { globSync } from 'glob';

export const VAULT_FORMS_DIR =
  '/Users/jiashenglin/Desktop/mybrain/文件管理体系/当前公司/04-记录表单';

export interface ParsedField {
  name: string;
  label: string;
  type: string;
  unit?: string;
  required: boolean;
  defaultValue?: string;
}

export interface ParsedTemplate {
  code: string;
  name: string;
  department: string;
  retentionYears: number;
  fields: ParsedField[];
  rawPath: string;
}

function mapType(vaultType: string): string {
  const t = vaultType.trim().toLowerCase();
  if (t.includes('枚举（多选）')) return 'multi-enum';
  if (t.includes('枚举')) return 'enum';
  if (t.includes('数值') || t.includes('数字') || t === '数字') return 'number';
  if (t.includes('日期时间')) return 'datetime';
  if (t.includes('日期')) return 'date';
  if (t.includes('检验表') || t.includes('三列')) return 'inspection-table';
  if (t.includes('勾选') || t.includes('checklist')) return 'checklist';
  if (t.includes('图片') || t.includes('照片')) return 'photo';
  if (t.includes('布尔')) return 'boolean';
  if (t.includes('文本')) return 'text';
  return 'text';
}

function extractCodeFromFrontmatter(content: string): string | null {
  // Look for 编号 field in YAML frontmatter
  const fmMatch = content.match(/^---\s*[\s\S]*?^---/m);
  if (fmMatch) {
    const fm = fmMatch[0];
    const codeMatch = fm.match(/编号:\s*["']?(GRSS-[A-Z]+-JL-\d+)["']?/);
    if (codeMatch) return codeMatch[1];
  }
  // Fallback: search entire content
  const match = content.match(/GRSS-[A-Z]+-JL-\d+/);
  return match ? match[0] : null;
}

function extractRetentionYears(content: string): number {
  const match = content.match(/保存年限:\s*["']?(\d+)/);
  return match ? parseInt(match[1], 10) : 5;
}

function extractCode(filePath: string, content: string): string {
  const fromFm = extractCodeFromFrontmatter(content);
  if (fromFm) return fromFm;
  // Generate a code from file path as fallback
  const dir = path.basename(path.dirname(filePath));
  const base = path.basename(filePath, '.md');
  const slug = `${dir}-${base}`.toUpperCase().replace(/[^A-Z0-9]/g, '-').slice(0, 40);
  return slug;
}

/**
 * Parse all field tables from a markdown file.
 * The actual format uses:
 *   | 字段名 | 类型 | 单位 | 必填 | 填写方式 | 默认值 / 取值范围 |
 * with ✓ for required and — for not applicable.
 */
/**
 * Table format variants:
 *   Format A (standard):  | 字段名 | 类型 | 单位 | 必填 | 填写方式 | 默认值 / 取值范围 |
 *   Format B (alt):       | 字段名称 | 类型 | 填写方式 | 可选值 / 说明 |
 */
type TableFormat = 'standard' | 'alt';

export function parseFieldTable(content: string): ParsedField[] {
  const lines = content.split('\n');
  const fields: ParsedField[] = [];

  let inFieldTable = false;
  let headerParsed = false;
  let tableFormat: TableFormat = 'standard';

  for (const line of lines) {
    const trimmed = line.trim();

    // Detect the field table header row — standard format requires 必填
    if (trimmed.includes('字段名') && trimmed.includes('类型') && trimmed.includes('必填')) {
      inFieldTable = true;
      headerParsed = false;
      tableFormat = 'standard';
      continue;
    }

    // Alt format: 字段名称 | 类型 | 填写方式 | 可选值 (no 必填 column)
    if (
      trimmed.includes('字段名称') &&
      trimmed.includes('类型') &&
      trimmed.includes('填写方式') &&
      !trimmed.includes('必填')
    ) {
      inFieldTable = true;
      headerParsed = false;
      tableFormat = 'alt';
      continue;
    }

    if (!inFieldTable) continue;

    // Skip the separator row (--- alignment row)
    if (!headerParsed) {
      if (trimmed.startsWith('|') && trimmed.includes('---')) {
        headerParsed = true;
        continue;
      }
      // If we see another line without pipes, reset
      if (!trimmed.startsWith('|')) {
        inFieldTable = false;
        continue;
      }
      continue;
    }

    // End of table
    if (!trimmed.startsWith('|')) {
      inFieldTable = false;
      headerParsed = false;
      continue;
    }

    const cols = trimmed
      .split('|')
      .map((c) => c.trim())
      .filter(Boolean);

    if (cols.length < 3) continue;

    const label = cols[0];

    // Skip rows that look like sub-headers or empty labels
    if (!label || label.startsWith('---') || label === '字段名' || label === '字段名称') continue;

    let typeRaw: string;
    let unit: string | undefined;
    let required: boolean;
    let defaultValue: string | undefined;

    if (tableFormat === 'standard') {
      // Need at least: 字段名, 类型, 单位, 必填
      if (cols.length < 4) continue;
      typeRaw = cols[1] ?? '';
      const unitRaw = cols[2];
      const requiredRaw = cols[3] ?? '';
      unit = unitRaw && unitRaw !== '—' && unitRaw !== '-' ? unitRaw : undefined;
      required = requiredRaw.includes('✓');
      const defaultValueRaw = cols[5];
      defaultValue =
        defaultValueRaw && defaultValueRaw !== '—' && defaultValueRaw !== '-'
          ? defaultValueRaw.slice(0, 200)
          : undefined;
    } else {
      // Alt format: 字段名称 | 类型 | 填写方式 | 可选值/说明
      typeRaw = cols[1] ?? '';
      unit = undefined;
      required = false; // alt format has no required column
      const optionsRaw = cols[3];
      defaultValue =
        optionsRaw && optionsRaw !== '—' && optionsRaw !== '-'
          ? optionsRaw.slice(0, 200)
          : undefined;
    }

    const fieldName = label
      .replace(/[（(][^）)]*[）)]/g, '') // strip parentheses content
      .replace(/[^\u4e00-\u9fa5\w]/g, '_') // non-CJK non-word → underscore
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')
      .toLowerCase()
      .slice(0, 50);

    fields.push({
      name: fieldName || `field_${fields.length}`,
      label,
      type: mapType(typeRaw),
      unit,
      required,
      defaultValue,
    });
  }

  return fields;
}

export function parseAllForms(): ParsedTemplate[] {
  const files = globSync('**/*.md', { cwd: VAULT_FORMS_DIR, absolute: true });
  const templates: ParsedTemplate[] = [];

  for (const file of files) {
    let content: string;
    try {
      content = fs.readFileSync(file, 'utf-8');
    } catch {
      continue;
    }

    const department = path.basename(path.dirname(file));

    // Extract name: prefer frontmatter title, then first H1
    const fmTitleMatch = content.match(/^title:\s*["']?(.+?)["']?\s*$/m);
    const h1Match = content.match(/^#\s+(.+)/m);
    const name = (fmTitleMatch?.[1] ?? h1Match?.[1] ?? path.basename(file, '.md')).trim();

    const fields = parseFieldTable(content);

    // Skip files with no parseable fields
    if (fields.length === 0) continue;

    templates.push({
      code: extractCode(file, content),
      name,
      department,
      retentionYears: extractRetentionYears(content),
      fields,
      rawPath: file,
    });
  }

  return templates;
}
