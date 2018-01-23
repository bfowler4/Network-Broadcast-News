const net = require(`net`);
const server = net.createServer((client) => {
  let address = client.address().address;
  let port = client.address().port;
  console.log(`CONNECTED: ${address}`);
  client.setEncoding(`utf8`);
  clientList.push(client);
  usernames.push(``);
  client.write(`[@ to change username. Example: @username123]`);

  client.on(`data`, (data) => {
    if (data.startsWith(`@`)) {
      let username = data.slice(1, data.length - 1);
      if (username.toLowerCase().includes(`admin`)) {
        client.write(`Error: Not allowed to have 'admin' in username. Username was not changed`);
      } else if (usernames.indexOf(username) !== -1) {
        client.write(`Error: That username already exists. Username was not changed.`);
      } else {
        usernames[clientList.indexOf(client)] = username;
        client.write(`Your username is now @${username}`);
      }
      return;
    }
    if (data.startsWith(`$`)) {
      let messageRecipient = data.split(` `)[0].slice(1);
      let message = data.split(` `).slice(1).join(` `);
      let recipientIndex = usernames.indexOf(messageRecipient);
      let senderIndex = clientList.indexOf(client);
      if (recipientIndex === -1) {
        client.write(`${messageRecipient} was not found. Message was not sent.`);
      } else {
        clientList[recipientIndex].write(`*MESSAGE FROM @${usernames[senderIndex]}: ${message}`);
      }
      return;
    }
    let username = usernames[clientList.indexOf(client)];
    console.log(`SERVER BROADCAST FROM ${address}:${port}(${username}) : ${data}`);
    clientList.forEach((curr) => {
      if (username === undefined) {
        username = `${address}:${port}`;
      }
      curr.write(`${username}: "${data}"`);
    });
  });

  client.on(`end`, () => {
    let index = clientList.indexOf(client);
    let username = usernames[index];
    clientList.splice(index, 1);
    usernames.splice(index, 1);
    console.log(`${address}:${port}(${username}) DISCONNECTED`);
  });
});

const clientList = [];
const usernames = [];
server.listen(6969, `0.0.0.0`, () => {
  console.log(`Server listening on 0.0.0.0:6969`);
  console.log(`[@kick username to kick specific user. Example: @kick user1]`);
});

process.stdin.setEncoding(`utf8`);
process.stdin.on(`readable`, () => {
  const chunk = process.stdin.read();
  if (chunk !== null) {
    if (chunk.startsWith(`@kick`)) {
      let username = chunk.split(` `)[1].trim();
      console.log(username);
      let index = usernames.indexOf(username);
      if (index === -1) {
        console.log(`Error: ${username} was not found. Kick unsuccessful`);
      } else {
        clientList[index].write(`CYA IDIOT!`);
        clientList[index].destroy();
        clientList.splice(index, 1);
        usernames.splice(index, 1);
        console.log(`@${username} was kicked.`)
      }
      return;
    }
    clientList.forEach((curr) => {
      curr.write(`[ADMIN]: "${chunk}"`);
    })
  }
});

