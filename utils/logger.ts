import { logger } from "react-native-logs";
import * as Sentry from "@sentry/react-native";

/**
 * Dual-purpose logger that sends logs to both React Native console and Sentry
 * Maintains the same interface as react-native-logs while adding Sentry integration
 */
const rnLogger = logger.createLogger();

type LogAttributes = Record<string, string | number | boolean>;

/**
 * Abstracted logger interface that logs to both React Native and Sentry
 */
export const log = {
  /**
   * Trace level logging - detailed diagnostic information
   */
  trace: (message: string, ...args: any[]) => {
    rnLogger.debug(message, ...args);
    try {
      const attributes = parseLogAttributes(args);
      Sentry.logger.trace(message, attributes);
    } catch (error) {
      // Silent fail - don't let Sentry errors break logging
    }
  },

  /**
   * Debug level logging - diagnostic information useful for debugging
   */
  debug: (message: string, ...args: any[]) => {
    rnLogger.debug(message, ...args);
    try {
      const attributes = parseLogAttributes(args);
      Sentry.logger.debug(message, attributes);
    } catch (error) {
      // Silent fail
    }
  },

  /**
   * Info level logging - informational messages
   */
  info: (message: string, ...args: any[]) => {
    rnLogger.info(message, ...args);
    try {
      const attributes = parseLogAttributes(args);
      Sentry.logger.info(message, attributes);
    } catch (error) {
      // Silent fail
    }
  },

  /**
   * Warning level logging - potentially harmful situations
   */
  warn: (message: string, ...args: any[]) => {
    rnLogger.warn(message, ...args);
    try {
      const attributes = parseLogAttributes(args);
      Sentry.logger.warn(message, attributes);
    } catch (error) {
      // Silent fail
    }
  },

  /**
   * Error level logging - error events
   */
  error: (message: string, ...args: any[]) => {
    rnLogger.error(message, ...args);
    try {
      const attributes = parseLogAttributes(args);
      Sentry.logger.error(message, attributes);
    } catch (error) {
      // Silent fail
    }
  },

  /**
   * Fatal level logging - very severe error events
   */
  fatal: (message: string, ...args: any[]) => {
    rnLogger.error(message, ...args); // react-native-logs doesn't have fatal, use error
    try {
      const attributes = parseLogAttributes(args);
      Sentry.logger.fatal(message, attributes);
    } catch (error) {
      // Silent fail
    }
  },
};

/**
 * Helper function to parse log arguments into Sentry attributes
 * Converts various argument formats into a key-value object
 */
function parseLogAttributes(args: any[]): LogAttributes {
  if (args.length === 0) return {};

  const attributes: LogAttributes = {};

  args.forEach((arg, index) => {
    if (typeof arg === "object" && arg !== null && !Array.isArray(arg)) {
      // If it's already an object, merge its properties
      Object.entries(arg).forEach(([key, value]) => {
        if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
          attributes[key] = value;
        } else if (value !== null && value !== undefined) {
          // Convert non-primitive values to string
          attributes[key] = String(value);
        }
      });
    } else if (typeof arg === "string" || typeof arg === "number" || typeof arg === "boolean") {
      // Add primitive values as indexed attributes
      attributes[`arg_${index}`] = arg;
    } else if (arg !== null && arg !== undefined) {
      // Convert other types to string
      attributes[`arg_${index}`] = String(arg);
    }
  });

  return attributes;
}
