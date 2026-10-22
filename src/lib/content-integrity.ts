import type { PackageData } from '../content/schemas';

interface ServiceRef {
  id: string;
  data: { status: 'live' | 'hidden' | 'coming-soon' };
}
interface PackageRef {
  id: string;
  data: PackageData;
}

/** Cross-collection rules Zod can't express. Returns every problem, so one build shows them all. */
export function contentProblems(services: ServiceRef[], packages: PackageRef[]): string[] {
  const statusById = new Map(services.map((s) => [s.id, s.data.status]));
  const problems: string[] = [];

  for (const pkg of packages) {
    if (pkg.data.status !== 'live') continue;
    const items = pkg.data.kind === 'fixed' ? pkg.data.includes : pkg.data.choose.from;
    for (const item of items) {
      const status = statusById.get(item.service);
      if (status === undefined) {
        problems.push(`Package "${pkg.id}" includes unknown service "${item.service}"`);
      } else if (status !== 'live') {
        problems.push(`Package "${pkg.id}" includes service "${item.service}" which is ${status}`);
      }
    }
  }
  return problems;
}

export function assertContentIntegrity(services: ServiceRef[], packages: PackageRef[]): void {
  const problems = contentProblems(services, packages);
  if (problems.length > 0) {
    throw new Error(`Content integrity check failed:\n- ${problems.join('\n- ')}`);
  }
}
