const net = require(`net`);
const colors = require(`colors`);
const clientList = [];
const usernames = [];
const messageTimes = [];
const server = net.createServer((client) => {
  let address = client.address().address;
  let port = client.address().port;
  console.log(`CONNECTED: ${address}:${port}`);
  client.setEncoding(`utf8`);
  clientList.push(client);
  usernames.push(``);
  messageTimes.push([]);
  client.write(menu);

  client.on(`data`, (data) => {
    if (!rateLimiter(client)) {
      return;
    }
    if (usernames[clientList.indexOf(client)] === `` && !(data.startsWith(`@changeUsername`) || data.startsWith(`@commandList`))) {
      client.write(`[ADMIN]: Error: Please set a user name using the '@changeUsername {username}' command before using chatroom.\n`);
      return;
    }
    if (data.startsWith(`@changeUsername`)) {
      changeUsername(client, data, address, port);
    } else if (data.startsWith(`@message`)) {
      sendMessage(client, data);
    } else if (data.startsWith(`@commandList`)) {
      client.write(menu);
    } else if (data.startsWith(`@users`)) {
      sendUserList(client);
    } else {
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
    clientList[recipientIndex].write(`[ADMIN]: *MESSAGE FROM @${usernames[senderIndex]}: ${message}\n`);
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
  for (let i = 0; i < clientList.length; i ++) {
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
  if (messageTimes[index].length < 4) {
    messageTimes[index].push(time);
    return true;
  } else {
    if (time - messageTimes[index][0] < 1000) {
      kickUserByIP(clientList[index].address().address);
      return false;
    } else {
      messageTimes[index].shift();
      messageTimes[index].push(time);
      return true;
    }
  }
}

function removeFromLists(index) {
  clientList.splice(index, 1);
  usernames.splice(index, 1);
  messageTimes.splice(index, 1);
}


