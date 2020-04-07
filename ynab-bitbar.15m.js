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
  process.exitCode = 1;
}

const ynabAPI = new ynab.API(API_KEY);

const currentMonth = moment().startOf("month");

(async function () {
  const budgetsResponse = await ynabAPI.budgets.getBudgets();
  const budgets = budgetsResponse.data.budgets;

  const firstBudgetID = budgets[0] && budgets[0].id;
  const budgetResponse = await ynabAPI.budgets.getBudgetById(firstBudgetID);

  const months = budgetResponse.data.budget.months;
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
      )}) / ${formatter.format(theMonth.budgeted / 1000)}`,
      color: bitbar.darkMode ? "white" : "red",
      dropdown: false,
    },
  ]);
})();
