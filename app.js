require("dotenv").config();
const express = require("express");
const ejs = require("ejs");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
// const encrypt = require("mongoose-encryption");
// const md5 = require("md5");
// const bcrypt = require("bcrypt");
// const saltRounds = 10;
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require("mongoose-findorcreate");

const app = express();

app.use(express.static("public"));
app.set("view engine", 'ejs');
app.use(bodyParser.urlencoded({
  extended: true
}));


app.use(session({
  secret: "This is a secret",
  resave: false,
  saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://localhost:27017/userDB");

const userSchema = new mongoose.Schema({
  email: String,
  password: String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);
// userSchema.plugin(encrypt,{secret : process.env.SECRET, encryptedFields : ['password'] });
const userModel = mongoose.model('user', userSchema);

passport.use(userModel.createStrategy());
passport.serializeUser(function(user,done){
  done(null,user.id);
});
passport.deserializeUser(function(id,done){
  userModel.findById(id, function(err,user){
    done(err,user);
  });
});


passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL: "https://googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile);
    userModel.findOrCreate({
      googleId: profile.id
    }, function(err, user) {
      return cb(err, user);
    });
  }
));


app.get("/", function(req, res) {
  res.render("home");
});

app.get('/auth/google',
  passport.authenticate('google', {scope: ["profile"]}));


app.get('/auth/google/secrets',
  passport.authenticate('google', {failureRedirect: 'login'}),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('secrets');
  });


app.get("/login", function(req, res) {
  res.render("login");
});

app.get("/register", function(req, res) {
  res.render("register");
});

app.get("/secrets", function(req, res) {
  if (req.isAuthenticated()) {
    res.render("secrets");
  } else {
    res.render("login");
  }
});

app.get("/logout", function(req, res) {
  req.logout(function(err) {
    if (err) {
      console.log(err);
    } else {
      res.redirect("/");
    }
  });
});

app.post("/register", function(req, res) {

  // // bcrypt.hash(req.body.password, saltRounds, function(err, hash) {
  // //   const newUser = new userModel({
  // //     email: req.body.username,
  // //     password: hash
  // //   });
  //
  //   newUser.save(function(err) {
  //     if (!err) {
  //       res.render("secrets");
  //     } else {
  //       console.log(err);
  //     }
  //   });
  //
  // });

  userModel.register({
    username: req.body.username
  }, req.body.password, function(err, user) {
    if (err) {
      console.log(err);
      res.redirect("/register");
    } else {
      passport.authenticate("local")(req, res, function() {
        res.redirect("/secrets");
      });
    }
  });


});

app.post("/login", function(req, res) {

  // userModel.findOne({
  //   email: req.body.username
  // }, function(err, result) {
  //   if (!err) {
  //
  //     // bcrypt.compare(req.body.password, result.password, function(err, result) {
  //     //   if (result === true) {
  //     //     res.render("secrets");
  //     //   }
  //     // });
  //
  //   } else {
  //     console.log(err);
  //   }
  // })
  //

  const newUser = new userModel({
    username: req.body.username,
    password: req.body.password
  });

  req.login(newUser, function(err) {
    if (err) {
      console.log(err);
    } else {
      passport.authenticate("local")(req, res, function() {
        res.redirect("secrets");
      })
    }
  });
});

app.listen(3000, function() {
  console.log("Server listening on port 3000");
})
