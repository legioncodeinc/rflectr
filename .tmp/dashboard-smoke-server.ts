import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { BACKENDS } from '../src/constants.js';
import { createGatewayModelCatalog, type ServerModelInfo } from '../src/server/models.js';
import { startServer } from '../src/server/router.js';
import { loadRegistry } from '../src/registry/io.js';

const home = join(process.cwd(), '.tmp', 'dashboard-smoke-home');
mkdirSync(home, { recursive: true });
process.env.RFLECTR_HOME = home;

const configPath = join(home, 'config.json');
const providersPath = join(home, 'providers.json');

if (!existsSync(configPath)) {
  writeFileSync(configPath, JSON.stringify({
    defaultTool: 'codex',
    favoriteModels: [],
    server: { requestTracing: false },
  }, null, 2));
}

if (!existsSync(providersPath)) {
  writeFileSync(providersPath, JSON.stringify({
    schemaVersion: 1,
    providers: [],
  }, null, 2));
}

function registryModels(): ServerModelInfo[] {
  return loadRegistry().providers.flatMap(provider => {
    if (!provider.enabled || !provider.modelsCache) return [];
    return provider.modelsCache.models.map(model => ({
      id: model.id,
      name: model.name,
      isFree: false,
      brand: model.brand ?? model.family ?? provider.name,
      sourceBackend: provider.id,
      modelFormat: model.modelFormat,
      upstreamModelId: model.upstreamModelId,
      cost: model.cost,
      baseUrl: model.apiUrl ?? provider.api.url,
      npm: model.npm ?? provider.api.npm,
      apiBaseUrl: model.apiUrl ?? provider.api.url,
      providerId: provider.id,
      providerLabel: provider.name,
      contextWindow: model.contextWindow,
      supportedParameters: model.supportedParameters,
      reasoning: model.reasoning,
      interleavedReasoningField: model.interleavedReasoningField,
      headers: model.headers,
    } satisfies ServerModelInfo));
  });
}

function currentCatalog() {
  return createGatewayModelCatalog(registryModels(), { maskGatewayIds: true });
}

const handle = await startServer({
  host: '127.0.0.1',
  port: 17645,
  apiKey: 'smoke-local-key',
  serverPassword: null,
  catalog: currentCatalog(),
  refreshCatalog: async () => currentCatalog(),
  backends: BACKENDS,
  gateway: { maskGatewayIds: true },
  restartSupported: true,
  requestRestart: () => {
    console.log('Smoke restart requested');
  },
});

console.log(`Dashboard smoke server running: ${handle.url}/dashboard`);
process.on('SIGINT', () => void handle.close().then(() => process.exit(0)));
process.on('SIGTERM', () => void handle.close().then(() => process.exit(0)));
