
//Express
const express = require('express');
const app = express();

//Basic
const path = require('path');
const bodyParser = require('body-parser');
const hbs = require('express-handlebars');

const winston = require('winston');
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
        filename: 'all-logs.log',
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

//Authentication
const expressValidator = require('express-validator');
const session = require('express-session');
const flash = require('connect-flash');
const cookieParser = require('cookie-parser');
const passport = require('passport');
require('dotenv').config({path: __dirname + '/secrets.env'}); //load secrests to process environment

logger.info('Authentication required loaded');

//Database
const mongoose = require('mongoose');
const dev_db_url = 'mongodb://' + process.env.DB_USER + ':'+ process.env.DB_PASS +'@'+ process.env.DB_HOST +':' + process.env.DB_PORT + '/'+ process.env.DB_APPNAME;
const mongodbFullURL = process.env.MONGODB_URI || dev_db_url;
mongoose.connect(mongodbFullURL, { useNewUrlParser: true, useCreateIndex:true });

logger.info('Database connected successfully');

// View Engine Handlebars
app.set('views', path.join(__dirname, 'views'));
app.engine( 'hbs', hbs( { 
  extname: 'hbs', 
  defaultLayout: 'main', 
  layoutsDir: __dirname + '/views/layouts/',
  partialsDir: __dirname + '/views/layouts/partials/'
} ) );
app.set('view engine', 'hbs');

// Middleware
var nRequests = 0;
app.use(function (req, res, next) {
    logger.info((++nRequests) +' - '+'Request method '+ req.method + " at path: " + req.url );
    next();
});

app.use(bodyParser.json()); //puts a jason formatted body object in req object accessed by req.body 
app.use(bodyParser.urlencoded({ extended: false })); //UTF-8 encoded only string or arrays
app.use(cookieParser());

// Set Static Folder
app.use(express.static(path.join(__dirname,'public')));

// Express Session
app.use(session({
    secret: 'secret',
    saveUninitialized: true,
    resave: true
}));

// Passport init
app.use(passport.initialize());
app.use(passport.session());

// Express Validator
app.use(expressValidator({
  errorFormatter: function(param, msg, value) {
      const namespace = param.split('.')
      , root    = namespace.shift()
      , formParam = root;

    while(namespace.length) {
      formParam += '[' + namespace.shift() + ']';
    }
    return {
      param : formParam,
      msg   : msg,
      value : value
    };
  }
}));

// Connect Flash
app.use(flash());

// Flash res variables
app.use(function (req, res, next) {
  res.locals.success_msg = req.flash('success_msg');
  res.locals.error_msg = req.flash('error_msg');
  res.locals.error = req.flash('error');
  res.locals.user = req.user || null;
  next();
});

logger.info('Middleware loaded');

// Application wide persisting global variables
app.locals = {
  site: {
      title: 'WebFrame',
      description: 'A boilerplate for a simple web application with a Node.JS and Express backend, with an Hdb template with using Twitter Bootstrap.'
  },
  author: {
      name: 'Carlos Marten',
      contact: 'martencarlos@gmail.com'
  }
};

// Routes
const index = require('./routes/index');
const users = require('./routes/users');

app.all('/', index);
app.use('/users', users);

app.get('*', function(req, res){
  logger.info('Not found');
  res.render('404', {layout: false});
});

logger.info('Routes in place');

// Set Port
app.set('port', (process.env.PORT || 80));
app.listen(app.get('port'), function(){
  logger.info('Server started on port '+ app.get('port'));
});