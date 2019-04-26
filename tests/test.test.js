const {
  sendTransaction,
  getTable,
  getAccount,
  getBalance
} = require(`../utils`);

const {
  CONTRACT_ACCOUNT,
  ALICE_NAME,
  BOB_NAME,
  CHARLIE_NAME,
  CONTOSO_NAME,
  TOKEN_CONTRACT
} = process.env;

const getRole = async (worker, org) => {
  const tableResult = await getTable("roles", org)
  console.log(tableResult.rows)
  return tableResult.rows.filter(x => x.key == worker)[0]
}

describe("permissions", () => {
  test("contoso has included arbaro in its permissions", async () => {
    const contosoAccount = await getAccount(CONTOSO_NAME);

    const active = contosoAccount.permissions.find(
      perm => perm.perm_name === "active"
    );
    const accounts = active.required_auth.accounts;
    expect(accounts).toContainEqual({
      permission: {
        actor: CONTRACT_ACCOUNT,
        permission: "active"
      },
      weight: 1
    });
  });
});

describe(`contract`, () => {
  beforeAll(async () => {
    jest.setTimeout(20000);
    expect.assertions(5);
    let rolesTable = await getTable("roles");
    let orgsTable = await getTable("orgs");
    if (rolesTable.rows.length > 0 || orgsTable.rows.length > 0) {
      console.log("Resetting roles table...");
      await sendTransaction({ name: `testreset`, data: {org: CONTOSO_NAME} });
      rolesTable = await getTable("roles");
      orgsTable = await getTable("orgs");
    }
    expect(orgsTable.rows).toBeEmpty();
    expect(orgsTable.more).toBeFalse();
    expect(rolesTable.rows).toBeEmpty();
    expect(rolesTable.more).toBeFalse();
  });

  beforeEach(() => {
    jest.setTimeout(20000);
  });

  test("assertion count bug", () => {
    expect(true).toBe(true);
  });

  test("contoso cannot create a role before creating the orgnisation", async () => {
    expect.assertions(1);
    try {
      await sendTransaction({
        name: `createrole`,
        data: {
          worker: ALICE_NAME,
          org: CONTOSO_NAME,
          payrate: "25.0000 CONT"
        },
        actor: CONTOSO_NAME
      });
    } catch (e) {
      expect(e.message).toBe(
        "assertion failure with message: org does not exist"
      );
    }
  });

  test("contoso can create its own orgnaisation", async () => {
    await sendTransaction({
      name: "createorg",
      data: {
        owner: CONTOSO_NAME,
        tokensym: "4,CONT",
        tokencon: TOKEN_CONTRACT,
        friendlyname: "Contoso Enterprises"
      },
      actor: CONTOSO_NAME
    });

    const tableResult = await getTable("orgs");
    expect(tableResult.rows).toEqual([
      {
        key: CONTOSO_NAME,
        symbol: "4,CONT",
        tokencon: TOKEN_CONTRACT
      }
    ]);
  });

  test(`contoso can create alice to be a role`, async () => {
    await sendTransaction({
      name: `createrole`,
      data: {
        worker: ALICE_NAME,
        org: CONTOSO_NAME,
        payrate: "25.0000 CONT"
      },
      actor: CONTOSO_NAME
    });
    const tableResult = await getTable("roles", CONTOSO_NAME);
    expect(tableResult.rows).toEqual([
      {
        key: ALICE_NAME,
        payrate: "25.0000 CONT",
        earned: "0.0000 CONT",
        roleaccepted: 0
      }
    ]);
  });

  test("contoso can create bob to be a role", async () => {
    await sendTransaction({
      name: "createrole",
      data: {
        worker: BOB_NAME,
        org: CONTOSO_NAME,
        payrate: "0.5000 CONT"
      },
      actor: CONTOSO_NAME
    });

    const tableResult = await getTable("roles", CONTOSO_NAME);
    expect(tableResult.rows).toEqual([
      {
        key: ALICE_NAME,
        payrate: "25.0000 CONT",
        earned: "0.0000 CONT",
        roleaccepted: 0
      },
      {
        key: BOB_NAME,
        payrate: "0.5000 CONT",
        earned: "0.0000 CONT",
        roleaccepted: 0
      }
    ]);
  });

  test("alice cant accept bobs position", async () => {
    expect.assertions(1);
    try {
      await sendTransaction({
        name: "acceptrole",
        data: {
          worker: BOB_NAME,
          org: CONTOSO_NAME
        },
        actor: ALICE_NAME
      });
    } catch (e) {
      expect(e.message).toBe(`missing authority of ${BOB_NAME}`);
    }
  });

  test("alice can accept her position", async () => {
    await sendTransaction({
      name: "acceptrole",
      data: {
        worker: ALICE_NAME,
        org: CONTOSO_NAME
      },
      actor: ALICE_NAME
    });

    const tableResult = await getTable("roles", CONTOSO_NAME);
    expect(tableResult.rows).toEqual([
      {
        key: ALICE_NAME,
        payrate: "25.0000 CONT",
        earned: "0.0000 CONT",
        roleaccepted: 1
      },
      {
        key: BOB_NAME,
        payrate: "0.5000 CONT",
        earned: "0.0000 CONT",
        roleaccepted: 0
      }
    ]);
  });

  test("Alice can enter time and be awarded correct amount of shares", async () => {
    const beforeBalance = await getBalance(ALICE_NAME, "CONT");

    await sendTransaction({
      name: "claimtime",
      data: {
        worker: ALICE_NAME,
        org: CONTOSO_NAME,
        minutes: 3,
        notes: "Created a super sweet API!"
      },
      actor: ALICE_NAME
    });

    const afterBalance = await getBalance(ALICE_NAME, "CONT");

    expect(afterBalance).toBeGreaterThan(beforeBalance);
    expect(afterBalance).toBe(beforeBalance + 75);

    const tableResult = await getTable("roles", CONTOSO_NAME);
    expect(tableResult.rows).toEqual([
      {
        key: ALICE_NAME,
        payrate: "25.0000 CONT",
        earned: "75.0000 CONT",
        roleaccepted: 1
      },
      {
        key: BOB_NAME,
        payrate: "0.5000 CONT",
        earned: "0.0000 CONT",
        roleaccepted: 0
      }
    ]);
  });

  test("bob cannot enter time until he accepts role", async () => {
    expect.assertions(1);
    try {
      await sendTransaction({
        name: "claimtime",
        data: {
          minutes: 2,
          worker: BOB_NAME,
          org: CONTOSO_NAME,
          notes: "Jumped the gun!"
        },
        actor: BOB_NAME
      });
    } catch (e) {
      expect(e.message).toBe(
        "assertion failure with message: role must be accepted"
      );
    }
  });

  test("bob can accept his role", async () => {
    expect.assertions(1);
    await sendTransaction({
      name: "acceptrole",
      data: {
        worker: BOB_NAME,
        org: CONTOSO_NAME
      },
      actor: BOB_NAME
    });

    const tableResult = await getTable("roles", CONTOSO_NAME);
    expect(tableResult.rows).toContainEqual({
      key: BOB_NAME,
      payrate: "0.5000 CONT",
      earned: "0.0000 CONT",
      roleaccepted: 1
    });
  });

  test("bob can enter time", async () => {
    const beforeBalance = await getBalance(BOB_NAME, "CONT");

    expect.assertions(3);
    await sendTransaction({
      name: "claimtime",
      data: {
        minutes: 270,
        worker: BOB_NAME,
        org: CONTOSO_NAME,
        notes: "Did things and the stuff."
      },
      actor: BOB_NAME
    });

    const afterBalance = await getBalance(BOB_NAME, "CONT");

    expect(afterBalance).toBeGreaterThan(beforeBalance);
    expect(afterBalance).toBe(beforeBalance + 135);

    const tableResult = await getTable("roles", CONTOSO_NAME);
    expect(tableResult.rows).toContainEqual({
      key: BOB_NAME,
      payrate: "0.5000 CONT",
      earned: "135.0000 CONT",
      roleaccepted: 1
    });
  });

  test("bob can enter 3 minutes worth of work and be awarded appropriately", async () => {
    const beforeBalance = await getBalance(BOB_NAME, "CONT");
    
    await sendTransaction({
      name: "claimtime",
      data: {
        minutes: 3,
        worker: BOB_NAME,
        org: CONTOSO_NAME,
        notes: "Did things and the stuff."
      },
      actor: BOB_NAME
    });

    const afterBalance = await getBalance(BOB_NAME, "CONT");
    expect(afterBalance).toBeGreaterThan(beforeBalance);
    expect(afterBalance).toBe(beforeBalance + 1.5);
  });


  test("no one but the contract account can create roles", async () => {
    expect.assertions(1);
    try {
      await sendTransaction({
        name: "createrole",
        data: {
          worker: ALICE_NAME,
          org: CONTOSO_NAME,
          payrate: "25.0000 CONT"
        },
        actor: ALICE_NAME
      });
    } catch (e) {
      expect(e.message).toContain("missing authority of");
    }
  });
});
