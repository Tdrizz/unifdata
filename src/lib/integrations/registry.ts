import type { IntegrationSyncer } from "./types";

const registry = new Map<string, IntegrationSyncer>();

export function registerSyncer(syncer: IntegrationSyncer) {
  registry.set(syncer.provider, syncer);
}

export function getSyncer(provider: string): IntegrationSyncer | undefined {
  return registry.get(provider);
}
