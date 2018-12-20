
//Express
const express = require('express');
const app = express();

//Basic
const path = require('path');
const bodyParser = require('body-parser');
const hbs = require('express-handlebars');

const logger = require('./logs/logger.js'); 

//Authentication
const expressValidator = require('express-validator');
const session = require('express-session');
const flash = require('connect-flash');
const cookieParser = require('cookie-parser');
const passport = require('passport');

if (!process.env.HOST_HEROKU_DEPLOYED){
  require('dotenv').config({path: path.join(__dirname,'config/secrets.env')}); //load secrests to process environment
}

logger.info('Authentication required loaded');

//Database
const mongoose = require('mongoose');
const dev_db_url = 'mongodb://' + process.env.DB_USER + ':'+ process.env.DB_PASS +'@'+ process.env.DB_HOST +':' + process.env.DB_PORT + '/'+ process.env.DB_APPNAME;
const mongodbFullURL = process.env.MONGODB_URI || dev_db_url;
mongoose.connect(mongodbFullURL, { useNewUrlParser: true, useCreateIndex:true });

logger.info('Database connected successfully');

// View Engine Handlebars
app.set('views', [path.join(__dirname,'views'),
  path.join(__dirname,'products/home'),
  path.join(__dirname,'products/users/login'),
  path.join(__dirname,'products/users/register'),
  path.join(__dirname,'products/errors')
]);

app.engine( 'hbs', hbs( { 
  extname: 'hbs', 
  defaultLayout: 'main', 
  layoutsDir: path.join(__dirname,'/views/layouts/'),
  partialsDir:  path.join(__dirname,'/views/layouts/partials/')
} ) );
app.set('view engine', 'hbs');

// MIDDLEWARE
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
  path: {
      //main
      home: '/',
      //users
      login: '/users/login',
      logout: '/users/logout',
      register: '/users/register',
      //errors
      notFound: '/404'
  },
  author: {
      name: 'Carlos Marten',
      contact: 'martencarlos@gmail.com'
  }
};

// Routes
const home = require('./products/home/index');
const users = require('./products/users/users');
const errors = require('./products/errors/errors');

app.use('/', home);
app.use('/users', users);
app.use('/', errors); // always keep at the end of the routes

logger.info('Routes in place');

// Start Server
app.set('port', (process.env.PORT || 80));
app.listen(app.get('port'), function(){
  logger.warn('Server started on port '+ app.get('port'));
});