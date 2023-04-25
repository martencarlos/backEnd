var mongoose = require('mongoose');

// globalvariable Schema
var GlobalVariableSchema = mongoose.Schema({
    lastIndexProcessed: Number,
  });

  var GlobalVariable = module.exports = mongoose.model('GlobalVariable', GlobalVariableSchema);
