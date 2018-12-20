
// Winston logger
var winston = require('winston');
const path = require('path');

winston.configure({
    level:"warn",
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    ),
    transports: [
      new winston.transports.Console()
    ]
  });

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.printf(info => {
        return `${info.timestamp} ${info.level}: ${info.message}`;
    })
  ),
  transports: [
    new winston.transports.File({
        level: 'info', //  error: 0,  warn: 1, info: 2, verbose: 3, debug: 4, silly: 5 
        filename: path.join(__dirname,'logs/all-logs.log'),
        handleExceptions: true,
        json: true,
        maxsize: 5242880, //5MB
        maxFiles: 5,
        colorize: false
    }),
    new winston.transports.Console({
        level: 'info',
        handleExceptions: true,
        json: false,
        colorize: true
    })
    ],
    exitOnError: false
});

logger.info('logger setup and running');

module.exports=logger;