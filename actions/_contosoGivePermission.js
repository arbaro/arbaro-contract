const { sendTransaction, getErrorDetail } = require(`../utils`);
const { api } = require(`../config.js`);

const { CONTRACT_ACCOUNT, CONTOSO_NAME } = process.env;


// Goal
// Add the contract@active to the organisation account


async function action() {

    console.log(CONTRACT_ACCOUNT, CONTOSO_NAME)

    try {
        const tokenIssuerAccount = await api.rpc.get_account(
          CONTOSO_NAME
        );
        const activePermissions = tokenIssuerAccount.permissions.find(
          permission => permission.perm_name === "active"
        ).required_auth;

        if (
          activePermissions.accounts.find(
            permission => permission.permission.actor === CONTRACT_ACCOUNT
          )
        ) {
            console.log("Permission already exists")
          return;
        }

        const data = {
          account: CONTOSO_NAME,
          permission: "active",
          auth: {
            ...activePermissions,
            accounts: [
              ...activePermissions.accounts,
              {
                permission: {
                  actor: CONTRACT_ACCOUNT,
                  permission: `active`
                },
                weight: 1
              }
            ]
          },
          parent: "owner"
        };

        await sendTransaction({

              account: "eosio",
              name: "updateauth",
              authorization: [
                {
                  actor: CONTOSO_NAME,
                  permission: "active"
                }
              ],
              data
            
          
        });
      } catch (e) {
        console.log( e.message)
      }
    






//   try {
//     const transaction = await sendTransaction({
//       account: `eosio`,
//       name: `updateauth`,
//       data: {
//         account: "contoso",
//         permission: `active`,
//         auth: {
//           threshold: 1,
//           keys: [
//             {
//               key: `EOS7rkVPRV3FD434Ux9K7GpNZpwQyQjNNsLLrS3FMQeLyX88MXj1P`,
//               weight: 1
//             }
//           ],
//           accounts: [
//             {
//               permission: { actor: `arbaro`, permission: `active` },
//               weight: 1
//             }
//           ],
//           waits: []
//         },
//         parent: `owner`
//       },
//       actor: "contoso"
//     });
//     console.log(`SUCCESS`);
//     console.log(
//       transaction.processed.action_traces
//         .map(
//           trace =>
//             `${trace.console}${trace.inline_traces.map(
//               t => `\n\t${t.console}`
//             )}`
//         )
//         .join(`\n`)
//     );
//   } catch (error) {
//     console.error(`${getErrorDetail(error)}`);
//   }
}

action();
