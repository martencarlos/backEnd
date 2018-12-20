
var express = require('express');
var router = express.Router();

// Register
const register = require('./register/register');
router.use('/register', register);

// Login
const login = require('./login/login');
router.use('/login', login);

router.get('/logout', function(req, res){
	req.logout();

	req.flash('success_msg', 'You are logged out');

	res.redirect('/users/login');
});

module.exports = router;