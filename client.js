const net = require(`net`);
const client = new net.Socket();
const colors = require(`colors`);
client.setEncoding(`utf8`);
client.connect(6969, `0.0.0.0`, () => {
  console.log(`Connected to 0.0.0.0:6969`);
});

client.on(`data`, (data) => {
  if (data.startsWith(`[ADMIN]: *MESSAGE FROM`)) {
    let message = data.split(` `).slice(1).join(` `);
    console.log(colors.magenta(message));
  } else if (data.startsWith(`[ADMIN]`) && (data.includes(`IDIOT`) || data.includes(`CUB SCOUT`))) {
    console.log(data.rainbow);
  } else if (data.startsWith(`[ADMIN]: "`)) {
    console.log(data.green);
  } else if (data.startsWith(`[ADMIN]: Error:`)) {
    console.log(data.red);
  } else if (data.startsWith(`[ADMIN]:`)) {
    console.log(data.cyan);
  } else {
    console.log(data);
  }
});

client.on(`close`, () => {
  console.log(`Connection closed`);
});

process.stdin.setEncoding(`utf8`);
process.stdin.on(`readable`, () => {
  const chunk = process.stdin.read();
  if (chunk !== null) {
    if (chunk.startsWith(`NOMODWESPAM`)) {
      let message = chunk.split(` `).slice(1).join(` `);
      while (true) {
        client.write(message);
      }
    } else {
      client.write(chunk);
    }
  }
});