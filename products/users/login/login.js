
var express = require('express');
var router = express.Router();
var passport = require('passport');

// Login
router.get('/', function(req, res){
	res.render('login');
});

router.post('/',
  passport.authenticate('local', {successRedirect:'/', failureRedirect:'/users/login',failureFlash: true}),
  function(req, res) {
    res.redirect('/');
  });

module.exports = router;