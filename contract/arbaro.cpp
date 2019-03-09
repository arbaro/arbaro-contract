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

    role_index rolesdb(_code, _code.value);
    auto itr = rolesdb.begin();
    while (itr != rolesdb.end())
    {
        itr = rolesdb.erase(itr);
    }

    org_index orgsdb(_code, _code.value);
    auto itr2 = orgsdb.begin();
    while (itr2 != orgsdb.end())
    {
        itr2 = orgsdb.erase(itr2);
    }
}

void arbaro::throwifnotorg(name org)
{
    org_index orgsdb(_code, _code.value);
    auto iterator = orgsdb.find(org.value);
    eosio_assert(iterator != orgsdb.end(), "organisation does not exist");
}

void arbaro::createrole(name org, name worker, name role, uint64_t payrate)
{
    require_auth(org);
    throwifnotorg(org);

    role_index rolesdb(_code, _code.value);
    rolesdb.emplace(_self, [&](auto &row) {
        row.key = role;
        row.org = org;
        row.worker = worker;
        row.payrate = payrate;
        row.roleaccepted = false;
        row.shares = 0;
    });
};

void arbaro::acceptrole(name role)
{

    role_index rolesdb(_code, _code.value);
    auto iterator = rolesdb.find(role.value);
    eosio_assert(iterator != rolesdb.end(), "role does not exist");
    require_auth(iterator->worker);

    rolesdb.modify(iterator, _self, [&](auto &row) {
        row.roleaccepted = true;
    });
}

void arbaro::claimtime(name role, double dechours, string notes)
{

    role_index rolesdb(_code, _code.value);
    auto iterator = rolesdb.find(role.value);
    eosio_assert(iterator != rolesdb.end(), "role does not exist");
    eosio_assert(iterator->roleaccepted, "role must be accepted");
    require_auth(iterator->worker);

    org_index orgsdb(_code, _code.value);
    auto iterator2 = orgsdb.find(iterator->org.value);
    eosio_assert(iterator2 != orgsdb.end(), "org does not exist");

    uint64_t reward = dechours * iterator->payrate * 10000;
    name cont = iterator2->tokencon;

    action(
        permission_level{"contoso"_n, "active"_n},
        iterator2->tokencon,
        "issue"_n,
        std::make_tuple(iterator->worker, asset(reward, iterator2->symbol), string("Work reward")))
        .send();

    rolesdb.modify(iterator, iterator->worker, [&](auto &row) {
        row.shares += reward;
    });
}

void arbaro::createorg(name owner, name orgname, symbol tokensym, name tokencon)
{

    require_auth(owner);
    org_index orgsdb(_code, _code.value);
    orgsdb.emplace(owner, [&](auto &row) {
        row.key = orgname;
        row.manager = owner;
        row.symbol = tokensym;
        row.tokencon = tokencon;
    });
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
            EOSIO_DISPATCH_HELPER(arbaro, (init)(testreset)(createrole)(acceptrole)(claimtime)(createorg))
        }
    }
}
