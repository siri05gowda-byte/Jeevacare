import winston from 'winston';
import config from '../config/index.js';
import { redactSecrets } from './secretRedactor.js';

const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

winston.addColors(colors);

// Custom format that redacts secrets
const redactingFormat = winston.format.printf((info) => {
  const message = typeof info.message === 'string'
    ? redactSecrets(info.message)
    : JSON.stringify(info.message);

  return `${info.timestamp} ${info.level}: ${message}`;
});

const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  redactingFormat,
);

const transports = [
  new winston.transports.Console(),
  new winston.transports.File({
    filename: 'logs/error.log',
    level: 'error',
  }),
  new winston.transports.File({
    filename: 'logs/all.log',
  }),
];

const logger = winston.createLogger({
  level: config.logging.level,
  levels: logLevels,
  format,
  transports,
});

export default logger;
