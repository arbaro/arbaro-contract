#include "./arbaro.hpp"

using namespace eosio;
using namespace std;

void arbaro::init(name name)
{
    require_auth(_self);
}

void arbaro::transfer(name from, name to, asset quantity, string memo)
{
    if (from == _self)
    {
        // we're sending money, do nothing additional
        return;
    }

    eosio_assert(to == _self, "contract is not involved in this transfer");
    eosio_assert(quantity.symbol.is_valid(), "invalid quantity");
    eosio_assert(quantity.amount > 0, "only positive quantity allowed");
    eosio_assert(quantity.symbol == EOS_SYMBOL, "only EOS tokens allowed");
}

void arbaro::testreset()
{
    require_auth(_self);
    worker_index workersdb(_code, _code.value);
    auto itr = workersdb.begin();
    while (itr != workersdb.end())
    {
        itr = workersdb.erase(itr);
    }
}

void arbaro::createworker(name worker, uint64_t payrate)
{
    require_auth(_self);
    worker_index workersdb(_code, _code.value);
    workersdb.emplace(_self, [&](auto &row) {
        row.key = worker;
        row.payrate = payrate;
        row.roleaccepted = false;
        row.shares = 0;
    });
};

void arbaro::acceptrole(name worker)
{
    require_auth(worker);
    worker_index workersdb(_code, _code.value);
    auto iterator = workersdb.find(worker.value);
    eosio_assert(iterator != workersdb.end(), "worker does not exist");
    workersdb.modify(iterator, _self, [&](auto &row) {
        row.roleaccepted = true;
    });
}

void arbaro::claimtime(name worker, double dechours, string notes)
{
    require_auth(worker);
    worker_index workersdb(_code, _code.value);
    auto iterator = workersdb.find(worker.value);
    eosio_assert(iterator != workersdb.end(), "you must be a worker to enter time");
    eosio_assert(iterator->roleaccepted == true, "role must be accepted");

    uint64_t reward = dechours * iterator->payrate;
    workersdb.modify(iterator, worker, [&](auto &row) {
        row.shares += reward;
    });

    print("Awarded ", reward, " shares.");
}

extern "C" void apply(uint64_t receiver, uint64_t code, uint64_t action)
{
    if (code == "eosio.token"_n.value && action == "transfer"_n.value)
    {
        eosio::execute_action(eosio::name(receiver), eosio::name(code), &arbaro::transfer);
    }
    else if (code == receiver)
    {
        switch (action)
        {
            EOSIO_DISPATCH_HELPER(arbaro, (init)(testreset)(createworker)(acceptrole)(claimtime))
        }
    }
}
