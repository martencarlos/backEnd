var mongoose = require('mongoose');

// User Schema
var UserSchema =  mongoose.Schema({
	username: {
		type: String,
		index:true
	},
	role: {
		type: String
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
	profilePic:{
		type: String
	},
	createDate:{
		type: Date
	},
	lastUpdate:{
		type: Date
	},
	lastLogin:{
		type: Date
	},
	logins:{
		type: Number
	}
	
});

var User = module.exports = mongoose.model('User', UserSchema);

module.exports.getUserById = function(id, callback){
	User.findById(id, callback);
}