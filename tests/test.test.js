const { sendTransaction, getTable } = require(`../utils`);

const { CONTRACT_ACCOUNT } = process.env;

const getWorker = async name =>
  getTable("workers")
    .then(res => res.rows)
    .then(rows => rows.find(row => row.key === name));

describe(`contract`, () => {
  beforeAll(async () => {
    const result = await sendTransaction({ name: `testreset` });
    const { rows, more } = await getTable("workers");
    expect(rows).toBeEmpty();
    expect(more).toBeFalse();
  });

  test(`contoso can create alice to be a worker`, async () => {
    const transaction = await sendTransaction({
      name: `createworker`,
      data: {
        worker: `alice`,
        payrate: 25
      }
    });

    const tableResult = await getTable("workers");
    expect(tableResult.rows).toEqual([
      {
        key: "alice",
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
        worker: "bob",
        payrate: 30
      }
    });

    const tableResult = await getTable("workers");
    expect(tableResult.rows).toEqual([
      {
        key: "alice",
        payrate: 25,
        shares: 0,
        roleaccepted: 0
      },
      {
        key: "bob",
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
          worker: "bob"
        },
        actor: "alice"
      });
    } catch (e) {
      expect(e.message).toBe("missing authority of bob");
    }
  });

  test("alice can accept her position", async () => {
    await sendTransaction({
      name: "acceptrole",
      data: {
        worker: "alice"
      },
      actor: "alice"
    });

    const tableResult = await getTable("workers");
    expect(tableResult.rows).toEqual([
      {
        key: "alice",
        payrate: 25,
        shares: 0,
        roleaccepted: 1
      },
      {
        key: "bob",
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
        worker: "alice",
        dechours: 3,
        notes: "Created a super sweet API!"
      },
      actor: "alice"
    });

    const tableResult = await getTable("workers");
    expect(tableResult.rows).toEqual([
      {
        key: "alice",
        payrate: 25,
        shares: 75,
        roleaccepted: 1
      },
      {
        key: "bob",
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
          worker: "bob",
          notes: "Jumped the gun!"
        },
        actor: "bob"
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
        worker: "bob"
      },
      actor: "bob"
    });

    const tableResult = await getTable("workers");
    expect(tableResult.rows).toContainEqual({
      key: "bob",
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
        worker: "bob",
        notes: "Did things and the stuff."
      },
      actor: "bob"
    });
    const tableResult = await getTable("workers");
    expect(tableResult.rows).toContainEqual({
      key: "bob",
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
        worker: "bob",
        notes: "Did things and the stuff."
      },
      actor: "bob"
    });
    const { shares } = await getWorker("bob");
    expect(shares).toBe(136);
  });

  test("no one but the contract account can create workers", async () => {
    expect.assertions(1);
    try {
      await sendTransaction({
        name: "createworker",
        data: {
          worker: `jeff`,
          payrate: 100
        },
        actor: "charlie"
      });
    } catch (e) {
      expect(e.message).toContain("missing authority of");
    }
  });
});
