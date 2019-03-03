const { sendTransaction, getTable } = require(`../utils`);

const {
  CONTRACT_ACCOUNT,
  ALICE_NAME,
  BOB_NAME,
  CHARLIE_NAME,
  CONTOSO_NAME
} = process.env;

const getWorker = async name =>
  getTable("workers")
    .then(res => res.rows)
    .then(rows => rows.find(row => row.key === name));

describe(`contract`, () => {
  beforeAll(async () => {
    jest.setTimeout(20000);
    // Checks for existing records and then
    // Destroys all records in the workers table
    const { rows } = await getTable("workers");
    if (rows.length > 0) {
      console.log("Resetting contract...");
      await sendTransaction({ name: `testreset` });
      const { rows, more } = await getTable("workers");
      expect(rows).toBeEmpty();
      expect(more).toBeFalse();
    }
  });

  beforeEach(() => {
    jest.setTimeout(20000);
  });

  test(`contoso can create alice to be a worker`, async () => {
    await sendTransaction({
      name: `createworker`,
      data: {
        worker: ALICE_NAME,
        payrate: 25
      }
    });
    const tableResult = await getTable("workers");
    expect(tableResult.rows).toEqual([
      {
        key: ALICE_NAME,
        payrate: 25,
        shares: 0,
        roleaccepted: 0
      }
    ]);
  });

  test("contoso can create bob to be a worker", async () => {
    await sendTransaction({
      name: "createworker",
      data: {
        worker: BOB_NAME,
        payrate: 30
      }
    });

    const tableResult = await getTable("workers");
    expect(tableResult.rows).toEqual([
      {
        key: ALICE_NAME,
        payrate: 25,
        shares: 0,
        roleaccepted: 0
      },
      {
        key: BOB_NAME,
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
          worker: BOB_NAME
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
        worker: ALICE_NAME
      },
      actor: ALICE_NAME
    });

    const tableResult = await getTable("workers");
    expect(tableResult.rows).toEqual([
      {
        key: ALICE_NAME,
        payrate: 25,
        shares: 0,
        roleaccepted: 1
      },
      {
        key: BOB_NAME,
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
        worker: ALICE_NAME,
        dechours: 3,
        notes: "Created a super sweet API!"
      },
      actor: ALICE_NAME
    });

    const tableResult = await getTable("workers");
    expect(tableResult.rows).toEqual([
      {
        key: ALICE_NAME,
        payrate: 25,
        shares: 75,
        roleaccepted: 1
      },
      {
        key: BOB_NAME,
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
          worker: BOB_NAME,
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
        worker: BOB_NAME
      },
      actor: BOB_NAME
    });

    const tableResult = await getTable("workers");
    expect(tableResult.rows).toContainEqual({
      key: BOB_NAME,
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
        worker: BOB_NAME,
        notes: "Did things and the stuff."
      },
      actor: BOB_NAME
    });
    const tableResult = await getTable("workers");
    expect(tableResult.rows).toContainEqual({
      key: BOB_NAME,
      payrate: 30,
      shares: 135,
      roleaccepted: 1
    });
  });

  test("bob can enter 3 and a half minutes worth of work and be awarded appropriately", async () => {
    expect.assertions(1);
    await sendTransaction({
      name: "claimtime",
      data: {
        dechours: 0.058333333333333334,
        worker: BOB_NAME,
        notes: "Did things and the stuff."
      },
      actor: BOB_NAME
    });
    const { shares } = await getWorker(BOB_NAME);
    expect(shares).toBe(136);
  });

  test("no one but the contract account can create workers", async () => {
    expect.assertions(1);
    try {
      await sendTransaction({
        name: "createworker",
        data: {
          worker: `randomperson`,
          payrate: 100
        },
        actor: CHARLIE_NAME
      });
    } catch (e) {
      expect(e.message).toContain("missing authority of");
    }
  });
});
