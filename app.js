// LOAD MODULES 
var express = require("express"),
    sqlite = require('sqlite3').verbose(),
    app = express(),
    geoip = require('geoip-lite')
    bodyParser = require('body-parser'),
    mongoose = require('mongoose'),
    passport = require('passport'),
    LocalStrategy = require('passport-local'),
    path = require('path'),
    favicon = require('serve-favicon'),
    useragent = require('express-useragent'),
    User = require('./models/user'),
    DataLibrary = require('./models/datalibrary'),
    helper = require('./routes/helpers/helpers')

var showRoutes = require('./routes/show'),
    indexRoutes = require('./routes/index'),
    //datalibraryRoutes = require('./routes/datalibrary'),
    vizRoutes = require('./routes/viz'),
    authRoutes = require('./routes/auth'),
    downloadsRoutes = require('./routes/downloads'),
    deleteRoutes = require('./routes/delete')

// limit parameter required to send larger json files
// https://stackoverflow.com/questions/19917401/error-request-entity-too-large
app.use(bodyParser.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({limit: '50mb', extended: true}));
app.use(express.json());
app.use(useragent.express());
app.set("view engine", "ejs"); // use ejs template engine for rendering

var mongoDB = process.env.MONGODB_URI || "mongodb://localhost/datalibrary"; 
mongoose.connect(mongoDB,
    { useUnifiedTopology: true, useNewUrlParser: true }, function (err) {
        if (err) { console.log('Not connected to database!'); } else {
            console.log('Successfully connected to database.')
        }
    }
);

// Connection to SQLite Data libary database
const db_name = path.join(__dirname, "models", "data_lib.db");
const db = new sqlite.Database(db_name, err => {
  if (err) {
    return console.error(err.message);
  }
  console.log("Successful connection to the database 'data_lib.db'");
});

// Creating the DataLibrary table 
const sql_create = `CREATE TABLE IF NOT EXISTS DataLibrary (
    data BLOB, 
    info_ BLOB, 
    geoinfo BLOB, 
    datasummary BLOB,
    subject, 
    type, 
    uniquestudyid, 
    desc, 
    condition, 
    previous_uniquestudyid,
    previous_time, 
    previous_mins_before, 
    browser, 
    browser_ver, 
    os, 
    platform,
    time, 
    utc_datetime, 
    utc_date BLOB, 
    utc_time BLOB, 
    user_date, 
    user_time
  );`;
  db.run(sql_create, err => {
    if (err) {
      return console.error(err.message);
    }
    console.log("Successful creation of the 'DataLibrary' table");
})

// Connection to SQLite User database
const db_name = path.join(__dirname, "models", "user.db");
const db = new sqlite.Database(db_name, err => {
  if (err) {
    return console.error(err.message);
  }
  console.log("Successful connection to the database 'user.db'");
});

// Creating the User table 
const sql_create = `CREATE TABLE IF NOT EXISTS User (
    username, 
    password
  );`;
  db.run(sql_create, err => {
    if (err) {
      return console.error(err.message);
    }
    console.log("Successful creation of the 'User' table");
})

app.post('/submit-data', function (req, res) {
    const rawdata = req.body;  // data from jspsych
    const info = rawdata[0].info_; // get info_ from object/trial 0
    console.assert(info != null, 'No info stored in data, please add to jsPsych data.')
    const datasummary = rawdata[0].datasummary;  // get datasummary_ from object/trial 0
    const ua = req.useragent; // get client/user info using express-useragent package

    // get ip
    // https://stackoverflow.com/questions/8107856/how-to-determine-a-users-ip-address-in-node
    var ip = req.headers['x-forwarded-for'] ||
        req.connection.remoteAddress ||
        req.socket.remoteAddress ||
        (req.connection.socket ? req.connection.socket.remoteAddress : null);
    // var ip = "2001:569:7530:8100:719d:bd86:de7a:797b"

    var geoinfo = geoip.lookup(ip);
    if (!geoinfo) {
        var geoinfo = {
            range: [null, null],
            country: null,
            region: null,
            eu: null,
            timezone: null,
            city: null,
            ll: [null, null],
            metro: null,
            area: null
        }
    };

    // add columns/properties to each row/trial/object in jspsych data (eventually 2D tables/csv)
    rawdata.forEach(function (i) {
        delete i.info_; // delete to save space
        delete i.datasummary; // delete to save space

        // task info
        i.type = info.type;
        i.uniquestudyid = info.uniquestudyid;
        i.desc = info.desc;
        i.condition = info.condition;
        i.redirect_url = info.redirect_url;
        i.previous_uniquestudyid = info.previous_uniquestudyid;
        i.previous_time = info.previous_time;
        i.previous_mins_before = info.previous_mins_before;
        i.previous_task_completed = info.previous_task_completed;

        // geo/time info
        i.utc_datetime = info.utc_datetime,
        i.country = info.demographics.country,
        i.country_code = info.demographics.country_code,
        i.time = info.time,
        
        // client info
        i.browser = ua.browser;
        i.browser_ver = ua.version;
        i.os = ua.os;
        i.platform = ua.platform;
        i.ip = ip;

        // demographics
        i.nationality = info.demographics.country_associate;
        i.nationality_code = info.demographics.country_associate_code;
        i.language = info.demographics.language;
        i.language_code = info.demographics.language_code;
        i.religion = info.demographics.religion;
        i.race_ethnicity = info.demographics.race_ethnicity;
        i.gender = info.demographics.gender;
        i.handedness = info.demographics.handedness;
        i.life_satisfaction = info.demographics.life_satisfaction;
    })

    // add fields to this document
    const sql = "INSERT INTO DataLibrary (data, info_, geoinfo, datasummary, " + 
        "subject, type, uniquestudyid, desc, condition, previous_uniquestudyid," +
        "previous_time, previous_mins_before, browser, browser_ver, os, platform," +
        "time, utc_datetime, utc_date, utc_time, user_date, user_time) VALUES (?, ?," +
        "?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
    const exp_data = [JSON.stringify(rawdata), JSON.stringify(info), JSON.stringify(geoinfo), JSON.stringify(datasummary), info.subject, info.type, info.uniquestudyid, info.desc, info.condition, 
                  info.previous_uniquestudyid, info.previous_time, info.previous_mins_before, ua.browser, ua.version, ua.os, ua.platform, info.time, 
                  info.utc_datetime, JSON.stringify(info.utc_date), JSON.stringify(info.utc_time), info.utc_user_date, info.utc_user_time];
    db.run(sql, exp_data, err => {
        if (err) {
            console.log(err)
            res.sendStatus(500);
        } else {
            res.sendStatus(200);
        }})
    });


// PASSPORT CONFIGURATION
app.use(require("express-session")({
    secret: "Welcome to Anthrope.",  // USED TO DECODE INFO IN THE SESSION, STILL TRYING TO FIGURE IT OUT
    resave: false, 
    saveUninitialized: false
}));

app.use(passport.initialize()); // SET UP PASSPORT
app.use(passport.session());    // SET UP PASSPORT
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser()); // USED TO READING DATA FROM THE SESSION, WHAT DATA OF THE USER SHOULD BE STORED IN THE SESSION?
passport.deserializeUser(User.deserializeUser()); // USED TO DECODE THE DATA FROM THE SESSION

app.use(function(req, res, next){
    res.locals.currentUser = req.user;
    next();
});

// // TELL EXPRESS TO USE THE FOLLOWING LIBRARIES/FILES
app.use(favicon(__dirname + '/public/assets/img/favicon.ico')); // to show favicon
app.use('/tasks', express.static(__dirname + "/tasks"));
app.use('/surveys', express.static(__dirname + "/surveys"));
app.use('/studies', express.static(__dirname + "/studies"));
app.use('/jspsych', express.static(__dirname + "/jspsych"));
app.use('/libraries', express.static(__dirname + "/libraries"));
app.use('/public', express.static(__dirname + "/public"));

app.use(indexRoutes);
//app.use(datalibraryRoutes);
app.use(showRoutes);
app.use(vizRoutes);
app.use(downloadsRoutes);
app.use(deleteRoutes);
app.use(authRoutes);

// Handle 404
app.use(function (req, res) {
    helper.cssFix(req, res, "404", 404)
});

// Handle 500
app.use(function (error, req, res, next) {
    helper.cssFix(req, res, "500", 500)
});

// START SERVER
app.listen(process.env.PORT || 8080); // process.env.PORT is undefined by default
console.log("Server started on port 8080");