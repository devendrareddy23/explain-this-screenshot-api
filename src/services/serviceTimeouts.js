export const OPENAI_TIMEOUT_MS = 20000;
export const JOB_SOURCE_TIMEOUT_MS = 20000;
export const EMAIL_TIMEOUT_MS = 15000;

export async function withServiceTimeout(operation, timeoutMs, message) {
  const executor = typeof operation === "function" ? operation : () => operation;

  let timeoutId;

  try {
    return await Promise.race([
      executor(),
      new Promise((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error(message || "Service request timed out."));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}
