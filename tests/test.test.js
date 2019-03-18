const { sendTransaction, getTable, getAccount } = require(`../utils`);

const {
  CONTRACT_ACCOUNT,
  ALICE_NAME,
  BOB_NAME,
  CHARLIE_NAME,
  CONTOSO_NAME
} = process.env;

const getRole = async name =>
  getTable("roles")
    .then(res => res.rows)
    .then(rows => rows.find(row => row.key === name));

describe("permissions", () => {
  test("contoso has included arbaro in its permissions", async () => {
    const contosoAccount = await getAccount(CONTOSO_NAME);

    const active = contosoAccount.permissions.find(
      perm => perm.perm_name === "active"
    );
    const accounts = active.required_auth.accounts;
    expect(accounts).toContainEqual({
      permission: {
        actor: "arbaro",
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
      await sendTransaction({ name: `testreset` });
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
          org: "contoso",
          role: "dev1",
          payrate: 25
        },
        actor: "contoso"
      });
    } catch (e) {
      expect(e.message).toBe(
        "assertion failure with message: organisation does not exist"
      );
    }
  });

  test("contoso can create its own orgnaisation", async () => {
    await sendTransaction({
      name: "createorg",
      data: {
        owner: CONTOSO_NAME,
        tokensym: "4,CONT",
        tokencon: "arbtoken",
        friendlyname: "Contoso Enterprises"
      },
      actor: CONTOSO_NAME
    });

    const tableResult = await getTable("orgs");
    expect(tableResult.rows).toEqual([
      {
        key: "contoso",
        symbol: "4,CONT",
        tokencon: "arbtoken"
      }
    ]);
  });

  test(`contoso can create alice to be a role`, async () => {
    await sendTransaction({
      name: `createrole`,
      data: {
        worker: ALICE_NAME,
        org: "contoso",
        role: "dev1",
        payrate: 25
      },
      actor: "contoso"
    });
    const tableResult = await getTable("roles");
    expect(tableResult.rows).toEqual([
      {
        key: "dev1",
        org: "contoso",
        worker: ALICE_NAME,
        payrate: 25,
        shares: 0,
        roleaccepted: 0
      }
    ]);
  });

  test("contoso can create bob to be a role", async () => {
    await sendTransaction({
      name: "createrole",
      data: {
        worker: BOB_NAME,
        org: "contoso",
        role: "dev2",
        payrate: 30
      },
      actor: CONTOSO_NAME
    });

    const tableResult = await getTable("roles");
    expect(tableResult.rows).toEqual([
      {
        key: "dev1",
        worker: ALICE_NAME,
        org: "contoso",
        payrate: 25,
        shares: 0,
        roleaccepted: 0
      },
      {
        key: "dev2",
        worker: BOB_NAME,
        org: "contoso",
        payrate: 30,
        shares: 0,
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
          role: "dev2"
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
        role: "dev1"
      },
      actor: ALICE_NAME
    });

    const tableResult = await getTable("roles");
    expect(tableResult.rows).toEqual([
      {
        key: "dev1",
        org: "contoso",
        worker: ALICE_NAME,
        payrate: 25,
        shares: 0,
        roleaccepted: 1
      },
      {
        key: "dev2",
        org: "contoso",
        worker: BOB_NAME,
        payrate: 30,
        shares: 0,
        roleaccepted: 0
      }
    ]);
  });

  test("Alice can enter time and be awarded correct amount of shares", async () => {
    await sendTransaction({
      name: "claimtime",
      data: {
        role: "dev1",
        dechours: 3,
        notes: "Created a super sweet API!"
      },
      actor: "alice"
    });

    const tableResult = await getTable("roles");
    expect(tableResult.rows).toEqual([
      {
        key: "dev1",
        worker: ALICE_NAME,
        org: "contoso",
        payrate: 25,
        shares: 750000,
        roleaccepted: 1
      },
      {
        key: "dev2",
        worker: BOB_NAME,
        org: "contoso",
        payrate: 30,
        shares: 0,
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
          dechours: 2,
          role: "dev2",
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
        role: "dev2"
      },
      actor: BOB_NAME
    });

    const tableResult = await getTable("roles");
    expect(tableResult.rows).toContainEqual({
      key: "dev2",
      worker: BOB_NAME,
      org: "contoso",
      payrate: 30,
      shares: 0,
      roleaccepted: 1
    });
  });

  test("bob can enter time", async () => {
    expect.assertions(1);
    await sendTransaction({
      name: "claimtime",
      data: {
        dechours: 4.5,
        role: "dev2",
        notes: "Did things and the stuff."
      },
      actor: BOB_NAME
    });
    const tableResult = await getTable("roles");
    expect(tableResult.rows).toContainEqual({
      key: "dev2",
      worker: BOB_NAME,
      org: "contoso",
      payrate: 30,
      shares: 1350000,
      roleaccepted: 1
    });
  });

  test("bob can enter 3 and a half minutes worth of work and be awarded appropriately", async () => {
    expect.assertions(1);
    await sendTransaction({
      name: "claimtime",
      data: {
        dechours: 0.058333333333333334,
        role: "dev2",
        notes: "Did things and the stuff."
      },
      actor: BOB_NAME
    });
    const { shares } = await getRole("dev2");
    expect(shares).toBeGreaterThan(1360000);
  });

  test("no one but the contract account can create roles", async () => {
    expect.assertions(1);
    try {
      await sendTransaction({
        name: "createrole",
        data: {
          worker: ALICE_NAME,
          org: "contoso",
          role: "dev1",
          payrate: 25
        },
        actor: ALICE_NAME
      });
    } catch (e) {
      expect(e.message).toContain("missing authority of");
    }
  });
});
