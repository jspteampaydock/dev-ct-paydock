import {setupServer} from "../../src/server.js";
import {getAuthorizationRequestHeader, hasValidAuthorizationHeader} from '../../src/validator/authentication.js'
import config from '../../src/config/config.js';

const request = require('supertest');
const requestData = require('../../test-data/paymentHandler/get-payment-methods.handler.request.json');
const configData = require('../../test-data/config.json');
const moduleConfigData = require('../../test-data/moduleConfig.json');
const responseData = require('../../test-data/paymentHandler/get-payment-methods.handler.response.json');
const sandboxPaymentExtensionResponse = require('../../test-data/paymentHandler/get-payment-methods.handler.sandbox-payment-extension-response.json');
const livePaymentExtensionResponse = require('../../test-data/paymentHandler/get-payment-methods.handler.sandbox-payment-extension-response.json');

jest.mock('../../src/validator/authentication.js')
jest.mock('../../src/config/config.js')

config.getModuleConfig.mockResolvedValue(moduleConfigData)
config.getCtpClient.mockResolvedValue({create: jest.fn(), builder: {customObjects: {}}})

describe('Unit::getPaymentMethods::', () => {
    const server = setupServer();

    beforeEach(() => {
        server.listen(3001, 'localhost')
    })

    afterEach(() => {
        server.close();
    });

    test('get sandbox configuration', () => {
        configData.sandbox_mode = "Yes";
        config.getPaydockConfig.mockResolvedValue(configData)
        getAuthorizationRequestHeader.mockResolvedValue('test-authorisation');
        hasValidAuthorizationHeader.mockResolvedValue(true);
        responseData.actions[0].value = JSON.stringify(sandboxPaymentExtensionResponse);

        return request(server)
            .post('/')
            .send(requestData)
            .expect(200)
            .then((response) => {
                expect(response.text).toEqual(JSON.stringify(responseData));
            })
    })

    test('get live configuration', () => {
        configData.sandbox_mode = "No";
        config.getPaydockConfig.mockResolvedValue(configData)
        getAuthorizationRequestHeader.mockResolvedValue('test-authorisation');
        hasValidAuthorizationHeader.mockResolvedValue(true);
        responseData.actions[0].value = JSON.stringify(livePaymentExtensionResponse);

        return request(server)
            .post('/')
            .send(requestData)
            .expect(200)
            .then((response) => {
                expect(response.text).toEqual(JSON.stringify(responseData));
            })
    })
})