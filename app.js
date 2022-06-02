
//Express
const express = require('express');
const app = express();
var cors = require('cors');
const path = require('path');
const fs = require("fs");

//API
const bcrypt = require('bcryptjs');
var User = require('./user');
var Card = require('./card');
const fileUpload = require('express-fileupload');

//Authentication
const cookieParser = require('cookie-parser');

//load secrests to process environment
if (!process.env.HOST_HEROKU_DEPLOYED){
  require('dotenv').config({path: process.cwd() + '/config/secrets.env'}); 
}
console.log('Authentication required loaded');

//Database
const mongodbFullURL = 'mongodb+srv://' + process.env.DB_USER + ':'+ process.env.DB_PASS +'@'+ process.env.DB_HOST + '/'+ process.env.DB_APPNAME+'?retryWrites=true&w=majority';

const mongoose = require('mongoose');
mongoose.connect(mongodbFullURL, {useNewUrlParser: true});

const db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error: "));
db.once("open", function () {
  console.log('Database connected successfully');
});

// MIDDLEWARE
app.set("trust proxy", 1);

//CORS headers
app.use(cors({origin: process.env.FRONTEND, credentials: true, methods: "GET, POST, PUT, DELETE"}));

var nRequests = 0;
app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Credentials", true);
  res.header("Access-Control-Allow-Origin", process.env.FRONTEND);
  res.header("Access-Control-Allow-Headers",
  "Origin, X-Requested-With, Content-Type, Accept, Authorization, X-HTTP-Method-Override, Set-Cookie, Cookie");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
  console.log((++nRequests) +' - '+'Request method '+ req.method + " at path: " + req.url );
  if(req.header.cookie)
    console.log("cookie in header")
  next();
});

app.use(express.json());
app.use(express.urlencoded({extended: false}));
app.use(cookieParser());

app.use(fileUpload());
app.use(express.static('Public')); 

console.log('Middleware loaded');
// Routes


app.post('/registeruser', function(req, res){
	
	run()
	async function run(){
    const foundusername =  await User.find({username: req.body.username});
		const foundemail =  await User.find({email: req.body.email});
    
		if(foundemail.length!=0 ){
      res.json({
        email: "Email already registered",
        username: ""
      })
    }else if(foundusername.length!=0){
      res.json({
        username: "username taken",
        email:""
      })
		}else{
      const user = new User(req.body);
      bcrypt.hash(user.password, 10, function(err, hash) {
        user.password = hash;
        console.log(user)
        user.save();
      });
      res.json({
        success: "registered"
      })
    }
		}
});

app.post('/login',async(req, res) => {
  const foundUser =  await User.find({email: req.body.email});
    if(foundUser.length !==0){
      bcrypt.compare(req.body.password, foundUser[0].password).then(function(result) {
        if(result){
          res.cookie('user', foundUser[0], { maxAge: 3600000, httpOnly: false })
          // res.cookie('user', foundUser[0], { maxAge: 3600000, httpOnly: false })
          res.send(foundUser[0])
        }else{
           res.json({password: 'Invalid password',errors: "yes"});
        }
      });
    }else{
       res.json( {email: 'Email not registered',errors:"yes"});
    }
})

app.get('/', (req, res) => {
  res.send("Server is live")
})

app.get('/dashboard', checkAuthenticated, (req, res) => {
  res.json({ name: req.user.name })
})

function checkAuthenticated(req, res, next) {
  
  if (req.headers.cookie) {
      next();
  } else {
      console.log("not authenticated error")
      res.json({error: "not authenticated"})
  }
}

// app.delete("/logout", (req,res) => {
//   req.logOut()
//   res.redirect("/login")
//   console.log(`-------> User Logged out`)
// })


app.get('/cards',checkAuthenticated, function(req, res){
	
  console.log("getting cards");
  run()
	async function run(){
    const allCards = await Card.find({});
    res.json(allCards);
  }
});

app.post('/getProfileImage',checkAuthenticated, async function(req, res){
	// console.log("body:"+req.body)
  const foundUser =  await User.find({_id: req.body._id});
    if(foundUser.length !==0){
      // var filePath = path.join(__dirname,"Public","Images","Profiles/")
      const filePath = process.env.SERVER+"/Images/Profiles/"+req.body._id+".png"+"?" + Date.now();
      // const filePath = filePath+req.body._id+".png"+"?" + Date.now();

      console.log(filePath)
      res.send(filePath)
    }
    else{
       console.log("not found user")
    }
});

app.post('/setImageProfile',checkAuthenticated, (req, res)=>{
	console.log("setting image profile");
  
  if (!req.files || Object.keys(req.files).length === 0) {
    return res.status(400).send('No files were uploaded.');
  }
  const file = req.files.profile_image;
  var imageType=file.mimetype.substring(file.mimetype.length-3,file.mimetype.length)
  if(imageType==="peg")
    imageType="jpg"
  const filePath= path.join(__dirname,"Public","Images","Profiles")
  
  const user = JSON.parse(decodeURIComponent(req.headers.cookie).substring(7))
  file.mv(`${filePath}/${user._id+'.'+imageType}`,(err)=>{
    if(err) console.log("error saving image into file"+err)
  })
  res.status(200).send('image uploaded')

});

app.post('/cards', function(req, res){
	console.log("saving cards into db");
	//async required because of database query
	run()
	async function run(){
    const card = new Card(req.body);
    await card.save();
		}
});


console.log('Routes in place');

// Start Server
app.set('port', (process.env.PORT || 80));
app.listen(app.get('port'), function(){
  console.log('Server started on port '+ app.get('port'));
});