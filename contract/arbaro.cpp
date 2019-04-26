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

    role_index rolesdb(_code, "contoso"_n.value);
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

void arbaro::createrole(name org, name worker, asset payrate)
{
    require_auth(org);
    eosio_assert(payrate.symbol.is_valid(), "invalid payrate");

    org_index orgsdb(_code, _code.value);
    auto itr = orgsdb.find(org.value);
    eosio_assert(itr != orgsdb.end(), "org does not exist");
    
    eosio_assert(itr->symbol == payrate.symbol, "pay does not match orgs token");
    eosio_assert(payrate.amount > 0, "only positive quantity allowed");

    role_index rolesdb(_code, org.value);
    rolesdb.emplace(org, [&](auto &row) {
        row.key = worker;
        row.payrate = payrate;
        row.roleaccepted = false;
        row.earned = asset{0, itr->symbol};
    });
};

void arbaro::acceptrole(name worker, name org)
{

    role_index rolesdb(_code, org.value);
    auto iterator = rolesdb.find(worker.value);
    eosio_assert(iterator != rolesdb.end(), "worker at this org does not exist");
    require_auth(iterator->key);

    rolesdb.modify(iterator, _self, [&](auto &row) {
        row.roleaccepted = true;
    });
}

void arbaro::claimtime(name worker, name org, double dechours, string notes)
{

    role_index rolesdb(_code, org.value);
    auto iterator = rolesdb.find(worker.value);
    eosio_assert(iterator != rolesdb.end(), "worker does not exist");
    eosio_assert(iterator->roleaccepted, "role must be accepted");
    require_auth(iterator->key);

    org_index orgsdb(_code, _code.value);
    auto iterator2 = orgsdb.find(org.value);
    eosio_assert(iterator2 != orgsdb.end(), "org does not exist");

    asset reward = dechours * iterator->payrate;
    name cont = iterator2->tokencon;
    name issuer = iterator2->key;

    action(
        permission_level{issuer, "active"_n},
        iterator2->tokencon,
        "issue"_n,
        std::make_tuple(iterator->key, reward, string("Work reward")))
        .send();

    rolesdb.modify(iterator, iterator->key, [&](auto &row) {
        row.earned += reward;
    });
}

void arbaro::createorg(name owner, symbol tokensym, name tokencon, string friendlyname)
{
    require_auth(owner);
    org_index orgsdb(_code, _code.value);
    orgsdb.emplace(owner, [&](auto &row) {
        row.key = owner;
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
