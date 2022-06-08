var mongoose = require('mongoose');

// Card Schema
var CardSchema = mongoose.Schema({
    title: String,
    image: String,
    stats:{
        likes: Number,
        views: Number,
        downloads: Number
    },
    author:{
        pic: String,
        firstName: String,
        lastName: String,
        authorid:String
    }
  });

  var Card = module.exports = mongoose.model('Card', CardSchema);
