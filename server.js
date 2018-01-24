const net = require(`net`);
const colors = require(`colors`);
const clientList = [];
const usernames = [];
const userScores = [];
const commandList = {
  changeUsername: true,
  message: true,
  commandList: true,
  users: true,
  upVote: true,
  downVote: true
};
const server = net.createServer((client) => {
  let address = client.address().address;
  let port = client.address().port;
  console.log(`CONNECTED: ${address}:${port}`);
  client.setEncoding(`utf8`);
  clientList.push(client);
  usernames.push(``);
  client.messageTimes = [];
  userScores.push(0);
  client.write(menu);

  client.on(`data`, (data) => {
    if (!rateLimiter(client)) {
      return;
    }
    let command = data.startsWith(`@`) ? data.split(` `)[0].slice(1).trim() : false;
    if (usernames[clientList.indexOf(client)] === `` && !(command === `changeUsername` || command === `commandList`)) {
      client.write(`[ADMIN]: Error: Please set a user name using the '@changeUsername {username}' command before using chatroom.\n`);
      return;
    }
    if (command && !commandList.hasOwnProperty(command)) {
      client.write(`[ADMIN]: Error: Invalid command. Please try again.\n`);
      return;
    }
    switch (command) {
      case `changeUsername`:
        changeUsername(client, data, address, port);
        break;
      case `message`:
        sendMessage(client, data);
        break;
      case `commandList`:
        client.write(menu);
        break;
      case `users`:
        sendUserList(client);
        break;
      case `upVote`:
        upVoteUser(client, data);
        break;
      default:
        broadcastMessage(client, data, address, port);
    }
  });

  client.on(`end`, () => {
    disconnectedUser(client, address, port);
  });
});

server.listen(6969, `0.0.0.0`, () => {
  console.log(`Server listening on 0.0.0.0:6969`);
  console.log(`[@kick username to kick specific user. Example: @kick user1]`);
});

process.stdin.setEncoding(`utf8`);
process.stdin.on(`readable`, () => {
  const chunk = process.stdin.read();
  if (chunk !== null) {
    if (chunk.startsWith(`@kick:ip`)) {
      let ipAddress = chunk.split(` `)[1].trim();
      kickUserByIP(ipAddress);
    } else if (chunk.startsWith(`@kick`)) {
      let username = chunk.split(` `)[1].trim();
      kickUserByUsername(username);
    } else {
      clientList.forEach((curr) => {
        curr.write(`[ADMIN]: "${chunk}"`);
      });
    }
  }
});

const menu = `[ADMIN]: COMMAND LIST - 
  @changeUsername newUserName : Sets your username to newUserName
  @message recipientUsername message : Sends message to recipientUsername
  @users : View list of users in the chat
  @upVote user : Gives their user score a +1
  @downVote user : Gives their user score a -1 (users are kicked at -7)
  @commandList : View command list\n`;

function changeUsername(client, data, ipAddress, port) {
  let username = data.split(` `).slice(1).join(` `);
  username = username.slice(0, username.length - 1);
  let index = clientList.indexOf(client);
  if (username.toLowerCase().includes(`admin`)) {
    client.write(`[ADMIN]: Error: Not allowed to have 'admin' in username. Username was not changed\n`);
    return false;
  } else if (usernames.indexOf(username) !== -1) {
    client.write(`[ADMIN]: Error: That username already exists. Username was not changed.\n`);
    return false;
  } else {
    console.log(`SET ${ipAddress}:${port}(${usernames[index]}) TO ${username}`);
    usernames[index] = username;
    client.write(`[ADMIN]: Your username is now @${username}\n`);
    return true;
  }
}

function sendMessage(client, data) {
  let messageRecipient = data.split(` `)[1];
  let recipientIndex = usernames.indexOf(messageRecipient);
  let senderIndex = clientList.indexOf(client);
  let message = data.split(` `).slice(2).join(` `);
  if (recipientIndex === -1) {
    client.write(`[ADMIN]: Error: ${messageRecipient} was not found. Message was not sent.\n`);
    return false;
  } else {
    clientList[recipientIndex].write(`[ADMIN]: *MESSAGE FROM @${usernames[senderIndex]}: ${message}`);
    console.log(`DIRECT MESSAGE FROM ${usernames[senderIndex]} TO ${usernames[recipientIndex]}: ${message}`);
    return true;
  }
}

function sendUserList(client) {
  client.write(clientList.reduce((accum, curr, index) => {
    let address = curr.address().address;
    let port = curr.address().port;
    let username = usernames[index] === `` ? `*No username set*` : usernames[index];
    accum += `${address}:${port} - Username: ${username}\n`;
    return accum;
  }, ``));
  console.log(`SENT USER LIST TO '${usernames[clientList.indexOf(client)]}'`);
}

function broadcastMessage(client, data, address, port) {
  let username = usernames[clientList.indexOf(client)];
  console.log(`SERVER BROADCAST FROM ${address}:${port}(${username}) : ${data}`);
  clientList.forEach((curr) => {
    if (curr !== client) {
      curr.write(`[${username}]: "${data.trim()}"\n`);
    }
  });
}

function disconnectedUser(client, address, port) {
  let index = clientList.indexOf(client);
  let username = usernames[index];
  removeFromLists(index);
  console.log(`${address}:${port}(${username}) DISCONNECTED`);
}

function kickUserByUsername(username) {
  let index = usernames.indexOf(username);
  if (index === -1) {
    console.log(`Error: User:${username} was not found. Kick unsuccessful`);
    return false;
  } else {
    clientList[index].write(`[ADMIN]: CYA IDIOT!!!!!!!`);
    clientList[index].destroy();
    removeFromLists(index);
    console.log(`@${username} was kicked.`);
    return true;
  }
}

function kickUserByIP(ipAddress) {
  for (let i = 0; i < clientList.length; i++) {
    if (clientList[i].address().address === ipAddress) {
      clientList[i].write(`[ADMIN]: CYA IDIOT!!!!!!!`);
      clientList[i].destroy();
      removeFromLists(i);
      console.log(`IP:${ipAddress} was kicked.`);
      return true;
    }
  }
  console.log(`Error: IP:${ipAddress} was not found. Kick unsuccessful`);
  return false;
}

function rateLimiter(client) {
  let index = clientList.indexOf(client);
  let time = Date.now();
  if (client.messageTimes.length < 4) {
    client.messageTimes.push(time);
    return true;
  } else {
    if (time - client.messageTimes[0] < 1000) {
      kickUserByIP(clientList[index].address().address);
      return false;
    } else {
      client.messageTimes.shift();
      client.messageTimes.push(time);
      return true;
    }
  }
}

function upVoteUser(client, data) {
  let upVoterIndex = clientList.indexOf(client);
  let upVoter = usernames[upVoterIndex];
  let upVotee = data.split(` `).slice(1).join(` `).trim();
  let upVoteeIndex = usernames.indexOf(upVotee);
  if (upVoteeIndex > -1) {
    userScores[upVoteeIndex] ++;
    console.log(`@${upVotee}(Score: ${userScores[upVoteeIndex]}) HAS BEEN UP VOTED BY @${upVoter}`);
    client.write(`[ADMIN]: @${upVotee} has been up voted by you. They now have ${userScores[upVoteeIndex]}.\n`);
    return true;
  } else {
    client.write(`[ADMIN]: Error: ${upVotee} was not found. No up vote was given.\n`);
    return false;
  }
}

function removeFromLists(index) {
  clientList.splice(index, 1);
  usernames.splice(index, 1);
}


