import {serializeError} from 'serialize-error'
import VError from 'verror'
import config from '../../config/config.js'
import {addPaydockHttpLog, addPaydockLog} from '../../utils/logger.js'
import ctp from '../../utils/ctp.js'
import customObjectsUtils from '../../utils/custom-objects-utils.js'

async function processNotification(
    notificationResponse
) {
    const {notification, event} = notificationResponse

    const ctpConfig = config.getNotificationConfig()
    const ctpClient = await ctp.get(ctpConfig)

    let result = {}

    if (!notification.reference) {
        result.status = 'Failure'
        result.message = 'Reference not found'
    } else {
        const paymentKey = notification.reference
        const paymentObject = await getPaymentByMerchantReference(ctpClient, paymentKey)

        if (!paymentObject) {
            result.status = 'Failure'
            result.message = 'Payment not found'
        } else if (event !== undefined) {
            addPaydockHttpLog(notificationResponse)
            switch (event) {
                case 'transaction_success':
                case 'transaction_failure':
                case 'fraud_check_in_review':
                case 'fraud_check_in_review_async_approved':
                case 'fraud_check_transaction_in_review_async_approved':
                case 'fraud_check_success':
                case 'fraud_check_transaction_in_review_approved':
                case 'fraud_check_failed':
                case 'fraud_check_transaction_in_review_declined':
                    result = await processWebhook(event, paymentObject, notification, ctpClient)
                    break
                case 'standalone_fraud_check_success':
                case 'standalone_fraud_check_failed':
                case 'standalone_fraud_check_in_review_approved':
                case 'standalone_fraud_check_in_review_declined':
                case 'standalone_fraud_check_in_review_async_approved':
                case 'standalone_fraud_check_in_review_async_declined':
                    result = await processFraudNotification(event, paymentObject, notification, ctpClient)
                    break
                case 'refund_success':
                    result = await processRefundSuccessNotification(event, paymentObject, notification, ctpClient)
                    break
                default:
                    result.status = 'Failure'
                    result.message = 'Notification Event not found'
            }
        }
    }

    return result
}

async function processWebhook(event, payment, notification, ctpClient) {
    const result = {}
    const {status, paymentStatus, orderStatus} = await getNewStatuses(notification)
    let customStatus = status;
    const chargeId = notification._id
    const currentPayment = payment
    const currentVersion = payment.version
    const updateActions = [{
        action: 'setCustomField',
        name: 'PaymentExtensionRequest',
        value: JSON.stringify({
            action: 'FromNotification',
            request: {}
        })
    }];
    if(status === 'paydock-paid'){
        const capturedAmount = parseFloat(notification.transaction.amount) || 0
        const orderAmount = calculateOrderAmount(payment);
        customStatus = capturedAmount < orderAmount ? 'paydock-p-paid' : 'paydock-paid'
        updateActions.push({
            action: 'setCustomField',
            name: 'CapturedAmount',
            value: capturedAmount
        })
    }


    let operation = notification.type
    operation = operation ? operation.toLowerCase() : 'undefined'
    operation = operation.charAt(0).toUpperCase() + operation.slice(1)
    updateActions.push( {
        action: 'setCustomField',
        name: 'PaydockPaymentStatus',
        value: customStatus
    })

    try {
        await ctpClient.update(ctpClient.builder.payments, currentPayment.id, currentVersion, updateActions)
        await updateOrderStatus(ctpClient, currentPayment.id, paymentStatus, orderStatus);
        result.status = 'Success'
    } catch (error) {
        result.status = 'Failure'
        result.message = error
    }

    await addPaydockLog({
        paydockChargeID: chargeId,
        operation,
        status: result.status,
        message: result.message ?? ''
    })
    return result
}


async function processFraudNotification(event, payment, notification, ctpClient) {
    let result = {}
    const currentPayment = payment
    const currentVersion = payment.version
    const cacheName = `paydock_fraud_${notification.reference}`

    let operation = notification.type
    operation = operation ? operation.charAt(0).toUpperCase() + operation.slice(1).toLowerCase() : 'Undefined';

    if (notification.status !== 'complete') {
        result.message = operation
        result.paydockStatus = 'paydock-failed'
        await customObjectsUtils.removeItem(cacheName)

        const updateActions = [{
            action: 'setCustomField',
            name: 'PaydockPaymentStatus',
            value: result.paydockStatus
        },
            {
                action: 'setCustomField',
                name: 'PaymentExtensionRequest',
                value: JSON.stringify({
                    action: 'FromNotification',
                    request: {}
                })
            }]
        try {
            await ctpClient.update(ctpClient.builder.payments, currentPayment.id, currentVersion, updateActions)
        } catch (error) {
            result.status = 'Failure'
            result.message = error
        }
    } else {
        result = await processFraudNotificationComplete(event, payment, notification, ctpClient);
    }
    return result
}


async function processFraudNotificationComplete(event, payment, notification, ctpClient) {

    const fraudChargeId = notification._id ?? null;
    const cacheName = `paydock_fraud_${notification.reference}`
    let cacheData = await customObjectsUtils.getItem(cacheName)
    if (!cacheData) {
        return {message: 'Fraud data not found in local storage'};
    }

    cacheData = JSON.parse(cacheData)
    const request = await generateChargeRequest(notification, cacheData, fraudChargeId)
    const isDirectCharge = cacheData.capture
    await customObjectsUtils.removeItem(cacheName)
    const response = await createCharge(request, {directCharge: isDirectCharge}, true)
    const updatedChargeId = extractChargeIdFromNotification(response);

    if (response?.error) {
        result.status = 'UnfulfilledCondition'
        result.message = `Can't charge.${errorMessageToString(response)}`

        await addPaydockLog({
            paydockChargeID: updatedChargeId,
            operation: 'Charge',
            status: result.status,
            message: result.message
        })
        return result
    }

    if (cacheData._3ds) {
        const attachResponse = await cardFraudAttach({fraudChargeId, updatedChargeId})
        if (attachResponse?.error) {
            result.status = 'UnfulfilledCondition'
            result.message = `Can't fraud attach.${errorMessageToString(attachResponse)}`

            await addPaydockLog({
                paydockChargeID: updatedChargeId,
                operation: 'Fraud Attach',
                status: result.status,
                message: result.message
            })
            return result
        }
    }

    return await handleFraudNotification(response, updatedChargeId, ctpClient, payment);
}

function extractChargeIdFromNotification(response) {
    return response?.resource?.data?._id || response?.resource?.data?.id || 0;
}

async function handleFraudNotification(response, updatedChargeId, ctpClient, payment) {
    let updateActions = [];

    const currentPayment = payment
    const currentVersion = payment.version
    let status = response?.resource?.data?.status
    status = status ? status.toLowerCase() : 'undefined'
    status = status.charAt(0).toUpperCase() + status.slice(1)

    let operation = response?.resource?.data?.type
    operation = operation ? operation.toLowerCase() : 'undefined'
    operation = operation.charAt(0).toUpperCase() + operation.slice(1)

    const isAuthorization = response?.resource?.data?.authorization ?? 0

    const {commerceToolsPaymentStatus, paydockStatus} = determineFraudPaymentStatus(isAuthorization, status);
    result.paydockStatus = paydockStatus

    updateActions = [
        {
            action: 'setCustomField',
            name: 'PaydockPaymentStatus',
            value: result.paydockStatus
        },
        {
            action: 'setCustomField',
            name: 'PaydockTransactionId',
            value: chargeId
        }
    ]

    try {
        await ctpClient.update(ctpClient.builder.payments, currentPayment.id, currentVersion, updateActions)
        await updateOrderStatus(ctpClient, currentPayment.id, commerceToolsPaymentStatus, 'Open');

        result.status = 'Success'

        await addPaydockLog({
            paydockChargeID: chargeId,
            operation,
            status: result.status,
            message: ''
        })

        return result
    } catch (error) {
        result.status = 'Failure'
        result.message = error

        updateActions = [
            {
                action: 'setCustomField',
                name: 'PaydockPaymentStatus',
                value: 'paydock-failed'
            },
            {
                action: 'setCustomField',
                name: 'PaydockTransactionId',
                value: chargeId
            },
            {
                action: 'setCustomField',
                name: 'PaymentExtensionRequest',
                value: JSON.stringify({
                    action: 'FromNotification',
                    request: {}
                })
            }
        ]
        await ctpClient.update(ctpClient.builder.payments, currentPayment.id, currentVersion, updateActions)
        await updateOrderStatus(ctpClient, currentPayment.id, 'Failed', 'Cancelled');
    }
    return result;
}

function determineFraudPaymentStatus(isAuthorization, status) {
    if (isAuthorization && ['Pending', 'Pre_authentication_pending'].includes(status)) {
        return {paymentStatus: 'Pending', paydockStatus: 'paydock-authorize'};
    }
    const isCompleted = status === 'Complete';
    return {
        paymentStatus: isCompleted ? 'Paid' : 'Pending',
        paydockStatus: isCompleted ? 'paydock-paid' : 'paydock-pending'
    };
}

async function generateChargeRequest(notification, cacheData, fraudChargeId) {
    const paymentSource = notification.customer.payment_source

    if (cacheData.gateway_id) {
        paymentSource.gateway_id = cacheData.gateway_id
    }

    const isDirectCharge = cacheData.capture


    const request = {
        amount: notification.amount,
        reference: notification.reference,
        currency: notification.currency,
        customer: {
            first_name: cacheData.billingAddress.firstName,
            last_name: cacheData.billingAddress.lastName,
            email: cacheData.billingAddress.email,
            phone: cacheData.billingAddress.phone
        },
        fraud_charge_id: fraudChargeId,
        capture: isDirectCharge,
        authorization: !isDirectCharge
    }
    request.customer.payment_source = paymentSource
    if (cacheData.charge3dsId) {
        request._3ds_charge_id = cacheData.charge3dsId
    }

    if (cacheData._3ds) {
        request._3ds = cacheData._3ds
    }

    if (cacheData.ccv) {
        request.customer.payment_source.card_ccv = cacheData.ccv
    }
    return request
}

async function createCharge(data, params = {}, returnObject = false) {
    try {
        let url = '/v1/charges'
        if (params.action !== undefined) {
            if (params.action === 'standalone-fraud') {
                url += '/fraud'
            }
            if (params.action === 'standalone-fraud-attach') {
                url += `/${params.chargeId}/fraud/attach`
            }
        }

        if (params.directCharge !== undefined && params.directCharge === false) {
            url += '?capture=false'
        }

        const {response} = await callPaydock(url, data, 'POST')

        if (returnObject) {
            return response
        }

        if (response.status === 201) {
            return {
                status: 'Success',
                message: 'Charge is created successfully',
                chargeId: response.resource.data._id
            }
        }

        return {
            status: 'Failure',
            message: response?.error?.message,
            chargeId: '0'
        }
    } catch (error) {
        return {
            status: 'Failure',
            message: error.message || 'Unknown error',
            chargeId: '0'
        }
    }
}

async function processRefundSuccessNotification(event, payment, notification, ctpClient) {

    if (!notification.transaction || notification.from_webhook) {
        return {status: 'Failure'};
    }
    const result = {}
    let paydockStatus
    let chargeId = notification._id
    const currentPayment = payment
    const currentVersion = payment.version

    if (wasMerchantRefundedFromCommercetools(currentPayment)) {
        await ctpClient.update(ctpClient.builder.payments, currentPayment.id, currentVersion, [
            {
                action: 'setCustomField',
                name: 'PaymentExtensionResponse',
                value: null
            },
            {
                action: 'setCustomField',
                name: 'PaymentExtensionRequest',
                value: JSON.stringify({
                    action: 'FromNotification',
                    request: {}
                })
            }
        ])
        return {status: 'Success', message: ''}
    }
    const refundAmount = parseFloat(notification.transaction.amount) || 0
    const orderAmount = parseFloat(payment?.custom?.fields?.CapturedAmount) || 0;
    const oldRefundAmount = parseFloat(payment?.custom?.fields?.RefundedAmount) || 0;
    const notificationStatus = formatNotificationStatus(notification.status);

    if (['REFUNDED', 'REFUND_REQUESTED'].includes(notificationStatus.toUpperCase())) {
        paydockStatus = (oldRefundAmount + refundAmount) < orderAmount ? 'paydock-p-refund' : 'paydock-refunded'
    }
    if (paydockStatus && refundAmount) {
        const refunded = calculateRefundedAmount(paydockStatus, oldRefundAmount, refundAmount, orderAmount);
        const updateActions = [
            {
                action: 'setCustomField',
                name: 'PaydockPaymentStatus',
                value: paydockStatus
            },
            {
                action: 'setCustomField',
                name: 'RefundedAmount',
                value: refunded
            },
            {
                action: 'setCustomField',
                name: 'PaymentExtensionRequest',
                value: JSON.stringify({
                    action: 'FromNotification',
                    request: {}
                })
            }
        ]

        if (chargeId) {
            updateActions.push({
                action: 'setCustomField',
                name: 'PaydockTransactionId',
                value: chargeId
            })
        }

        try {
            await ctpClient.update(ctpClient.builder.payments, currentPayment.id, currentVersion, updateActions)
            await updateOrderStatus(ctpClient, currentPayment.id, 'Paid', 'Complete');

            result.status = 'Success'
            result.message = `Refunded ${refunded}`
        } catch (error) {
            result.status = 'Failure'
            result.message = error
        }
    }
    chargeId = chargeId ?? currentPayment.custom.fields.PaydockTransactionId
    await addPaydockLog({
        paydockChargeID: chargeId,
        operation: paydockStatus,
        status: result.status,
        message: result.message ?? ''
    })

    return result

}

function calculateRefundedAmount(paydockStatus, oldRefundAmount, refundAmount, orderAmount) {
    return paydockStatus === 'paydock-refunded' ? orderAmount : oldRefundAmount + refundAmount;
}

function calculateOrderAmount(payment){
    const fraction = payment.amountPlanned.type === 'centPrecision' ? Math.pow(10, payment.amountPlanned.fractionDigits) : 1;
    return payment.amountPlanned.centAmount / fraction;
}

function wasMerchantRefundedFromCommercetools(payment){
    const prevResponse = payment?.custom?.fields?.PaymentExtensionResponse;
    return prevResponse && JSON.parse(prevResponse)?.message === 'Merchant refunded money';
}

function formatNotificationStatus(status) {
    return status ? status.toLowerCase().charAt(0).toUpperCase() + status.slice(1).toLowerCase() : 'Undefined';
}

async function updateOrderStatus(
    ctpClient,
    id,
    paymentStatus,
    orderStatus
) {
    let order = await ctpClient.fetchOrderByNymber(ctpClient.builder.orders, id)
    if (order) {
        order = order.body
        const updateOrderActions = [
            {
                action: 'changePaymentState',
                paymentState: paymentStatus,
            },
            {
                action: 'changeOrderState',
                orderState: orderStatus
            }
        ]
        await ctpClient.update(ctpClient.builder.orders, order.id, order.version, updateOrderActions)
    }
}


async function getPaymentByMerchantReference(
    ctpClient,
    paymentKey
) {
    try {
        // eslint-disable-next-line no-shadow
        const result = await ctpClient.fetchById(ctpClient.builder.payments, paymentKey)
        return result.body
    } catch (err) {
        if (err.statusCode === 404) return null
        const errMsg =
            `Failed to fetch a payment` +
            `Error: ${JSON.stringify(serializeError(err))}`
        throw new VError(err, errMsg)
    }
}

async function cardFraudAttach({fraudChargeId, chargeId}) {
    const request = {
        fraud_charge_id: fraudChargeId
    }

    return createCharge(request, {action: 'standalone-fraud-attach', chargeId}, true)
}


async function getNewStatuses(notification) {
    let {status} = notification
    status = status ? status.toLowerCase() : 'undefined'
    status = status.charAt(0).toUpperCase() + status.slice(1)

    let paydockPaymentStatus
    let commerceToolsPaymentStatus
    let orderPaymentStatus

    switch (status.toUpperCase()) {
        case 'COMPLETE':
            paydockPaymentStatus = 'paydock-paid'
            commerceToolsPaymentStatus = 'Paid'
            orderPaymentStatus = 'Complete'
            break
        case 'PENDING':
        case 'PRE_AUTHENTICATION_PENDING':
            paydockPaymentStatus = notification.capture ? 'paydock-pending' : 'paydock-authorize'
            commerceToolsPaymentStatus = notification.capture ? 'Pending' : 'Paid'
            orderPaymentStatus = 'Open'
            break
        case 'CANCELLED':
            paydockPaymentStatus = 'paydock-cancelled'
            commerceToolsPaymentStatus = 'Paid'
            orderPaymentStatus = 'Cancelled'
            break
        case 'REFUNDED':
            paydockPaymentStatus = 'paydock-refunded'
            commerceToolsPaymentStatus = 'Paid'
            orderPaymentStatus = 'Complete'
            break
        case 'REQUESTED':
            paydockPaymentStatus = 'paydock-requested'
            commerceToolsPaymentStatus = 'Pending'
            orderPaymentStatus = 'Open'
            break
        case 'DECLINED':
        case 'FAILED':
            paydockPaymentStatus = 'paydock-failed'
            commerceToolsPaymentStatus = 'Failed'
            orderPaymentStatus = 'Cancelled'
            break
        default:
            paydockPaymentStatus = 'paydock-pending'
            commerceToolsPaymentStatus = 'Pending'
            orderPaymentStatus = 'Open'
    }

    return {status: paydockPaymentStatus, paymentStatus: commerceToolsPaymentStatus, orderStatus: orderPaymentStatus}
}

async function callPaydock(url, data, method) {
    let returnedRequest
    let returnedResponse
    url = await generatePaydockUrlAction(url)
    try {
        const {response, request} = await fetchAsyncPaydock(url, data, method)
        returnedRequest = request
        returnedResponse = response
    } catch (err) {
        returnedRequest = {body: JSON.stringify(data)}
        returnedResponse = serializeError(err)
    }

    return {request: returnedRequest, response: returnedResponse}
}

async function generatePaydockUrlAction(url) {
    const apiUrl = await config.getPaydockApiUrl()
    return apiUrl + url
}

async function fetchAsyncPaydock(
    url,
    requestObj,
    method
) {
    let response
    let responseBody
    let responseBodyInText
    const request = await buildRequestPaydock(requestObj, method)

    try {
        response = await fetch(url, request)
        responseBodyInText = await response.text()
        responseBody = responseBodyInText ? JSON.parse(responseBodyInText) : ''
    } catch (err) {
        if (response)
            // Handle non-JSON format response
            throw new Error(
                `Unable to receive non-JSON format resposne from Paydock API : ${responseBodyInText}`
            )
        // Error in fetching URL
        else throw err
    } finally {
        if (responseBody.additionalData) {
            delete responseBody.additionalData
        }
    }
    return {response: responseBody, request}
}

async function buildRequestPaydock(requestObj, methodOverride) {
    const paydockCredentials = await config.getPaydockConfig('connection')
    const requestHeaders = {
        'Content-Type': 'application/json',
        'x-user-secret-key': paydockCredentials.credentials_secret_key
    }

    const request = {
        method: methodOverride || 'POST',
        headers: requestHeaders
    }
    if (methodOverride !== 'GET') {
        request.body = JSON.stringify(requestObj)
    }
    return request
}

function errorMessageToString(response) {
    let result = ` ${response.error?.message ?? ''}`;
    if (response.error?.details) {
        const { details } = response.error;
        if (Array.isArray(details.messages) && details.messages.length > 0) {
            return details.messages[0];
        }
        const firstDetail = Object.values(details)[0];
        if (Array.isArray(firstDetail)) {
            result += ` ${firstDetail.join(',')}`;
        } else {
            result += ` ${Object.values(details).join(',')}`;
        }
    }
    return result.trim();
}

export default {processNotification}

