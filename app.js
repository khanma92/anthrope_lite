// LOAD MODULES 
var express = require("express"),
    sqlite = require('sqlite3').verbose(),
    app = express(),
    bodyParser = require('body-parser'),
    path = require('path'),
    useragent = require('express-useragent'),
    helper = require('./helpers'),
    geoip = require("geoip-lite")

// limit parameter required to send larger json files
// https://stackoverflow.com/questions/19917401/error-request-entity-too-large
app.use(bodyParser.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({limit: '50mb', extended: true}));
app.use(express.json());
app.use(useragent.express());
app.use('/jspsych', express.static(__dirname + "/jspsych"));
app.use('/delaydiscount', express.static(__dirname + "/delaydiscount"));
app.use('/flanker', express.static(__dirname + "/flanker"));
app.use('/letternumber', express.static(__dirname + "/letternumber"));
app.use('/nback', express.static(__dirname + "/nback"));
app.use('/stroop', express.static(__dirname + "/stroop"));
app.use('/symbolcount', express.static(__dirname + "/symbolcount"));
app.use('/updatemath', express.static(__dirname + "/updatemath"));
app.use('/updatemath2', express.static(__dirname + "/updatemath2"));
app.use('/bigfiveaspect', express.static(__dirname + "/bigfiveaspect"));
app.use('/brs1', express.static(__dirname + "/brs1"));
app.use('/crt', express.static(__dirname + "/crt"));
app.use('/gritshort', express.static(__dirname + "/gritshort"));
app.use('/schulzvalues2019', express.static(__dirname + "/schulzvalues2019"));
app.use('/zzz/brs2', express.static(__dirname + "/zzz/brs2"));






// DB CONNECTION + CONFIGURATION 

// CONNECTION TO SQLITE DATALIBRARY DB
const db_name = path.join(__dirname, "models", "data_lib.db");
const db = new sqlite.Database(db_name, err => {
  if (err) {
    return console.error(err.message);
  }
  console.log("Successful connection to the database 'data_lib.db'");
});

// CREATING DATALIBRARY TABLE
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




// ROUTES 

app.get('/:uniquestudyid', function (req, res) {
    console.log(req.params.uniquestudyid)
    res.sendFile(path.join(__dirname, '/' + req.params.uniquestudyid + '/' + 'task.html'))
    });


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

// DOWNLOAD ROUTES 

app.get('/d1', function (req, res) {
    // Download the most recent document (regardless of task)
    const sql = "SELECT * FROM DataLibrary ORDER BY row_id DESC LIMIT 1";
    db.run(sql).then(doc => {
            if (doc == null) {
                console.log("No data found.")
            } else {
                const filename = doc.type + "_" + doc.uniquestudyid + "_" + doc.subject + '.csv';
                var datastring = helper.json2csv(doc.data);
                res.attachment(filename);
                res.status(200).send(datastring);
            }
        })
        .catch(err => {
            console.log(err);
            res.status(200).send(err);
        });

});

// START SERVER
app.listen(process.env.PORT || 8080); // process.env.PORT is undefined by default
console.log("Server started on port 8080");