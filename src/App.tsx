import React from "react";
import Web3 from "web3";
import humanStandardTokenABI from "./humanStandardTokenABI";
import { format } from "d3-format";
import "./App.css";

interface Token {
  symbol: string;
  name: string;
  address: string;
  decimals: number;
  logoURI: string;
}

interface AppState {
  web3?: Web3;
  accountAddress?: string;
  isLoaded: boolean;
  ethBalance?: string;
  // keys are the token names
  allTokens: Record<string, Token>;
  tokenBalances: Record<string, string>;
  tokenPrices: Record<string, string>;
}

declare global {
  interface Window {
    ethereum: any;
  }
}

class App extends React.Component<any, AppState> {
  relevantTokens = [
    "DAI",
    "LINK",
    "UNI",
    "AAVE",
    "SUSHI",
    "SNX",
    "COMP",
    "ZRX",
    "FTM",
    "MIR",
    "1INCH",
  ] as Array<string>;

  constructor(props: any) {
    super(props);

    this.state = {
      web3: undefined,
      accountAddress: undefined,
      isLoaded: false,
      ethBalance: undefined,
      allTokens: {},
      tokenBalances: {},
      tokenPrices: {},
    };
  }

  isMetamaskInstalled() {
    return typeof window.ethereum !== "undefined";
  }

  updateEthBalance(balance: any) {
    if (this.state.web3) {
      const ethBalance = this.state.web3.utils.fromWei(balance);
      this.setState({ ethBalance });
    } else {
      console.error("web3 is not yet initialized");
    }
  }

  updateTokenBalance(token: string, balance: any) {
    if (this.state.web3) {
      const { tokenBalances, web3 } = this.state;
      tokenBalances[token] = web3.utils.fromWei(balance);
      this.setState({ tokenBalances });
    } else {
      console.error("web3 is not yet initialized");
    }
  }

  async connectToMetaMask() {
    const accounts = await window.ethereum.request({
      method: "eth_requestAccounts",
    });
    const accountAddress = accounts[0];
    const web3 = new Web3(window.ethereum);
    this.setState({ web3, accountAddress });
    web3.eth.getBalance(accountAddress).then(this.updateEthBalance.bind(this));
    this.relevantTokens.forEach((token: string) => {
      const tokenContractAddress = this.state.allTokens[token].address;
      const tokenPromise = new web3.eth.Contract(
        humanStandardTokenABI as any,
        tokenContractAddress
      );
      tokenPromise.methods
        .balanceOf(accountAddress)
        .call()
        .then((balance: any) => {
          this.updateTokenBalance(token, balance);
        });
      this.fetchTokenPrice(tokenContractAddress).then((price) => {
        const { tokenPrices } = this.state;
        tokenPrices[token] = price;
        this.setState({ tokenPrices });
      });
    });
  }

  async fetchTokenPrice(tokenAddress: string): Promise<string> {
    return fetch(
      `https://api.coingecko.com/api/v3/simple/token_price/ethereum?contract_addresses=${tokenAddress}&vs_currencies=usd`
    )
      .then((res) => res.json())
      .then((results) => {
        const price = Object.values(results)[0] as any;
        return price["usd"];
      });
  }

  componentDidMount() {
    fetch("https://api.1inch.exchange/v2.0/tokens")
      .then((res) => res.json())
      .then((results) => {
        const allTokens = {} as Record<string, Token>;
        Object.values(results.tokens).forEach(
          (token: any, i: number, array: any) => {
            allTokens[token.symbol] = token as Token;
          }
        );
        this.setState({
          isLoaded: true,
          allTokens: allTokens,
        });
      });
  }

  renderTokenBalance(token: Token) {
    const { tokenBalances, tokenPrices } = this.state;
    const symbol = token.symbol;
    const balance = +tokenBalances[symbol];
    const price = +tokenPrices[symbol];
    const positionSizeUSD = price * balance;
    const currencyFormat = format("$,.2f");
    const amountFormat = format(".2f");
    if (balance) {
      return (
        <tr key={symbol}>
          <td className="border border-light-blue-500 px-4 py-2 text-light-blue-600 font-medium">
            {symbol}
          </td>
          <td className="border border-light-blue-500 px-4 py-2 text-light-blue-600 font-medium">
            {amountFormat(balance)}
          </td>
          <td className="border border-light-blue-500 px-4 py-2 text-light-blue-600 font-medium">
            {currencyFormat(price)}
          </td>
          <td className="border border-light-blue-500 px-4 py-2 text-light-blue-600 font-medium">
            {currencyFormat(positionSizeUSD)}
          </td>
        </tr>
      );
    }
  }

  render() {
    if (!this.state) {
      return <div>Loading...</div>;
    }
    const { allTokens, ethBalance, accountAddress, tokenBalances } = this.state;
    const amountFormat = format(".2f");
    return (
      <div className="min-h-screen bg-gray-100 py-6 flex flex-col justify-center sm:py-12">
        <div className="relative py-3 sm:max-w-xl sm:mx-auto">
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-light-blue-500 shadow-lg transform -skew-y-6 sm:skew-y-0 sm:-rotate-6 sm:rounded-3xl"></div>
          <div className="relative px-4 py-10 bg-white shadow-lg sm:rounded-3xl sm:p-20">
            <div className="max-w-md mx-auto">
              <div className="divide-y divide-gray-200">
                <div className="py-8 text-base leading-6 space-y-4 text-gray-700 sm:text-lg sm:leading-7">
                  <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
                    Deephy
                  </h1>
                  <p>
                    Get a detailed balance of your DeFi tokens and get an
                    account overview. Click the button below to get started.
                  </p>
                  {this.isMetamaskInstalled() && !this.state.web3 && (
                    <button
                      onClick={this.connectToMetaMask.bind(this)}
                      className="text-white mt-auto bg-emerald-800 bg-opacity-50 hover:bg-opacity-75 transition-colors duration-200 rounded-xl font-semibold py-2 px-4 inline-flex"
                    >
                      Connect to MetaMask
                    </button>
                  )}
                  {accountAddress && (
                    <p>
                      Address:{" "}
                      <code>
                        <small>{accountAddress}</small>
                      </code>
                    </p>
                  )}
                  {Object.values(tokenBalances).length > 0 && (
                    <div>
                      <table className="table-auto">
                        <thead className="bg-indigo-200">
                          <tr>
                            <th className="border border-light-blue-500 px-4 py-2 text-light-blue-600 font-medium">
                              Token
                            </th>
                            <th className="border border-light-blue-500 px-4 py-2 text-light-blue-600 font-medium">
                              Amount
                            </th>
                            <th className="border border-light-blue-500 px-4 py-2 text-light-blue-600 font-medium">
                              Current price
                            </th>
                            <th className="border border-light-blue-500 px-4 py-2 text-light-blue-600 font-medium">
                              Equity
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {ethBalance && (
                            <tr>
                              <td className="border border-light-blue-500 px-4 py-2 text-light-blue-600 font-medium">
                                ETH
                              </td>
                              <td className="border border-light-blue-500 px-4 py-2 text-light-blue-600 font-medium">
                                {amountFormat(+ethBalance)}
                              </td>
                              <td className="border border-light-blue-500 px-4 py-2 text-light-blue-600 font-medium">
                                $0.00
                              </td>
                              <td className="border border-light-blue-500 px-4 py-2 text-light-blue-600 font-medium">
                                $0.00
                              </td>
                            </tr>
                          )}
                          {Object.values(allTokens).map(
                            this.renderTokenBalance.bind(this)
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export default App;
