import dotenv from 'dotenv';
import { buildServer } from './app.js';
import { EvolutionHttpClient } from './modules/whatsapp/index.js';

dotenv.config();

// Re-exportaciones para compatibilidad retroactiva con tests unitarios e integración
export { buildServer } from './app.js';
export type { CompositionRootDependencies } from './server.types.js';

async function start() {
  const server = buildServer();
  const port = Number(process.env.PORT) || 8000;
  const host = process.env.HOST || '0.0.0.0';

  try {
    await server.listen({ port, host });
    server.log.info(`🚀 GasConnect Ibarra API running on http://${host}:${port}`);

    // Auto-configuración en background de Evolution API en el arranque
    const evolutionClient = new EvolutionHttpClient();
    evolutionClient
      .ensureConfigured()
      .then((status) => {
        server.log.info(
          { instance: status.instanceName, state: status.state },
          'WhatsApp Evolution API auto-configured successfully'
        );
      })
      .catch((err) => {
        server.log.warn({ err: err.message }, 'Evolution API background auto-configuration deferred');
      });
  } catch (err) {
    server.log.error({ err }, 'Failed to start server');
    process.exit(1);
  }
}

if (process.env.NODE_ENV !== 'test') {
  start();
}
