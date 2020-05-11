📢 Use this project, [contribute](https://github.com/vtex-apps/flow-finance-payment) to it or open issues to help evolve it using [Store Discussion](https://github.com/vtex-apps/store-discussion).

# Flow Finance Payment

This is a payment authorization app for the Flow Finance payment method (financing with monthly payments). It is used in conjunction with [Flow Finance API](https://github.com/vtex-apps/flow-finance-api) and [Flow Finance Components](https://github.com/vtex-apps/flow-finance-components).

## Configuration

1. Enable Flow Finance as a payment method in your account admin. In the Gateway Affiliation, enter your Flow Finance Client ID as the `Application Key` and your Flow Finance Client Secret as the `Application Token`. For initial testing, make sure the slider is set to `Test` and not `Production/Live`.
2. [Install](https://vtex.io/docs/recipes/store/installing-an-app) `vtex.flow-finance-api` and `vtex.flow-finance-payment` in your account.
3. Configure the app settings by clicking "Apps" in your admin sidebar and then selecting "Flow Finance". The available settings are:

- `Client ID` / `Client Secret`: These are needed for the non-checkout Flow Finance API calls, such as pre-qualification checks and account creation.
- `Live`: Determines if non-checkout API calls are made in sandbox mode or not. Set to `false` if you are testing the implementation.

4. Add the following JavaScript to your account's `checkout6-custom.js` file (this will allow the shopper to choose a loan option inside the checkout payment method window):

```javascript
let loanChosen = false

async function postData(url = '', data = {}) {
  const response = await fetch(url, {
    method: 'POST',
    mode: 'cors',
    cache: 'no-cache',
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
    },
    redirect: 'follow',
    referrerPolicy: 'no-referrer',
    body: JSON.stringify(data),
  })
  if (!response.ok) {
    console.error(response)
    return response
  }
  return response.json()
}

function calculateInstallments(
  price,
  interestRate = 0.0149,
  installments = 12
) {
  if (!price || !interestRate || !installments) return 0
  const pricePerInstallment =
    (price * Math.pow(1 + interestRate, installments) * interestRate) /
    (Math.pow(1 + interestRate, installments) - 1)
  return pricePerInstallment.toFixed(2)
}

function hideFlowFinanceOption() {
  $('.payment-group-item:first').click()
  $('#payment-group-FlowFinancePaymentGroup').hide()
}

function showBuyNowButton() {
  $('.payment-submit-wrap').show()
}

function hideBuyNowButton() {
  $('.payment-submit-wrap').hide()
}

function renderPromoMessageWithLinkToSignUpPage(total) {
  let html = ''
  html += `<div class='pa3'><div>`
  html += `Financie sua compra e pague em até 12x de R$ ${calculateInstallments(
    total
  )}*`
  html += `</div><div>`
  html += `<a href='/flow-finance'>Peça seu crédito agora</a>`
  html += `</div><div class='t-mini'>`
  html += `*Parcela calculada com a taxa mínima de 2% ao mês, sem incluir o imposto sobre operações financeiras (IOF).`
  html += `</div><hr class='flowfinance-hr' /><div>Powered by Flow Finance</div>`
  html += `</div>`
  $('.flowFinancePaymentGroup').html(html)
}

function renderMessageToCheckBackLater() {
  let html = ''
  html += `<div class='pa3'><div>`
  html += `Sua análise de crédito ainda está em andamento. Em breve você vai receber uma mensagem com o resultado.`
  html += `</div><hr class='flowfinance-hr' /><div>Powered by Flow Finance</div>`
  html += `</div>`
  $('.flowFinancePaymentGroup').html(html)
}

function renderMessageThatUserDoesNotHaveEnoughCredit(availableCredit) {
  let html = ''
  html += `<div class='pa3'><div>`
  html += `Seu saldo de crédito é insuficiente para realizar esse pagamento:<br /><b>R$ ${availableCredit}</b><br /><br />Ao pagar as parcelas de suas compras anteriores, seu saldo de crédito será incrementado.`
  html += `</div><hr class='flowfinance-hr' /><div>Powered by Flow Finance</div>`
  html += `</div>`
  $('.flowFinancePaymentGroup').html(html)
}

function renderLoanOptions(loanOptions, availableCredit) {
  let html = `<div class='pa3'><div>`
  loanOptions.forEach((option, index) => {
    html += `<div class='flex flex-row flowfinance-loan-options'>`
    html += `<input type='radio' id='loan-${index}' name='loans' onClick='updateOrderForm("${option.offer_token}")' />`
    html += `<label for='loan-${index}'>`
    html += `<b>${option.term}X R$${option.installment_amount} (${option.interest_rate}% APR)</b>`
    html += `</label></div>`
  })
  html += `</div><hr class='flowfinance-hr' /><div>`
  html += `Seu saldo de crédito é: <b>R$${availableCredit}</b>`
  html += `</div><hr class='flowfinance-hr' /><div>Powered by Flow Finance</div>`
  html += `</div>`
  $('.flowFinancePaymentGroup').html(html)
}

function updateOrderForm(offerToken) {
  loanChosen = true
  let orderFormID = vtexjs.checkout.orderFormId
  $.ajax({
    url:
      window.location.origin +
      '/api/checkout/pub/orderForm/' +
      orderFormID +
      '/customData/flowfinance/chosenLoanToken',
    type: 'PUT',
    data: { value: offerToken },
    success: function() {
      vtexjs.checkout.getOrderForm().done(function(orderForm) {
        if (orderForm.customData) {
          showBuyNowButton()
        } else {
          initializeFlowFinance()
        }
      })
    },
  })
}

async function initializeFlowFinance() {
  $('.flowFinancePaymentGroup').html(
    `<div class="pa3 center"><i class="icon-spinner icon-spin" /></div>`
  )
  hideBuyNowButton()

  let email = ''
  let total = 0
  let credit = 0
  let status = 'none'
  let loanOptions = []

  await vtexjs.checkout.getOrderForm().done(function(orderForm) {
    if (orderForm.clientProfileData) {
      email = orderForm.clientProfileData.email
      total = orderForm.value

      if (email && total > 0) {
        total = total / 100
        postData(`/_v/api/connectors/flow-finance/get-loan-options`, {
          email: email,
          total: total,
        }).then(response => {
          if (
            response.accountStatus &&
            response.availableCredit &&
            response.loanOptions
          ) {
            status = response.accountStatus
            credit = response.availableCredit
            loanOptions = response.loanOptions
          }

          if (status == 'denied' || !email || !total) {
            hideFlowFinanceOption()
          }
          if (status == 'none') {
            renderPromoMessageWithLinkToSignUpPage(total)
          }
          if (status == 'pending') {
            renderMessageToCheckBackLater()
          }
          if (status == 'approved') {
            if (credit < total) {
              renderMessageThatUserDoesNotHaveEnoughCredit(credit)
            } else if (loanOptions.length) {
              renderLoanOptions(loanOptions, credit)
            }
          }
        })
      }
      if (!email || !total) {
        hideFlowFinanceOption()
      }
    }
  })
}

$(window).on('checkoutRequestBegin.vtex', function(evt, ajaxOptions) {
  if (
    !loanChosen &&
    $('.payment-group-item.active').attr('id') ==
      'payment-group-FlowFinancePaymentGroup'
  ) {
    initializeFlowFinance()
  } else {
    const json = JSON.parse(ajaxOptions.data)
    if (
      json.payments &&
      json.payments[0].paymentSystemName &&
      json.payments[0].paymentSystemName == 'FlowFinance'
    ) {
      if (!loanChosen) initializeFlowFinance()
    } else {
      showBuyNowButton()
    }
  }
})
```

5. Add the following CSS to your account's `checkout6-custom.css` file:

```css
.flex {
  display: flex;
}
.flex-column {
  flex-direction: column;
}
.flex-row {
  flex-direction: row;
}
.justify-center {
  justify-content: center;
}
.pa3 {
  padding: 0.5rem;
}
.t-mini {
  font-family: Fabriga, -apple-system, BlinkMacSystemFont, avenir next, avenir,
    helvetica neue, helvetica, ubuntu, roboto, noto, segoe ui, arial, sans-serif;
  font-weight: normal;
  font-size: 0.75rem;
  text-transform: initial;
  letter-spacing: 0;
}
.flowfinance-loan-options > input {
  margin-right: 5px;
}
.flowfinance-hr {
  border-top: 1px solid #c4c4c4;
  border-bottom: none;
}
```
