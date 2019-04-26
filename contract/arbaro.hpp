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
    ACTION testreset(eosio::name org);
    ACTION createrole(eosio::name org, eosio::name worker, eosio::asset payrate);
    ACTION acceptrole(eosio::name worker, eosio::name org);
    ACTION claimtime(eosio::name worker, eosio::name org, uint64_t minutes, std::string notes);
    ACTION createorg(eosio::name owner, eosio::symbol tokensym, eosio::name tokencon, std::string friendlyname);
    void transfer(eosio::name from, eosio::name to, eosio::asset quantity, std::string memo);

  private:
    TABLE role
    {
        eosio::name key;
        eosio::asset payrate;
        eosio::asset earned;
        bool roleaccepted;

        uint64_t primary_key() const { return key.value; }
    };

    typedef eosio::multi_index<"roles"_n, role>
        role_index;

    TABLE org
    {
        eosio::name key;
        eosio::symbol symbol;
        eosio::name tokencon;

        uint64_t primary_key() const { return key.value; }
    };

    typedef eosio::multi_index<"orgs"_n, org>
        org_index;
};
