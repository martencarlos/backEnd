
var express = require('express');
var router = express.Router();

var logger = require('winston');
  
// Show 404
router.all('*', function(req, res){
	logger.info('Not found');
	res.render('404', {layout: false});
  });


module.exports = router;