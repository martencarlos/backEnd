
//Express
const express = require('express');
const app = express();
var cors = require('cors');
const path = require('path');
const fs = require("fs");
const axios = require('axios').default;
const  cheerio =require('cheerio');

//API
const bcrypt = require('bcryptjs');
var User = require('./user');
var Card = require('./card');
const fileUpload = require('express-fileupload');
const defaultProfilePic = "https://firebasestorage.googleapis.com/v0/b/webframebase.appspot.com/o/profiles%2Fdefault.jpeg?alt=media&token=a220a7a4-ab49-4b95-ac02-d024b1ccb5db"

//Authentication
const cookieParser = require('cookie-parser');

//load secrets to process environment
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

// Firebase imports
const { initializeApp } = require ('firebase/app');
const { getStorage,ref,uploadBytesResumable,getDownloadURL } =require ('firebase/storage');

// Firebase configuration
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

// Nodemailer
var nodemailer = require('nodemailer');

// Email source
var transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'martencarlos3@gmail.com',
    pass: 'cuknrzlcnsriuabz'
  }
});

// Email options
var mailOptions = {
  from: 'martencarlos3@gmail.com',
  to: 'martencarlos@gmail.com',
  subject: 'The top article has changed',
};


// REPETITIVE TASKS
// 1 - Webscrap articles
const articles = []
var firstPlace ={};

getArticles() // get articles on start
setInterval(() => getArticles(), 1000*60*60) // after first hour, every hour

function getArticles(){
  console.log('repetitive task - running get webscrapping articles every hour');

  const URL = 'https://www.amazon.es/gp/bestsellers/computers/30117744031/ref=zg_bs_nav_computers_2_938008031'
  axios.get(URL)
    .then( response => {
        const htmlData = response.data
        const $ = cheerio.load(htmlData)
        
        let pos;

        $('.zg-grid-general-faceout', htmlData).each((index, element) => {
          pos=1+index;
          const title = $(element).find('._cDEzb_p13n-sc-css-line-clamp-3_g3dy1').text()
          const price = $(element).find('._cDEzb_p13n-sc-price_3mJ9Z').text()
          const imgSrc = $(element).find('._cDEzb_noop_3Xbw5 > img').attr('src')
          const url ="https://www.amazon.es"+ $(element).find('a').attr('href')

          articles.push({
              pos,
              title,
              price,
              imgSrc,
              url
          })
        })
        
        if(articles[0].title !== firstPlace.title || articles[0].price !== firstPlace.price){
          firstPlace = articles[0]

          mailOptions.html = `
            <div className="table"> 
              <table>
                <tbody>
                <tr className="header">
                    <th>Position</th>
                    <th>Title</th>
                    <th>Price</th>
                    <th>Img</th>
                    <th>Link</th>
                </tr>
                
                <tr key=${firstPlace.pos}>
                <td className="pos">${firstPlace.pos}</td>
                <td>${firstPlace.title}</td>
                <td>${firstPlace.price}</td>
                <td><img style="max-width: 200px; max-height: 100px;" fetchpriority="high" src= ${firstPlace.imgSrc} alt="product"></img></td>
                <td><a href=${firstPlace.url} className="link" underline="always">Amazon</a></td>
                </tr>
              
                </tbody>
              </table>
            </div>`
          
          transporter.sendMail(mailOptions, function(error, info){
            if (error) {
              console.log(error);
            } else {
              console.log('Email sent: ' + info.response);
            }
          });
        }
        
    }).catch(err => console.error(err))
}

// 2 - Blog entries
const blogEntries = []
getBlogEntries() // get articles on start
setInterval(() => getBlogEntries(), 1000*60*60) // after first hour, every hour
function getBlogEntries(){
  axios.get('https://webframe247611193.wordpress.com/feed/')
    .then(function (response) {
      // handle success
      blogEntries = (response.data).map(a => {return {...a}})
    })
    .catch(function (error) {
      // handle error
      console.log(error);
    })
    .then(function (response) {
      // always executed
  });
}


// MIDDLEWARE

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
  // if(req.header.cookie)
  //   console.log("cookie in header")
  console.log(req.socket.remoteAddress)
  console.log(req.headers['x-forwarded-for'])
  
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

app.post('/deleteUser', checkAuthenticated, async function(req, res){
	  
    const {deleteUserId,adminUserId}= req.body

    const adminUser =  await User.find({_id: adminUserId});
    
    if(adminUser[0].role === "admin"){
    
      if(deleteUserId === adminUserId){
        res.json({
          message: "You can't delete yourself"
        })
      }else{
        User.deleteOne({_id:deleteUserId}, function (err) {
          if (err) return handleError(err);
        });
        res.json({
          message: "user deleted"
        })
      }
    }else{
      res.json({
        message: "Only website administrators can delete users"
      })
    }
});

app.post('/deleteAccount', checkAuthenticated, async function(req, res){
	  
  const {userId}= req.body

  const foundUserArray =  await User.find({_id: userId});
  const foundUser = foundUserArray[0];
  
  User.deleteOne({_id:foundUser}, function (err) {
    if (err) return handleError(err);
  });

  res.json({
    message: "account deleted"
  })
    
});

app.post('/updateUser', checkAuthenticated, async function(req, res){
	  
    const formData= req.body
    var errors = {};
    let message="";
    let hasChanges = false;
    
    //get user from database
    const foundUserArray =  await User.find({_id: formData.id});
    const foundUser = foundUserArray[0];

    if(foundUser){
      //conditions
      var conditions = {
        _id : foundUser._id 
      }
      //changes
      if(formData.name !== foundUser.name){
       
        hasChanges = true;
        foundUser.name = formData.name;
      }
      if(formData.username !== foundUser.username){
        hasChanges = true;
        const userNameExists =  await User.find({username: formData.username});
        
        if(userNameExists.length!==0){
          errors.username = "Username already exists";
          message="errors found"
        }else
          foundUser.username = formData.username;
      }
        
      if(formData.email !== foundUser.email){
        hasChanges = true;
        const emailExists =  await User.find({email: formData.email});
        if(emailExists.length!==0){
            errors.email= "Email is already in use";
            message="errors found"
        }else
          foundUser.email = formData.email;
      }

      if(formData.password !==''){
        bcrypt.compare(formData.password, foundUser.password).then(function(result) {
          if(!result){
            console.log("passwords do not match")
            hasChanges = true;
            bcrypt.hash(formData.password, 10, function(err, hash) {
              foundUser.password = hash;
              sendReply()
            });
          }else{
            console.log("passwords match")
            if(hasChanges){
              if(JSON.stringify(errors) !== '{}'){
                message="errors found"
              }
            }else{
                message= "No changes made"
            }
            sendReply()
          }
        }).catch(function(err) {
              message= err
        });  
      }else{
        if(!hasChanges)
          message= "No changes made"
        sendReply()
      }
        
    }else{
      message= "Error - user not found"
      sendReply()
    }

    //find and update
    function sendReply(){
      if(!message && JSON.stringify(errors) === '{}'){
        foundUser.lastUpdate= Date.now();
        User.findOneAndUpdate(conditions,foundUser,function(error,result){
          if(error){
            message=error
            res.json({
              message: message,
              errors
            })
          }else{
              message="User updated"
              res.json({
                message: message,
                errors,
                user: foundUser
              })
          }
        });
      }else{
        res.json({
          message: message,
          errors
        })
      }
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
        user.profilePic= defaultProfilePic;
        user.createDate= Date.now();
        user.lastUpdate= Date.now();
        user.logins=0;
        user.role= "user";
        // console.log(user)
        user.save(function(err,result){
          if (err){
              console.log(err);
          }
          else{
              console.log(result)
              res.json({
                success: "registered"
              })
          }
      })
      });
      
    }
		}
});

app.post('/login',async(req, res) => {
  
   var foundUser =  await User.find({email: req.body.email});
    
    if(foundUser.length !==0){
      bcrypt.compare(req.body.password, foundUser[0].password).then(function(result) {
        if(result){
   
          //conditions
          var conditions = {
            _id : foundUser[0]._id 
          }
          //changes
          foundUser[0].lastLogin= Date.now();
          if(foundUser[0].logins)
            foundUser[0].logins= foundUser[0].logins+1;
          else
            foundUser[0].logins=1;
    
          //find and update
          User.findOneAndUpdate(conditions,foundUser[0],function(error,result){
            if(error){
              console.log(error)
            }else{
              console.log("updated");
              
            }
          });
           
          //update last login date
          

          res.cookie('user', foundUser[0], { maxAge: 3600000, httpOnly: false })
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

async function checkAuthenticated(req, res, next) {

  if (req.headers.cookie) {
    const cookies = parseCookies(req)
    
    var cookieUser = JSON.parse(cookies["user"].slice(2))
    var userArray = await User.find({_id: cookieUser._id})
    if(userArray.length!==0)
      next();
    else
      res.json({error: "not authenticated"})
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
  axios.get('https://medium.com/@JonathanSaring/feed')
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

app.get('/wordpress', (req, res) => {
  res.set('Content-Type', 'application/rss+xml')
  res.send(blogEntries)
  
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
      res.send(foundUser[0].profilePic)
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

app.post('/setImageProfile',checkAuthenticated, async (req, res)=>{
	console.log("setting image profile");
  
  //files are empty error handling
  if (!req.files || Object.keys(req.files).length === 0) {
    return res.status(400).send('No files were uploaded.');
  }
  
  const file = req.files.profile_image;
  

  const cookies = parseCookies(req)
  console.log(cookies)
  var cookieUser = JSON.parse(cookies["user"].slice(2))
  var url =""
  var userArray = await User.find({_id: cookieUser._id})
  var user = userArray[0]
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

      user.profilePic = downloadURL
      user.lastUpdate = Date.now()

      console.log(user.profilePic)
      
      User.findOneAndUpdate(conditions,user,function(error,result){
        if(error){
          // handle error
        }else{
          console.log("updated");
          res.status(200).send({url: user.profilePic})
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
      await card.save()
		
  } catch (error) {
     res.json({message: "error: "+error}) 
  }
  res.json({message: "success"}) 
}});

app.get('/users', async (req, res) => {
  console.log("getting all users");
  const allUsers =  await User.find({});
  res.json(allUsers);
});



app.get('/laptops', (req, res) => {
  // const URL = "https://www.amazon.es/gp/bestsellers/shoes/2008177031?ref_=Oct_d_obs_S&pd_rd_w=tDehD&content-id=amzn1.sym.0cde40b7-98fa-4b31-a03b-17a732646b9b&pf_rd_p=0cde40b7-98fa-4b31-a03b-17a732646b9b&pf_rd_r=B33J77067WYMVPZA1YBK&pd_rd_wg=qQltQ&pd_rd_r=a97d94ec-1284-451e-b83b-8250049c8425"
  
  const { q } = req.query;
  const keys = ["title"];
  const search = (data) => {
    return data.filter((item) =>
      keys.some((key) => item[key].toLowerCase().includes(q))
    );
  };

  q ? res.json(search(articles).slice(0, 30)) : res.json(articles.slice(0, 30));
  
})


console.log('Routes in place');

// Start Server
app.set('port', (process.env.PORT || 80));
app.listen(app.get('port'), function(){
  console.log('Server started on port '+ app.get('port'));
});