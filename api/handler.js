import { handleApiRequest } from "../lib/api-handler.js";

export default async function handler(req, res) {
  try {
    const route = typeof req.query.route === "string" ? req.query.route : "";
    const pathname = route ? `/api/${route.replace(/^\/+/, "")}` : "/api";

    const response = await handleApiRequest({
      method: req.method ?? "GET",
      pathname,
      bodyText: typeof req.body === "string" ? req.body : JSON.stringify(req.body ?? {}),
    });

    for (const [key, value] of Object.entries(response.headers)) {
      res.setHeader(key, value);
    }

    res.status(response.status).send(response.body);
  } catch (error) {
    res.status(500).json({
      error: "Server error.",
      detail: String(error.message ?? error),
    });
  }
}
