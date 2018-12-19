
var express = require('express');

//Basic
var path = require('path');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var hbs = require('express-handlebars');

//Authentication
var expressValidator = require('express-validator');
var flash = require('connect-flash');
var session = require('express-session');
var passport = require('passport');

//Database
var mongo = require('mongodb');
var mongoose = require('mongoose');

var dev_db_url = 'mongodb://admin:admin89@ds231374.mlab.com:31374/appdb';
var mongoDB = process.env.MONGODB_URI || dev_db_url;
mongoose.connect(mongoDB, { useNewUrlParser: true });
mongoose.set('useCreateIndex', true);
var db = mongoose.connection;

// Init App
var app = express();

// View Engine Handlebars
app.set('views', path.join(__dirname, 'views'));
app.engine( 'hbs', hbs( { 
  extname: 'hbs', 
  defaultLayout: 'main', 
  layoutsDir: __dirname + '/views/layouts/',
  partialsDir: __dirname + '/views/layouts/partials/'
} ) );
app.set('view engine', 'hbs');

// BodyParser Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
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
      var namespace = param.split('.')
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
var index = require('./routes/index');
var users = require('./routes/users');

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