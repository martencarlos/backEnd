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
      outOfStock: Boolean,
      countryCode: String,
      currency:String,
      imgSrc: String,
      camelurl: String,
      prices: [{
        date: Date,
        price: Number
      }]
    }
  });

var PriceTracker = module.exports = mongoose.model('PriceTracker', PriceTrackerSchema);
