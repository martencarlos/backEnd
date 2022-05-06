
var express = require('express');
var router = express.Router();

const logger = require(process.cwd() + '/logs/logger.js');

var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;

var User = require('../user');


// Register
router.get('/', function(req, res){
	logger.info("rendering register");
	res.render('register');

	run()
	async function run(){
		const myuser =  await User.find({username: "test"});
		console.log(myuser);
	}
	
});

// Register User
router.post('/', function(req, res){
	logger.info("entering post");
	
	// async required because of database query
	user = run()
	async function run(){
		//retrive info from Form
		var name = req.body.name;
		var email = req.body.emails;
		var username = req.body.username;
		var password = req.body.password;
		
		//Validation
		// search if user exists in DB
		const foundusername =  await User.find({username: username});
		const foundemail =  await User.find({email: email});
		
		//validate user and password
		if(foundusername.length!=0 || foundemail.length!=0 ){
			req.checkBody('username', 'User is already registered').equals("not me");
		}
		req.checkBody('password2', 'Passwords do not match').equals(req.body.password);

		var errors = req.validationErrors();

		if(errors){
			logger.info("showing errors");
			res.render('register',{
				errors:errors
			});
		} else {
			//create user in DB
			var newUser = new User({
				name: name,
				email:email,
				username: username,
				password: password
			});

			User.createUser(newUser, function(err, user){
				if(err) throw err;
			});
			
			//redirect and show success message
			req.flash('success_msg', 'You are registered and can now login');
			res.redirect('/users/login');
		}
	}
	
});

passport.use(new LocalStrategy(function(username, password, done) {
   User.getUserByUsername(username, function(err, user){
   	if(err) throw err;
   	if(!user){
   		return done(null, false, {message: 'Invalid username'});
   	}
	
   	User.comparePassword(password, user.password, function(err, isMatch){
   		if(err) throw err;
   		if(isMatch){
   			return done(null, user);
   		} else {
   			return done(null, false, {message: 'Invalid password'});
   		}
   	});
	});
  }));

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.getUserById(id, function(err, user) {
    done(err, user);
  });
});

module.exports = router;