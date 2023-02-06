var mongoose = require('mongoose');


// Price Tracker Schema
var PriceTrackerSchema = mongoose.Schema({
    userID: mongoose.Types.ObjectId,
    createDate: Date,
    url: String,
    productInfo:{
      productNumber: String,
      title: String,
      price: Number,
      imgSrc: String,
      camelurl: String,
      prices: [{
        date: Date,
        price: Number
      }]
    }
  });

var PriceTracker = module.exports = mongoose.model('PriceTracker', PriceTrackerSchema);
