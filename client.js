const net = require(`net`);
const client = new net.Socket();
const prompt = require(`prompt`);
client.setEncoding(`utf8`);
client.connect(6969, `0.0.0.0`, () => {
  console.log(`Connected to 0.0.0.0:6969`);
//  process.stdin.pipe(client);
//  client.pipe(process.stdout);
});

client.on(`data`, (data) => {
  console.log(data);
});

client.on(`close`, () => {
  console.log(`Connection closed`);
});

process.stdin.setEncoding(`utf8`);
process.stdin.on(`readable`, () => {
  const chunk = process.stdin.read();
  if (chunk !== null) {
    if (chunk.startsWith(`!@!@`)) {
      let message = chunk.split(` `)[1];
      while (true) {
        client.write(message);
      }
      return;
    }
    client.write(chunk);
  }
});