📢 Use this project, [contribute](https://github.com/vtex-apps/flow-finance-payment) to it or open issues to help evolve it using [Store Discussion](https://github.com/vtex-apps/store-discussion).

# Flow Finance Payment

This is a payment authorization app for the Flow Finance payment method (financing with monthly payments). It is used in conjunction with [Flow Finance API](https://github.com/vtex-apps/flow-finance-api) and [Flow Finance Components](https://github.com/vtex-apps/flow-finance-components).

## Configuration

1. Enable Flow Finance as a payment method in your account admin. In the Gateway Affiliation, enter your Flow Finance Client ID as the `Application Key` and your Flow Finance Client Secret as the `Application Token`. For initial testing, make sure the slider is set to `Test` and not `Production/Live`.
2. [Install](https://vtex.io/docs/recipes/store/installing-an-app) `vtex.flow-finance-api` and `vtex.flow-finance-payment` in your account.
3. Configure the app settings by clicking "Apps" in your admin sidebar and then selecting "Flow Finance". The available settings are:

- `Client ID` / `Client Secret`: These are needed for the non-checkout Flow Finance API calls, such as pre-qualification checks and account creation.
- `Live`: Determines if non-checkout API calls are made in sandbox mode or not. Set to `false` if you are testing the implementation.

4. Update the [orderForm configuration](https://developers.vtex.com/reference/configuration#updateorderformconfiguration) for your account using the following options:

```json
"apps": [
  {
    "id": "flowFinance",
    "fields": [
      "chosenLoanToken"
    ]
  }
]
```

5. Create three email templates for your account named `"flow-finance-submitted"`, `"flow-finance-approved"`, and `"flow-finance-denied"`. The first will be sent to a shopper when they complete the Flow Finance account sign up form, and one of the other two will be sent to them after Flow Finance reviews their application and either approves or rejects it.

6. Send a `POST` to `https://app.io.vtex.com/vtex.flow-finance-api/v0/{{account}}/master/_v/api/connectors/flow-finance/init-webhooks` using standard VTEX authentication; this will initialize the Flow Finance webhooks that trigger the above emails to be sent. Note that if you do this while in sandbox mode (and while using sandbox keys), you will need to do it again once the app is in production mode (and the production keys have been added).

7. Add the following JavaScript, adjusted as needed, to your account's `checkout6-custom.js` file (this will allow the shopper to choose a loan option inside the checkout payment method window):

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
  return pricePerInstallment.toFixed(2).replace('.', ',')
}

function hideFlowFinanceOption() {
  $('.payment-group-item:first').click()
  $('#payment-group-custom203PaymentGroupPaymentGroup').hide()
}

function showBuyNowButton() {
  $('#payment-flowfinance-submit').remove()
  $('.payment-submit-wrap').show()
}

function hideBuyNowButton() {
  $('.payment-submit-wrap').hide()
  $('#payment-flowfinance-submit').remove()
  $('.payment-submit-wrap')
    .after(`<button id="payment-flowfinance-submit" class="submit btn btn-success btn-large btn-block disabled">
      <span class="flowfinance-custom-button__text-wrapper">
          <span class="flowfinance-custom-button__icon"></span>
          <span class="flowfinance-custom-button__text">Finalizar Compra</span>
      </span>
  </button>`)
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
  html += `</div><hr class='flowfinance-hr' /><div class='flex flex-row'><div class='flex flex-column justify-center flowfinance-powered-by'>Powered by</div>`
  html += `<img src='https://{{account}}.vteximg.com.br/arquivos/flow-finance-logo.png' alt='Flow Finance' />`
  html += `</div></div>`
  $('.FlowFinancePaymentGroup').html(html)
}

function renderMessageToCheckBackLater() {
  let html = ''
  html += `<div class='pa3'><div>`
  html += `Sua análise de crédito ainda está em andamento. Em breve você vai receber uma mensagem com o resultado.`
  html += `</div><hr class='flowfinance-hr' /><div class='flex flex-row'><div class='flex flex-column justify-center flowfinance-powered-by'>Powered by</div>`
  html += `<img src='https://{{account}}.vteximg.com.br/arquivos/flow-finance-logo.png' alt='Flow Finance' />`
  html += `</div></div>`
  $('.FlowFinancePaymentGroup').html(html)
}

function renderMessageThatUserDoesNotHaveEnoughCredit(availableCredit) {
  let html = ''
  html += `<div class='pa3'><div>`
  html += `Seu saldo de crédito é insuficiente para realizar esse pagamento.<br />Ao pagar as parcelas de suas compras anteriores, seu saldo de crédito será incrementado.`
  html += `</div><hr class='flowfinance-hr' /><div>`
  html += `Seu saldo de crédito é: <b>R$${availableCredit
    .toString()
    .replace('.', ',')}</b>`
  html += `</div><hr class='flowfinance-hr' /><div class='flex flex-row'><div class='flex flex-column justify-center flowfinance-powered-by'>Powered by</div>`
  html += `<img src='https://{{account}}.vteximg.com.br/arquivos/flow-finance-logo.png' alt='Flow Finance' />`
  html += `</div></div>`
  $('.FlowFinancePaymentGroup').html(html)
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
  html += `Seu saldo de crédito é: <b>R$${availableCredit
    .toString()
    .replace('.', ',')}</b>`
  html += `</div><hr class='flowfinance-hr' /><div class='flex flex-row'>`
  html += `<div class='flex flex-column justify-center flowfinance-powered-by'>Powered by</div>`
  html += `<img src='https://{{account}}.vteximg.com.br/arquivos/flow-finance-logo.png' alt='Flow Finance' />`
  html += `</div></div>`
  $('.FlowFinancePaymentGroup').html(html)
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
  $('.FlowFinancePaymentGroup').html(
    `<div class="pa3 center"><i class="icon-spinner icon-spin" /></div>`
  )
  $('.FlowFinancePaymentGroup').show()
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

          if (status === 'rejected' || !email || !total) {
            hideFlowFinanceOption()
          }
          if (status === 'none' || status === 'pending') {
            renderPromoMessageWithLinkToSignUpPage(total)
          }
          if (status === 'under-review') {
            renderMessageToCheckBackLater()
          }
          if (status === 'approved') {
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
  console.log('checkout request begin')
  if (
    !loanChosen &&
    $('.payment-group-item.active').attr('id') ===
      'payment-group-FlowFinancePaymentGroup'
  ) {
    initializeFlowFinance()
  } else {
    const json = JSON.parse(ajaxOptions.data)
    if (
      json.payments &&
      json.payments[0].paymentSystemName &&
      json.payments[0].paymentSystemName === 'Flow Finance'
    ) {
      if (!loanChosen) initializeFlowFinance()
    } else {
      showBuyNowButton()
    }
  }
})

$(window).on('hashchange', function() {
  if (
    '#/payment' === window.location.hash &&
    $('.payment-group-item.active').attr('id') ===
      'payment-group-FlowFinancePaymentGroup'
  ) {
    initializeFlowFinance()
  }
})
```

8. Add the following CSS, adjusted as needed, to your account's `checkout6-custom.css` file:

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
.FlowFinancePaymentGroup {
  display: none;
}
```
