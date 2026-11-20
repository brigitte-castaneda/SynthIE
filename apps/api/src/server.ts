import { createServer } from 'node:http';
import { loadConfig } from './config';
import { createApp } from './http/app';
import { createProvider } from './llm';

const config = loadConfig();
const provider = createProvider(config.llm);
const server = createServer(createApp(config, provider));

// Requests can legitimately run as long as the model deadline.
server.requestTimeout = config.llm.timeoutMs + 30_000;

server.listen(config.port, () => {
  console.log(`SynthIE API on http://localhost:${config.port} (provider=${provider.name}, model=${provider.model})`);
});
