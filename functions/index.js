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
main.use(cors({ origin: false }));
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

//START TASTY API INFO -- CLIENT
app.get("/tags", async (req, res) => {
  res.header("Content-Type", "application/json");
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With"
  );
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
  res.header("Content-Type", "application/json");
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With"
  );
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

app.get("/recipe_detail/", (req, res) => {
  res.header("Content-Type", "application/json");
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With"
  );
  var req = unirest("GET", "https://tasty.p.rapidapi.com/recipes/detail");
  req.query({
    id: req.id,
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
//END TASTY API INFO -- CLIENT

//START CHATBOT INTERACTION -- GENERAL

app.post("/chatbot/test", (req, res) => {
  res.header("Content-Type", "application/json");
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With"
  );
  //Handling the response of witAI
  const message = req.body.message;
  const idChat = req.body.idChat;
  const docRef = db.collection("chats").doc(idChat).collection("messages");

  console.log(message);
  client
    .message(message)
    .then(async (data) => {
      const intent = (data.intents.length > 0 && data.intents[0]) || "__foo__";

      let unknow_ans = {
        idChat: idChat,
        uid: "X4TkYxTgloQlFjgPKO6ciKSUeL63",
        message: "Oh no!, I'm not ready to help you with that, yet....",
        type: "withImage",
        img_url:
          "https://firebasestorage.googleapis.com/v0/b/fibonacci-chatbot.appspot.com/o/LEO%20CHEFSITO-05.png?alt=media&token=deb997cf-64fb-4d3e-90ce-b22dc18a1e29",
      };

      let greatting = {
        idChat: idChat,
        uid: "X4TkYxTgloQlFjgPKO6ciKSUeL63",
        message: "Hey, hello!!! my name is Leo :v",
        type: "withImage",
        img_url:
          "https://firebasestorage.googleapis.com/v0/b/fibonacci-chatbot.appspot.com/o/LEO%20CHEFSITO-05.png?alt=media&token=deb997cf-64fb-4d3e-90ce-b22dc18a1e29",
      };

      let insult = {
        idChat: idChat,
        uid: "X4TkYxTgloQlFjgPKO6ciKSUeL63",
        message: "What? Fuck off .l.",
        type: "withImage",
        img_url:
          "https://firebasestorage.googleapis.com/v0/b/fibonacci-chatbot.appspot.com/o/LEO%20CHEFSITO-09.png?alt=media&token=0fbc83db-d14c-4cdc-9988-7ae29559c7a6",
      };

      let ans = "";
      switch (intent.name) {
        case "handleGreetings":
          try {
            await docRef.add(greatting);
            return res.status(200).send(greatting);
          } catch (error) {
            console.log(error);
            return res.status(500).send(error);
          }
        case "handleInsults":
          try {
            await docRef.add(insult);
            return res.status(200).send(insult);
          } catch (error) {
            console.log(error);
            return res.status(500).send(error);
          }
      }

      try {
        await docRef.add(unknow_ans);
        return res.status(200).send(unknow_ans);
      } catch (error) {
        console.log(error);
        return res.status(500).send(error);
      }
    })
    .catch((error) => res.status(400).send(error));
});

//Greetings
app.post("/chatbot/general", (req, res) => {
  res.header("Content-Type", "application/json");
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With"
  );
  //Handling the response of witAI
  const message = req.body.message;
  const idChat = req.body.idChat;
  const docRef = db.collection("chats").doc(idChat).collection("messages");

  console.log("DATA_RECIVED", req.body);
  client
    .message(message)
    .then(async (data) => {
      try {
        console.log("DATA_WIT_AI", data);
        const intent =
          (data.intents.length > 0 && data.intents[0]) || "__foo__";

        let ans = "";
        switch (intent.name) {
          case "handleGreetings":
            ans = await handleGreeting(idChat);
            await docRef.add(ans);
            return res.status(200).send(ans);

          case "handleInsults":
            ans = await handleInsults(idChat);
            await docRef.add(ans);
            return res.status(200).send(ans);
        }

        ans = formateResponse(idChat, "Sorry bruh :v", 0, -1, false);
        await docRef.add(ans);
        return res.status(200).send(ans);
      } catch (error) {
        console.log(error);
        return res.status(500).send(error);
      }
    })
    .catch((error) => res.status(400).send(error));
});
/*
formateResponse(idchat:number, message:string, anstype:number, ansimg:number, card:boolean)

Code of types
    0-> text
    1-> withImage
    2-> withVideo
    3-> withCard

Code of images
    0-> :O Suprised
    1-> :( Sad
    2-> :') Excited
    3-> :) Teaching
    4-> >:C Furious

    
   
*/
async function handleGreeting(id) {
  let = p_ans = ["Hello There!", "Hi, my name s leo"];
  const respo = formateResponse(
    id,
    p_ans[Math.floor(Math.random() * p_ans.length)],
    0,
    -1,
    false
  );
  return respo;
}

async function handleInsults(id) {
  let = p_ans = ["Hey don't insult me", "Insult Response 2"];
  const respo = formateResponse(
    id,
    p_ans[Math.floor(Math.random() * p_ans.length)],
    1,
    4,
    false
  );
  return respo;
}

function formateResponse(id, message, anstype, ansimg, card) {
  let type = "";
  let img = "";
  console.log(card);
  switch (anstype) {
    case 0:
      type = "text";
      break;
    case 1:
      type = "withImage";
      break;
    case 2:
      type = "withVideo";

      break;
    case 3:
      type = "withCard";
      break;
    default:
      type = "text";
      break;
  }

  /*
    Code of images
    0-> :O Suprised
    1-> :( Sad
    2-> :') Excited
    3-> :) Teaching
    4-> >:C Furious
  */

  switch (ansimg) {
    case 0:
      img =
        "https://firebasestorage.googleapis.com/v0/b/fibonacci-chatbot.appspot.com/o/LEO%20CHEFSITO-05.png?alt=media&token=deb997cf-64fb-4d3e-90ce-b22dc18a1e29";
      break;
    case 1:
      img =
        "https://firebasestorage.googleapis.com/v0/b/fibonacci-chatbot.appspot.com/o/LEO%20CHEFSITO-06.png?alt=media&token=49f2282c-5b02-4c30-a6e0-6fbd8020feec";
      break;
    case 2:
      img =
        "https://firebasestorage.googleapis.com/v0/b/fibonacci-chatbot.appspot.com/o/LEO%20CHEFSITO-07.png?alt=media&token=ddf1fa81-9e8a-4097-8eff-c7167255ee89";

      break;
    case 3:
      img =
        "https://firebasestorage.googleapis.com/v0/b/fibonacci-chatbot.appspot.com/o/LEO%20CHEFSITO-08.png?alt=media&token=c9ee24e3-7288-4451-9ba5-760d9f9dd3a4";
      break;
    case 4:
      img =
        "https://firebasestorage.googleapis.com/v0/b/fibonacci-chatbot.appspot.com/o/LEO%20CHEFSITO-09.png?alt=media&token=0fbc83db-d14c-4cdc-9988-7ae29559c7a6";
      break;
    default:
      img = "";
      break;
  }

  let data = {
    idChat: id,
    uid: "X4TkYxTgloQlFjgPKO6ciKSUeL63",
    message: message,
    type: type,
    img_url: img,
    cards: [],
  };

  return data;
}

//END CHATBOT INTERACTION -- GENERAL

// //Port
// app.set("port", 7777);
// const server = app.listen(app.get("port"), () => {
//   console.log(`Express running → PORT ${server.address().port}`);
// });
