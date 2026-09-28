import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
import fs from "fs";
import path from "path";

/**
 * Log directory
 */
const logDir = path.join(
  process.cwd(),
  "storage",
  "logs"
);

/**
 * Create folder if not exists
 */
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, {
    recursive: true,
  });
}

/**
 * Pretty formatter
 */
const logFormat = winston.format.printf(
  (info) => {
    const {
      timestamp,
      level,
      message,
      stack,
      ...meta
    } = info;

    /**
     * Base log
     */
    let log = `
      ==================================================
      [${timestamp}] ${level.toUpperCase()}
      ==================================================

      MESSAGE:
      ${message}
      `;

          /**
           * Stack trace
           */
          if (stack) {
            log += `
      STACK:
      ${stack}
      `;
          }

          /**
           * Extra metadata
           */
          if (Object.keys(meta).length > 0) {
            log += `
      META:
      ${JSON.stringify(meta, null, 2)}
      `;
          }

          /**
           * Space between logs
           */
          log += `

    `;

    return log;
  }
);

/**
 * Logger
 */
const logger = winston.createLogger({
  level: "info",

  format: winston.format.combine(
    winston.format.timestamp({
      format: "YYYY-MM-DD HH:mm:ss",
    }),

    winston.format.errors({
      stack: true,
    }),

    logFormat
  ),

  transports: [
    /**
     * Application logs
     */
    new DailyRotateFile({
      filename: path.join(
        logDir,
        "application-%DATE%.log"
      ),

      datePattern: "YYYY-MM-DD",

      maxSize: "20m",

      maxFiles: "14d",
    }),

    /**
     * Error logs
     */
    new DailyRotateFile({
      level: "error",

      filename: path.join(
        logDir,
        "error-%DATE%.log"
      ),

      datePattern: "YYYY-MM-DD",

      maxSize: "20m",

      maxFiles: "30d",
    }),

    /**
     * Console logs
     */
    new winston.transports.Console(),
  ],

  exitOnError: false,
});

export default logger;