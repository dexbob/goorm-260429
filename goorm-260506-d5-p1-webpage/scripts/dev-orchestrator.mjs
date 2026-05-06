import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const portsFile = path.join(root, ".runtime-ports.json");

const rawArgs = process.argv.slice(2);
function readMode() {
  let modeArg = "";
  for (let i = 0; i < rawArgs.length; i += 1) {
    const cur = rawArgs[i];
    if (cur === "--mode" && i + 1 < rawArgs.length) {
      modeArg = String(rawArgs[i + 1] || "").trim();
      break;
    }
    if (cur.startsWith("--mode=")) {
      modeArg = cur.slice("--mode=".length).trim();
      break;
    }
  }
  if (!modeArg) return "all";
  if (modeArg === "api") return "api";
  if (modeArg === "web") return "web";
  return "all";
}
const mode = readMode();

function isPortFree(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", () => resolve(false));
    server.once("listening", () => {
      server.close(() => resolve(true));
    });
    server.listen(port, "127.0.0.1");
  });
}

async function pickPort(start, max = start + 200) {
  for (let p = start; p <= max; p += 1) {
    // eslint-disable-next-line no-await-in-loop
    if (await isPortFree(p)) return p;
  }
  throw new Error(`No free port in range ${start}-${max}`);
}

function writePortsJson(obj) {
  const tmp = `${portsFile}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(obj, null, 2), "utf8");
  fs.renameSync(tmp, portsFile);
}

function spawnProc(command, argv, opts = {}) {
  return spawn(command, argv, {
    cwd: root,
    env: process.env,
    stdio: "inherit",
    shell: process.platform === "win32",
    detached: process.platform !== "win32",
    ...opts,
  });
}

const procs = [];
let shuttingDown = false;
let forceKillTimer = null;

function cleanup(signal = "SIGINT") {
  if (shuttingDown) return;
  shuttingDown = true;

  for (const p of procs) {
    if (p && p.exitCode == null && !p.killed) {
      try {
        // uvicorn --reload 자식까지 포함해 프로세스 그룹 단위로 종료
        if (process.platform !== "win32" && typeof p.pid === "number") {
          process.kill(-p.pid, signal);
        } else {
          p.kill(signal);
        }
      } catch {
        // ignore
      }
    }
  }

  // reload 프로세스가 남아있는 경우를 대비해 강제 종료 보강
  forceKillTimer = setTimeout(() => {
    for (const p of procs) {
      if (p && p.exitCode == null && !p.killed) {
        try {
          if (process.platform !== "win32" && typeof p.pid === "number") {
            process.kill(-p.pid, "SIGKILL");
          } else {
            p.kill("SIGKILL");
          }
        } catch {
          // ignore
        }
      }
    }
  }, 1200);

  try {
    fs.rmSync(portsFile, { force: true });
  } catch {
    // ignore
  }
}
process.on("SIGINT", () => {
  cleanup("SIGINT");
  setTimeout(() => process.exit(130), 50);
});
process.on("SIGTERM", () => {
  cleanup("SIGTERM");
  setTimeout(() => process.exit(143), 50);
});
process.on("exit", () => {
  if (forceKillTimer) clearTimeout(forceKillTimer);
  try {
    fs.rmSync(portsFile, { force: true });
  } catch {
    // ignore
  }
});

async function main() {
  const apiPort = mode === "web" ? null : await pickPort(8793, 8999);
  const webPort = mode === "api" ? null : await pickPort(5173, 5399);

  const ports = {
    apiPort,
    webPort,
    apiBase: apiPort ? `http://127.0.0.1:${apiPort}` : null,
    updatedAt: new Date().toISOString(),
  };
  writePortsJson(ports);

  console.log(`[dev-orchestrator] mode=${mode}`);
  if (apiPort) console.log(`[dev-orchestrator] api  : http://127.0.0.1:${apiPort}`);
  if (webPort) console.log(`[dev-orchestrator] web  : http://127.0.0.1:${webPort}`);
  console.log(`[dev-orchestrator] ports: ${portsFile}`);

  if (apiPort) {
    const uvicorn = spawnProc(
      "python3",
      ["-m", "uvicorn", "api.index:app", "--host", "0.0.0.0", "--port", String(apiPort), "--reload"],
    );
    procs.push(uvicorn);
  }

  if (webPort) {
    const vite = spawnProc(
      "vite",
      ["--host", "127.0.0.1", "--port", String(webPort), "--strictPort"],
      {
        env: {
          ...process.env,
          VITE_API_BASE_URL: apiPort ? `http://127.0.0.1:${apiPort}` : process.env.VITE_API_BASE_URL,
        },
      },
    );
    procs.push(vite);
  }

  // 종료 전파
  for (const p of procs) {
    p.on("exit", (code) => {
      if (code && code !== 0) {
        console.error(`[dev-orchestrator] child exited with code ${code}`);
      }
      cleanup("SIGTERM");
      process.exit(code ?? 0);
    });
  }
}

main().catch((e) => {
  console.error(`[dev-orchestrator] ${e instanceof Error ? e.message : String(e)}`);
  process.exit(1);
});

