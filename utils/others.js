const fs = require(`fs`);
const path = require(`path`);
const { RpcError } = require(`eosjs`);

const { api } = require(`../config.js`);

const { CONTRACT_ACCOUNT, TOKEN_CONTRACT } = process.env;

const createAction = ({
  account = CONTRACT_ACCOUNT,
  name,
  actor = CONTRACT_ACCOUNT,
  data = {}
}) => ({
  account,
  name,
  authorization: [
    actor.includes("@")
      ? {
          actor: actor.split("@")[0],
          permission: actor.split("@")[1]
        }
      : {
          actor,
          permission: `active`
        }
  ],
  data
});

const sendTransaction = async args => {
  const actions = Array.isArray(args)
    ? args.map(createAction)
    : [createAction(args)];
  return api.transact(
    {
      actions
    },
    {
      blocksBehind: 3,
      expireSeconds: 30
    }
  );
};

const getOrganisation = async orgName => {
  return api.rpc.get_table_rows({
    json: true,
    code: CONTRACT_ACCOUNT,
    scope,
    table: tableName,
    lower_bound: 0,
    upper_bound: -1,
    limit: 9999,
    index_position: 1
  });
};

const getTable = async (tableName, scope = CONTRACT_ACCOUNT) => {
  return await api.rpc.get_table_rows({
    json: true,
    code: CONTRACT_ACCOUNT,
    scope,
    table: tableName,
    lower_bound: 0,
    upper_bound: -1,
    limit: 9999,
    index_position: 1
  });
};

const getBalance = async (
  accountName,
  symbol = "EOS",
  tokenContract = TOKEN_CONTRACT
) => {
  const result = await api.rpc.get_currency_balance(
    tokenContract,
    accountName,
    symbol
  );

  if (result.length === 1) {
    const amount = result[0].split(" ")[0];
    return Number(amount);
  } else {
    return 0;
  }
};

const getAccount = async accountName => api.rpc.get_account(accountName);

function getErrorDetail(exception) {
  if (exception instanceof RpcError)
    return JSON.stringify(exception.json, null, 2);
  return exception && exception.message;
}

function getDeployableFilesFromDir(dir) {
  const dirCont = fs.readdirSync(dir);
  const wasmFileName = dirCont.find(filePath =>
    filePath.match(/.*\.(wasm)$/gi)
  );
  const abiFileName = dirCont.find(filePath => filePath.match(/.*\.(abi)$/gi));
  if (!wasmFileName) throw new Error(`Cannot find a ".wasm file" in ${dir}`);
  if (!abiFileName) throw new Error(`Cannot find an ".abi file" in ${dir}`);
  return {
    wasmPath: path.join(dir, wasmFileName),
    abiPath: path.join(dir, abiFileName)
  };
}

module.exports = {
  sendTransaction,
  getTable,
  getBalance,
  getAccount,
  getErrorDetail,
  getDeployableFilesFromDir
};
