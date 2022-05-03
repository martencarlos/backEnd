
var express = require('express');
var router = express.Router();

// Register
const register = require('./register/register');
router.use('/register', register);

// Login
const login = require('./login/login');
router.use('/login', login);

// Failed login
router.get('/failedLogin', function(req, res){
	req.flash('error_msg', 'User unknown');
	res.redirect('/users/login');
});

// Logout
router.get('/logout', function(req, res){
	req.logout();
	req.flash('success_msg', 'You are logged out');
	res.redirect('/users/login');
});

module.exports = router;