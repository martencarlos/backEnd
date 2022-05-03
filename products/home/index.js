
var express = require('express');
var router = express.Router();


// Get Homepage
router.get('/', ensureAuthenticated, function(req, res){
	res.render('auth-home');
});

function ensureAuthenticated(req, res, next){
	if(req.isAuthenticated()){
		return next();
	} else {
        //req.flash('error_msg','You are not logged in');
		res.render('home');
	}
}

module.exports = router;