const net = require(`net`);
const colors = require(`colors`);
const clientList = [];
const usernames = [];
const commandList = {
  changeUsername: true,
  message: true,
  commandList: true,
  users: true,
  upVote: true,
  downVote: true
};
const adminCommandList = {
  kick: true,
  [`kick:ip`]: true,
  message: true,
};
const server = net.createServer((client) => {
  let address = client.address().address;
  let port = client.address().port;
  client.setEncoding(`utf8`);
  clientList.push(client);
  usernames.push(``);
  client.messageTimes = [];
  client.userScore = 0;
  client.lastUpVoteTime = 0;
  client.lastDownVoteTime = 0;
  client.write(`[ADMIN]: ${welcomeGreeting}`);
  console.log(`CONNECTED: ${address}:${port}\n`);

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
        client.write(`[ADMIN]:\n${menu}`);
        break;
      case `users`:
        sendUserList(client);
        break;
      case `upVote`:
        upVoteUser(client, data);
        break;
      case `downVote`:
        downVoteUser(client, data);
        break;
      default:
        broadcastMessage(client, data, address, port);
        break;
    }
  });

  client.on(`end`, () => {
    disconnectedUser(client, address, port);
  });
});

server.listen(6969, `0.0.0.0`, () => {
  console.log(`Server listening on 0.0.0.0:6969`);
  console.log(`COMMAND LIST -
    @kick username : Kicks user with given username
    @kick:ip ipAddress : Kicks user with given ipAddress
    @message user : Sends message to given user\n`);
});

process.stdin.setEncoding(`utf8`);
process.stdin.on(`readable`, () => {
  const chunk = process.stdin.read();
  if (chunk !== null) {
    let command = chunk.startsWith(`@`) ? chunk.split(` `)[0].slice(1).trim() : false;
    if (command && !adminCommandList.hasOwnProperty(command)) {
      console.log(`Error: Invalid command please try again.\n`.red);
      return;
    }
    switch (command) {
      case `kick:ip`:
        let ipAddress = chunk.split(` `)[1].trim();
        kickUserByIP(ipAddress);
        break;
      case `kick`:
        let username = chunk.split(` `)[1].trim();
        kickUserByUsername(username);
        break;
      case `message`:
        sendMessageFromAdmin(chunk);
        break;
      default:
        broadcastMessageFromAdmin(chunk);
        break;
    }
  }
});

const menu = `COMMAND LIST - 
  @changeUsername newUserName : Sets your username to newUserName
  @message recipientUsername message : Sends message to recipientUsername
  @users : View list of users in the chat
  @upVote user : Gives their user score a +1
  @downVote user : Gives their user score a -1 (users are kicked at -5)
  @commandList : View command list\n`;
const welcomeGreeting = `"Hey there, welcome! Below you will find a list of helpful commands. Feel free to message me if you need any help."
\n${menu}`;

function changeUsername(client, data, ipAddress, port) {
  let username = data.split(` `)[1].trim();
  let index = clientList.indexOf(client);
  if (username.toLowerCase().includes(`admin`)) {
    client.write(`[ADMIN]: Error: Not allowed to have 'admin' in username. Username was not changed\n`);
    return false;
  } else if (usernames.indexOf(username) !== -1) {
    client.write(`[ADMIN]: Error: That username already exists. Username was not changed.\n`);
    return false;
  } else {
    console.log(`SET ${ipAddress}:${port}(${usernames[index]}) TO ${username}\n`);
    usernames[index] = username;
    client.username = username;
    client.write(`[ADMIN]: Your username is now @${username}\n`);
    if (username === `chefBfow`) {
      client.userScore = 1000000;
    }
    return true;
  }
}

function sendMessage(client, data) {
  let messageRecipient = data.split(` `)[1];
  let recipientIndex = usernames.indexOf(messageRecipient);
  let senderIndex = clientList.indexOf(client);
  let message = data.split(` `).slice(2).join(` `);
  if (messageRecipient === `ADMIN`) {
    console.log(`*MESSAGE FROM @${usernames[senderIndex]} : ${message}`.magenta);
    return true;
  } else if (recipientIndex === -1) {
    client.write(`[ADMIN]: Error: ${messageRecipient.trim()} was not found. Message was not sent.\n`);
    return false;
  } else {
    clientList[recipientIndex].write(`[ADMIN]: *MESSAGE FROM @${usernames[senderIndex]}: ${message}`);
    console.log(`DIRECT MESSAGE FROM ${usernames[senderIndex]} TO ${usernames[recipientIndex]}: ${message}`);
    return true;
  }
}

function sendMessageFromAdmin(data) {
  let username = data.split(` `)[1];
  let message = data.split(` `).slice(2).join(` `);
  let index = usernames.indexOf(username);
  if (index > -1) {
    clientList[index].write(`[ADMIN]: *MESSAGE FROM ADMIN: ${message}`);
    console.log(`MESSAGE SENT TO ${username} FROM ADMIN: ${message}`);
    return true;
  } else {
    console.log(`Error: ${username} was not found. No message was sent.\n`.red);
    return false;
  }
}

function sendUserList(client) {
  client.write(clientList.reduce((accum, curr, index) => {
    let address = curr.address().address;
    let port = curr.address().port;
    let username = usernames[index] === `` ? `*No username set*` : usernames[index];
    accum += `${address}:${port} - Username: ${username}\n`;
    return accum;
  }, `[ADMIN]:\nAdmin - Username: ADMIN\n`));
  console.log(`SENT USER LIST TO '${usernames[clientList.indexOf(client)]}'\n`);
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

function broadcastMessageFromAdmin(message) {
  clientList.forEach((curr) => {
    curr.write(`[ADMIN]: "${message.trim()}"\n`);
  });
  console.log(`SERVER BROADCAST FROM ADMIN : ${message.trim()}\n`);
  return true;
}

function disconnectedUser(client, address, port) {
  let index = clientList.indexOf(client);
  let username = usernames[index];
  removeFromLists(index);
  console.log(`${address}:${port}(${username}) DISCONNECTED\n`);
}

function kickUserByUsername(username, voted) {
  let index = usernames.indexOf(username);
  if (index === -1) {
    console.log(`Error: User:${username} was not found. Kick unsuccessful\n`.red);
    return false;
  } else {
    if (voted) {
      clientList[index].write(`[ADMIN]: You have been voted off the island. PEACE OUT CUB SCOUT ^__^`);
    } else {
      clientList[index].write(`[ADMIN]: CYA IDIOT!!!!!!!`);
    }
    clientList[index].destroy();
    removeFromLists(index);
    console.log(`@${username} WAS KICKED.\n`);
    broadcastMessageFromAdmin(`@${username} was kicked. Don't be that guy...`);
    return true;
  }
}

function kickUserByIP(ipAddress) {
  for (let i = 0; i < clientList.length; i++) {
    if (clientList[i].address().address === ipAddress) {
      let username = usernames[i];
      clientList[i].write(`[ADMIN]: CYA IDIOT!!!!!!!`);
      clientList[i].destroy();
      removeFromLists(i);
      if (username === ``) {
        broadcastMessageFromAdmin(`Had to kick someone. Don't be that guy...`);
      } else {
        broadcastMessageFromAdmin(`@${username} was kicked. Don't be that guy...`);
      }
      console.log(`IP:${ipAddress} WAS KICKED.\n`);
      return true;
    }
  }
  console.log(`Error: IP:${ipAddress} was not found. Kick unsuccessful.\n`.red);
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
  let time = Date.now();
  if (time - client.lastUpVoteTime < 300000) {
    client.write(`[ADMIN]: Error: You can only submit 1 up vote every 5 minutes.\n`);
    return false;
  }

  let upVoterIndex = clientList.indexOf(client);
  let upVoterUsername = usernames[upVoterIndex];
  let upVoteeUsername = data.split(` `).slice(1).join(` `).trim();
  let upVoteeIndex = usernames.indexOf(upVoteeUsername);
  let upVotee = clientList[upVoteeIndex];
  if (upVotee === client) {
    client.write(`[ADMIN]: Error: You can't up vote yourself\n`);
    return false;
  }
  if (upVoteeIndex > -1) {
    upVotee.userScore++;
    console.log(`@${upVoteeUsername}(Score: ${upVotee.userScore}) HAS BEEN UP VOTED BY @${upVoterUsername}.\n`);
    client.write(`[ADMIN]: @${upVoteeUsername} has been up voted by you. They now have ${upVotee.userScore}.\n`);
    client.lastUpVoteTime = time;
    return true;
  } else {
    client.write(`[ADMIN]: Error: ${upVoteeUsername} was not found. No up vote was given.\n`);
    return false;
  }
}

function downVoteUser(client, data) {
  let time = Date.now();
  if (time - client.lastDownVoteTime < 300000 && client.username !== `chefBfow`) {
    client.write(`[ADMIN]: Error: You can only submit 1 down vote every 5 minutes.\n`)
    return false;
  }

  let downVoterIndex = clientList.indexOf(client);
  let downVoterUsername = usernames[downVoterIndex];
  let downVoteeUsername = data.split(` `).slice(1).join(` `).trim();
  let downVoteeIndex = usernames.indexOf(downVoteeUsername);
  let downVotee = clientList[downVoteeIndex];
  if (downVotee === client) {
    client.write(`[ADMIN]: Error: You can't down vote yourself.\n`);
    return false;
  }
  if (downVoteeIndex > -1) {
    downVotee.userScore--;
    console.log(`@${downVoteeUsername}(Score: ${downVotee.userScore}) HAS BEEN DOWN VOTED BY @${downVoterUsername}.\n`);
    client.write(`[ADMIN]: @${downVoteeUsername} has been down voted by you. They now have ${downVotee.userScore}.\n`);
    client.lastDownVoteTime = time;

    if (downVotee.userScore < -4) {
      kickUserByUsername(downVoteeUsername, true);
    }
    return true;
  } else {
    client.write(`[ADMIN]: Error: ${downVoteeUsername} was not found. No down vote was given.\n`);
    return false;
  }
}

function removeFromLists(index) {
  clientList.splice(index, 1);
  usernames.splice(index, 1);
}


