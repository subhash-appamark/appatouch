/********************************************************************************************************************************************
---------------------------------------------------------------------------------------------------------------------------------------------
Company: Appamark Touch 
File: server.js
Description: 
NodeJS Starting Point Server.  
Hosts URL Service information.  
Appamark Touch products main landing file.
Web page/service configurations are done here. 
FYI -- appatouch is deployed to AWS Beanstalk and Heroku
---------------------------------------------------------------------------------------------------------------------------------------------

-------------Update Log----------------------------------------------------------------------------------------------------------------------
Version | When | Who | What :
----------------------------
1.0 | 11/26/2015 | SR | server.js file created
---------------------------------------------------------------------------------------------------------------------------------------------
********************************************************************************************************************************************/
/*-----INCLUDES OR REQUIRES-----*/
var express = require("express");
var bodyParser = require("body-parser");
var _= require("underscore");
var awsIot = require('aws-iot-device-sdk');

//local modules
var index_page = require('./com/views/index.js');
var undermaintenance_page = require('./com/views/undermaintenance.js');
var awsiot_service = require('./com/services/awsiot.js');
var db = require('./com/services/db.js');
var query = require('./com/tools/query.js');

/*-----DECLARATIONS-----*/
//Application Variables 
var app = express();
var PORT = process.env.PORT || 3000;

/*-----USES-----*/
//page level use declarations
app.use(bodyParser.json()); //body-parser 
app.use(express.static(__dirname + '/')); //Store all HTML files in view folder.
app.use(express.static(__dirname + '/views')); //Store all HTML files in view folder.
app.use(express.static(__dirname + '/awsCerts')); //AWS Certificates.

/**-----CONNECT TO AWS IOT-----**/
var device = awsIot.device({
	   keyPath: './awsCerts/thing-private-key.pem',
	  certPath: './awsCerts/cert.pem',
	    caPath: './awsCerts/rootCA.pem',
	  clientId: 'AppamarkTouch',
	    region: 'us-east-1'
	});

/*-----REQUESTS, RESPONSES AND FUNCTIONS-----*/
//ROOT - GET METHOD
app.get('/:serial', function (req, res) {
	
	//open index page, this page will collect the location details and call pindrop
	//res.send(index_page(req));
	/////res.render("touch.html");
	res.sendFile(__dirname + '/views/touch.html');
});


//LOCATION - GET METHOD FOR pindrop
app.get('/pindrop/:lat/:lng/:serial/:usrdt/:err', function (req, res) {
	//declare local variables
	var vTagAccess = {};
	
	//validate the requests to eliminate attacks

	
	//push the body request post variables into the Tag Access Array Object
	/*
		Type:
		1 = Only Location, Serial number and Date
		2 = Location, Serial number, Date and Like/Displike
		3 = Location, Serial number, Date, Social Net details and Social Net Type
	*/
	vTagAccess.Type = '1'
	vTagAccess.lat = req.params.lat;
	vTagAccess.lng = req.params.lng;
	vTagAccess.serial = req.params.serial;
	vTagAccess.usrdt = req.params.usrdt;
	vTagAccess.msg = req.params.err;

	//Asyncronized call to push Tag Access to AWS IOT
	var awsiotResponse = awsiot_service(device, vTagAccess);

	//asyncronized call to pull customer URL based on serial number
	var QueryString = query(vTagAccess, "Destination");

	db.query(QueryString, function(err, result) {
            if(err) {
                res.send("/undermaintenance/1000/" + err);
            }
            else {
            	if(result) {
            		if(result.rows.length > 0) {
            			res.send(result.rows[0].destination);
            		} else {
            			res.send("/undermaintenance/1001/No Records Found");
            		}
            	} else {
            		res.send("/undermaintenance/1002/No Result Returned");
            	}
                
            }
        });

	//response redirect to the customers URL
	
	
});

//LOCATION - GET METHOD FOR pindrop
app.get('/undermaintenance/:errorcode/:err', function (req, res) {
	//declare local variables
	var vErrorResponseHtml =  undermaintenance_page(req.params.errorcode, req.params.err)
	
	//response redirect to the customers URL
	res.send(vErrorResponseHtml);
	
});

app.get('/sqltest/:serialnumber', function(req,res) {

	 var QueryString = 	"SELECT Destination, DestinationType FROM TouchDestinationList " + 
						"WHERE ProductSerialAssociationID = ( " + 
						"SELECT " + 
						"	(CASE WHEN (SELECT COUNT(1) FROM ProductSerialAssociation WHERE StartSerialNumber <= '" + req.params.serialnumber + "' AND EndSerialNumber >= '" + req.params.serialnumber + "') > 0 THEN " + 
						"	  (SELECT ProductSerialAssociationID FROM ProductSerialAssociation WHERE StartSerialNumber <= '" + req.params.serialnumber + "' AND EndSerialNumber >= '" + req.params.serialnumber + "') " + 
						"	ELSE " + 
						"		1 " + 
						"	END))";


    db.query(QueryString, function(err, result) {
            //done();
            if(err) {
                console.error('error running query', err);
            }
           res.send(result.rows);
        });
   
});

app.listen(PORT, function () {
	console.log("AppaTouch Express server started on " + PORT + " !!!");
});
