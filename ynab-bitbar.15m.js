#!/usr/bin/env /usr/local/bin/node

const ynab = require("ynab");
const moment = require("moment");
const bitbar = require("bitbar");

const API_KEY = "APIKEY";

if (API_KEY === "APIKEY") {
  bitbar([
    {
      text: "YNAB: Enter your API Key",
      color: bitbar.darkMode ? "white" : "red",
      dropdown: false,
    },
  ]);
  return (process.exitCode = 1);
}

const ynabAPI = new ynab.API(API_KEY);

const currentMonth = moment().startOf("month");

(async function () {
  const budgetsResponse = await ynabAPI.budgets.getBudgets();
  const budgets = budgetsResponse.data.budgets;

  const firstBudgetID = budgets[0] && budgets[0].id;
  const budgetResponse = await ynabAPI.budgets.getBudgetById(firstBudgetID);
  const theBudget = budgetResponse.data.budget;
  const transRespone = await ynabAPI.transactions.getTransactions(theBudget.id);
  const trans = transRespone.data.transactions;

  const uncategorizedTransactions = trans.filter(
    ({ date, category_id, approved, payee_name, transfer_account_id }) =>
      moment(date).isBetween(
        currentMonth,
        moment(currentMonth).endOf("month")
      ) &&
      (!category_id || !approved) &&
      payee_name !== "Starting Balance" &&
      !transfer_account_id
  );
  const hasTransactions = !!uncategorizedTransactions.length;

  const groupedTrans = groupTrans(uncategorizedTransactions, "account_id");

  const months = theBudget.months;
  const theMonth = months.find(
    ({ month }) => month === currentMonth.format("YYYY-MM-DD")
  );

  const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  });

  bitbar([
    {
      text: `YNAB: (${formatter.format(
        theMonth.to_be_budgeted / 1000
      )}) / ${formatter.format(theMonth.budgeted / 1000)}${
        hasTransactions ? " \u25CF" : ""
      }`,
      color: bitbar.darkMode ? "white" : "black",
      dropdown: false,
    },
    bitbar.separator,
    ...[
      hasTransactions && {
        text: "Outstanding Transactions",
      },
      ...Object.entries(groupedTrans).map(([account_id, values]) => ({
        text: `${values[0].account_name}: ${values.length} transaction${
          values.length > 1 ? "s" : ""
        }`,
        href: `https://app.youneedabudget.com/${theBudget.id}/accounts/${account_id}`,
      })),
    ].filter(Boolean),
    bitbar.separator,
    {
      text: "Linked Accounts",
    },
    ...theBudget.accounts
      .filter(({ closed, deleted }) => !closed && !deleted)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(({ balance, id, name }) => ({
        text: `${name}: ${formatter.format(balance / 1000)}`,
        color: balance < 0 ? "red" : bitbar.darkMode ? "white" : "black",
        href: `https://app.youneedabudget.com/${theBudget.id}/accounts/${id}`,
      })),
    bitbar.separator,
    {
      text: "Refresh YNAB",
      refresh: true,
    },
  ]);
})();

function groupTrans(arr, property) {
  return arr.reduce(function (memo, x) {
    if (!memo[x[property]]) {
      memo[x[property]] = [];
    }
    memo[x[property]].push(x);
    return memo;
  }, {});
}
