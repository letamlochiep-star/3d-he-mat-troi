import path from 'path';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import { handleChatRequest } from './api/chat';

function chatApiPlugin(env: Record<string, string>): Plugin {
  return {
    name: 'chat-api-plugin',
    configureServer(server) {
      // Đưa các biến môi trường vào process.env để api/chat.ts truy cập
      Object.assign(process.env, env);

      server.middlewares.use(async (req, res, next) => {
        const url = req.url || '';
        if (url === '/api/chat' || url.startsWith('/api/chat?')) {
          try {
            await handleChatRequest(req, res);
          } catch (err) {
            console.error('Lỗi khi thực thi /api/chat middleware:', err);
            if (!res.headersSent) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json; charset=utf-8');
              res.end(JSON.stringify({ error: 'Lỗi máy chủ nội bộ' }));
            }
          }
          return;
        }
        next();
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [chatApiPlugin(env)],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
  };
});
