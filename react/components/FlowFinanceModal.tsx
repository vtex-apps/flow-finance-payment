import React, { Component } from 'react'
import { ModalDialog } from 'vtex.styleguide'
import '../theme.css'

interface FlowFinanceAuthenticationProps {
  appPayload: string
}

declare const vtex: any
declare const $: any

class FlowFinanceModal extends Component<FlowFinanceAuthenticationProps> {
  public state = {
    pdfLoaded: false,
    modalOpen: true,
  }

  public componentDidMount() {
    vtex.checkout.MessageUtils.hidePaymentMessage()
  }

  public respondTransaction = async (status: boolean) => {
    const { callbackUrl, transactionId } = JSON.parse(this.props.appPayload)
    if (!status) {
      vtex.checkout.MessageUtils.showPaymentMessage()
      await fetch(
        `${callbackUrl}?tid=${transactionId}&message=Modal failed or was closed by user&status=denied`,
        {
          method: 'post',
          mode: 'no-cors',
        }
      )
    }
    $(window).trigger('transactionValidation.vtex', [status])
  }

  public handleConfirmation = async () => {
    vtex.checkout.MessageUtils.showPaymentMessage()
    this.setState({ modalOpen: false })
    const { inboundRequestsUrl, callbackUrl, accountId, loanId } = JSON.parse(
      this.props.appPayload
    )
    const inbound = inboundRequestsUrl.replace(':action', 'loanAcceptance')
    const userAgent = navigator.userAgent
    const data = {
      userAgent: userAgent,
      accountId: accountId,
      loanId: loanId,
      callbackUrl: callbackUrl,
    }
    await fetch(`${inbound}`, {
      method: 'post',
      mode: 'no-cors',
      body: JSON.stringify(data),
    })
    this.respondTransaction(true)
  }

  public render() {
    const { pdfUrl } = JSON.parse(this.props.appPayload)

    return (
      <ModalDialog
        centered
        closeOnOverlayClick={false}
        isOpen={this.state.modalOpen}
        title="Para continuar você precisa aceitar os termos do contrato de financiamento"
        confirmation={
          this.state.pdfLoaded
            ? {
                onClick: this.handleConfirmation,
                label: 'Aceito',
              }
            : {
                onClick: () => {
                  return false
                },
                label: 'Espere por favor',
              }
        }
        cancelation={{
          onClick: () => this.respondTransaction(false),
          label: 'Cancelar',
        }}
        onClose={() => this.respondTransaction(false)}
      >
        <div style={{ minWidth: '40vw' }}>
          <iframe
            title="Flow Finance Loan Agreement"
            width="95%"
            height={400}
            src={pdfUrl}
            data-testid="embedded-pdf"
            className={`db center`}
            frameBorder="0"
            onLoad={() => this.setState({ pdfLoaded: true })}
          />
        </div>
      </ModalDialog>
    )
  }
}

export default FlowFinanceModal
