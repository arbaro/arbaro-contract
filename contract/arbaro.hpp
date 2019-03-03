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
    ACTION createworker(eosio::name worker, uint64_t payrate);
    ACTION acceptrole(eosio::name worker);
    ACTION claimtime(eosio::name worker, double dechours, std::string notes);
    void transfer(eosio::name from, eosio::name to, eosio::asset quantity, std::string memo);

  private:
    TABLE worker
    {
        eosio::name key;
        uint64_t payrate;
        uint64_t shares;
        bool roleaccepted;

        uint64_t primary_key() const { return key.value; }
    };

    typedef eosio::multi_index<"workers"_n, worker>
        worker_index;
};
