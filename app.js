
//Express
const express = require('express');
const app = express();
var cors = require('cors');
const path = require('path');
const fs = require("fs");
const axios = require('axios').default;


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

// Import the functions you need from the SDKs you need
const { initializeApp } = require ('firebase/app');
const { getStorage,ref,uploadBytesResumable,getDownloadURL } =require ('firebase/storage');
const { url } = require('inspector');
const { URL } = require('url');
const { request } = require('https');
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDIhP5WDO8s6Z_6Aiw7VqoqRqsqLKsZW9w",
  authDomain: "api.webframe.one",
  projectId: "webframebase",
  storageBucket: "webframebase.appspot.com",
  messagingSenderId: "1053445254999",
  appId: "1:1053445254999:web:b95f31ce4dd07ba0405812"
};

// Initialize Firebase
const firebaseApp = initializeApp(firebaseConfig);

// MIDDLEWARE


//CORS headers
app.use(cors({origin: process.env.FRONTEND, credentials: true, methods: "GET, POST, PUT, DELETE"}));

var nRequests = 0;
app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Credentials", true);
  res.header("Access-Control-Allow-Origin", process.env.FRONTEND);
  //res.header("Access-Control-Allow-Origin", 'https://medium.com');
  res.header("Access-Control-Allow-Headers",
  "Origin, X-Requested-With, Content-Type, Accept, Authorization, X-HTTP-Method-Override, Set-Cookie, Cookie");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
  console.log((++nRequests) +' - '+'Request method '+ req.method + " at path: " + req.url );
  // if(req.header.cookie)
  //   console.log("cookie in header")
  next();
});

app.use(express.json({limit: '50mb'}));
app.use(express.urlencoded({extended: false}));
app.use(cookieParser());

app.use(fileUpload());
app.use(express.static('Public')); 

console.log('Middleware loaded');
// Routes

app.post('/deletecard', async function(req, res){
	
  const {userID,cardID}= req.body
  if(userID && cardID){
      // const foundUsername =  await User.find({_id: userID});
      const foundCard =  await Card.find({_id: cardID});

      if(userID===foundCard[0].author.authorid){
        Card.deleteOne({_id:cardID}, function (err) {
          if (err) return handleError(err);
        });
        res.json({
          message: "card deleted"
        })
        
      }else{
        res.json({
          message: "Only the user that created the card can delete it"
        })
        
      }
    }else{
      res.json({
        message: "Error encountered. Please refresh the page and try again"
      })
    }

});

app.post('/registeruser', function(req, res){
	
	run()
	async function run(){
   
    const foundusername =  await User.find({username: req.body.username});
		const foundemail =  await User.find({email: req.body.email});
    
		if(foundusername.length!=0){
      res.json({
        username: "username taken",
        email:""
      })
		}else if(foundemail.length!=0 ){
      res.json({
        email: "Email already registered",
        username: ""
      })
    }else{
      const user = new User(req.body);
      bcrypt.hash(user.password, 10, function(err, hash) {
        user.password = hash;
        // console.log(user)
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

app.get('/medium', (req, res) => {
  
  // Make a request for a user with a given ID
  axios.get('https://medium.com/@ajaykapoor1509/feed')
  .then(function (response) {
    // handle success
    //console.log(response);
    
    res.set('Content-Type', 'application/rss+xml')
    res.send(response.data)
  })
  .catch(function (error) {
    // handle error
    console.log(error);
  })
  .then(function (response) {
    // always executed
  });

  

 
});

app.get('/cards', function(req, res){
	
  console.log("getting cards");
  run()
	async function run(){
    const allCards = await Card.find({});
    res.json(allCards);
  }
});

app.post('/getProfileImage',checkAuthenticated, async function(req, res){
	// const testFolder = './Public/Images/Profiles/';

  // fs.readdir(testFolder, (err, files) => {
  //   files.forEach(file => {
  //     console.log(file);
  //   });
  // });
  
  // console.log("body:"+req.body)
  const foundUser =  await User.find({_id: req.body._id});
    if(foundUser.length !==0){
      // var filePath = path.join(__dirname,"Public","Images","Profiles/")
      // const filePath = process.env.SERVER+"/Images/Profiles/"+req.body._id+".png"+"?" + Date.now();
      // const filePath = filePath+req.body._id+".png"+"?" + Date.now();
     
      // console.log(filePath)
      res.send(foundUser[0].profilepic)
    }
    else{
       console.log("not found user")
    }
});

function parseCookies (request) {
  const list = {};
  const cookieHeader = request.headers?.cookie;
  if (!cookieHeader) return list;

  cookieHeader.split(`;`).forEach(function(cookie) {
      let [ name, ...rest] = cookie.split(`=`);
      name = name?.trim();
      if (!name) return;
      const value = rest.join(`=`).trim();
      if (!value) return;
      list[name] = decodeURIComponent(value);
  });

  return list;
}

app.post('/setImageProfile',checkAuthenticated, (req, res)=>{
	console.log("setting image profile");
  
  //files are empty error handling
  if (!req.files || Object.keys(req.files).length === 0) {
    return res.status(400).send('No files were uploaded.');
  }
  
  const file = req.files.profile_image;
  console.log(file)

  const cookies = parseCookies(req)
  console.log(cookies)
  var user = JSON.parse(cookies["user"].slice(2))
  var url =""

  const storage = getStorage(firebaseApp);

  const metadata = {
    contentType: file.mimetype
  };

  
  // Upload file and metadata to the object 'images/mountains.jpg'
  const storageRef = ref(storage, 'profiles/' + user._id);
  const uploadTask = uploadBytesResumable(storageRef, file.data, metadata);
  
  // Listen for state changes, errors, and completion of the upload.
  uploadTask.on('state_changed',
    (snapshot) => {
      // Get task progress, including the number of bytes uploaded and the total number of bytes to be uploaded
      const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
      console.log('Upload is ' + progress + '% done');
      switch (snapshot.state) {
        case 'paused':
          console.log('Upload is paused');
          break;
        case 'running':
          console.log('Upload is running');
          break;
      }
    }, 
    (error) => {
      // A full list of error codes is available at
      // https://firebase.google.com/docs/storage/web/handle-errors
      switch (error.code) {
        case 'storage/unauthorized':
          console.log("not authorized")
          
          break;
        case 'storage/canceled':
          console.log("cancelled")
          break;
  
        // ...
  
        case 'storage/unknown':
        console.log("unknown error")  
        // Unknown error occurred, inspect error.serverResponse
          break;
      }
    }, 
    () => {
      // Upload completed successfully, now we can get the download URL
      getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
      
      var conditions = {
        _id : user._id 
        }

      user.profilepic = downloadURL

      console.log(user.profilepic)
      res.status(200).send({url: user.profilepic})

      User.findOneAndUpdate(conditions,user,function(error,result){
        if(error){
          // handle error
        }else{
          console.log("updated");
          
        }
      });
      
      });
    }
  );

  // file.mv(`${filePath}/${user._id+'.'+imageType}`,(err)=>{ //
  //   if(err) console.log("error saving image into file"+err)
  // })
  

});

app.post('/setCardCoverImage',checkAuthenticated, (req, res)=>{
	console.log("setting Card Cover Image");
  
  //files are empty error handling
  if (!req.files || Object.keys(req.files).length === 0) {
    return res.status(400).send('No files were uploaded.');
  }
  
  const file = req.files.cardCoverImage;
  console.log(file)

  const cookies = parseCookies(req)
  var user = JSON.parse(cookies["user"].slice(2))
  var url =""

  const storage = getStorage(firebaseApp);

  const metadata = {
    contentType: file.mimetype
  };

  // Upload file and metadata to the object 'images/mountains.jpg'
  const storageRef = ref(storage, user._id+'/cardImages/'+Date.now()+'-'+file.name);
  const uploadTask = uploadBytesResumable(storageRef, file.data, metadata);
  
  // Listen for state changes, errors, and completion of the upload.
  uploadTask.on('state_changed',
    (snapshot) => {
      // Get task progress, including the number of bytes uploaded and the total number of bytes to be uploaded
      const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
      console.log('Upload is ' + progress + '% done');
      switch (snapshot.state) {
        case 'paused':
          console.log('Upload is paused');
          break;
        case 'running':
          console.log('Upload is running');
          break;
      }
    }, 
    (error) => {
      // A full list of error codes is available at
      // https://firebase.google.com/docs/storage/web/handle-errors
      switch (error.code) {
        case 'storage/unauthorized':
          console.log("not authorized")
          
          break;
        case 'storage/canceled':
          console.log("cancelled")
          break;
  
        // ...
  
        case 'storage/unknown':
        console.log("unknown error")  
        // Unknown error occurred, inspect error.serverResponse
          break;
      }
    }, 
    () => {
      // Upload completed successfully, now we can get the download URL
      getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
        res.status(200).send({url: downloadURL})
      });
    }
  );
});

app.post('/cards', function(req, res){
	console.log("saving cards into db");
	//async required because of database query
	run()
	async function run(){
    try {
      const card = new Card(req.body);
      await card.save();
		
  } catch (error) {
     res.json({message: "error: "+error}) 
  }
  res.json({message: "success"}) 
}});


console.log('Routes in place');

// Start Server
app.set('port', (process.env.PORT || 80));
app.listen(app.get('port'), function(){
  console.log('Server started on port '+ app.get('port'));
});