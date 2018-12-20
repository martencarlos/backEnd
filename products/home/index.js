
var express = require('express');
var router = express.Router();

var logger = require('winston');
  
// Get Homepage
router.get('/', ensureAuthenticated, function(req, res){
    logger.info('home');
	res.render('index');
});

function ensureAuthenticated(req, res, next){
	if(req.isAuthenticated()){
		return next();
	} else {
        //req.flash('error_msg','You are not logged in');
		res.redirect('/users/login');
	}
}

module.exports = router;