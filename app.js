const express = require("express");
const app = express();
const path = require("path");
const sqlite3 = require("sqlite3");
const { open } = require("sqlite");
const dbPath = path.join(__dirname, "twitterClone.db");
const uuidv4 = require("uuid");
let db = null;
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const installAndUse = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
  } catch (e) {
    console.log("error");
  }
};
installAndUse();

app.use(express.json());
//API1
app.post("/register/", async (request, response) => {
  const { name, username, password, gender } = request.body;
  const api1 = `select * from user where username="${username}"`;
  const result1 = await db.get(api1);
  if (result1 === undefined) {
    if (password.length < 6) {
      response.status(400);
      response.send("Password is To short");
    } else {
      const convertPassword = await bcrypt.hash(password, 10);
      const api1Inside = `insert into user
      values (null,"${name}","${username}","${convertPassword}","${gender}")`;
      const result1Inside = await db.get(api1Inside);
      response.status(200);
      response.send("User created successfully");
    }
  } else {
    response.status(400);
    response.send("User already exists");
  }
});

// api2
app.post("/login/", async (request, response) => {
  const { username, password } = request.body;
  const api2 = `select * from user where username="${username}"`;
  const result2 = await db.get(api2);
  if (result2 === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const verifyPassword = await bcrypt.compare(password, result2.password);
    // console.log(verifyPassword);
    if (verifyPassword === true) {
      const playLoad = {
        username: username,
      };
      const jwt_token = jwt.sign(playLoad, "MY_SCR");
      response.send({ jwt_token });
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});

const convertApi2 = (each) => {
  return {
    name: each.name,
  };
};

const middleWare = (request, response, next) => {
  let jwtToken;
  const authHeader = request.headers["authorization"];
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
  }
  if (jwtToken === undefined) {
    response.status(401);
    response.send("Invalid JWT Token");
  } else {
    jwt.verify(jwtToken, "MY_SCR", async (error, payload) => {
      if (error) {
        response.status(401);
        response.send("Invalid JWT Token");
      } else {
        next();
      }
    });
  }
};
const convertApi6 = (eachItem) => {
  return {
    tweet: eachItem.tweet,
    likes: eachItem.likes,
    replies: eachItem.replies,
    dateTime: eachItem.date_time,
  };
};
//API3
/* const api3TweetFeed = (a) => {
  console.log(a);
  
  return {
    username: eachFeed.username,
    tweet: eachFeed.tweet,
    dateTime: eachFeed.date_time,
  };
}; */
app.get("/user/tweets/feed/", middleWare, async (request, response) => {
  const followingQ = `select following_user_id from follower where follower_user_id = 2`;
  const followingQResult = await db.all(followingQ);
  const retriveData = followingQResult.map((each) => {
    return each.following_user_id;
  });
  const api3 = `select user.username,tweet.tweet,tweet.date_time as dateTime from user join tweet on user.user_id=tweet.user_id  where user.user_id in (${retriveData}) order by tweet.date_time desc limit 4`;
  const result3 = await db.all(api3);
  console.log(result3);
  response.send(result3);
});

//API4
app.get("/user/following/", middleWare, async (request, response) => {
  let { username } = request.body;
  const getUserIdQuery1 = `select user_id from user where username='${username}';`;
  const getUserId1 = await db.get(getUserIdQuery1);
  // console.log(getUserId1);
  const getFollowerIdsQuery = `select following_user_id from follower 
    where follower_user_id=${getUserId1.user_id};`;
  const getFollowerIdsArray = await db.all(getFollowerIdsQuery);
  const getFollowerIds = getFollowerIdsArray.map((eachUser) => {
    return eachUser.following_user_id;
  });
  const getFollowersResultQuery = `select name from user where user_id in (${getFollowerIds});`;
  const responseResult = await db.all(getFollowersResultQuery);
  console.log(responseResult);
  response.send(responseResult);
});

//API5
app.get("/user/followers/", middleWare, async (request, response) => {
  let { username } = request.body;
  const getUserIdQuery2 = `select user_id from user where username='${username}';`;
  const getUserId2 = await db.get(getUserIdQuery2);
  // console.log(getUserId2);
  const getFollowerIdsQuery = `select follower_user_id from follower where following_user_id=${getUserId2.user_id};`;
  const getFollowerIdsArray = await db.all(getFollowerIdsQuery);
  console.log(getFollowerIdsArray);
  const getFollowerIds = getFollowerIdsArray.map((eachUser) => {
    return eachUser.follower_user_id;
  });

  const getFollowersNameQuery = `select name from user where user_id in (${getFollowerIds});`;
  const getFollowersName = await db.all(getFollowersNameQuery);
});

//API6
app.get("/tweet/:tweetId/", middleWare, async (request, response) => {
  const { tweetId } = request.params;
  const { username } = request.body;
  const getUser = `select user_id from user where username="${username}"`;
  const getUserResult = await db.get(getUser);
  const userFollowing = `select following_user_id from follower where follower_user_id=${getUserResult.user_id}`;
  const userFollowingResult = await db.all(userFollowing);
  console.log(userFollowingResult);
  const userEachFollowing = userFollowingResult.map((eachPerson) => {
    return eachPerson.following_user_id;
  });
  const tweetUser = `select tweet_id from tweet where user_id in (${userEachFollowing})`;
  const tweetResult = await db.all(tweetUser);
  console.log(tweetResult, "hi");
  const result = tweetResult.map((each) => {
    return each.tweet_id;
  });
  if (result.includes(parseInt(tweetId))) {
    const validUserTweet = `select tweet.tweet,count(like.user_id) as likes,
    count(reply.user_id) as replies,
    tweet.date_time from tweet join reply
     on tweet.tweet_id = reply.tweet_id join like on
     like.tweet_id = tweet.tweet_id where tweet.tweet_id="${tweetId}"`;
    const validResult = await db.all(validUserTweet);
    console.log(validResult);
    response.send(validResult.map((each) => convertApi6(each)));
  } else {
    response.status(401);
    response.send("Invalid Request");
  }
});

//API7
app.get("/tweet/:tweetId/likes/", middleWare, async (request, response) => {
  const { username } = request.body;
  const { tweetId } = request.params;
  const user_ids = `select user_id from user where username="${username}"`;
  const user_idResult = await db.get(user_ids);

  const user_following = `select following_user_id from follower where follower_user_id=${user_idResult.user_id}`;
  const following = await db.all(user_following);

  const resultFollower = following.map((each) => {
    return each.following_user_id;
  });

  const final = `select tweet_id from tweet where user_id in (${resultFollower})`;
  const finalResult = await db.all(final);
  const rr = finalResult.map((eachRe) => {
    return eachRe.tweet_id;
  });
  if (rr.includes(parseInt(tweetId))) {
    const query = `select user.name from like join user on like.user_id = user.user_id where tweet_id=${tweetId}`;
    const queryRe = await db.all(query);
    const resultResponse = queryRe.map((eachName) => {
      return eachName.name;
    });
    response.send(resultResponse);
  } else {
    response.send("Invalid Request");
  }
});
// API8
const tweetReplies = (obj) => {
  return {
    replies: obj,
  };
};
app.get("/tweet/:tweetId/replies", middleWare, async (request, response) => {
  const { username } = request.body;
  const { tweetId } = request.params;
  const user_ids2 = `select user_id from user where username="${username}"`;
  const user_idResult = await db.get(user_ids2);

  const user_following2 = `select following_user_id from follower where follower_user_id=${user_idResult.user_id}`;
  const following = await db.all(user_following2);

  const resultFollower2 = following.map((each) => {
    return each.following_user_id;
  });

  const final2 = `select tweet_id from tweet where user_id in (${resultFollower2})`;
  const finalResult = await db.all(final2);
  const rr2 = finalResult.map((eachRe2) => {
    return eachRe2.tweet_id;
  });
  if (rr2.includes(parseInt(tweetId))) {
    const query2 = `select user.name ,reply.reply from reply join user on reply.user_id =user.user_id where tweet_id=${tweetId}`;
    const queryRe2 = await db.all(query2);
    response.send(tweetReplies(queryRe2));
  } else {
    response.send("Invalid Request");
  }
});
//API10
const userTweets = (a) => {
  return {
    tweet: a,
  };
};

app.get("/user/tweet", middleWare, async (request, response) => {
  const { username } = request.body;
  const user_ids3 = `select user_id from user where username="${username}"`;
  const user_idResult3 = await db.get(user_ids3);

  const userTweet = `select tweet from tweet where user_id=${user_idResult3.user_id}`;
  const userTweetResult = await db.all(userTweet);
  response.send(userTweets(userTweetResult));
});

//API11
app.post("/user/tweet/", middleWare, async (request, response) => {
  const { tweet } = request.body;
  console.log(tweet);
  const dateTime = new Date();
  console.log(dateTime);
  const userTweetPost = `insert into tweet(user_id,tweet,user_id,date_time) values("${null}","${tweet}","${null}","${dateTime}")`;
  const userTweetPostResult = await db.run(userTweetPost);
  response.send("Created a Tweet");
});

module.exports = app;

// api4
/* app.get("/user/following/", middleWare, async (request, response) => {
  // const api4 = `select user.name from follower join user on follower.follower_user_id = user.user_id where follower_user_id = 2 group by user.name`;
  const kk = `select user.name from follower join user on follower.following_user_id = user.user_id where follower_user_id = 2`;
  const result4 = await db.all(kk);
  response.send(result4.map((each) => convertApi2(each)));
}); */

/* 
app.get("/user/follower/", middleWare, async (request, response) => {
  const follower = `select user.name from follower join user on follower.following_user_id = user.user_id where follower_user_id = 2`;
  const result5 = await db.all(follower);
  response.send(result5.map((each) => convertApi2(each)));
}); */

/* const userLike = `select count(user_id) from reply where user_id=${user_idResult3.user_id}`;
  const userLikeResult2 = await db.all(userLike);
  // response.send(userTweets(userLikeResult2));
  console.log(userLikeResult2);

  const userReply = `select count(user_id) from reply  where user_id=${user_idResult3.user_id}`;
  const userReplyResult = await db.all(userReply); */
/* 
  const userDate = `select date_time from like where user_id=${user_idResult3.user_id}`;
  const userDateResult3 = await db.get(userDate);
  //response.send(userTweets(userDateResult3)); */
