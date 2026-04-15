import { createServer } from "node:http";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { handleApiRequest } from "./lib/api-handler.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const port = Number(process.env.PORT || 8000);

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
};

function sendText(res, statusCode, body) {
  res.writeHead(statusCode, { "Content-Type": "text/plain; charset=utf-8" });
  res.end(body);
}

async function readRequestBody(req) {
  const chunks = [];

  for await (const chunk of req) {
    chunks.push(chunk);
  }

  if (chunks.length === 0) {
    return "";
  }

  return Buffer.concat(chunks).toString("utf8");
}

async function serveStatic(req, res, url) {
  let filePath = url.pathname === "/" ? "/index.html" : url.pathname;
  filePath = path.normalize(filePath).replace(/^(\.\.[/\\])+/, "");
  const fullPath = path.join(__dirname, filePath);

  try {
    const stat = await fs.stat(fullPath);
    if (stat.isDirectory()) {
      return serveStatic(req, res, new URL("/index.html", "http://localhost"));
    }
    const ext = path.extname(fullPath);
    const contentType = mimeTypes[ext] ?? "application/octet-stream";
    const contents = await fs.readFile(fullPath);
    res.writeHead(200, { "Content-Type": contentType });
    res.end(contents);
  } catch {
    sendText(res, 404, "Not found");
  }
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);

    if (url.pathname.startsWith("/api/")) {
      const response = await handleApiRequest({
        method: req.method ?? "GET",
        pathname: url.pathname,
        bodyText: await readRequestBody(req),
      });

      res.writeHead(response.status, response.headers);
      res.end(response.body);
      return;
    }

    await serveStatic(req, res, url);
  } catch (error) {
    res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ error: "Server error.", detail: String(error.message ?? error) }));
  }
});

server.listen(port, () => {
  console.log(`VM app listening on http://localhost:${port}`);
});
