
//Express
const express = require('express');
const app = express();

//Basic
const path = require('path');
const bodyParser = require('body-parser');
const hbs = require('express-handlebars');

//Authentication
const expressValidator = require('express-validator');
const session = require('express-session');
const flash = require('connect-flash');
const cookieParser = require('cookie-parser');
const passport = require('passport');
require('dotenv').config({path: __dirname + '/secrets.env'}); //load secrests to process environment

//Database
const mongoose = require('mongoose');
const dev_db_url = 'mongodb://' + process.env.DB_USER + ':'+ process.env.DB_PASS +'@'+ process.env.DB_HOST +':' + process.env.DB_PORT + '/'+ process.env.DB_APPNAME;
const mongodbFullURL = process.env.MONGODB_URI || dev_db_url;
mongoose.connect(mongodbFullURL, { useNewUrlParser: true, useCreateIndex:true });

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
  res.render('404', {layout: false});
});

app.use('*', function (err, req, res, next){
    
});

// Set Port
app.set('port', (process.env.PORT || 80));
app.listen(app.get('port'), function(){
  console.log('Server started on port '+ app.get('port'));
});