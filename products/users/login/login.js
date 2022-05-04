
var express = require('express');
var router = express.Router();
var passport = require('passport');
const logger = require(process.cwd() + '/logs/logger.js');

// Login
router.get('/', function(req, res){
  logger.info("rendering loggin in");
	res.render('login');
});

router.post('/',
  passport.authenticate('local', {successRedirect:'/', failureRedirect:'/users/failedLogin'}),
  function(req, res) {
    res.redirect('/');
});



module.exports = router;