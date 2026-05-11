const { spawn } = require("child_process");

const prompt = process.argv.slice(2).join(" ");

if (!prompt) {
    console.error("Usage: node index.js <prompt>");
    process.exit(1);
}

// Pipe the prompt via stdin to avoid shell escaping issues
// with special characters (URLs, commas, quotes, etc.)
const claude = spawn("claude", ["-p", "--dangerously-skip-permissions"], {
    shell: true,
    stdio: ["pipe", "pipe", "pipe"],
});

claude.stdin.write(prompt);
claude.stdin.end();

claude.stdout.on("data", (chunk) => {
    process.stdout.write(chunk);
});

claude.stderr.on("data", (chunk) => {
    process.stderr.write(chunk);
});

claude.on("error", (err) => {
    console.error("Failed to start Claude CLI:", err.message);
    process.exit(1);
});

claude.on("close", (code) => {
    process.exit(code ?? 0);
});
