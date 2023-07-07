const express = require("express");
const app = express();
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

app.use(express.json());

const dbPath = path.join(__dirname, "twitterClone.db");
let db = null;
const initializeDbAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, async () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error:${message.e}`);
    process.exit(1);
  }
};
initializeDbAndServer();

//api 1
app.post("/register/", async (request, response) => {
  const { username, password, name, gender } = request.body;
  const checkUser = `select username from user where username='${username}';`;
  const dbUser = await db.get(checkUser);
  console.log(dbUser);
  if (dbUser !== undefined) {
    response.status(400);
    response.send("User already exists");
  } else {
    if (password.length < 6) {
      response.status(400);
      response.send("Password is too short");
    } else {
      const hashedPassword = await bcrypt.hash(password, 10);
      const requestQuery = `insert into user(name,gender,username,password)
            values('${name}','${gender}','${username}','${hashedPassword}');`;
      await db.run(requestQuery);
      response.status(200);
      response.send("User created successfully");
    }
  }
});

//api 2

app.post("/login/", async (request, response) => {
  const { username, password } = request.body;
  const checkUser = `select * from user where username='${username}';`;
  const dbUser = await db.get(checkUser);
  if (dbUser !== undefined) {
    const checkPassword = await bcrypt.compare(password, dbUser.password);
    if (checkPassword === true) {
      const payload = { username: username };
      const jwtToken = jwt.sign(payload, "THE_KEY");
      response.send({ jwtToken });
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  } else {
    response.status(400);
    response.send("Invalid user");
  }
});

//authenticate Token
const authenticateToken = (request, response, next) => {
  let jwtToken;
  const authHeader = request.headers["authorization"];
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
  }
  if (jwtToken === undefined) {
    response.status(401);
    response.send("Invalid JWT Token");
  } else {
    jwt.verify(jwtToken, "THE_KEY", async (error, payload) => {
      if (error) {
        response.status(401);
        response.send("Invalid JWT Token");
      } else {
        request.username = payload.username;
        next();
      }
    });
  }
};

//api 3

app.get("/user/tweets/feed/", authenticateToken, async (request, response) => {
  let { username } = request;
  const getUserIdQuery = `select user_id from user where username='${username}';`;
  const getUserId = await db.get(getUserIdQuery);
  //console.log(getUserId);
  //get followers ids from user id//
  const getFollowerIdsQuery = `select following_user_id from follower 
    where follower_user_id=${getUserId.user_id};`;
  const getFollowersIds = await db.all(getFollowerIdsQuery);
  //console.log(getFollowerIds);
  //get follower ids array
  const getFollowerIdsArray = getFollowersIds.map((eachUser) => {
    return eachUser.following_user_id;
  });
  //console.log(getUserIds);
  //console.log(`${getUserIds}`);
  //query

  const getTweetQuery = `select user.username,tweet.tweet, tweet.date_time as dateTime
    from user inner join tweet 
    on user.user_id=tweet.user_id where user.user_id in (${getFollowerIdsArray})
    order by tweet.date_time  desc limit 4;`;

  const responseResult = await db.all(getTweetQuery);
  //console.log(responseResult);
  response.send(responseResult);
});

//api 4

app.get("/user/following/", authenticateToken, async (request, response) => {
  let { username } = request;
  const getUserIdQuery = `select user_id from user where username='${username}';`;
  const getUserId = await db.get(getUserIdQuery);
  //console.log(getUserId);
  //get followers ids from user id//
  const getFollowerIdsQuery = `select following_user_id from follower 
    where follower_user_id=${getUserId.user_id};`;
  const getFollowersIdsArray = await db.all(getFollowerIdsQuery);
  //console.log(getFollowerIdsArray);
  //get follower ids array
  const getFollowerIds = getFollowersIdsArray.map((eachUser) => {
    return eachUser.following_user_id;
  });
  //console.log(`${getFollowerIds}`);
  const getFollowersResultQuery = `select name from user where user_id in (${getFollowerIds});`;
  const responseResult = await db.all(getFollowersResultQuery);
  //console.log(responseResult);
  response.send(responseResult);
});

//api 5
app.get("/user/followers/", authenticateToken, async (request, response) => {
  let { username } = request;
  const getUserIdQuery = `select user_id from user where username='${username}';`;
  const getUserId = await db.get(getUserIdQuery);
  //console.log(getUserId);
  //get followers ids from user id//
  const getFollowerIdsQuery = `select follower_user_id from follower 
    where following_user_id=${getUserId.user_id};`;
  const getFollowersIdsArray = await db.all(getFollowerIdsQuery);
  console.log(getFollowersIdsArray);
  //get follower ids array
  const getFollowerIds = getFollowersIdsArray.map((eachUser) => {
    return eachUser.follower_user_id;
  });
  console.log(`${getFollowerIds}`);
  const getFollowersNameQuery = `select name from user where user_id in (${getFollowerIds});`;
  const getFollowersName = await db.all(getFollowersNameQuery);
  //console.log(responseResult);
  response.send(getFollowersName);
});

//api 6

const api6OutPut = (tweetData, likesCount, replyCount) => {
  return {
    tweet: tweetData.tweet,
    likes: likesCount.likes,
    replies: replyCount.replies,
    dateTime: tweetData.date_time,
  };
};
app.get("/tweets/:tweetId/", authenticateToken, async (request, response) => {
  const { tweetId } = request.params;
  //console.log(tweetId);
  let { username } = request;
  const getUserIdQuery = `select user_id from user where username='${username}';`;
  const getUserId = await db.get(getUserIdQuery);
  //console.log(getUserId);
  //get followers ids from user id//
  const getFollowingIdsQuery = `select following_user_id from follower 
    where follower_user_id=${getUserId.user_id};`;
  const getFollowingIdsArray = await db.all(getFollowingIdsQuery);
  //console.log(getFollowingIdsArray);
  //get follower ids array
  const getFollowingIds = getFollowingIdsArray.map((eachUser) => {
    return eachUser.following_user_id;
  });
  //console.log(`${getFollowingIds}`);
  //get the tweets made by the users he is following
  const getTweetIdsQuery = `select tweet_id from tweet where user_id on (${getFollowingIds});`;
  const getTweetsIdsArray = await db.all(getFollowingIdsQuery);
  const followingTweetIds = getTweetsIdsArray.map((eachId) => {
    return eachId.tweet_Id;
  });
  //console.log(followingTweetIds);
  //console.log(followingTweetIds.includes(parseInt(tweetIds)));
  if (followingTweetIds.includes(parseInt(tweetId))) {
    const likes_count_query = `select count(user_id) as likes from like where  tweet_id=${tweetId};`;
    const likes_count = await db.get(likes_count_query);
    //console.log(likes_count);
    const reply_count_query = `select count(user_id) as replies from reply where  tweet_id=${tweetId};`;
    const reply_count = await db.get(reply_count_query);
    //console.log(reply_count);
    const tweet_tweetDateQuery = `select  tweet, date_time  from tweet where tweet_id=${tweetId};`;
    const tweet_tweetDate = await db.get(tweet_tweetDateQuery);
    //console.log(tweet_tweetDate);
    response.send(api6OutPut(tweet_tweetData, likes_count, reply_count));
  } else {
    response.status(401);
    response.send("Invalid Request");
    console.log("Invalid Request");
  }
});

//api7
const convertLikedUserNameDBObjectToResponseObject = (dbObject) => {
  return {
    likes: dbObject,
  };
};
app.get(
  "/tweets/:tweetId/likes/",
  authenticateToken,
  async (request, response) => {
    const { tweetId } = request.params;
    //console.log(tweetId);
    let { username } = request;
    const getUserIdQuery = `select user_id from user where username='${username}';`;
    const getUserId = await db.get(getUserIdQuery);
    //console.log(getUserId);
    //get followers ids from user id//
    const getFollowingIdsQuery = `select following_user_id from follower 
    where follower_user_id=${getUserId.user_id};`;
    const getFollowingIdsArray = await db.all(getFollowingIdsQuery);
    //console.log(getFollowingIdsArray);
    //get follower ids array
    const getFollowingIds = getFollowingIdsArray.map((eachUser) => {
      return eachUser.following_user_id;
    });
    //console.log(`${getFollowingIds}`);
    //get the tweets made by the users he is following
    const getTweetIdsQuery = `select tweet_id from tweet where user_id on (${getFollowingIds});`;
    const getTweetsIdsArray = await db.all(getFollowingIdsQuery);
    const getTweetIds = getTweetsIdsArray.map((eachTweet) => {
      return eachTweet.tweet_Id;
    });
    //console.log(getTweetIds);
    //console.log(getTweetIds.includes(parseInt(tweetId)));
    if (getTweetIds.includes(parseInt(tweetId))) {
      const getLikedUsersNameQuery = `select user.username as likes from user inner join like
        on user.user_id =like.user_id where like.tweet_id=${tweetId};`;
      const getLikedUsersNameArray = await db.all(getLikedUsersNameQuery);
      //console.log(getLikedUsersNameArray);
      const getLikedUserNames = getLikedUsersNameArray.map((eachUser) => {
        return eachUser.likes;
      });
      //console.log(getLikedUserNames);
      response.send(
        convertLikedUserNameDBObjectToResponseObject(getLikedUserNames)
      );
    } else {
      response.status(401);
      response.send("Invalid Request");
    }
  }
);

//api 8
const convertUserNameReplyedDBObjectToResponseObject = (dbObject) => {
  return {
    replies: dbObject,
  };
};

app.get(
  "/tweets/:tweetId/replies/",
  authenticateToken,
  async (request, response) => {
    const { tweetId } = request.params;
    //console.log(tweetId);
    let { username } = request;
    const getUserIdQuery = `select user_id from user where username='${username}';`;
    const getUserId = await db.get(getUserIdQuery);
    //console.log(getUserId);
    //get followers ids from user id//
    const getFollowingIdsQuery = `select following_user_id from follower 
    where follower_user_id=${getUserId.user_id};`;
    const getFollowingIdsArray = await db.all(getFollowingIdsQuery);
    //console.log(getFollowingIdsArray);
    //get follower ids array
    const getFollowingIds = getFollowingIdsArray.map((eachUser) => {
      return eachUser.following_user_id;
    });
    console.log(getFollowingIds);
    //get the tweets made by the users he is following
    const getTweetIdsQuery = `select tweet_id from tweet where user_id on (${getFollowingIds});`;
    const getTweetsIdsArray = await db.all(getTweetIdsQuery);
    const getTweetIds = getTweetsIdsArray.map((eachId) => {
      return eachId.tweet_Id;
    });
    console.log(getTweetIds);
    //console.log(getTweetIds.includes(parseInt(tweetId)));
    if (getTweetIds.includes(parseInt(tweetId))) {
      const getUserNameReplyTweetsQuery = `select user.name,reply.reply from user
         inner join reply on user.tweet_id= reply.tweet_id where reply.tweet_id=${tweetId};`;
      const getUserNameReplyTweets = await db.all(getUserNameReplyTweetsQuery);
      response.send(
        convertUserNameReplyedDBObjectToResponseObject(getUserNameReplyTweets)
      );
    } else {
      response.status(401);
      response.send("Invalid Request");
    }
  }
);
//api 9
app.get("/user/tweets/", authenticateToken, async (request, response) => {
  let { username } = request;
  const getUserIdQuery = `select user_id from user where username=${username};`;
  const getUserId = await db.get(getUserIdQuery);
  console.log(getUserId);

  //get the tweets made by the users
  const getTweetIdsQuery = `select tweet_id from tweet where user_id = ${getUserId.userId};`;
  const getTweetsIdsArray = await db.all(getTweetIdsQuery);
  const getTweetIds = getTweetsIdsArray.map((eachId) => {
    return parseInt(eachId.tweet_Id);
  });
  console.log(getTweetIds);
});
//api 10
app.post("/user/tweets/", authenticateToken, async (request, response) => {
  let { username } = request;
  const getUserIdQuery = `select user_id from user where username=${username};`;
  const getUserId = await db.get(getUserIdQuery);
  console.log(getUserId);
  //console.log(getUserId.user_id);
  const { tweet } = request.body;
  //console.log(tweet);
  //const currentDate=format(new Date(),"yyyy-MM-dd HH-mm-ss";
  const currentDate = new Date();
  console.log(currentDate.toISOString().replace("T", " "));

  const postRequestQuery = `insert into tweet(tweet,user_id,date_time) 
    values('${tweet}',${getUserId.user_id},${dateTime});`;
  const responseResult = await db.run(postRequestQuery);
  const tweet_id = responseResult.lastId;
  response.send("Created a Tweet");
});
//api 11

app.delete(
  "/tweets/:tweetId/",
  authenticateToken,
  async (request, response) => {
    const { tweetId } = request.params;
    //console.log(tweetId);
    let { username } = request;
    const getUserIdQuery = `select user_id from user where username=${username};`;
    const getUserId = await db.get(getUserIdQuery);
    //console.log(getUserId);

    //get the tweets made by the users
    const getUserTweetsListQuery = `select tweet_id from tweet where user_id = ${getUserId.userId};`;
    const getUserTweetsListArray = await db.all(getUserTweetsListQuery);
    const getUserTweetsList = getUserTweetsListArray.map((eachId) => {
      return parseInt(eachId.tweet_Id);
    });
    console.log(getUserTweetsList);
    if (getUserTweetsList.includes(parseInt(tweetId))) {
      const deleteTweetQuery = `delete from tweet where tweet_id =${tweetId};`;
      await db.run(deleteTweetQuery);
      response.send("Tweet Removed");
    } else {
      response.status(401);
      response.send("Invalid Request");
    }
  }
);
module.exports = app;
