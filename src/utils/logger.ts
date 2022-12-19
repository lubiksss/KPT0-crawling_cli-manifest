import winston from 'winston';
import winstonDaily from 'winston-daily-rotate-file';
import moment from 'moment';

let logDir = 'test';
const { combine, timestamp, printf } = winston.format;

const config = {
  colors: {
    error: 'red',
    debug: 'blue',
    warn: 'yellow',
    info: 'green',
    data: 'magenta',
    verbose: 'cyan',
    silly: 'grey',
    custom: 'yellow',
  },
};

winston.addColors(config.colors);

const logFormat = printf((info) => {
  return `${info.timestamp} ${info.level}: ${info.message}`;
});

const logger = winston.createLogger({
  format: combine(
    timestamp({
      format: 'YYYY-MM-DD HH:mm:ss',
    }),
    logFormat,
  ),
  transports: [
    new winstonDaily({
      level: 'debug',
      datePattern: 'YYYY-MM-DD',
      dirname: logDir,
      filename: `%DATE%.log`,
      maxFiles: 7,
      zippedArchive: true,
    }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new winston.transports.Console({
      level: 'debug',
      format: winston.format.combine(
        winston.format.align(),
        winston.format.colorize(),
        winston.format.combine(
          timestamp({
            format: 'YYYY-MM-DD HH:mm:ss',
          }),
          logFormat,
        ),
      ),
    }),
  );
}

class customLogger {
  private readonly event: any;

  constructor(event) {
    this.event = event;
  }

  public info(message: string) {
    if (this.event) {
      this.event.sender.send('chan', `${moment().format('YYYY-MM-DD HH:mm:ss')} ${message}`);
    }
    logger.info(message);
  }

  public debug(message: string) {
    if (this.event) {
      this.event.sender.send('chan', `${moment().format('YYYY-MM-DD HH:mm:ss')} ${message}`);
    }
    logger.debug(message);
  }
}

export default customLogger;
