type Env = {
  port: number;
  nodeEnv: "development" | "test" | "production";
  corsOrigins: string[];
  redisUrl: string;
};

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

export function loadEnv(): Env {
  const port = Number(process.env.PORT ?? "8080");
  const nodeEnv = (process.env.NODE_ENV ?? "development") as Env["nodeEnv"];
  const corsOrigins = (process.env.CORS_ORIGINS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const redisUrl = process.env.REDIS_URL ?? requireEnv("REDIS_URL");

  return { port, nodeEnv, corsOrigins, redisUrl };
}

