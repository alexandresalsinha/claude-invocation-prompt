const express = require('express');
const { spawn } = require('child_process');

const app = express();
const port = process.env.PORT || 4000;

app.use(express.json());
app.use(express.text()); // To allow sending raw text prompts as well

function extractPrompt(req) {
    if (req.body && typeof req.body === 'object' && req.body.prompt) return req.body.prompt;
    if (typeof req.body === 'string' && req.body.trim()) return req.body;
    return null;
}

function runClaude(prompt) {
    return new Promise((resolve, reject) => {
        const claude = spawn("claude", ["-p", "--dangerously-skip-permissions"], {
            cwd: "C:\\Users\\alexandre.salsinha",
            shell: true,
            stdio: ["pipe", "pipe", "pipe"],
        });

        let stdout = "";
        let stderr = "";

        claude.stdout.on("data", (chunk) => { stdout += chunk.toString(); });
        claude.stderr.on("data", (chunk) => { stderr += chunk.toString(); });

        claude.on("error", (err) => reject(err));

        claude.on("close", (code) => {
            if (code !== 0) {
                return reject(new Error(stderr.trim() || `Claude exited with code ${code}`));
            }
            resolve(stdout);
        });

        claude.stdin.write(prompt);
        claude.stdin.end();
    });
}

// JSON endpoint: waits for Claude to finish and returns the full answer.
app.post('/prompt', async (req, res) => {
    const prompt = extractPrompt(req);
    if (!prompt) {
        return res.status(400).json({
            error: "Prompt is required. Send { \"prompt\": \"your prompt\" } or as plain text.",
        });
    }

    try {
        const answer = await runClaude(prompt);
        res.json({ answer: answer.trim() });
    } catch (err) {
        console.error("Claude invocation failed:", err.message);
        res.status(500).json({ error: err.message });
    }
});

// Streaming endpoint (existing behavior, returns text chunks as Claude produces them).
app.get('/', (req, res) => {
    const prompt = extractPrompt(req);

    if (!prompt) {
        return res.status(400).send("Prompt is required. Send it as { \"prompt\": \"your prompt\" } or as plain text.");
    }

    // Set appropriate headers for streaming
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Transfer-Encoding', 'chunked');

    const claude = spawn("claude", ["-p", "--dangerously-skip-permissions"], {
        cwd: "C:\\Users\\alexandre.salsinha",
        shell: true,
        stdio: ["pipe", "pipe", "pipe"],
    });

    claude.stdin.write(prompt);
    claude.stdin.end();

    claude.stdout.on("data", (chunk) => {
        res.write(chunk);
    });

    claude.stderr.on("data", (chunk) => {
        console.error(`stderr: ${chunk}`);
    });

    claude.on("error", (err) => {
        console.error("Failed to start Claude CLI:", err.message);
        if (!res.headersSent) {
            res.status(500).send("Failed to start Claude CLI");
        } else {
            res.end(`\n\nError: Failed to start Claude CLI`);
        }
    });

    claude.on("close", (code) => {
        res.end();
    });
});

app.listen(port, () => {
    console.log(`Web server listening on port ${port}`);
    console.log(`  POST http://localhost:${port}/prompt  -> JSON { answer }`);
    console.log(`  POST http://localhost:${port}/        -> streamed text`);
});
