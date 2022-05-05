
var express = require('express');

var router = express.Router();
var { body, validationResult} = require('express-validator');
const logger = require(process.cwd() + '/logs/logger.js');

var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;

var User = require('../user');

// Register
router.get('/', function(req, res){
	logger.info("rendering register");
	res.render('register');
});

// Register User
router.post('/', function(req, res){
	logger.info("entering post");
	
	var name = req.body.name;
	var email = req.body.email;
	var username = req.body.username;
	var password = req.body.password;
	var password2 = req.body.password2;

	// Validation
	body('name', 'Name is required').notEmpty();
	body('email', 'Email is required').notEmpty();
	body('email', 'Email is not valid').isEmail();
	body('username', 'Username is required').notEmpty();
	body('password', 'Password is required').notEmpty();
	body('password2', 'Passwords do not match').equals(req.body.password);

	var errors = validationResult(req);

	if(errors){
		res.render('register',{
			errors:errors
		});
	} else {
		var newUser = new User({
			name: name,
			email:email,
			username: username,
			password: password
		});

		User.createUser(newUser, function(err, user){
			if(err) throw err;
			
		});

		req.flash('success_msg', 'You are registered and can now login');

		res.redirect('/users/login');
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