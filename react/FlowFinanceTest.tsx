import React, { FunctionComponent } from 'react'
import FlowFinanceModal from './components/FlowFinanceModal'

const FlowFinanceTest: FunctionComponent = () => {
  const json = JSON.stringify({
    pdfUrl:
      'https://reportsteste.moneyp.com.br/reportscustom/urbe/imprimirccb?code=64c1e4f9-e31b-42b6-b58a-73f611079b18&copias=1',
    accountId: 3,
    loanId: 4,
    callbackUrl: 'blah',
    inboundRequestsUrl: 'blah2',
    transactionId: 'dfjkdf',
  })

  return typeof document != 'undefined' ? (
    <FlowFinanceModal appPayload={json} />
  ) : null
}

export default FlowFinanceTest
