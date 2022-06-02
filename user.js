var mongoose = require('mongoose');

// User Schema
var UserSchema =  mongoose.Schema({
	username: {
		type: String,
		index:true
	},
	name: {
		type: String
	},
	password: {
		type: String
	},
	email: {
		type: String
	},
	profilepic:{
		type: String
	}
	
});

var User = module.exports = mongoose.model('User', UserSchema);

module.exports.getUserById = function(id, callback){
	User.findById(id, callback);
}