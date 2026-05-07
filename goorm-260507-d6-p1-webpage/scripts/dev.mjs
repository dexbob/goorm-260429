import net from "node:net";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

function bin(name) {
  const ext = process.platform === "win32" ? ".cmd" : "";
  return path.join(root, "node_modules", ".bin", `${name}${ext}`);
}

function canListen(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.unref();
    server.on("error", () => resolve(false));
    server.listen({ port, host: "127.0.0.1" }, () => {
      server.close(() => resolve(true));
    });
  });
}

async function pickPort(start = 8789, range = 80) {
  for (let p = start; p < start + range; p += 1) {
    if (await canListen(p)) return p;
  }
  throw new Error(`빈 포트를 찾지 못했습니다: ${start}~${start + range - 1}`);
}

function run(cmd, args, env) {
  const child = spawn(cmd, args, {
    cwd: root,
    stdio: "inherit",
    env: { ...process.env, ...env },
  });
  return child;
}

async function main() {
  const mode = process.argv.includes("--preview") ? "preview" : "dev";
  const port = await pickPort(Number(process.env.RAG_API_PORT_START || 8789), 80);

  const sharedEnv = {
    // API 서버/프록시가 같은 포트를 바라보게 고정
    PORT: String(port),
    RAG_API_PORT: String(port),
  };

  const tsx = bin("tsx");
  const vite = bin("vite");

  const apiArgs = mode === "dev" ? ["watch", "server/index.ts"] : ["server/index.ts"];
  const webArgs = mode === "dev" ? [] : ["preview"];

  console.log(`[dev] mode=${mode} api_port=${port}`);

  const api = run(tsx, apiArgs, sharedEnv);
  const web = run(vite, webArgs, sharedEnv);

  const shutdown = (sig) => {
    if (api.killed === false) api.kill(sig);
    if (web.killed === false) web.kill(sig);
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));

  const exit = await new Promise((resolve) => {
    let done = false;
    const finish = (code) => {
      if (done) return;
      done = true;
      resolve(code ?? 0);
    };
    api.on("exit", finish);
    web.on("exit", finish);
  });

  process.exit(exit);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : String(e));
  process.exit(1);
});

