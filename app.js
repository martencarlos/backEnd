
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
var Article = require('./article');
var PriceTracker = require('./pricetracker');

const fileUpload = require('express-fileupload');
const defaultProfilePic = "https://firebasestorage.googleapis.com/v0/b/webframebase.appspot.com/o/profiles%2Fdefault.jpeg?alt=media&token=a220a7a4-ab49-4b95-ac02-d024b1ccb5db"

//Authentication
const cookieParser = require('cookie-parser');
const uuidv4 = require("uuid4")

//load secrets to process environment
if (!process.env.HOST_HEROKU_DEPLOYED){
  require('dotenv').config({path: process.cwd() + '/config/secrets.env'}); 
}else{

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
const { isFunction } = require('util');
const { rejects } = require('assert');
const { Http2ServerRequest } = require('http2');

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


// Cron Jobs
// 1 - Webscrap articles
app.get('/updatewebscrap', (req, res) => {
  updateDBArticles() // get articles 
  res.send("updated")
})

function updateDBArticles(){
  const URL = 'https://www.amazon.es/gp/bestsellers/computers/30117744031/ref=zg_bs_nav_computers_2_938008031'
  axios.get(URL)
    .then(async (response) => {
        const htmlData = response.data
        const $ = cheerio.load(htmlData)
        const newArticles = []
        let pos;

        $('.zg-grid-general-faceout', htmlData).each((index, element) => {
          pos=1+index;
          const title = $(element).find('._cDEzb_p13n-sc-css-line-clamp-3_g3dy1').text()
          const price = $(element).find('._cDEzb_p13n-sc-price_3mJ9Z').text()
          const imgSrc = $(element).find('._cDEzb_noop_3Xbw5 > img').attr('src')
          const url ="https://www.amazon.es"+ $(element).find('a').attr('href')

          newArticles.push({
              pos,
              title,
              price,
              imgSrc,
              url
          })
        })
  
        const savedArticles = await Article.find({}) 

        if(savedArticles[0]=== undefined){
            const article = new Article({articles: newArticles});
            article.save();
            console.log("saving articles for the first time")
        }else 
        if(JSON.stringify(newArticles) !== JSON.stringify(savedArticles)){
          
          //Only send email if the top article has changed
          if(newArticles[0].title !== savedArticles[0].articles[0].title || newArticles[0].price !== savedArticles[0].articles[0].price){
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
                  
                  <tr key=${newArticles[0].pos}>
                  <td className="pos">${newArticles[0].pos}</td>
                  <td>${newArticles[0].title}</td>
                  <td>${newArticles[0].price}</td>
                  <td><img style="max-width: 200px; max-height: 100px;" fetchpriority="high" src= ${newArticles[0].imgSrc} alt="product"></img></td>
                  <td><a href=${newArticles[0].url} className="link" underline="always">Amazon</a></td>
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

          //Update entire list
          const conditions = {
            _id : savedArticles[0]._id 
          }
          
          Article.findOneAndUpdate(conditions,{articles: newArticles},function(error,result){
            if(error){
              console.log(error)
            }else{
              console.log("repetitive task - articles updated")
            }
          });
        }
    }).catch(err => console.error(err))
}

// 2 - Blog entries Daily
app.get('/updateblogentries', (req, res) => {
  updateMemoryBlogEntries() 
  res.send("updated blogentries")
})

var blogEntries = []
updateMemoryBlogEntries() //get it at start of server
function updateMemoryBlogEntries(){
  
  axios.get('https://webframe247611193.wordpress.com/feed/')
    .then(function (response) {
      // handle success
      if(blogEntries !== response.data)
        blogEntries =  JSON.parse(JSON.stringify(response.data))
      
        console.log("repetitive task - blog entries updated")
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
      console.log("debug - author ID: "+ cardID)
      console.log("debug - userID: " + userID)
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

          //Session
          var newSession ={}
          newSession.sessionID= uuidv4()
         
          if(req.body.keepLoggedIn){
            newSession.expireDate=new Date((new Date()).getTime() + 7 * 24 * 60 * 60 * 1000); //1 week
            foundUser[0].sessions.push(newSession)
            res.cookie("uid", foundUser[0]._id, { maxAge: (7 * 24 * 60 * 60 * 1000), httpOnly: false, sameSite: 'none', secure:true })
            res.cookie("ssid",newSession,{ maxAge: (7 * 24 * 60 * 60 * 1000), httpOnly: false, sameSite: 'none', secure:true })
          }else{
            newSession.expireDate=new Date((new Date()).getTime() + 1 * 60 * 60 * 1000); // 1 hour
            foundUser[0].sessions.push(newSession)
            res.cookie("uid", foundUser[0]._id, { maxAge: (1 * 60 * 60 * 1000), httpOnly: false, sameSite: 'none', secure:true })
            res.cookie("ssid",newSession,{ maxAge: (1 * 60 * 60 * 1000), httpOnly: false, sameSite: 'none', secure:true })
          }
          
          // update logins counter
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

    if(cookies["uid"] && cookies["ssid"]){
      console.log(cookies["uid"])
      if(process.env.SERVER === "http://localhost")
        var activeUid = JSON.parse((cookies["uid"]))
      else
        var activeUid = JSON.parse((cookies["uid"].slice(2)))
      var userArray = await User.find({_id: activeUid})

      if(userArray.length!==0){
        var activeSession = {}
        console.log("parsing active session cookie:")
        console.log(cookies["ssid"])
        if(process.env.SERVER === "http://localhost")
          activeSession = userArray[0].sessions.find(obj => obj.sessionID === JSON.parse((cookies["ssid"])).sessionID);
        else
          activeSession = userArray[0].sessions.find(obj => obj.sessionID === JSON.parse((cookies["ssid"].slice(2))).sessionID);
        
        if (activeSession){
          if(Date.now() < activeSession.expireDate)
            next();
          else{
            console.log("cookie deletion reason: expired date")
            res.cookie('uid', "", { maxAge: -1, httpOnly: false }) //expired
            res.json({error: "not authenticated"})
          }
        }
      }else{
        console.log("cookie deletion reason: user not found")
        res.cookie('uid', "", { maxAge: -1, httpOnly: false }) //expired
        res.json({error: "not authenticated"})
      }
    }
    else{
      console.log("cookie deletion reason: cookie 'uid' not found")
      // res.cookie('me', "", { maxAge: -1, httpOnly: false }) //expired
      res.json({error: "not authenticated"})
    }
    
      
  } else {
      console.log("cookie deletion reason: No cookies found")
      // res.cookie('me', "", { maxAge: -1, httpOnly: false }) //expired
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
  if(process.env.SERVER==="http://localhost")
    var activeUid = JSON.parse(cookies["uid"])
  else
    var activeUid = JSON.parse(cookies["uid"].slice(2))
  var url =""
  var userArray = await User.find({_id: activeUid})
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
  if(process.env.SERVER==="http://localhost")
    var uid = JSON.parse(cookies["uid"])
  else
    var uid = JSON.parse(cookies["uid"].slice(2))
  var url =""

  const storage = getStorage(firebaseApp);

  const metadata = {
    contentType: file.mimetype
  };

  // Upload file and metadata to the object 'images/mountains.jpg'
  const storageRef = ref(storage, uid+'/cardImages/'+Date.now()+'-'+file.name);
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

app.post('/cards', async function(req, res){
	console.log("saving cards into db");
	//async required because of database query
  const card = new Card(req.body);
  try {
    await card.save()
  } catch (error) {
     res.json({message: "error: "+error}) 
  }
  const foundCard =  await Card.find({authorid: card.author.authorid}).sort({_id:-1}).limit(1)
 
  res.json(foundCard[0]) 
});

app.get('/users', async (req, res) => {
  console.log("getting all users");
  const allUsers =  await User.find({});
  res.json(allUsers);
});



app.get('/laptops', async (req, res) => {
  // const URL = "https://www.amazon.es/gp/bestsellers/shoes/2008177031?ref_=Oct_d_obs_S&pd_rd_w=tDehD&content-id=amzn1.sym.0cde40b7-98fa-4b31-a03b-17a732646b9b&pf_rd_p=0cde40b7-98fa-4b31-a03b-17a732646b9b&pf_rd_r=B33J77067WYMVPZA1YBK&pd_rd_wg=qQltQ&pd_rd_r=a97d94ec-1284-451e-b83b-8250049c8425"
  
  const { q } = req.query;
  const keys = ["title"];
  const savedArticles = await Article.find({}) 


  const search = (data) => {
    return data.filter((item) =>
      keys.some((key) => item[key].toLowerCase().includes(q))
    );
  };
  res.header("Access-Control-Allow-Origin", "*");
  q ? res.json(search(savedArticles[0].articles).slice(0, 30)) : res.json(savedArticles[0].articles.slice(0, 30));
  
})

app.post('/newtracker',checkAuthenticated, async (req, res) => {
  let {userID, url}= req.body
  console.log("before first AXIOOOOOS")
  try {
    await axios.get(url).then(async response => {
      url=response.request._redirectable._currentUrl
      // console.log(response.request._redirectable._currentUrl); // Final URL after redirections
    });
  } catch (error) {
    url=error.request.res.responseUrl
  }
  
  console.log("After first AXIOOOOOS")
  // console.log("debug - response URL")
  // console.log(url)
  //check if tracker is already in the user trackers
  const user =  await User.find({_id:userID});
  let userTrackerAlreadyExist = false;
  // console.log(mongoose.Types.ObjectId(userID))

  async function asyncForEach(trackers) {
    for (let index = 0; index < trackers.length; index++) {
      if((await PriceTracker.find({_id: trackers[index].trackerId})).length !==0){
        if(((await PriceTracker.find({_id: trackers[index].trackerId}))[0]).productInfo.productNumber === (url.split('/dp/')[1]).slice(0,10)){
        userTrackerAlreadyExist = true;
      }
      }
      
    }
  }
  await asyncForEach(user[0].trackers)

  // user[0].trackers.forEach(async function(tracker) {
  //   var fullPriceTracker = await PriceTracker.find({_id:tracker.trackerId})
  //   if(typeof fullPriceTracker[0] !== "undefined"){
  //     if(fullPriceTracker[0].url ===url){
  //       userTrackerAlreadyExist = true;
  //     }
  //   }
  // });
 
  const foundTracker =  await PriceTracker.find({"productInfo.productNumber": (url.split('/dp/')[1]).slice(0,10)});
  // console.log("DEBUG - product number:")
  // console.log((url.split('/dp/')[1]).slice(0,10))
  // console.log("DEBUG - found tracker:")
  // console.log(foundTracker)
  // userTrackers.length !==0
  //check if the user is already traking the product
  
  if(userTrackerAlreadyExist){
      res.json({message: "user tracker already exists"})
   }else if(foundTracker.length !==0){
      // console.log("Debug - found tracker:")
      user[0].trackers.push({trackerId:foundTracker[0]._id})
      // console.log(user[0])
      await User.findOneAndUpdate({_id : user[0]._id },user[0],function(error,result){
        if(error){
          // handle error
        }else{
          console.log("updated user trackers with existing tracker");
        }
      }).clone();
      res.json(foundTracker[0])
   }
   else{
      console.log("Debug - getting the new tracker info")
      getProductInfo(url,userID,res)
   }
      
})

 async function getProductInfo(url,userID,res){
  
  //get camel url
  try {
    (url.split('/dp/')[1]).slice(0,10)
    // (url.split('/dp/')[1]).split('/')[0]
  } catch (error) {
    res.json({message:"URL is not a product page"})
    return true
  }
  
  let productNumber = (url.split('/dp/')[1]).slice(0,10)
  // let productNumber = (url.split('/dp/')[1]).split('/')[0]
  let countryCode;
  if((url.split('www.amazon.')[1]).substring(0, 3)==='com'){
    countryCode ="us"
  }else if((url.split('www.amazon.')[1]).substring(0, 5)==='co.uk'){
    countryCode ="co.uk"
  }
  else
    {countryCode = (url.split('www.amazon.')[1]).substring(0, 2)}
  let camelurl;
  if(countryCode === "us")
    camelurl= "https://camelcamelcamel.com/product/"+productNumber
  else
    camelurl= "https://"+countryCode+".camelcamelcamel.com/product/"+productNumber

  console.log("DEBUG - Camel URL")
  console.log(camelurl)
  // axios.get(url)
  axios.get(camelurl)
    .then(async (response) => {
      
        const htmlData = await response.data
        const $ = cheerio.load(htmlData)
        var productInfo = {
          productNumber: String,
          title: String,
          price: Number,
          countryCode: String,
          imgSrc: String,
          camelurl: String,
          prices: [{
            date: Date,
            price: Number
          }]
        }
        
        //working webscraping of title and image directly from amazon
        // productInfo.title= $('#productTitle').text().trim()
        // productInfo.imgSrc= $('#imgTagWrapperId').find('img').attr('src');
        // productInfo.price = $("[id*='corePriceDisplay']").first().find('.a-price-whole').text();

        productInfo.productNumber=productNumber
        productInfo.title= ($('h2 > a').first().text()).substring(0,($('h2 > a').first().text()).length-(productNumber.length+2));
        productInfo.imgSrc= $('img').attr('src');
        // console.log("DEBUG - price in us:")
        // console.log(($('.green').first().text()))
        productInfo.countryCode= countryCode
        if(countryCode === "us"){
          if(isNaN(parseFloat(($('.green').first().text()).substring(1))))
            productInfo.price= 0
          else
            productInfo.price= parseFloat(($('.green').first().text()).substring(1));
        }else{
          if(isNaN(parseFloat(($('.green').first().text()))))
            productInfo.price= 0
          else
            productInfo.price= parseFloat(($('.green').first().text()).replace(".",""));
        }
        
        productInfo.camelurl = camelurl
        productInfo.prices[0].date= new Date()
        productInfo.prices[0].price=productInfo.price
        // console.log(productInfo)
        

        if(productInfo.price !==0){
          //save in db
          const newTracker = new PriceTracker({ createDate: Date.now(), url:url,productInfo: productInfo});
          // userID: mongoose.Types.ObjectId(userID),
          await newTracker.save();
          const newTrackersWithNewID =  await PriceTracker.find({url: url});
          
          // Add tracker to user
          const updatedUser =  await User.find({_id:userID});
          // console.log("DEBUG - user info:")
          // console.log(updatedUser[0])
          updatedUser[0].trackers.push({trackerId:newTrackersWithNewID[0]._id})
          // console.log("DEBUG - user info with new tracker:")
          // console.log(updatedUser[0])
          await User.findOneAndUpdate({_id : userID },updatedUser[0],function(error,result){
            if(error){
              // handle error
            }else{
              console.log("updated");
            }
          }).clone();
          res.json(newTrackersWithNewID[0])
        }else{
          res.json({message:"Product is out of stock - no price found"})
        }
        
        // return productInfo;
      }
    ).catch(err => console.error(err))
}

app.post('/deletetracker',checkAuthenticated, async (req, res) => {
  const {userID,trackerID} = req.body

  foundUser= await User.find({_id: userID});
  
  // Find the index of the object 
  let index = foundUser[0].trackers.findIndex(obj => obj.trackerId === trackerID);

  // If the index is found, remove the object from the array
  if (index !== -1) {
    foundUser[0].trackers.splice(index, 1);
  }

  await User.findOneAndUpdate({_id : userID },foundUser[0],function(error,result){
    if(error){
      res.send("error")
    }else{
      console.log("user tracker deleted");
      res.send("deleted")
    }
  }).clone();

  // foundTrackers= await PriceTracker.find({_id: trackerID});
  
  // if(foundTrackers[0].length !==0){
  //   PriceTracker.deleteOne({_id:trackerID}, function (err) {
  //     if (err) return handleError(err);
  //     res.send("deleted")
  //   });
  // }else
  //   res.send("error")
})

app.get('/mytrackers',checkAuthenticated, async (req, res) => {
 
  const cookies = parseCookies(req)
  if(process.env.SERVER === "http://localhost")
    var uid = JSON.parse(cookies["uid"])
  else
    var uid = JSON.parse(cookies["uid"].slice(2))
  const userID = uid
  const user =  await User.find({_id: userID});
  var myTrackers=[];
  // console.log("Debug - user trackers:")
  // console.log(user[0].trackers)

  async function asyncForEach(trackers) {
    for (let index = 0; index < trackers.length; index++) {
      myTrackers.push((await PriceTracker.find({_id: trackers[index].trackerId}))[0])
    }
  }
  await asyncForEach(user[0].trackers)
  
  // console.log("Debug - My trackers:")
  // console.log(myTrackers)
  res.send(myTrackers)
})

app.get('/updateTrackers', async (req, res) => {
  
  res.send("Tracker request received. Updating trackers...")
  
  async function updatePrice(tracker,i) {
    // if(i % 1 == 0){
    //   await new Promise(resolve => setTimeout(resolve, 3000));//wait for 1 second
    // }
    
    // setTimeout(async () => {
      console.log(i)
      var response

      // if(i % 5 == 0){
      //   await new Promise(resolve => setTimeout(resolve, 15000));//wait for 15 second
      // }
      try {
         response = await axios.get(tracker.url,{
            headers:{
              'User-agent': ''
            }
         });
        }catch (error) {
          console.log(error.code)
          if(i % 1 == 0){
            try {
              await new Promise(resolve => setTimeout(resolve, 10000));//wait for 8 second
              response = await axios.get(tracker.url,{
                headers:{
                  'User-agent': ''
                }
             });}catch (error) {
              console.log(error)
             }
            }
        }

         const $ = cheerio.load(response.data);
         
         var latestPrice=0
        //  if(isNaN(parseFloat(($('.green').first().text()))))
        if(isNaN(parseFloat($("[id*='corePriceDisplay']").first().find('.a-price-whole').text())))
           latestPrice= 0
         else{
          //  latestPrice= (parseFloat(($('.green').first().text()).replace(".","")));
          latestPrice= parseFloat($("[id*='corePriceDisplay']").first().find('.a-price-whole').text().replace(".",""))
         }
        
         cloneTracker = JSON.parse(JSON.stringify(tracker))
         
        //  console.log("current price:")
        //  console.log(cloneTracker.productInfo.price)
        //  console.log("lates tPrice:")
        //  console.log(latestPrice)
         if(latestPrice !== cloneTracker.productInfo.price && latestPrice!==0){
           cloneTracker.productInfo.price = latestPrice
           cloneTracker.productInfo.prices.push({date: Date.now(),price:latestPrice})
           const newTracker = new PriceTracker(cloneTracker);
           
           //Update entire list
           const conditions = {
             _id : tracker._id 
           }
           
           await PriceTracker.findOneAndUpdate(conditions,newTracker,function(error,result){
             if(error){
               console.log(error)
             }else{
              //  console.log("updated counter: "+ trackerCounter++)
               return "updated"
             }
           }).clone();
           
         }else{
          // console.log("not updated")
           return "not updated"
         }
     
  //  }, 1000); //wait a second to avoid too many requests error from server
   
  }

  let trackerCounter=0;
  const userTrackerss =  await PriceTracker.find({});
  
  for (const [i,tracker] of userTrackerss.entries()) {
    const result = await updatePrice(tracker,i)
    // console.log(result);
  }

  console.log("trackers updated: "+trackerCounter)
    
    // userTrackerss.forEach(async (tracker,i) => {
    //    var result = await updatePrice(tracker)
    // })

    // setTimeout(() => {
    //   console.log("trackers updated: "+trackerCounter)
      
    // }, 15000);

})

console.log('Routes in place');

// Start Server
app.set('port', (process.env.PORT || 80));
app.listen(app.get('port'), function(){
  console.log('Server started on port '+ app.get('port'));
});