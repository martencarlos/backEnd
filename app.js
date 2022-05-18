


//Express
const express = require('express');
const app = express();

//Basic
const path = require('path');
var favicon = require('serve-favicon');
const bodyParser = require('body-parser');
var hbs = require('express-handlebars');
const logger = require('./logs/logger.js'); 

//API
const bcrypt = require('bcrypt');
var Card = require('./products/card');
var User = require('./products/users/user');
const mongoStore = require('connect-mongo')


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
const mongodbFullURL = 'mongodb+srv://' + process.env.DB_USER + ':'+ process.env.DB_PASS +'@'+ process.env.DB_HOST + '/'+ process.env.DB_APPNAME+'?retryWrites=true&w=majority';
mongoose.connect(mongodbFullURL, {useNewUrlParser: true});

const db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error: "));
db.once("open", function () {
  logger.info('Database connected successfully');
});


// View Engine Handlebars
app.set('views', [path.join(__dirname,'views'),
  path.join(__dirname,'products/home'),
  path.join(__dirname,'products/users/login'),
  path.join(__dirname,'products/users/register'),
  path.join(__dirname,'products/errors')
]);

//Rendering engine HANDLEBARS
app.engine( 'hbs', hbs.engine( { 
  extname: 'hbs', 
  defaultLayout: 'main', 
  layoutsDir:  path.join(__dirname,"views/layouts"),
  partialsDir: './views/layouts/partials'
} ) );

app.set('view engine', 'hbs');

// MIDDLEWARE

//logger and CORS headers
var nRequests = 0;
app.use(function (req, res, next) {
    res.header({
      'Access-Control-Allow-Origin': '*',
      'origin':'x-requested-with',
      'Access-Control-Allow-Headers': 'POST, GET, PUT, DELETE, OPTIONS, HEAD, Authorization, Origin, Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers, Access-Control-Allow-Origin',
      'Content-Type': 'application/json',
    });
    logger.info((++nRequests) +' - '+'Request method '+ req.method + " at path: " + req.url );
    next();
});

// Favicon + BodyParser + CookieParser
app.use(favicon(path.join(__dirname, 'public/img', 'favicon-anchor.ico')))
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false })); 
app.use(cookieParser());

// Set Static Folder
app.use(express.static(path.join(__dirname,'public')));

// Express Session
app.use(session({
    secret: 'Casdfat On9 KeyB9ard',
    saveUninitialized: true,
    resave: false,
    store: mongoStore.create({mongoUrl:mongodbFullURL, collectionName: "sessions"}),
    cookie: {
      maxAge: 1000 * 60 * 60 * 24
    }
}));

// Passport init
app.use(passport.initialize());
app.use(passport.session());

//Validation
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

app.post('/login', function(req, res) {
    const {email, password} = req.body
    run()
	  async function run(){
      const foundUser =  await User.find({email: email});
      console.log(foundUser)
      if(foundUser.length !==0){
        bcrypt.compare(password, foundUser[0].password).then(function(result) {
          if(result){
            
              
              res.json(foundUser[0])
            
            
          }else{
            res.json({
              password: "Incorrect password",
              errors: "yes"
            })
          }
        });
      }else{
        res.json({
          email: "User not found",
          errors:"yes"
        })
      }
      
    }
    
});

app.post('/registeruser', function(req, res){
	logger.info("checking user");
	//async required because of database query
	run()
	async function run(){
    const foundusername =  await User.find({username: req.body.username});
		const foundemail =  await User.find({email: req.body.email});
    
    //validate user and email
		if(foundemail.length!=0 ){
      res.json({
        email: "Email already registered",
        username: ""
      })
    }else if(foundusername.length!=0){
      res.json({
        username: "username taken",
        email:""
      })
		}else{
      const user = new User(req.body);
      bcrypt.hash(user.password, 10, function(err, hash) {
        user.password = hash;
        console.log(user)
        user.save();
      });
      
      
      res.json({
        success: "registered"
      })
    }
		}
});

app.use('/users', users);

function ensureAuthenticated(req, res, next){
	console.log(req.session)
  if(req.session.user){
		return next();
	} else {
       
	}
}


app.get('/cards', function(req, res){
	
  logger.info("getting cards");
  run()
	async function run(){
    const allCards = await Card.find({});
    res.json(allCards);
  }
});

app.post('/cards', function(req, res){
	logger.info("saving cards into db");
	//async required because of database query
	run()
	async function run(){
    const card = new Card(req.body);
    await card.save();
		}
});

app.use('/', errors); // always keep at the end of the routes

logger.info('Routes in place');

// Start Server
app.set('port', (process.env.PORT || 80));
app.listen(app.get('port'), function(){
  logger.warn('Server started on port '+ app.get('port'));
});