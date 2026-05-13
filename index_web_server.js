const express = require('express');
const { spawn } = require('child_process');

const app = express();
const port = process.env.PORT || 4000;

app.use(express.json());
app.use(express.text()); // To allow sending raw text prompts as well

app.post('/', (req, res) => {
    // Try to get prompt from JSON body, or use the raw body if it's text
    let prompt = req.body.prompt || (typeof req.body === 'string' ? req.body : null);

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
});
