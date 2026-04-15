export type LogMeta = Record<string, unknown>;

function fmtMeta(meta?: LogMeta) {
  if (!meta) return "";
  try {
    return ` ${JSON.stringify(meta)}`;
  } catch {
    return "";
  }
}

export const logger = {
  info(message: string, meta?: LogMeta) {
    // eslint-disable-next-line no-console
    console.log(`[info] ${message}${fmtMeta(meta)}`);
  },
  warn(message: string, meta?: LogMeta) {
    // eslint-disable-next-line no-console
    console.warn(`[warn] ${message}${fmtMeta(meta)}`);
  },
  error(message: string, meta?: LogMeta) {
    // eslint-disable-next-line no-console
    console.error(`[error] ${message}${fmtMeta(meta)}`);
  }
};

