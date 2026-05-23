import type { LoggerService } from '@nestjs/common';
import type { ModuleKey } from './module-access.constants';

export type MatchMode = 'exact' | 'prefix';
export interface RouteEntry { path: string; mode: MatchMode; }
export interface AuxiliaryEntry extends RouteEntry { guard: 'authenticated' | 'public'; }

export interface RegistryConfig {
  modules: Partial<Record<ModuleKey, RouteEntry[]>>;
  adminOnly: RouteEntry[];
  public: RouteEntry[];
  auxiliary: AuxiliaryEntry[];
}

export type MatchResult =
  | { kind: 'module'; moduleKey: ModuleKey; entry: RouteEntry }
  | { kind: 'admin-only'; entry: RouteEntry }
  | { kind: 'public'; entry: RouteEntry }
  | { kind: 'auxiliary'; entry: AuxiliaryEntry };

export class ModuleRouteRegistry {
  constructor(private readonly cfg: RegistryConfig) {}

  match(controllerPath: string): MatchResult | null {
    const norm = controllerPath.replace(/^\/+|\/+$/g, '');

    const pubEntry = this.findEntry(this.cfg.public, norm);
    if (pubEntry) return { kind: 'public', entry: pubEntry };

    const adminEntry = this.findEntry(this.cfg.adminOnly, norm);
    if (adminEntry) return { kind: 'admin-only', entry: adminEntry };

    const moduleHits: { key: ModuleKey; entry: RouteEntry }[] = [];
    for (const [key, entries] of Object.entries(this.cfg.modules) as [ModuleKey, RouteEntry[] | undefined][]) {
      if (!entries) continue;
      const hit = this.findEntry(entries, norm);
      if (hit) moduleHits.push({ key, entry: hit });
    }
    if (moduleHits.length > 1) {
      // resolve by longest path; ties => fail-fast at validate time
      moduleHits.sort((a, b) => b.entry.path.length - a.entry.path.length);
    }
    if (moduleHits.length >= 1)
      return { kind: 'module', moduleKey: moduleHits[0].key, entry: moduleHits[0].entry };

    const auxEntry = this.findEntry(this.cfg.auxiliary, norm) as AuxiliaryEntry | null;
    if (auxEntry) return { kind: 'auxiliary', entry: auxEntry };

    return null;
  }

  validate(allControllerPaths: string[], opts: { strict?: boolean; logger?: LoggerService } = {}) {
    const strict = opts.strict ?? true;
    const log = opts.logger;
    const unmapped: string[] = [];
    const multiHits: string[] = [];

    for (const path of allControllerPaths) {
      const norm = path.replace(/^\/+|\/+$/g, '');
      const hits = this.collectAllHits(norm);
      if (hits.length === 0) {
        unmapped.push(norm);
        continue;
      }
      // multi-hit detection ignores public+anything else (public is highest priority and short-circuits)
      const tieGroups = this.detectMultiHit(hits);
      if (tieGroups.length > 0) multiHits.push(`${norm} -> ${tieGroups.join(', ')}`);
    }

    if (multiHits.length > 0) {
      throw new Error(`ModuleRouteRegistry multi-hit detected:\n  ${multiHits.join('\n  ')}`);
    }
    if (unmapped.length > 0) {
      const msg = `ModuleRouteRegistry unmapped controllers: ${unmapped.join(', ')}`;
      if (strict) throw new Error(msg);
      log?.warn?.(msg);
    }
  }

  private findEntry(entries: RouteEntry[], path: string): RouteEntry | null {
    const exact = entries.find((e) => e.mode === 'exact' && e.path === path);
    if (exact) return exact;
    const prefixCandidates = entries
      .filter((e) => e.mode === 'prefix' && (path === e.path || path.startsWith(e.path + '/')))
      .sort((a, b) => b.path.length - a.path.length);
    return prefixCandidates[0] ?? null;
  }

  private collectAllHits(path: string) {
    const out: { kind: string; entry: RouteEntry; source?: ModuleKey }[] = [];
    const pubHit = this.findEntry(this.cfg.public, path);
    if (pubHit) out.push({ kind: 'public', entry: pubHit });
    const adminHit = this.findEntry(this.cfg.adminOnly, path);
    if (adminHit) out.push({ kind: 'admin-only', entry: adminHit });
    for (const [key, entries] of Object.entries(this.cfg.modules) as [ModuleKey, RouteEntry[] | undefined][]) {
      if (!entries) continue;
      const hit = this.findEntry(entries, path);
      if (hit) out.push({ kind: 'module', entry: hit, source: key });
    }
    const auxHit = this.findEntry(this.cfg.auxiliary, path);
    if (auxHit) out.push({ kind: 'auxiliary', entry: auxHit });
    return out;
  }

  private detectMultiHit(hits: { kind: string; entry: RouteEntry; source?: ModuleKey }[]): string[] {
    // multiple module hits with identical path length = unresolved tie
    const moduleHits = hits.filter((h) => h.kind === 'module');
    if (moduleHits.length < 2) return [];
    const maxLen = Math.max(...moduleHits.map((h) => h.entry.path.length));
    const top = moduleHits.filter((h) => h.entry.path.length === maxLen);
    if (top.length > 1) return top.map((h) => `${h.source}:${h.entry.path}`);
    return [];
  }
}
