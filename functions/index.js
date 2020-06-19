const functions = require("firebase-functions");
const admin = require("firebase-admin");
const express = require("express");
const bodyParser = require("body-parser");
const unirest = require("unirest");
const { Wit, log } = require("node-wit");
const interactive = require("node-wit").interactive;
const fetch = require("node-fetch");

const cors = require("cors");

admin.initializeApp();

const db = admin.firestore();

const app = express();
const main = express();

main.use("/api/v1", app);
main.use(cors({ origin: true }));
main.use(bodyParser.json());
main.use(bodyParser.urlencoded({ extended: true }));

const client = new Wit({
  accessToken: "6KZ2HERHOVERDBFQBVYIJHVZNKGQ3E4B",
  logger: new log.Logger(log.DEBUG), // optional
});
//TOKEN: 6KZ2HERHOVERDBFQBVYIJHVZNKGQ3E4B
// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
//
// exports.helloWorld = functions.https.onRequest((request, response) => {
//  response.send("Hello from Firebase!");
// });

exports.webApi = functions.https.onRequest(main);

//Testing
app.get("/test", (req, res) => {
  res.status(200).send("TESTING API");
});

//Setup TEST Wit.AI
app.post("/witai_test", (req, res) => {
  const message = req.body.message;
  console.log(message);
  client
    .message(message)
    .then(async (data) => {
      const intent = (data.intents.length > 0 && data.intents[0]) || "__foo__";

      let ans = "";
      switch (intent.name) {
        case "distanceBetween":
          ans = await handleDistanceBetween(data);
          console.log(ans);
          res.status(200).send(ans);
          break;
        case "timeAtPlace":
          ans = await handleTimeAtPlace(data);
          console.log(ans);
          res.status(200).send(ans);
          break;
      }

      res.status(202).send("Sorry Bruh, I don't know what to answer you :'v");
    })
    .catch((error) => res.status(400).send(error));
});

function handleGibberish() {
  return res
    .status(202)
    .send("Sorry Bruh, I don't know what to answer you :'v");
}

// ----------------------------------------------------------------------------
// handleDistanceBetween

function handleDistanceBetween(data) {
  const location = data.entities["wit$location:location"];
  if (location == null || location.length != 2) {
    return handleGibberish();
  }

  var loc0 = location[0].resolved.values[0];
  var loc1 = location[1].resolved.values[0];
  var distance = getDistanceFromLatLonInKm(
    loc0.coords.lat,
    loc0.coords.long,
    loc1.coords.lat,
    loc1.coords.long
  );
  distance = roundTo(distance, 0.01);
  return Promise.resolve(
    `It's ${distance}km from ${loc0.name} to ${loc1.name}`
  );
}

//https://stackoverflow.com/questions/27928/calculate-distance-between-two-latitude-longitude-points-haversine-formula
function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
  var R = 6371; // Radius of the earth in km
  var dLat = deg2rad(lat2 - lat1); // deg2rad below
  var dLon = deg2rad(lon2 - lon1);
  var a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) *
      Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  var d = R * c; // Distance in km
  return d;
}

function deg2rad(deg) {
  return deg * (Math.PI / 180);
}

function roundTo(val, round) {
  return Math.floor(val / round) * round;
}

// ----------------------------------------------------------------------------
// handleTimeAtPlace

function handleTimeAtPlace(data) {
  const loc =
    data.entities["wit$location:location"] &&
    data.entities["wit$location:location"][0];
  if (loc == null) {
    return handleGibberish();
  }

  const tz = loc.resolved.values[0].timezone;
  const placeName = loc.resolved.values[0].name;

  return currentTimeFromTimezone(tz).then((res) => {
    return `It's currently ${res} in ${placeName}`;
  });
}

function currentTimeFromTimezone(loc) {
  const url = "http://worldtimeapi.org/api/timezone/" + loc;

  return fetch(url, {})
    .then((res) => res.json())
    .then((data) => {
      //trim off the timezone to avoid date auto-adjusting
      const time = data.datetime.substring(0, 19);
      return new Date(time).toUTCString("en-US").substring(0, 22);
    });
}
//Ending Test API

//Testing
app.get("/tags", async (req, res) => {
  var req = unirest("GET", "https://tasty.p.rapidapi.com/tags/list");

  req.headers({
    "x-rapidapi-host": "tasty.p.rapidapi.com",
    "x-rapidapi-key": "7S8ICzgRMKmshVbNIIQGTmB01k5ep1sNi4gjsnZ0Ylj5qJQNjv",
    useQueryString: true,
  });

  req.end(function (result) {
    if (!result.error) {
      res.status(200).send(result.body);
    } else {
      res.status(400).send(result.error);
    }
  });
});

app.get("/recipes", async (req, res) => {
  var req = unirest("GET", "https://tasty.p.rapidapi.com/recipes/list");

  req.query({
    from: "0",
    sizes: "20",
  });

  req.headers({
    "x-rapidapi-host": "tasty.p.rapidapi.com",
    "x-rapidapi-key": "7S8ICzgRMKmshVbNIIQGTmB01k5ep1sNi4gjsnZ0Ylj5qJQNjv",
    useQueryString: true,
  });

  req.end(function (result) {
    if (!result.error) {
      res.status(200).send(result.body);
    } else {
      res.status(400).send(result.error);
    }
  });
});

//Port
app.set("port", 7777);
const server = app.listen(app.get("port"), () => {
  console.log(`Express running → PORT ${server.address().port}`);
});
