#include <string>

#include <eosiolib/eosio.hpp>
#include <eosiolib/asset.hpp>

#define EOS_SYMBOL symbol("EOS", 4)

CONTRACT arbaro : public eosio::contract
{
    using contract::contract;

  public:
    struct init
    {
        init(){};
        eosio::name name;
        EOSLIB_SERIALIZE(init, (name))
    };

    ACTION init(eosio::name name);
    ACTION testreset();
    ACTION createrole(eosio::name org, eosio::name worker, eosio::name role, uint64_t payrate);
    ACTION acceptrole(eosio::name role);
    ACTION claimtime(eosio::name role, double dechours, std::string notes);
    ACTION createorg(eosio::name owner, eosio::name orgname, eosio::symbol tokensym, eosio::name tokencon);
    void transfer(eosio::name from, eosio::name to, eosio::asset quantity, std::string memo);
    void throwifnotorg(eosio::name org);

  private:
    TABLE role
    {
        eosio::name key;
        eosio::name org;
        eosio::name worker;
        uint64_t payrate;
        uint64_t shares;
        bool roleaccepted;

        uint64_t primary_key() const { return key.value; }
    };

    typedef eosio::multi_index<"roles"_n, role>
        role_index;

    TABLE org
    {
        eosio::name key;
        eosio::symbol symbol;
        eosio::name manager;
        eosio::name tokencon;

        uint64_t primary_key() const { return key.value; }
    };

    typedef eosio::multi_index<"orgs"_n, org>
        org_index;
};
