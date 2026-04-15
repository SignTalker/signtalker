import cors from "cors";

export function buildCors(corsOrigins: string[]) {
  const allowAll = corsOrigins.length === 0;
  return cors({
    origin: (origin, cb) => {
      if (allowAll) return cb(null, true);
      if (!origin) return cb(null, true);
      if (corsOrigins.includes(origin)) return cb(null, true);
      return cb(new Error("CORS blocked"));
    },
    credentials: false
  });
}

