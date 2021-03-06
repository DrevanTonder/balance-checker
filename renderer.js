const axios = require('axios');
const Vue = require("./node_modules/vue/dist/vue.js");
const fs = require("fs");

const config = JSON.parse(fs.readFileSync("config.json"));

const walletRegex = /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/;

var balanceChecker = new Vue({
  el: '#balance-checker',
  data: {
    currency: config.currency,
    exchangeRate: 0,
    walletAddress: config.defaultWalletAddress,
    canUpdate: false,

    pools: config.pools,
  },
  methods: {
    setExchangeRate: function(){
      axios.get(config.bitcoinRateProvider)
        .then(function (response) {
          this.exchangeRate = response.data[this.currency]["15m"];
          console.log("Exchange Rate:",this.exchangeRate);
        }.bind(this));
    },

    validateWalletAddress: function(){
      if (walletRegex.test(this.walletAddress)){
        this.canUpdate = true;
        this.updatePools();
      }
    },

    updatePools: function () {
      if(this.canUpdate){
        this.pools.forEach(function(pool){
          this.getPoolData(pool);
        }.bind(this));
      }

    },

    getPoolData: function(pool){
      var apiURL = pool.API.replace("WALLET_ADDRESS",this.walletAddress)
      axios.get(apiURL)
        .then(function (response) {
          pool.unpaidBalance = (response.data.total_unpaid || response.data.unpaid);
          pool.unpaidBalanceWorth = this.calculateWorth(pool.unpaidBalance);
        }.bind(this))
        .catch(function(error) {
          setTimeout(function(){ this.getPoolData(pool); }.bind(this), 2000);
        }.bind(this));
    },

    calculateWorth: function(cryptocurrencyAmount){
      return (cryptocurrencyAmount * this.exchangeRate).toFixed(2);
    }
  },

  mounted: function () {
    this.setExchangeRate();
    this.validateWalletAddress();
    this.updatePools();

    setInterval(function () {
      this.updatePools();
    }.bind(this), 30000);
  }

});
