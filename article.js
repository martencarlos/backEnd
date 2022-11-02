var mongoose = require('mongoose');

// Article Schema
var ArticleSchema = mongoose.Schema({
    articles: [{}]
  });

  var Article = module.exports = mongoose.model('Article', ArticleSchema);

