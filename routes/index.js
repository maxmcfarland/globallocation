var express = require('express');
var request = require('request');
var router = express.Router();

// Try to get the running region
/*
//-----------------------------------
//       This is for local
//-----------------------------------
var gcloud = require('google-cloud');

var resource = gcloud.resource({
  projectId: 'svcp-simplelocation',
  keyFilename: './svcp-simplelocation-5aabb7346046.json'
});

var project = resource.project('svcp-simplelocation');
console.log("project from GCloud: %j", project);

var metadata;
var apiResponse;
project.getMetadata().then(function(data) {
  metadata = data[0];
  apiResponse = data[1];
});

console.log("apiResponse from GCloud: %j", apiResponse);
console.log("Metadata from GCloud: %j", metadata);

*/


/*
// This is for on GCloud
var gcloud = require('google-cloud');
var resource = gcloud.resource();
var project = resource.project('svcp-simplelocation');
var projectMetadata;

project.getMetadata(function(err, metadata, apiResponse) {
  projectMetadata = metadata;
});

var vmMetadata;

var gce = gcloud.compute();
gce.getVMsStream()
  .on('error', console.error)
  .on('data', function(vm) {
    vm.getMetadata(function(err, metadata, apiResponse) {
      vmMetadata = metadata;
    });
  })
  .on('end', function() {
    // All vms retrieved.
  });
*/
// -----------------------------------------------------------------------
//                    Getting instance metadata
//
//   https://cloud.google.com/compute/docs/storing-retrieving-metadata
//------------------------------------------------------------------------
var zoneData = "Zone Unknown"

var options = {
  url: 'http://metadata/computeMetadata/v1/instance/zone?alt=text',
  headers: {
    'Metadata-Flavor': 'Google'
  }
};

var inUSWest = false;
var inUSEast = false;
var inEurope = false;
var inChina = false;
var inJapan = false;

function callback(error, response, body) {
  if (!error && response.statusCode == 200) {
    var n = body.lastIndexOf('/');
    zoneData = body.substring(n + 1);
    if (zoneData.indexOf('us-west') > -1) {
      inUSWest = true;
    }
    else if (zoneData.indexOf('us-east') > -1) {
      inUSEast = true;
    }
    else if (zoneData.indexOf('asia-east') > -1) {
      inChina = true;
    }
    else if (zoneData.indexOf('asia-northeast') > -1) {
      inJapan = true;
    }
    else if (zoneData.indexOf('europe-west') > -1) {
      inEurope = true;
    }
  }
}

request(options, callback);
//inUSWest = false;
//inUSEast = false;
//inEurope = false;
//inChina = false;
//inJapan = false;

/* GET home page. */
router.get('/', function(req, res, next) {
  if (inJapan) {
    res.render('japan-index', { params: { title: 'Home Page', location: zoneData}});
  }
  else if (inChina) {
    res.render('china-index', { params: { title: 'Home Page', location: zoneData}});
  }
  else if (inEurope) {
    res.render('euro-index', { params: { title: 'Home Page', location: zoneData}});
  }
  else if (inUSEast) {
    res.render('us-east-index', { params: { title: 'Home Page', location: zoneData}});
  }
  else if (inUSWest) {
    res.render('us-west-index', { params: { title: 'Home Page', location: zoneData}});
  }
  else {
    res.render('unknown-index', { params: { title: 'Home Page', location: zoneData}});
  }
});

/* Status */
router.get('/status', function(req, res) {
  if (inJapan) {
    res.render('japan-status', { params: {title: 'Status Page', status: "I love the cherry blossoms in springtime."}});
  }
  else if (inChina) {
    res.render('china-status', { params: {title: 'Status Page', status: "Sitting down to a nice cup of TEA"}});
  }
  else if (inEurope) {
    res.render('euro-status', { params: {title: 'Status Page', status: "Sipping a glass of wine ... gazing at the Eiffle Tower!"}});
  }
  else if (inUSEast) {
    res.render('us-east-status', { params: {title: 'Status Page', status: "Just about to head out to see HAMILTON - should be great!"}});
  }
  else if (inUSWest) {
    res.render('us-west-status', { params: {title: 'Status Page', status: "Chillin at the beach.... wait - was that an EARTHQUAKE!??"}});
  }
  else {
    res.render('unknown-status', { params: {title: 'Status Page', status: "I have no idea where I am!  Zoinks!!"}});
  }
});

module.exports = router;
