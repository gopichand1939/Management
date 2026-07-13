const { spawn } = require("node:child_process");

const npmCli = process.env.npm_execpath;

if (!npmCli) {
  console.error("Unable to locate npm. Start this application with `npm start`.");
  process.exit(1);
}

const processes = [
  spawn(process.execPath, [npmCli, "start", "--prefix", "Backend"], {
    stdio: "inherit",
  }),
  spawn(process.execPath, [npmCli, "run", "dev", "--prefix", "Frontend"], {
    stdio: "inherit",
  }),
];

let shuttingDown = false;

function shutdown(exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;

  for (const child of processes) {
    if (!child.killed) child.kill();
  }

  process.exit(exitCode);
}

for (const child of processes) {
  child.on("error", (error) => {
    console.error(`Failed to start application: ${error.message}`);
    shutdown(1);
  });

  child.on("exit", (code, signal) => {
    if (!shuttingDown) {
      console.error(
        `An application process stopped${signal ? ` (${signal})` : ` with code ${code}`}.`,
      );
      shutdown(code ?? 1);
    }
  });
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));
