const { sendTransaction, getErrorDetail } = require(`../utils`);



const { TOKEN_CONTRACT, CONTOSO_NAME } = process.env;


async function action() {
  try {
    const transaction = await sendTransaction({
      account: TOKEN_CONTRACT,
      name: `create`,
      actor: CONTOSO_NAME,
      data: {
        issuer: CONTOSO_NAME,
        maximum_supply: `10000000.0000 CONT`
      }
    });
    console.log(`SUCCESS`);
    console.log(
      transaction.processed.action_traces
        .map(
          trace =>
            `${trace.console}${trace.inline_traces.map(
              t => `\n\t${t.console}`
            )}`
        )
        .join(`\n`)
    );
  } catch (error) {
    console.error(`${getErrorDetail(error)}`);
  }
}

action();
